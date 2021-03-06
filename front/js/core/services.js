'use strict';

var services = angular.module('services', [
    'ngCookies',
    'ui.router',
    'ui.bootstrap',
    'globalizeWrapper',
    'api',
    'forms',
]);

services.factory('AppControl',
    [ '$window', '$rootScope', '$state', '$stateParams', '$timeout', '$http', '$cookies', 'globalizeWrapper', 'SocketServer', 'ProfileApi',
    function ($window, $rootScope, $state, $stateParams, $timeout, $http, $cookies, globalizeWrapper, SocketServer, ProfileApi) {
        var error = null;
        var token = null;
        var tokenStorageKey = 'Token-' + $window['config']['project'];
        var profile = {
            locale: {
                current: null,
                default: null,
                available: [],
            },
            authenticated: false,
            name: 'Anonymous',
            email: null,
            roles: [],
        };

        var initialized = false;
        var savedState = null;

        $rootScope.$on('GlobalizeLocaleChanged', function() {
            profile.locale.current = globalizeWrapper.getLocale();
            if (initialized)
                return $state.go($state.current.name, $stateParams, { reload: true });

            initialized = true;
            $rootScope.$broadcast('AppInitialized');

            var reload = null;
            if (savedState === null) {
                if ($state.current.name.length) {
                    reload = function () {
                        $state.go($state.current.name, $stateParams, { reload: true });
                    };
                }
            } else {
                var state = savedState;
                savedState = null;
                reload = function () {
                    $state.go(state.name, state.params, { reload: true });
                };
            }

            if (reload !== null)
                $timeout(reload);
        });
        $rootScope.$on('$stateChangeStart', function(event, toState, toStateParams) {
            if (!initialized) {
                savedState = { name: toState.name, params: toStateParams };
                event.preventDefault();
            }
        });

        return {
            isError: function () {
                return error !== null;
            },
            setError: function (code) {
                error = code;
                if (error) {
                    $('#view-wrapper').addClass('forced-hide');
                    $('#error-wrapper').removeClass('forced-hide');
                } else {
                    $('#error-wrapper').addClass('forced-hide');
                    $('#view-wrapper').removeClass('forced-hide');
                }
            },
            getError: function () {
                return error;
            },
            hasToken: function () {
                return token !== null;
            },
            getToken: function () {
                return token;
            },
            setToken: function (newToken) {
                token = newToken;
                localStorage.setItem(tokenStorageKey, token);

                var socket = SocketServer.getSocket();
                if (socket.emit)
                    socket.emit('token', token);

                $http.defaults.headers.common['Authorization'] = 'Bearer ' + token;
                $.ajaxSetup({
                    headers: { 'Authorization': 'Bearer ' + token },
                    error: function (data) {
                        if (data.status == 401) {
                            localStorage.removeItem(tokenStorageKey);
                            $window.location.reload();
                        }
                    }
                });
            },
            removeToken: function () {
                token = null;
                localStorage.removeItem(tokenStorageKey);
                $http.defaults.headers.common['Authorization'] = undefined;
                $.ajaxSetup({
                    headers: { 'Authorization': undefined },
                    error: undefined,
                });
            },
            isAllowed: function (stateName) {
                var state = $state.get(stateName);
                if (!state)
                    return false;

                if (angular.isUndefined(state.roles))
                    return true;

                var allowed = false;
                $.each(this.getProfile().roles, function (index, value) {
                    if (state.roles.indexOf(value) !== -1)
                        allowed = true;
                });
                return allowed;
            },
            aclCheckCurrentState: function () {
                var stateName = $state.current.name;
                if (!this.isAllowed(stateName)) {
                    this.setError('ACL');
                    return false;
                }
                if (this.getError() == 'ACL')
                    this.setError(null);
                return true;
            },
            getProfile: function () {
                return profile;
            },
            setProfile: function (newProfile) {
                profile = newProfile;
            },
            loadProfile: function () {
                var locale = $cookies.get('locale');
                if (typeof locale == 'undefined')
                    $http.defaults.headers.common['Accept-Language'] = undefined;
                else
                    $http.defaults.headers.common['Accept-Language'] = locale.replace('_', '-');

                var me = this;
                ProfileApi.read()
                    .then(function (data) {
                        profile = data;
                        if (!profile.authenticated && me.hasToken()) {
                            me.removeToken();
                            return $window.location.reload();
                        }

                        if (initialized) {
                            if (globalizeWrapper.getLocale() != profile.locale.current)
                                globalizeWrapper.setLocale(profile.locale.current);
                            else if ($state.current.name.length)
                                $state.go($state.current.name, $stateParams, { reload: true });
                        } else {
                            if (data.locale.available.indexOf(locale) == -1)
                                $cookies.remove('locale');

                            var locales = [ data.locale.current.substr(0, 2) ];
                            data.locale.available.forEach(function (locale) {
                                var code = locale.substr(0, 2);
                                if (locales.indexOf(code) == -1)
                                    locales.push(code);
                            });
                            globalizeWrapper.loadLocales(locales);
                        }
                    });
            },
            init: function () {
                if (typeof $window['config'] == 'undefined') {
                    this.setError('CONFIG');
                    return;
                }

                var storedToken = localStorage.getItem(tokenStorageKey);
                if (storedToken !== null)
                    this.setToken(storedToken);

                this.loadProfile();
            },
        };
    } ]
);

services.factory('SocketServer',
    [ '$rootScope', '$filter', '$http', '$window',
    function ($rootScope, $filter, $http, $window) {
        var socket = null;
        var connected = false;
        var buildTag;

        function onConnect() {
            connected = true;
            if (!$rootScope.$$phase)
                $rootScope.$digest();

            if ($rootScope.appControl.hasToken())
                socket.emit('token', $rootScope.appControl.getToken());

            $http({
                method: 'GET',
                url: '/build.tag.txt',
            }).then(function success(response) {
                var newTag = response.data.trim();
                if (newTag.length) {
                    if (buildTag && buildTag != newTag)
                        $window.location.reload();
                    buildTag = newTag;
                }
            });
        }

        function onDisconnect() {
            connected = false;
            if (!$rootScope.$$phase)
                $rootScope.$digest();
        }

        function onNotification(message) {
            new PNotify({
                icon: message.icon && $filter('glMessage')(message.icon, message.variables),
                title: message.title && $filter('glMessage')(message.title, message.variables),
                text: $filter('glMessage')(message.text, message.variables),
                mouse_reset: false,
            });
        }

        socket = io.connect();
        socket.on('connect', onConnect);
        socket.on('disconnect', onDisconnect);
        socket.on('notification', onNotification);

        return {
            getConnected: function () {
                return connected;
            },
            getSocket: function () {
                return socket;
            },
        };
    } ]
);

services.factory('PasswordGenerator',
    [ function () {
        return {
            get: function(length) {
                var text = "";
                var chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789";
                for (var i = 0; i < length; i++ )
                    text += chars.charAt(Math.floor(Math.random() * chars.length));
                return text;
            },
        };
    } ]
);
