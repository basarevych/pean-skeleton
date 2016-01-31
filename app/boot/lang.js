/**
 * Initialize translations
 */

'use strict'

var locator = require('node-service-locator');
var merge = require('merge');
var globalize = require('globalize');

module.exports = function (app) {
    var config = locator.get('config');

    var data = merge.recursive(
        require("../../node_modules/cldr-data/supplemental/currencyData"),
        require("../../node_modules/cldr-data/supplemental/likelySubtags"),
        require("../../node_modules/cldr-data/supplemental/plurals"),
        require("../../node_modules/cldr-data/supplemental/timeData"),
        require("../../node_modules/cldr-data/supplemental/weekData")
    );

    var messages = {};
    config['lang']['locales'].forEach(function (locale) {
        data = merge.recursive(
            data,
            require("../../node_modules/cldr-data/main/" + locale + "/ca-gregorian"),
            require("../../node_modules/cldr-data/main/" + locale + "/currencies"),
            require("../../node_modules/cldr-data/main/" + locale + "/dateFields"),
            require("../../node_modules/cldr-data/main/" + locale + "/numbers")
        );
        messages = merge.recursive(messages, require("../../l10n/" + locale));
    });

    globalize.load(data);
    globalize.loadMessages(messages);
    globalize.locale(config['lang']['default']);

    /**
     * Create Globalize wrapper in res.locals
     */
    app.use(function (req, res, next) {
        var logger = locator.get('logger');

        var lang = config['lang']['locales'].indexOf(req.cookies.locale) == -1 ? null : req.cookies.locale;
        if (!lang)
            lang = req.acceptsLanguages(config['lang']['locales']);
        if (!lang)
            lang = config['lang']['default'];
        if (locator.get('locale') != lang)
            locator.register('locale', lang);

        try {
            globalize.locale(lang);
        } catch (err) {
            logger.warn('globalize', err);
        }

        // add translation helpers
        res.locals.glDate = function (input, params) {
            var output = input;
            try {
                output = globalize.formatDate(input, params);
            } catch (err) {
                logger.warn('globalize.formatDate', err);
            }
            return output;
        };
        res.locals.glMessage = function (input, params) {
            var output = input;
            try {
                output = globalize.formatMessage(input, params);
            } catch (err) {
                logger.warn('globalize.formatMessage', err);
            }
            return output;
        };
        res.locals.glNumber = function (input, params) {
            var output = input;
            try {
                output = globalize.formatNumber(input, params);
            } catch (err) {
                logger.warn('globalize.formatNumber', err);
            }
            return output;
        };
        res.locals.glCurrency = function (input, currency, params) {
            var output = input;
            try {
                output = globalize.formatCurrency(input, currency, params);
            } catch (err) {
                logger.warn('globalize.formatCurrency', err);
            }
            return output;
        };

        next();
    });
};
