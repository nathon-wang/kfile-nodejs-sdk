var P = require('bluebird'),
util = require('util'),
tools = require("./tools"),
file = require("./file"),
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

XFile.prototype.rename = function (name) {
    return this.rename_by_shareType(name);
};

XFile.prototype.archive = function () {
    return this.archive_by_shareType();
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
                if (detail.parent_xid !== _this.xid) {
                    throw new Error();
                } else {
                    return _createXFileByProperties(_this.home, _this.parent, detail);
                }
            });
    }
};

function ShareXFile () {
}

ShareXFile.prototype.rename_by_shareType = function (name) {
    var _this = this;
    return this.delegate('XfileShareRenameV1', {xid: _this.xid, name: name});
};

ShareXFile.prototype.archive_by_shareType = function (name) {
    var _this = this;
    return this.delegate('XfileShareArchiveV1', {xid: _this.xid});
};

function CageXFile () {
}

CageXFile.prototype.rename_by_shareType = function (name) {
    var _this = this;
    return this.delegate('XfileCageRenameV1', {xid: _this.xid, name: name});
};

CageXFile.prototype.archive_by_shareType = function (name) {
    var _this = this;
    return this.delegate('XfileCageArchiveV1', {xid: _this.xid});
};


function KFile (opts) {
    XFile.call(this, opts);
}

util.inherits(KFile, XFile);

KFile.prototype.download = function (opts) {
    var opts2 = opts||{};
    return new Downloader({
        xid: this.xid,
        file_version: this.file_version,
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
            resolve(_createXFileListByProperites(_this, _this.home, lst));
        })
        .catch(function (error) {
            reject(error);
        });
    });
};


KDirectory.prototype.match_by_name = function (name, directory) {
    var xtype = directory === true ? 1 : 0;
    return new P(function(resolve, rejec) {
        this.delegate('XfileLevelMatchV1', {xid: this.xid, name: name, xtype: xtype})
        .then(function (data) {
            resolve(_createXFileByProperties(data));
        });
    });
};

KDirectory.prototype.search_by_name = function (name) {
    return  new P(function (resolve, reject) {
        this.delegate('XfileLevelSearchV1', {xid: this.xid, name: name})
        .then(function (lst) {
            resolve(_createXFileListByProperites(_this, _this.home, lst));
        });
    });
};

KDirectory.prototype.upload = function (opts) {
    return new Uploader({
        xid: this.xid,
        path: opts.path,
        delegation: this,
        progress: opts.progress
    }).begin();
};

KDirectory.prototype.download = function (opts) {
    var _this = this;
    return this.info(xid)
        .then(function (xfile) {
            return xfile.download(opts);
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

KDirectory.prototype.upload_dir = function () {
};

KDirectory.prototype.download_dir = function () {
};

function KShareDirectory (opts) {
    KDirectory.call(this, opts);
}

util.inherits(KShareDirectory, KDirectory);
tools.addMixIn(ShareXFile.prototype, KShareDirectory.prototype);

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

KShareHome.prototype.list_by_page = function (args) {
    return this.delegate('XfileDirShareRootListV1', args);
};

function KCageDirectory (opts) {
    KDirectory.call(this, opts);
}

util.inherits(KCageDirectory, KDirectory);
tools.addMixIn(CageXFile.prototype, KCageDirectory.prototype);

function KCageHome (user, xid) {
    KCageDirectory.call(this, {user: user, properties: {xid: xid, parent_xid: xid}});
}

util.inherits(KCageHome, KCageDirectory);

function KTrash(user) {
    KObject.call(this, this.user.connection);
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
    KShareFile: KShareFile,
    KCageFile: KCageFile,
    KShareDirectory: KShareDirectory,
    KCageDirectory: KCageDirectory,
    KShareHome: KShareHome,
    KCageHome: KCageHome,
    KShareTrash: KShareTrash,
    KCageTrash: KCageTrash
};
