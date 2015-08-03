/**
 * Initialize translations
 */

'use strict'

var locator = require('node-service-locator');

module.exports = function () {
    var app = locator.get('app');
    var config = locator.get('config');
    var locales = [];

    locator.register('locale', config['lang']['default']);
    locator.register('globalize', function (locale) {
        if (config['lang']['locales'].indexOf(locale) == -1)
            throw new Error('Unsupported locale: ' + locale);

        if (typeof locales[locale] != 'undefined')
            return locales[locale];

        var globalize = require('globalize');

        globalize.load(
            require("../../node_modules/cldr-data/supplemental/currencyData"),
            require("../../node_modules/cldr-data/supplemental/likelySubtags"),
            require("../../node_modules/cldr-data/supplemental/plurals"),
            require("../../node_modules/cldr-data/supplemental/timeData"),
            require("../../node_modules/cldr-data/supplemental/weekData"),
            require("../../node_modules/cldr-data/main/" + locale + "/ca-gregorian"),
            require("../../node_modules/cldr-data/main/" + locale + "/currencies"),
            require("../../node_modules/cldr-data/main/" + locale + "/dateFields"),
            require("../../node_modules/cldr-data/main/" + locale + "/numbers")
        );
        globalize.loadMessages(require("../../l10n/" + locale));
        globalize.locale(locale);

        locales[locale] = globalize;
        return globalize;
    });

    app.use(function (req, res, next) {
        var logger = locator.get('logger');

        var lang = req.acceptsLanguages(config['lang']['locales']);
        if (!lang)
            lang = config['lang']['default'];
        if (locator.get('locale') != lang)
            locator.register('locale', lang);

        var globalize = null;
        try {
            globalize = locator.get('globalize')(lang);
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
