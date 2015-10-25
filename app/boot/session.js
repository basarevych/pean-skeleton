/**
 * Session support
 */

'use strict'

var locator = require('node-service-locator');
var path = require('path');
var session = require('express-session');
var FileStore = require('session-file-store')(session);

module.exports = function () {
    var config = locator.get('config');
    if (!config['session']['enable'])
        return;

    var app = locator.get('app');
    var ttl = config['session']['ttl'];
    var store = undefined;

    if (app.get('env') != 'test') {
        store = new FileStore({
            path: path.join(__dirname, '..', '..', 'sessions'),
            ttl: ttl ? ttl : 24 * 60 * 60,  // time to live or one day, seconds
            retries: -1,                    // do not retry
        });
    }

    // session support

    app.use(session({
        name: config['session']['cookie'],  // cookie name
        resave: false,              // don't save session if unmodified
        saveUninitialized: false,   // don't create session until something stored
        unset: 'destroy',           // delete session from store on unset
        secret: config['session']['secret'],
        cookie: {
            maxAge: ttl ? ttl * 1000 : null,    // milliseconds or till browser closed
        },
        store: store,
    }));

    // define a custom res.message() method which stores messages in the session
    app.response.message = function (msg) {
        // reference `req.session` via the `this.req` reference
        var sess = this.req.session;
        // simply add the msg to an array for later
        sess.messages = sess.messages || [];
        sess.messages.push(msg);
        return this;
    };

    // expose the "messages" local variable when views are rendered
    app.use(function (req, res, next) {
        if (app.get('env') == 'test') { // override session when testing
            var mock = locator.get('session');
            if (mock) {
                for (var key in mock) {
                    if (mock.hasOwnProperty(key))
                        req.session[key] = mock[key];
                }
            }
        }

        var msgs = req.session.messages || [];

        // expose "messages" local variable
        res.locals.messages = msgs;

        // expose "hasMessages"
        res.locals.hasMessages = !! msgs.length;

        if (res.locals.hasMessages) {
            // empty or "flush" the messages so they don't build up
            req.session.messages = [];
            req.session.save(function () { next(); });
        } else {
            next();
        }
    });
};
