var util = require("util"),
P = require("bluebird"),
KObject = require("./base").KObject;

function XStaff (user, staff_info) {
    KObject.call(this, user.connection);
    this.xid = staff_info.xid;
    this.name = staff_info.name;
    this.properties = staff_info;
}

util.inherits(XStaff, KObject);

XStaff.prototype.rename = function () {
};

XStaff.prototype.remove = function () {
};


function KDept(user, staff_info) {
    XStaff.call(this, user, staff_info);
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


function KStaff(user, staff_info) {
    XStaff.call(this, user, staff_info);
}

util.inherits(KStaff, XStaff);
KStaff.prototype.modify = function () {
};

KStaff.prototype.lock = function () {
};

KStaff.prototype.unlock = function () {
};


function KDomain(user, domain_id) {
    KObject.call(this, user.connection);
    this.domain_id = domain_id;
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
