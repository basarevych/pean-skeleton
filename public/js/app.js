/* pean-skeleton - v0.0.0 - 2015-10-11 */

'use strict';

var app = angular.module('app', [
    'ngResource',               // Angular HTTP $resource
    'ngCookies',                // Angular Cookie support
    'ngAnimate',                // Angular Animations
    'angular-loading-bar',      // Loading spinner
    'globalizeWrapper',         // jQuery.Globalize wrapper
    'ui.router',                // AngularUI Router
    'ui.bootstrap',             // AngularUI Bootstrap
    'dynamicTable',             // DynamicTable
    'hljs',                     // HighlightJS
    'api',
    'services',
    'directives',
    'filters',
    'forms',
    'state.layout',
    'state.index',
    'state.user-list',
    'state.token-list',
]);

app.config(
    [ '$stateProvider', '$urlRouterProvider',
    function ($stateProvider, $urlRouterProvider) {
        $stateProvider
            .state('layout', {
                abstract: true,
                controller: 'LayoutCtrl',
                templateUrl: 'views/layout.html',
            })
            .state('layout.index', {
                url: '/',
                title: 'APP_TITLE',
                controller: 'IndexCtrl',
                templateUrl: 'views/index.html',
            })
            .state('layout.user-list', {
                url: '/user',
                title: 'APP_TITLE',
                controller: 'UserListCtrl',
                templateUrl: 'views/user-list.html',
                roles: [ 'admin' ],
            })
            .state('layout.token-list', {
                url: '/user/:userId/token',
                title: 'APP_TITLE',
                controller: 'TokenListCtrl',
                templateUrl: 'views/token-list.html',
                roles: [ 'admin' ],
            });

        $urlRouterProvider
            .otherwise('/');
    } ]
);

app.config(
    [ 'globalizeWrapperProvider',
    function (globalizeWrapperProvider) {
        globalizeWrapperProvider.setCldrBasePath('cldr');
        globalizeWrapperProvider.setL10nBasePath('l10n');
    } ]
);

app.config(
    [ 'dynamicTableProvider',
    function (dynamicTableProvider) {
        dynamicTableProvider.setTranslationFilter('glMessage');
    } ]
);

app.config(
    [ 'hljsServiceProvider',
    function (hljsServiceProvider) {
        hljsServiceProvider.setOptions({
            tabReplace: '    ',
        });
    } ]
);

app.run(
    [ '$rootScope', '$window', '$state', '$stateParams', '$filter', '$timeout', 'AppControl', 'Socket', 'LoginForm',
    function ($rootScope, $window, $state, $stateParams, $filter, $timeout, AppControl, Socket, LoginForm) {
        PNotify.prototype.options.styling = "bootstrap3";

        $rootScope.appControl = AppControl;
        $rootScope.socket = Socket;
        $rootScope.$state = $state;
        $rootScope.$stateParams = $stateParams;
        $rootScope.pageTitle = 'Loading...',
        $rootScope.initialized = false;

        $rootScope.login = function () {
            LoginForm()
                .then(function (data) {
                    AppControl.setToken(data.token);
                    AppControl.loadProfile(function () {
                        $state.go($state.current.name, $stateParams, { reload: true });
                    });
                });
        };

        $rootScope.$on('$stateChangeSuccess', function (event, toState) {
            $rootScope.pageTitle = $filter('glMessage')(toState.title);
        });
        $rootScope.$on('AppInitialized', function () {
            $timeout(function () { $rootScope.initialized = true; }, 101);
        });

        Socket.init();
        AppControl.init();
    } ]
);

'use strict';

var api = angular.module('api', [
    'ngResource',
]);

api.factory('ResourceWrapper',
    [ '$rootScope', '$q', '$window', 'InfoDialog',
    function ($rootScope, $q, $window, InfoDialog) {
        return function (promise, noErrorHandler) {
            var deferred = $q.defer();

            promise
                .then(function (data) {
                    deferred.resolve(data);
                })
                .catch(function (data) {
                    deferred.reject({ error: 'http', code: data.status });

                    if (noErrorHandler === true) {
                        return;
                    } else if (data.status == 401) {
                        if ($rootScope.appControl.hasToken())
                            $rootScope.appControl.removeToken();
                        $window.location.reload();
                        return;
                    } else if (data.status == 403) {
                        InfoDialog({
                            title: 'ERROR_API_DENIED_TITLE',
                            text: 'ERROR_API_DENIED_TEXT'
                        });
                        return;
                    }

                    InfoDialog({
                        title: 'ERROR_API_GENERIC_TITLE',
                        text: 'ERROR_API_GENERIC_TEXT'
                    });
                });

            return deferred.promise;
        };
    } ]
);
 
api.factory('ProfileApi',
    [ '$resource', '$window', 'ResourceWrapper',
    function ($resource, $window, ResourceWrapper) {
        var resource = $resource($window['config']['apiUrl'] + '/profile/:action', { }, {
            readList:   { method: 'GET', isArray: false },
            updateList: { method: 'PUT', isArray: false },
            validate:   { method: 'POST', params: { action: 'validate' }, isArray: false }
        });

        return {
            readList: function (params, noErrorHandler) {
                return ResourceWrapper(resource.readList(params).$promise, noErrorHandler);
            },
            updateList: function (params, noErrorHandler) {
                return ResourceWrapper(resource.updateList(params).$promise, noErrorHandler);
            },
            validate: function (params, noErrorHandler) {
                return ResourceWrapper(resource.validate(params).$promise, noErrorHandler);
            },
        };
    } ]
);

api.factory('AuthApi',
    [ '$resource', '$window', 'ResourceWrapper',
    function ($resource, $window, ResourceWrapper) {
        var resource = $resource($window['config']['apiUrl'] + '/auth/:action', { }, {
            token:      { method: 'POST', params: { action: 'token' }, isArray: false },
            validate:   { method: 'POST', params: { action: 'validate' }, isArray: false }
        });

        return {
            token: function (params, noErrorHandler) {
                return ResourceWrapper(resource.token(params).$promise, noErrorHandler);
            },
            validate: function (params, noErrorHandler) {
                return ResourceWrapper(resource.validate(params).$promise, noErrorHandler);
            },
        };
    } ]
);

api.factory('TokenApi',
    [ '$resource', '$window', 'ResourceWrapper',
    function ($resource, $window, ResourceWrapper) {
        var resource = $resource($window['config']['apiUrl'] + '/token/:id/:action', { }, {
            read:       { method: 'GET', params: { id: '@id' }, isArray: false },
        });

        return {
            read: function (params, noErrorHandler) {
                return ResourceWrapper(resource.read(params).$promise, noErrorHandler);
            },
        };
    } ]
);

'use strict';

var directives = angular.module('directives', []);

directives.directive('aclSref',
    [ 'AppControl',
    function (AppControl) {
        return {
            link: function (scope, element, attrs) {
                var states = attrs.aclSref.split(' ');
                var check = function () {
                    var allowed = false;
                    angular.forEach(states, function (value) {
                        if (AppControl.isAllowed(value))
                            allowed = true;
                    });

                    if (allowed)
                        element.show();
                    else
                        element.hide();
                };

                check();
            }
        };
    } ]
);

directives.directive('onKeyEnter',
    [ function () {
        return {
            restrict: 'A',
            link: function(scope, element, attrs, ngModelCtrl) {
                element.bind('keypress', function(event) {
                    if (event.keyCode === 13) {
                        event.preventDefault();
                        scope.$apply(function () {
                            scope.$eval(attrs.onKeyEnter);
                        });
                    }
                });
            }
        };
    } ]
);

directives.directive('focusOn',
    [ '$parse', '$timeout',
    function ($parse, $timeout) {
        return {
            restrict: 'A',
            link: function (scope, element, attrs) {
                var model = $parse(attrs.focusOn);
                scope.$watch(model, function (value) {
                    if (value === true) {
                        $timeout(function() {
                            element.focus();
                            scope.$apply(model.assign(scope, false));
                        });
                    }
                });
            }
        };
    } ]
);

directives.directive('sidebar',
    [ function () {
        return {
            link: function(scope, element, attrs) {
                var win = $(window), edge = attrs.sidebar;
                var sizes = ['xs', 'sm', 'md', 'lg'];

                var onResize = function() {
                    element.css({ position: 'fixed' });

                    var bottom = element.position().top + element.outerHeight(true),
                        position = win.height() < bottom ? 'static' : undefined;

                    if (angular.isUndefined(position)) {
                        var current;
                        for (var i = sizes.length - 1; i >= 0; i--) {
                            var test = $('<div></div>');
                            test.addClass('hidden-' + sizes[i]).appendTo($('body'));
                            var visible = test.is(':visible');
                            test.remove();

                            if (!visible) {
                                current = sizes[i];
                                break;
                            }
                        };

                        if (angular.isDefined(current))
                            position = sizes.indexOf(edge) > sizes.indexOf(current) ? 'static' : 'fixed';
                    }

                    if (angular.isDefined(position))
                        element.css({ position: position });

                    element.css({ width: element.parent().width() });
                };

                win.bind('resize', onResize);
                onResize();
            }
        };
    } ]
);

'use strict';

var filters = angular.module('filters', []);

'use strict';

var forms = angular.module('forms', []);

forms.factory('InfoDialog',
    [ '$modal', 'globalizeWrapper',
    function ($modal, globalizeWrapper) {
        var isOpened = false;

        var ModalCtrl = function ($scope, $modalInstance, title, text, yes, variables) {
            $scope.title = title;
            $scope.text = text;
            $scope.yes = yes;
            $scope.variables = variables;
            $scope.globalizeReady = (globalizeWrapper.getLocale() != null);
        };

        return function (params) {
            if (isOpened)
                return null;

            isOpened = true;
            var modal = $modal.open({
                controller: ModalCtrl,
                templateUrl: 'modals/info-dialog.html',
                resolve: {
                    title: function () { return params.title; },
                    text: function () { return angular.isArray(params.text) ? params.text : [params.text]; },
                    yes: function () { return angular.isDefined(params.yes) ? params.yes : ''; },
                    variables: function () { return angular.isDefined(params.variables) ? params.variables : {}; },
                }
            });
            modal.result.finally(function () { isOpened = false; });
            return modal;
        }
    } ]
);

forms.factory('ModalFormCtrl',
    [ '$timeout', '$filter',
    function ($timeout, $filter) {
        return function ($scope, $modalInstance, model, validator, submitter) {
            $scope.model = model;
            $scope.validation = { errors: [], fields: {} }; 
            $scope.processing = false;

            var resetFocus = function () {
                var errorFound = false;
                $.each($scope.model, function (key, value) {
                    var messages = $scope.validation.fields[key];
                    if (angular.isDefined(messages) && messages.length) {
                        $scope.model[key].focus = true;
                        errorFound = true;
                        return false;
                    }
                });

                if (!errorFound) {
                    $.each($scope.model, function (key, value) {
                        if (angular.isObject($scope.model[key]) && angular.isDefined($scope.model[key]['focus'])) {
                            $scope.model[key].focus = true;
                            return false;
                        }
                    });
                }
            };

            $scope.resetValidation = function (name) {
                if (angular.isDefined(name)) {
                    $scope.validation.fields[name] = undefined;
                } else {
                    $scope.validation.errors = [];
                    $scope.validation.fields = {};
                }
            };

            $scope.setValidationError = function (name, error) {
                if (angular.isUndefined($scope.validation.fields[name]))
                    $scope.validation.fields[name] = [];
                if ($.inArray(error, $scope.validation.fields[name]) == -1)
                    $scope.validation.fields[name].push(error);
            };

            $scope.validate = function (name) {
                if ($scope.processing)
                    return;
                if (!$('.modal').is(':visible'))
                    return;
                if (angular.isUndefined(validator))
                    return;

                var params = {
                    field: name,
                    form: {},
                };
                $.each($scope.model, function (key, item) {
                    if (angular.isObject(item) && angular.isDefined(item['value']))
                        params.form[key] = item.value;
                });

                validator(params)
                    .then(function (data) {
                        if (data.valid)
                            return;

                        $.each(data.errors, function (index, value) {
                            $scope.setValidationError(name, value);
                        });
                    });
            };

            $scope.submit = function () {
                $scope.processing = true;

                $scope.resetValidation();
                if (angular.isUndefined(submitter)) {
                    $scope.processing = false;
                    return;
                }

                var params = {};
                $.each($scope.model, function (key, item) {
                    if (angular.isObject(item) && angular.isDefined(item['value']))
                        params[key] = item.value;
                });

                submitter(params)
                    .then(function (data) {
                        if (data.valid) {
                            $scope.$close(data);
                            return;
                        }

                        $scope.validation.errors = data.errors;
                        $scope.validation.fields = data.fields;

                        resetFocus();
                    })
                    .finally(function () {
                        $scope.processing = false;
                    });
            };
        };
    } ]
);

forms.factory('LoginForm',
    [ '$modal', '$filter', 'ModalFormCtrl', 'AuthApi',
    function ($modal, $filter, ModalFormCtrl, AuthApi) {
        return function () {
            return $modal.open({
                controller: ModalFormCtrl,
                templateUrl: 'modals/login.html',
                resolve: {
                    model: function () {
                        return {
                            email: { value: '', focus: true },
                            password: { value: '', focus: false },
                        };
                    },
                    validator: function () { return AuthApi.validate; },
                    submitter: function () { return AuthApi.token; },
                }
            }).result;
        }
    } ]
);

forms.factory('ProfileForm',
    [ '$modal', '$filter', 'ModalFormCtrl', 'ProfileApi',
    function ($modal, $filter, ModalFormCtrl, ProfileApi) {
        return function (profile) {
            return $modal.open({
                controller: ModalFormCtrl,
                templateUrl: 'modals/profile.html',
                resolve: {
                    model: function () {
                        return {
                            name: { value: profile.name, focus: true },
                            email: { value: profile.email, focus: false },
                            new_password: { value: '', focus: false },
                            retyped_password: { value: '', focus: false },
                        };
                    },
                    validator: function () { return ProfileApi.validate; },
                    submitter: function () { return ProfileApi.updateList; },
                }
            }).result;
        }
    } ]
);

forms.factory('TokenPayloadForm',
    [ '$modal', '$filter', 'ModalFormCtrl',
    function ($modal, $filter, ModalFormCtrl) {
        return function (payload) {
            return $modal.open({
                controller: ModalFormCtrl,
                templateUrl: 'modals/token-payload.html',
                resolve: {
                    model: function () {
                        return {
                            payload: { value: payload, focus: false },
                        };
                    },
                    validator: function () { return null },
                    submitter: function () { return null },
                }
            }).result;
        }
    } ]
);

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
            user_id: null,
            name: 'Anonymous',
            email: null,
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

                var me = this;
                ProfileApi.readList({})
                    .then(function (data) {
                        if (!angular.equals(profile, data)) {
                            profile = data;
                            globalizeWrapper.setLocale(profile.locale.current.substr(0, 2));
                        }

                        if (!profile.user_id && me.hasToken())
                            me.removeToken();

                        profileLoaded = true;
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

services.factory('Socket',
    [ '$rootScope', '$filter',
    function ($rootScope, $filter) {
        var socket = null;
        var connected = false;

        function onConnect() {
            connected = true;
            if (!$rootScope.$$phase)
                $rootScope.$digest();
        }

        function onDisconnect() {
            connected = false;
            if (!$rootScope.$$phase)
                $rootScope.$digest();
        }

        function onNotification(message) {
            var variables = JSON.parse(message.variables);
            new PNotify({
                icon: message.icon,
                title: message.title && $filter('glMessage')(message.title, variables),
                text: $filter('glMessage')(message.text, variables),
                desktop: {
                    desktop: true
                },
            });
        }

        return {
            getConnected: function () {
                return connected;
            },
            init: function () {
                socket = io.connect();
                socket.on('connect', onConnect);
                socket.on('reconnect', onConnect);
                socket.on('disconnect', onDisconnect);
                socket.on('notification', onNotification);
            },
        };
    } ]
);

'use strict';

var module = angular.module('state.index', []);

module.controller("IndexCtrl",
    [ '$scope',
    function ($scope) {
        if (!$scope.appControl.aclCheckCurrentState())
            return; // Disable this controller
    } ]
);

'use strict';

var module = angular.module('state.layout', []);

module.controller("LayoutCtrl",
    [ '$scope', '$state', '$stateParams', '$cookies', '$window', 'ProfileForm',
    function ($scope, $state, $stateParams, $cookies, $window, ProfileForm) {
        $scope.locale = $scope.appControl.getProfile().locale;
        $scope.locale.cookie = $cookies.get('locale');

        $scope.setLocale = function (locale) {
            if (locale === null)
                $cookies.remove('locale');
            else
                $cookies.put('locale', locale);

            $scope.appControl.loadProfile(function () {
                $state.go($state.current.name, $stateParams, { reload: true });
            });
        };

        $scope.changeProfile = function () {
            ProfileForm($scope.appControl.getProfile())
                .then(function () {
                    $scope.appControl.loadProfile(function () {
//                        $state.go($state.current.name, $stateParams, { reload: true });
                    });
                });
        };

        $scope.logout = function () {
            $scope.appControl.removeToken();
            $scope.appControl.loadProfile(function () {
                $state.go($state.current.name, $stateParams, { reload: true });
            });
        };
    } ]
);

'use strict';

var module = angular.module('state.token-list', []);

module.controller("TokenListCtrl",
    [ '$scope', '$window', '$filter', 'dynamicTable', 'TokenApi', 'TokenPayloadForm',
    function ($scope, $window, $filter, dynamicTable, TokenApi, TokenPayloadForm) {
        if (!$scope.appControl.aclCheckCurrentState())
            return; // Disable this controller

        var urlParam = "?user_id=" + $scope.$stateParams.userId;

        $scope.hasSelection = false;
        $scope.hasSingleSelection = false;
        $scope.tableCtrl = dynamicTable({
            url: $window['config']['apiUrl'] + '/token/table' + urlParam,
            row_id_column: 'id',
            sort_column: 'id',
            mapper: function (row) {
                if (row['created_at'] != null) {
                    var m = moment.unix(row['created_at']).local();
                    row['created_at'] = m.format($filter('glMessage')('DT_DATE_TIME_FORMAT'));
                }

                if (row['updated_at'] != null) {
                    var m = moment.unix(row['updated_at']).local();
                    row['updated_at'] = m.format($filter('glMessage')('DT_DATE_TIME_FORMAT'));
                }

                return row;
            },
        });

        $scope.viewPayload = function () {
            var sel = $scope.tableCtrl.plugin.getSelected();
            TokenApi.read({ id: sel[0] })
                .then(function (data) {
                    TokenPayloadForm(data.payload);
                });
        };

        $scope.$watch('tableCtrl.event', function () {
            $scope.tableCtrl.event = null;
            if ($scope.tableCtrl.plugin == null)
                return;

            var sel = $scope.tableCtrl.plugin.getSelected();
            $scope.hasSelection = (sel == 'all' || sel.length);
            $scope.hasSingleSelection = (sel != 'all' && sel.length == 1);
        });
    } ]
);

'use strict';

var module = angular.module('state.user-list', []);

module.controller("UserListCtrl",
    [ '$scope', '$window', '$filter', 'dynamicTable',
    function ($scope, $window, $filter, dynamicTable) {
        if (!$scope.appControl.aclCheckCurrentState())
            return; // Disable this controller

        $scope.hasSelection = false;
        $scope.hasSingleSelection = false;
        $scope.tableCtrl = dynamicTable({
            url: $window['config']['apiUrl'] + '/user/table',
            row_id_column: 'id',
            sort_column: 'id',
            mapper: function (row) {
                if (row['created_at'] != null) {
                    var m = moment.unix(row['created_at']).local();
                    row['created_at'] = m.format($filter('glMessage')('DT_DATE_TIME_FORMAT'));
                }

                if (row['tokens'] > 0)
                    row['tokens'] = '<a href="/#/user/' + row['id'] + '/token">' + row['tokens'] + '</a>'

                return row;
            },
        });

        $scope.$watch('tableCtrl.event', function () {
            $scope.tableCtrl.event = null;
            if ($scope.tableCtrl.plugin == null)
                return;

            var sel = $scope.tableCtrl.plugin.getSelected();
            $scope.hasSelection = (sel == 'all' || sel.length);
            $scope.hasSingleSelection = (sel != 'all' && sel.length == 1);
        });
    } ]
);
