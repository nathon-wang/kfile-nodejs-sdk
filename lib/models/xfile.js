var P = require('bluebird'),
_ = require('lodash'),
util = require('util'),
tools = require("./tools"),
file = require("./file"),
helper = require('./helper'),
fs = require("fs-extra"),
Uploader = file.Uploader,
Downloader = file.Downloader,
KObject = require("./base").KObject;

function _createXFileByProperties(home, parent, properties) {
    var opts = {parnode: parent, home: home, properties: properties};
    if (properties.xtype === 1) {
        if (properties.is_share === 0) {
            return new KCageDirectory(opts);
        } else {
            return new KShareDirectory(opts);
        }
    } else {
        if (properties.is_share === 0) {
            return new KCageFile(opts);
        } else {
            return new KShareFile(opts);
        }
    }
}

function _createFakeFileByProperties(user, properties) {
    var opts = {parnode: null, home: {user: user}, properties: properties};
    return new KFile(opts);
}

function _createXFileListByProperites(home, parent, lst_data) {
    var k_obj_arr = [];

    for (var i = 0, len = lst_data.length; i < len; i++) {
        var kobj = _createXFileByProperties(home, parent, lst_data[i]);
        k_obj_arr.push(kobj);
    }
    return k_obj_arr;
}

function XFile (opts) {
    this.home = opts.home||this;
    this.parnode = opts.parnode||this;
    this.user = opts.user||this.home.user;
    this.properties = opts.properties||{};
    this.xid = this.properties.xid;
    this.name = this.properties.name;
    this.parent_xid = this.properties.parent_xid;
    KObject.call(this, this.user.connection);
}

util.inherits(XFile, KObject);

XFile.prototype.toString = function () {
    return util.format('{[KObject] %s: xid: %s, name: %s, parent_xid: %s}', this.constructor.name, this.xid, this.name, this.parent_xid);
};

XFile.prototype.is_dir = function (name) {
    return this.properties.xtype === 1;
};

XFile.prototype.is_file = function (name) {
    return this.properties.xtype === 0;
};

XFile.prototype.is_share = function (name) {
    return this.properties.is_share === 1;
};

XFile.prototype.is_cage = function (name) {
    return this.properties.is_share === 0;
};

XFile.prototype.update_name = function (name) {
    this.name = name;
    this.properties.name = name;
};


XFile.prototype.rename = function (name) {
    var _this = this;
    return new P(function (resolve, reject) {
        _this.rename_by_shareType(name)
        .then(function () {
            _this.update_name(name);
            resolve(_this);
        })
        .catch(function (error) {
            reject(error);
        });
    });
};

XFile.prototype.archive = function () {
    var _this = this;
    return new P(function (resolve, reject) {
        _this.archive_by_shareType()
        .then(function () {
            resolve(_this);
        })
        .catch(function (error) {
            reject(error);
        });
    });
};

XFile.prototype.recover = function () {
    return this.recover_by_shareType();
};

XFile.prototype.remove = function () {
    return this.remove_by_shareType();
};

XFile.prototype.gen_short_link = function () {
};

XFile.prototype.info = function (xid) {
    var _this = this;
    if (xid === this.xid || xid === undefined) {
        return new P (function (resolve, reject) {
            resolve(_this);
        });
    } else {
        return this.delegate('XfileInfoV1', {xid: xid||_this.xid})
            .then(function (detail) {
                return _createXFileByProperties(_this.home, _this.parent, detail);
            });
    }
};

function ShareXFile () {
}

ShareXFile.prototype.rename_by_shareType = function (name) {
    return this.delegate('XfileShareRenameV1', {xid: this.xid, name: name});
};

ShareXFile.prototype.archive_by_shareType = function (name) {
    return this.delegate('XfileShareArchiveV1', {xid: this.xid});
};

ShareXFile.prototype.remove_by_shareType = function (name) {
    return this.delegate('XfileShareDeleteV1', {xid: this.xid});
};

function CageXFile () {
}

CageXFile.prototype.rename_by_shareType = function (name) {
    return this.delegate('XfileCageRenameV1', {xid: this.xid, name: name});
};

CageXFile.prototype.archive_by_shareType = function (name) {
    return this.delegate('XfileCageArchiveV1', {xid: this.xid});
};

CageXFile.prototype.remove_by_shareType = function (name) {
    return this.delegate('XfileCageDeleteV1', {xid: this.xid});
};


function KFile (opts) {
    XFile.call(this, opts);
}

util.inherits(KFile, XFile);

KFile.prototype.download = function (opts) {
    var opts2 = opts||{};
    return new Downloader({
        xid: this.xid,
        file_version: this.properties.file_version,
        size: this.properties.xsize,
        path: opts2.path||'./' + this.name,
        delegation: this,
        progress: opts2.progress
    }).begin();
};

function KShareFile (opts) {
    KFile.call(this, opts);
}

util.inherits(KShareFile, KFile);
tools.addMixIn(ShareXFile.prototype, KShareFile.prototype);

function KCageFile (opts) {
    KFile.call(this, opts);
}

util.inherits(KCageFile, KFile);
tools.addMixIn(CageXFile.prototype, KCageFile.prototype);


function KDirectory (opts) {
    XFile.call(this, opts);
}

util.inherits(KDirectory, XFile);

KDirectory.prototype.mkdir = function (args) {
    var _this = this;
    return new P(function (resolve, reject) {
        _this.create_directory(args)
        .then(function (data) {
            resolve(_createXFileByProperties(_this.home, _this, data));
        })
        .catch(function (error) {
            reject(error);
        });
    });
};

KDirectory.prototype.get_one_page = function (opts) {
    var _this = this, options = opts|{};
    return new P(function(resolve, reject) {
        _this.list_by_page({
            token: _this.user.account.token,
            sortBy: options.sortBy||1,
            order: options.order||1,
            pageMax: options.pageMax||50,
            pageIdx: options.pageIdx||0
        })
        .then(function (lst) {
            resolve(_createXFileListByProperites(_this.home, _this, lst));
        })
        .catch(function (error) {
            reject(error);
        });
    });
};


KDirectory.prototype.match_by_name = function (name, directory) {
    var xtype = directory === true ? 1 : 0, _this = this;
    return new P(function(resolve, rejec) {
        this.delegate('XfileLevelMatchV1', {xid: this.xid, name: name, xtype: xtype})
        .then(function (data) {
            resolve(_createXFileByProperties(_this.home, _this, data));
        })
        .catch(function (error) {
            reject(error);
        });
    });
};

KDirectory.prototype.search_by_name = function (name) {
    return  new P(function (resolve, reject) {
        this.delegate('XfileLevelSearchV1', {xid: this.xid, name: name})
        .then(function (lst) {
            resolve(_createXFileListByProperites(_this.home, _this, lst));
        });
    });
};

KDirectory.prototype.upload_file = function (opts) {
    var _this = this;
    return new Uploader({
        xid: this.xid,
        path: opts.path,
        delegation: this,
        progress: opts.progress
    }).begin();
};

KDirectory.prototype.upload = function (opts) {
    var _this = this;
    return fs.stat(opts.path)
    .then(function (stat) {
        if (stat.isFile()) {
            return _this.upload_file();
        } else if (stat.isDirectory()) {
            return helper.buildLocalTreeObject(opts.path)
                .then(function (treeObject) {
                    treeObject.remote_proxy = _this;
                    return treeObject.upload();
                });
        } else {
            throw new Error("Upload target is invalid!!!");
        }
    });
};

function create_file_objs(user, root_path, file_paths) {
    var pathObjs = [], file_set = {};
    file_paths.forEach(function (fitems) {
        var path = _.map(fitems, 'name').join('/'), data, last_item;
        if (file_set[path]) {
            return;
        }
        last_item = fitems[fitems.length-1];
        data = {path: root_path + path, xid: last_item.xid};
        data.obj = _createFakeFileByProperties(user, {
            xid: last_item.xid, file_version: last_item.file_version, xsize: last_item.xsize, name: last_item.name});

        pathObjs.push(data);
        file_set[path] = true;
    });
    return pathObjs;
}

KDirectory.prototype.download = function (opts) {
    var _this = this;
    opts = opts||{};
    return  new P (function (resolve, reject) {
        var page_max = 1024,
        snapshot_func = function (args) {
            return _this.delegate('XfileSnapshotPageListV2', args);
        };
        helper.get_all({func: snapshot_func, datas: [], args:{xid:_this.xid, hint:0, pageMax:page_max}, next: function(data, args) {
            var max_data = data[data.length-1];
            return {xid:args.xid, hint:max_data.xid, pageMax:page_max};
        }, finish: function (data) {
            return data.length < page_max;
        }})
        .then(function (snapshot) {
            var level = [], current=_this.parent_xid, parent_xids = [], xids = [], xid2xfile = {};
            for (var i=0, len=snapshot.length; i < len; i++) {
                var item = snapshot[i];
                if (item.status === 0) {
                    xid2xfile[item.xid] = {
                        xid: item.xid,
                        file_version: item.file_version,
                        properties: {xsize: item.xsize},
                        parent_xid: item.parent_xid,
                        name: item.name,
                        xtype: (item.sha1 === '' ? 1:0)
                    };
                    parent_xids.push(item.parent_xid);
                    xids.push(item.xid);
                }
            }
            xid2xfile[_this.xid] = {xid: _this.xid, parent_xid:_this.parent_xid, name: _this.name, xtype: 1};
            var leaf_xids = _.difference(xids, parent_xids), file_paths = [], dir_paths = [];
            leaf_xids.forEach(function (xid) {
                var xpath;
                if (xid2xfile[xid].xtype === 1) {
                    dir_paths.push(helper.find_path(xid, xid2xfile));
                } else {
                    xpath = helper.find_path(xid, xid2xfile);
                    if (xpath.length >= 1) {
                        dir_paths.push(xpath.slice(0, (xpath.length-1)));
                    }
                    file_paths.push(xpath);
                }
            });
            return helper.create_path_n_download_files(_this.user, opts.root_path||'./', dir_paths, file_paths, create_file_objs);
        })
        .then(function (data) {
            resolve(data);
        })
        .catch(function (error) {
            reject(error);
        });
    });
};

KDirectory.prototype.download_file_by_name = function (name, path) {
    var _this = this;
    return this.match_by_name(name)
        .then(function (file_obj) {
            if (file_obj instanceof KFile) {
                return _this.download_file_by_xid(xfile_obj.xid, path);
            }
        });
};

function KShareDirectory (opts) {
    KDirectory.call(this, opts);
}

util.inherits(KShareDirectory, KDirectory);
tools.addMixIn(ShareXFile.prototype, KShareDirectory.prototype);

KShareDirectory.prototype.create_directory = function (args) {
    return this.delegate('XfileDirShareCreateV1', {xid: this.xid, name: args.name});
};

KShareDirectory.prototype.list_by_page = function (args) {
    args.xid = this.xid;
    return this.delegate('XfileDirSharePageListV1', args);
};

KShareDirectory.prototype.subscribe = function () {
    return this.delegate("XfileSubscribe", {xid: this.xid});
};

KShareDirectory.prototype.unsubscribe = function () {
    return this.delegate("XfileUnsubscribe", {xid: this.xid});
};

KShareDirectory.prototype.get_subscribe_list = function () {
    return this.delegate("XfileSubscribeList", {xid: this.xid});
};

function KShareHome (user, xid) {
    KShareDirectory.call(this, {user: user, properties: {xid: xid, parent_xid: xid}});
}

util.inherits(KShareHome, KShareDirectory);

KShareHome.prototype.create_directory = function (args) {
    return this.delegate('XfileDirShareRootCreateV1', {xid: this.xid, name: args.name, perm: args.perm, desc: args.desc});
};


KShareHome.prototype.list_by_page = function (args) {
    return this.delegate('XfileDirShareRootListV1', args);
};

function KCageDirectory (opts) {
    KDirectory.call(this, opts);
}

util.inherits(KCageDirectory, KDirectory);
tools.addMixIn(CageXFile.prototype, KCageDirectory.prototype);

KCageDirectory.prototype.create_directory = function (args) {
    return this.delegate('XfileDirCageCreateV1', {xid: this.xid, name: args.name});
};

function KCageHome (user, xid) {
    KCageDirectory.call(this, {user: user, properties: {xid: xid, parent_xid: xid}});
}

util.inherits(KCageHome, KCageDirectory);

function KTrash(user) {
    KObject.call(this, user.connection);
    this.user = user;
}

util.inherits(KTrash, KObject);

function KCageTrash(user) {
    KTrash.call(this, user);
}

util.inherits(KCageTrash, KTrash);

function KShareTrash(user) {
    KTrash.call(this, user);
}

util.inherits(KShareTrash, KTrash);

module.exports = {
    XFile: XFile,
    KShareFile: KShareFile,
    KCageFile: KCageFile,
    KShareDirectory: KShareDirectory,
    KCageDirectory: KCageDirectory,
    KShareHome: KShareHome,
    KCageHome: KCageHome,
    KShareTrash: KShareTrash,
    KCageTrash: KCageTrash
};
