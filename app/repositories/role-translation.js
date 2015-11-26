/**
 * Role translation repository
 */

'use strict'

var locator = require('node-service-locator');
var q = require('q');
var moment = require('moment-timezone');
var BaseRepository = locator.get('base-repository');
var BaseModel = locator.get('base-model');
var RoleTranslationModel = locator.get('role-translation-model');

function RoleTranslationRepository() {
    BaseRepository.call(this);
}

RoleTranslationRepository.prototype = new BaseRepository();
RoleTranslationRepository.prototype.constructor = RoleTranslationRepository;

RoleTranslationRepository.prototype.find = function (id) {
    var logger = locator.get('logger');
    var defer = q.defer();

    id = parseInt(id, 10);
    if (isNaN(id)) {
        defer.reject('RoleTranslationRepository.find() - invalid parameters');
        return defer.promise;
    }

    var db = this.getPostgres();
    db.connect(function (err) {
        if (err) {
            defer.reject();
            logger.error('RoleTranslationRepository.find() - pg connect', err);
            process.exit(1);
        }

        db.query(
            "SELECT * "
          + "  FROM role_translations "
          + " WHERE id = $1 ",
            [ id ],
            function (err, result) {
                if (err) {
                    defer.reject();
                    logger.error('RoleTranslationRepository.find() - pg query', err);
                    process.exit(1);
                }

                db.end();

                var translations = [];
                result.rows.forEach(function (row) {
                    var translation = new RoleTranslationModel(row);
                    translations.push(translation);
                });

                defer.resolve(translations);
            }
        );
    });

    return defer.promise;
};

RoleTranslationRepository.prototype.findByRoleId = function (roleId) {
    var logger = locator.get('logger');
    var defer = q.defer();

    roleId = parseInt(roleId, 10);
    if (isNaN(roleId)) {
        defer.reject('RoleTranslationRepository.findByRoleIdAndLocale() - invalid parameters');
        return defer.promise;
    }

    var db = this.getPostgres();
    db.connect(function (err) {
        if (err) {
            defer.reject();
            logger.error('RoleTranslationRepository.findByRoleIdAndLocale() - pg connect', err);
            process.exit(1);
        }

        db.query(
            "SELECT * "
          + "  FROM role_translations "
          + " WHERE role_id = $1 ",
            [ roleId ],
            function (err, result) {
                if (err) {
                    defer.reject();
                    logger.error('RoleTranslationRepository.findByRoleIdAndLocale() - pg query', err);
                    process.exit(1);
                }

                db.end();

                var translations = [];
                result.rows.forEach(function (row) {
                    var translation = new RoleTranslationModel(row);
                    translations.push(translation);
                });

                defer.resolve(translations);
            }
        );
    });

    return defer.promise;
};

RoleTranslationRepository.prototype.findByRoleIdAndLocale = function (roleId, locale) {
    var logger = locator.get('logger');
    var defer = q.defer();

    roleId = parseInt(roleId, 10);
    if (isNaN(roleId)) {
        defer.reject('RoleTranslationRepository.findByRoleIdAndLocale() - invalid parameters');
        return defer.promise;
    }

    var db = this.getPostgres();
    db.connect(function (err) {
        if (err) {
            defer.reject();
            logger.error('RoleTranslationRepository.findByRoleIdAndLocale() - pg connect', err);
            process.exit(1);
        }

        db.query(
            "SELECT * "
          + "  FROM role_translations "
          + " WHERE role_id = $1 AND locale = $2 ",
            [ roleId, locale ],
            function (err, result) {
                if (err) {
                    defer.reject();
                    logger.error('RoleTranslationRepository.findByRoleIdAndLocale() - pg query', err);
                    process.exit(1);
                }

                db.end();

                var translations = [];
                result.rows.forEach(function (row) {
                    var translation = new RoleTranslationModel(row);
                    translations.push(translation);
                });

                defer.resolve(translations);
            }
        );
    });

    return defer.promise;
};

RoleTranslationRepository.prototype.findAll = function () {
    var logger = locator.get('logger');
    var defer = q.defer();

    var db = this.getPostgres();
    db.connect(function (err) {
        if (err) {
            defer.reject();
            logger.error('RoleTranslationRepository.findAll() - pg connect', err);
            process.exit(1);
        }

        db.query(
            "  SELECT * "
          + "    FROM role_translations ",
            function (err, result) {
                if (err) {
                    defer.reject();
                    logger.error('RoleTranslationRepository.findAll() - pg query', err);
                    process.exit(1);
                }

                db.end();

                var translations = [];
                result.rows.forEach(function (row) {
                    var translation = new RoleTranslationModel(row);
                    translations.push(translation);
                });

                defer.resolve(translations);
            }
        );
    });

    return defer.promise;
};

RoleTranslationRepository.prototype.save = function (translation) {
    var logger = locator.get('logger');
    var defer = q.defer();

    var db = this.getPostgres();
    db.connect(function (err) {
        if (err) {
            defer.reject();
            logger.error('RoleTranslationRepository.save() - pg connect', err);
            process.exit(1);
        }

        db.query("BEGIN TRANSACTION", [], function (err, result) {
            if (err) {
                defer.reject();
                logger.error('RoleTranslationRepository.save() - pg query', err);
                process.exit(1);
            }

            db.query(
                "SELECT id "
              + "  FROM role_translations "
              + " WHERE id <> $1 "
              + "       AND role_id = $2 "
              + "       AND locale = $3 ",
                [
                    translation.getId(),
                    translation.getRoleId(),
                    translation.getLocale(),
                ],
                function (err, result) {
                    if (err) {
                        defer.reject();
                        logger.error('RoleTranslationRepository.save() - pg query', err);
                        process.exit(1);
                    }

                    if (result.rows.length) {
                        db.query("ROLLBACK TRANSACTION", [], function (err, result) {
                            if (err) {
                                defer.reject();
                                logger.error('RoleTranslationRepository.save() - pg query', err);
                                process.exit(1);
                            }

                            db.end();
                            defer.resolve(null);
                        });
                        return;
                    }

                    var query, params = [];
                    if (translation.getId()) {
                        query = "UPDATE role_translations "
                              + "   SET role_id = $1, "
                              + "       locale = $2, "
                              + "       title = $3 "
                              + " WHERE id = $4 ";
                        params = [
                            translation.getRoleId(),
                            translation.getLocale(),
                            translation.getTitle(),
                            translation.getId(),
                        ];
                    } else {
                        query = "   INSERT "
                              + "     INTO role_translations(role_id, locale, title) "
                              + "   VALUES ($1, $2, $3) "
                              + "RETURNING id ";
                        params = [
                            translation.getRoleId(),
                            translation.getLocale(),
                            translation.getTitle(),
                        ];
                    }

                    db.query(query, params, function (err, result) {
                        if (err) {
                            defer.reject();
                            logger.error('RoleTranslationRepository.save() - pg query', err);
                            process.exit(1);
                        }

                        var id = result.rows.length && result.rows[0]['id'];
                        if (id)
                            translation.setId(id);
                        else
                            id = translation.getId();

                        db.query("COMMIT TRANSACTION", [], function (err, result) {
                            if (err) {
                                defer.reject();
                                logger.error('RoleTranslationRepository.save() - pg query', err);
                                process.exit(1);
                            }

                            db.end();
                            translation.dirty(false);
                            defer.resolve(id);
                        });
                    });
                }
            );
        });
    });

    return defer.promise;
};

RoleTranslationRepository.prototype.delete = function (translation) {
    var logger = locator.get('logger');
    var defer = q.defer();

    if (!translation.getId()) {
        defer.resolve(0);
        return defer.promise;
    }

    var db = this.getPostgres();
    db.connect(function (err) {
        if (err) {
            defer.reject();
            logger.error('RoleTranslationRepository.delete() - pg connect', err);
            process.exit(1);
        }

        db.query(
            "DELETE "
          + "  FROM role_translations "
          + " WHERE id = $1 ",
            [ translation.getId() ],
            function (err, result) {
                if (err) {
                    defer.reject();
                    logger.error('RoleTranslationRepository.delete() - pg query', err);
                    process.exit(1);
                }

                db.end();
                translation.setId(null);
                translation.dirty(false);

                defer.resolve(result.rowCount);
            }
        );
    });

    return defer.promise;
};

RoleTranslationRepository.prototype.deleteAll = function () {
    var logger = locator.get('logger');
    var defer = q.defer();

    var db = this.getPostgres();
    db.connect(function (err) {
        if (err) {
            defer.reject();
            logger.error('RoleTranslationRepository.deleteAll() - pg connect', err);
            process.exit(1);
        }

        db.query(
            "DELETE "
          + "  FROM role_translations ",
            function (err, result) {
                if (err) {
                    defer.reject();
                    logger.error('RoleTranslationRepository.deleteAll() - pg query', err);
                    process.exit(1);
                }

                db.end();

                defer.resolve(result.rowCount);
            }
        );
    });

    return defer.promise;
};

module.exports = RoleTranslationRepository;
