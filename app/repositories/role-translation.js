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

/**
 * Role translation repository
 *
 * @constructor
 */
function RoleTranslationRepository() {
    BaseRepository.call(this);
}

RoleTranslationRepository.prototype = new BaseRepository();
RoleTranslationRepository.prototype.constructor = RoleTranslationRepository;

/**
 * Find a translation by ID
 *
 * @param {integer} id      ID to search by
 * @return {object}         Returns promise resolving to array of models
 */
RoleTranslationRepository.prototype.find = function (id) {
    var logger = locator.get('logger');
    var defer = q.defer();

    var db = this.getPostgres();
    db.connect(function (err) {
        if (err)
            return defer.reject([ 'RoleTranslationRepository.find() - pg connect', err ]);

        db.query(
            "SELECT * "
          + "  FROM role_translations "
          + " WHERE id = $1 ",
            [ id ],
            function (err, result) {
                if (err) {
                    db.end();
                    return defer.reject([ 'RoleTranslationRepository.find() - select', err ]);
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

/**
 * Find translations by role ID
 *
 * @param {integer} roleID      Role ID to search by
 * @return {object}             Returns promise resolving to array of models
 */
RoleTranslationRepository.prototype.findByRoleId = function (roleId) {
    var logger = locator.get('logger');
    var defer = q.defer();

    var db = this.getPostgres();
    db.connect(function (err) {
        if (err)
            return defer.reject([ 'RoleTranslationRepository.findByRoleId() - pg connect', err ]);

        db.query(
            "SELECT * "
          + "  FROM role_translations "
          + " WHERE role_id = $1 ",
            [ roleId ],
            function (err, result) {
                if (err) {
                    db.end();
                    return defer.reject([ 'RoleTranslationRepository.findByRoleId() - select', err ]);
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

/**
 * Find translations by role ID and locale
 *
 * @param {integer} roleId          Role ID
 * @param {string} locale           Locale
 * @return {object}                 Returns promise resolving to array of models
 */
RoleTranslationRepository.prototype.findByRoleIdAndLocale = function (roleId, locale) {
    var logger = locator.get('logger');
    var defer = q.defer();

    var db = this.getPostgres();
    db.connect(function (err) {
        if (err)
            return defer.reject([ 'RoleTranslationRepository.findByRoleIdAndLocale() - pg connect', err ]);

        db.query(
            "SELECT * "
          + "  FROM role_translations "
          + " WHERE role_id = $1 AND locale = $2 ",
            [ roleId, locale ],
            function (err, result) {
                if (err) {
                    db.end();
                    return defer.reject([ 'RoleTranslationRepository.findByRoleIdAndLocale() - select', err ]);
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

/**
 * Find all the translations
 *
 * @return {object}             Returns promise resolving to array of models
 */
RoleTranslationRepository.prototype.findAll = function () {
    var logger = locator.get('logger');
    var defer = q.defer();

    var db = this.getPostgres();
    db.connect(function (err) {
        if (err)
            return defer.reject([ 'RoleTranslationRepository.findAll() - pg connect', err ]);

        db.query(
            "  SELECT * "
          + "    FROM role_translations ",
            function (err, result) {
                if (err) {
                    db.end();
                    return defer.reject([ 'RoleTranslationRepository.findAll() - select', err ]);
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

/**
 * Save translation model
 *
 * @param {object} translation  The translation to save
 * @return {object}             Returns promise resolving to translation ID or null on failure
 */
RoleTranslationRepository.prototype.save = function (translation) {
    var logger = locator.get('logger');
    var defer = q.defer();

    var db = this.getPostgres();
    db.connect(function (err) {
        if (err)
            return defer.reject([ 'RoleTranslationRepository.save() - pg connect', err ]);

        db.query("BEGIN TRANSACTION", [], function (err, result) {
            if (err) {
                db.end();
                return defer.reject([ 'RoleTranslationRepository.save() - begin transaction', err ]);
            }

            var query = "SELECT id "
                      + "  FROM role_translations "
                      + " WHERE role_id = $1 "
                      + "       AND locale = $2 ";
            var params = [
                translation.getRoleId(),
                translation.getLocale(),
            ];

            if (translation.getId()) {
                query += " AND id <> $3 ";
                params.push(translation.getId());
            }

            db.query(
                query,
                params,
                function (err, result) {
                    if (err) {
                        db.end();
                        return defer.reject([ 'RoleTranslationRepository.save() - main query', err ]);
                    }

                    if (result.rows.length) {
                        db.query("ROLLBACK TRANSACTION", [], function (err, result) {
                            if (err) {
                                db.end();
                                return defer.reject([ 'RoleTranslationRepository.save() - rollback transaction', err ]);
                            }

                            db.end();
                            defer.resolve(null);
                        });
                        return;
                    }

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
                            db.end();
                            return defer.reject([ 'RoleTranslationRepository.save() - main query', err ]);
                        }

                        var id = result.rows.length && result.rows[0]['id'];
                        if (id)
                            translation.setId(id);
                        else
                            id = result.rowCount > 0 ? translation.getId() : null;

                        db.query("COMMIT TRANSACTION", [], function (err, result) {
                            if (err) {
                                db.end();
                                return defer.reject([ 'RoleTranslationRepository.save() - commit transaction', err ]);
                            }

                            db.end();

                            if (id)
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

/**
 * Delete a translation
 *
 * @param {object} translation      Translation to delete
 * @return {object}                 Returns promise resolving to a number of deleted DB rows
 */
RoleTranslationRepository.prototype.delete = function (translation) {
    var logger = locator.get('logger');
    var defer = q.defer();

    var db = this.getPostgres();
    db.connect(function (err) {
        if (err)
            return defer.reject([ 'RoleTranslationRepository.delete() - pg connect', err ]);

        db.query(
            "DELETE "
          + "  FROM role_translations "
          + " WHERE id = $1 ",
            [ translation.getId() ],
            function (err, result) {
                if (err) {
                    db.end();
                    return defer.reject([ 'RoleTranslationRepository.delete() - delete', err ]);
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

/**
 * Delete all the translations
 *
 * @return {object}             Returns promise resolving to a number of deleted DB rows
 */
RoleTranslationRepository.prototype.deleteAll = function () {
    var logger = locator.get('logger');
    var defer = q.defer();

    var db = this.getPostgres();
    db.connect(function (err) {
        if (err)
            return defer.reject([ 'RoleTranslationRepository.deleteAll() - pg connect', err ]);

        db.query(
            "DELETE "
          + "  FROM role_translations ",
            function (err, result) {
                if (err) {
                    db.end();
                    return defer.reject([ 'RoleTranslationRepository.deleteAll() - delete', err ]);
                }

                db.end();
                defer.resolve(result.rowCount);
            }
        );
    });

    return defer.promise;
};

module.exports = RoleTranslationRepository;
