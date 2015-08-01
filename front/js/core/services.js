'use strict';

var services = angular.module('services', []);

services.factory('AppControl',
    [ '$window', '$rootScope', '$state', '$stateParams', '$timeout', '$http', '$cookies', 'globalizeWrapper', 'ProfileApi',
    function ($window, $rootScope, $state, $stateParams, $timeout, $http, $cookies, globalizeWrapper, ProfileApi) {
        var error = null;
        var token = null;
        var tokenStorageKey = 'Token-' + $window['config']['apiUrl'];
        var profile = {
            locale: {
                current: null,
                fallback: null,
                available: [],
            },
            login: 'anonymous',
            roles: [],
        };

        var initialized = false;
        var savedState = null;
        var profileLoaded = false;
        var globalizeLoaded = false;

        function sendInitBroadcast() {
            if (initialized)
                return;

            if (!profileLoaded || !globalizeLoaded)
                return;

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
        };

        $rootScope.$on('GlobalizeLoadSuccess', function() {
            globalizeLoaded = true;
            sendInitBroadcast();
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
            },
            getError: function () {
                return error;
            },
            isReady: function () {
                return initialized;
            },
            hasToken: function () {
                return token !== null;
            },
            setToken: function (newToken) {
                token = newToken;
                localStorage.setItem(tokenStorageKey, token);
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
            loadProfile: function (done) {
                var locale = $cookies.get('locale');
                if (typeof locale == 'undefined')
                    $http.defaults.headers.common['Accept-Language'] = undefined;
                else
                    $http.defaults.headers.common['Accept-Language'] = locale.replace('_', '-');

                ProfileApi.readList({})
                    .then(function (data) {
                        profileLoaded = true;

                        if (!angular.equals(profile, data)) {
                            profile = data;
                            globalizeWrapper.setLocale(profile.locale.current.substr(0, 2));
                        }

                        if (done)
                            done();
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

                this.loadProfile(sendInitBroadcast);
            },
        };
    } ]
);
