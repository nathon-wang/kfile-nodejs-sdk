var P = require("bluebird"),
    klaw = require("klaw"),
    _ = require("lodash"),
    mkdirp = require('mkdirp-bluebird'),
    util = require("util"),
    pathlib = require("path");

function TreeNode(opts) {
    this.name = opts.name;
    this.local_path = opts.path;
    this.children = [];
    this.parent = null;
    this.kobj = null;
    this.remote_proxy = null;
}

function MiddNode(opts) {
    TreeNode.call(this, opts);
}

util.inherits(MiddNode, TreeNode);

MiddNode.prototype.upload = function () {
    var _this = this;
    return new P(function (resolve, reject) {
        _this.remote_proxy.mkdir({name: _this.name})
        .then(function (kobj) {
            _this.kobj = kobj;
            _this.children.forEach(function (tobj) {
                tobj.remote_proxy = kobj;
            });
            return P.mapSeries(_this.children, function (tobj) { return tobj.upload(); });
        })
        .then(function () {
            resolve();
        })
        .catch(function (error) {
            reject(error);
        });
    });
};

function LeafNode(opts) {
    TreeNode.call(this, opts);
}

util.inherits(LeafNode, TreeNode);

LeafNode.prototype.upload = function () {
    var _this = this;
    return new P(function (resolve, reject) {
        _this.remote_proxy.upload_file({path: _this.local_path})
        .then(function (kobj) {
            _this.kobj = kobj;
            resolve(_this);
        })
        .catch(function (error) {
            reject(error);
        });
    });
};


function buildTree(root, parent, currentPath, treeMap) {
    var currentNode = treeMap[currentPath], nodeObj;
    if (currentNode.is_file) {
        nodeObj = new LeafNode(currentNode);
    } else {
        nodeObj = new MiddNode(currentNode);
    }
    if (parent !== null) {
        parent.children.push(nodeObj);
        nodeObj.parent = parent;
    }
    if (root.header === undefined) {
        root.header = nodeObj;
    }
    if (currentNode.children === undefined || currentNode.children.length === 0) {
        return;
    } else {
        currentNode.children.forEach(function (item) {
            buildTree(root, nodeObj, item.path, treeMap);
        });
    }
}


function buildLocalTreeObject(path) {
    return new P(function (resolve, reject) {
        var tree = {}, rootPath = pathlib.resolve(path);
        klaw(path)
        .on('data', function (item) {
		var current_path = item.path,
		    parent_path = pathlib.dirname(item.path),
                    parent_name = pathlib.basename(parent_path),
                    parent_parent_path = pathlib.dirname(parent_path),
		    name = pathlib.basename(current_path),
                    is_file;

		if(tree[parent_path] === undefined) {
			tree[parent_path] = {path: parent_path, name: parent_name, parent: parent_parent_path, children:[], is_file: false};
		}
		if (item.stats.isDirectory()) {
                    is_file = false;
                    if (tree[current_path] === undefined) {
                        tree[current_path] = {path: current_path, name: name, parent: parent_path, children:[], is_file: false};
                    }
		} else if (item.stats.isFile()) {
                    is_file = true;
                    tree[current_path] = {path: current_path, name: name, parent: parent_path, is_file: true};
		}
                if (is_file !== undefined) {
                    tree[parent_path].children.push({path: current_path, name: name, parent: parent_path, is_file: is_file});
                }
        })
        .on('end', function () {
                var root = {};
                buildTree(root, null, rootPath, tree);
                resolve(root.header);
        });
    });
}

exports.buildLocalTreeObject = buildLocalTreeObject;

function get_all(opts) {
    var operation = opts.func(opts.args);
    return operation
    .then(function (data) {
        var datas = opts.datas.concat(data);
        if(opts.finish(data)) {
            return P.resolve(datas);
        } else {
            var new_opts = {
                func: opts.func,
                datas: datas,
                args: opts.next(data, opts.args),
                finish: opts.finish,
                next: opts.next
            };
            return P.delay(0.001)
            .then(get_all.bind(null, new_opts));
        }
    });
}

exports.get_all = get_all;

function retrieve_path_n_xid(root_path, dir_paths) {
    var pathNxid = [], path_set = {};
    dir_paths.forEach(function (pitems) {
        var path = _.map(pitems, 'name').join('/'), data;
        if (path_set[path]) {
            return;
        }
        data = {path: root_path + path, xid: pitems[pitems.length-1].xid};
        pathNxid.push(data);
        path_set[path] = true;
    });
    return pathNxid;
}


function create_local_path(root_path, dir_paths) {
    var pathNxid = retrieve_path_n_xid(root_path, dir_paths), mkdirTasks;
    mkdirTasks = _.map(pathNxid, function (item) {
        return mkdirp(item.path);
    });
    return P.all(mkdirTasks)
        .then(function () {
            return new P(function (resolve) { resolve(pathNxid); });
        });
}

function download_all_files(user, root_path, file_paths, create_file_objs) {
    var pathObjs = create_file_objs(user, root_path, file_paths), downloadTasks;
    downloadTasks = _.map(pathObjs, function (item) {
        return item.obj.download({path: item.path});
    });
    return P.resolve(downloadTasks).map(function (result){}, {concurrency: 4})
    .then(function () {
        return pathObjs;
    });
}

function create_path_n_download_files(user, root_path, dir_paths, file_paths, create_file_objs) {
    var pathNxid;
    return create_local_path(root_path, dir_paths)
        .then(function (data) {
            pathNxid = data;
            return download_all_files(user, root_path, file_paths, create_file_objs);
        })
        .then(function (pathObjs) {
            return new P(function (resolve) { resolve({p:pathNxid, f:pathObjs}); });
        });
}

exports.create_path_n_download_files = create_path_n_download_files;

function find_path(xid, xid2xfile) {
    var current = xid2xfile[xid], xpath = [current];
    while (true) {
        parent_xid = current.parent_xid;
        current = xid2xfile[parent_xid];
        if (!current) {
            break;
        }
        xpath.push(current);
    }
    return _.reverse(xpath);
}

exports.find_path = find_path;
