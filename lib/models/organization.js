var util = require("util"),
P = require("bluebird"),
KObject = require("./base").KObject;

function XStaff (user) {
    KObject.call(this, user.connection);
    this.user = user;
}

util.inherits(XStaff, KObject);

XStaff.prototype.rename = function () {
};

XStaff.prototype.remove = function () {
};


function KDept(user) {
    XStaff.call(this, user);
}

util.inherits(KDept, XStaff);

KDept.prototype.list_all = function () {
};

KDept.prototype.match_by_name = function () {
};

KDept.prototype.find_by_name = function () {
};

KDept.prototype.add_staff = function () {
};

KDept.prototype.add_dept = function () {
};


function KStaff(user) {
    XStaff.call(this, user);
}

util.inherits(KStaff, XStaff);
KStaff.prototype.modify = function () {
};

KStaff.prototype.lock = function () {
};

KStaff.prototype.unlock = function () {
};


function KDomain(user) {
    KObject.call(this, user.connection);
    this.user = user;
}

util.inherits(KDomain, KObject);

KDomain.prototype.info = function () {
};

KDomain.prototype.setting = function () {
};

function KSpace(user) {
    KObject.call(this, user.connection);
    this.user = user;
}

util.inherits(KSpace, KObject);

KSpace.prototype.info = function () {
};

KSpace.prototype.resize = function () {
};

module.exports = {
    KStaff: KStaff,
    KDept: KDept,
    KDomain: KDomain,
    KSpace: KSpace
};
