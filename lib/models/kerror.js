var util = require("util");

function KError() {
    Error.call(this);
}

util.inherits(KError, Error);
