/**
 * Initialize translations
 */

'use strict';

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

    // Create Globalize wrapper in res.locals
    app.use(function (req, res, next) {
        var logger = locator.get('logger');

        var lang = null;
        if (req.cookies)
            lang = config['lang']['locales'].indexOf(req.cookies.locale) == -1 ? null : req.cookies.locale;
        if (!lang)
            lang = req.acceptsLanguages(config['lang']['locales']);
        if (!lang)
            lang = config['lang']['default'];
        if (locator.get('locale') != lang)
            locator.register('locale', lang);

        // add translation helpers

        /**
         * Globalize formatDate wrapper
         *
         * @param {string} input                Translation key
         * @param {object} params               Parameters
         * @param {string} [locale]             Use non-default locale
         * @return {string}                     Returns translation
         */
        res.locals.glDate = function (input, params, locale) {
            if (!locale)
                locale = lang;
            var output = input;

            try {
                globalize.locale(locale);
            } catch (err) {
                logger.warn('globalize.locale', err);
            }

            try {
                output = globalize.formatDate(input, params);
            } catch (err) {
                logger.warn('globalize.formatDate', err);
            }
            return output;
        };

        /**
         * Globalize formatMessage wrapper
         *
         * @param {string} input                Translation key
         * @param {object} [params]             Parameters
         * @param {string} [locale]             Use non-default locale
         * @return {string}                     Returns translation
         */
        res.locals.glMessage = function (input) {
            var params = {}, locale = lang, output = input;
            if (arguments.length == 3) {
                params = arguments[1];
                locale = arguments[2];
            } else if (arguments.length == 2) {
                if (typeof arguments[1] == 'object')
                    params = arguments[1];
                else
                    locale = arguments[1];
            } else if (arguments.length != 1) {
                throw new Error('Invalid parameters to glMessage');
            }

            try {
                globalize.locale(locale);
            } catch (err) {
                logger.warn('globalize.locale', err);
            }

            try {
                output = globalize.formatMessage(input, params);
            } catch (err) {
                logger.warn('globalize.formatMessage', err);
            }
            return output;
        };

        /**
         * Globalize formatNumber wrapper
         *
         * @param {string} input                Translation key
         * @param {object} [params]             Parameters
         * @param {string} [locale]             Use non-default locale
         * @return {string}                     Returns translation
         */
        res.locals.glNumber = function (input) {
            var params = {}, locale = lang, output = input;
            if (arguments.length == 3) {
                params = arguments[1];
                locale = arguments[2];
            } else if (arguments.length == 2) {
                if (typeof arguments[1] == 'object')
                    params = arguments[1];
                else
                    locale = arguments[1];
            } else if (arguments.length != 1) {
                throw new Error('Invalid parameters to glNumber');
            }

            try {
                globalize.locale(locale);
            } catch (err) {
                logger.warn('globalize.locale', err);
            }

            try {
                output = globalize.formatNumber(input, params);
            } catch (err) {
                logger.warn('globalize.formatNumber', err);
            }
            return output;
        };

        /**
         * Globalize formatNumber wrapper
         *
         * @param {string} input                Translation key
         * @param {string} currency             Currency name
         * @param {object} [params]             Parameters
         * @param {string} [locale]             Use non-default locale
         * @return {string}                     Returns translation
         */
        res.locals.glCurrency = function (input, currency) {
            var params = {}, locale = lang, output = input;
            if (arguments.length == 4) {
                params = arguments[2];
                locale = arguments[3];
            } else if (arguments.length == 3) {
                if (typeof arguments[2] == 'object')
                    params = arguments[2];
                else
                    locale = arguments[2];
            } else if (arguments.length != 2) {
                throw new Error('Invalid parameters to glCurrency');
            }

            try {
                globalize.locale(locale);
            } catch (err) {
                logger.warn('globalize.locale', err);
            }

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
