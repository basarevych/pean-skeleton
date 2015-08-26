/**
 * ACL service
 */

function Acl() {
}

Acl.prototype.isAllowed = function (user, resource, action) {
    return true;
};

module.exports = Acl;
