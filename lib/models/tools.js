exports.addMixIn = function(source, dest) {
    for (var k in source) {
        if (source.hasOwnProperty(k)) {
            dest[k] = source[k];
        }
    }
    return dest;
};
