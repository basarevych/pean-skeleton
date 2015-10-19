/* pean-skeleton - v0.0.0 - 2015-10-19 */

'use strict';

var app = angular.module('app', [
    'ngResource',               // Angular HTTP $resource
    'ngCookies',                // Angular Cookie support
    'ngAnimate',                // Angular Animations
    'angular-loading-bar',      // Loading spinner
    'globalizeWrapper',         // jQuery.Globalize wrapper
    'ui.router',                // AngularUI Router
    'ui.bootstrap',             // AngularUI Bootstrap
    'ui.tree',                  // AngularUI Tree
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
    'state.send-notification',
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
            })
            .state('layout.send-notification', {
                url: '/notify',
                title: 'APP_TITLE',
                controller: 'SendNotificationCtrl',
                templateUrl: 'views/send-notification.html',
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
 
api.factory('AuthApi',
    [ '$resource', '$window', 'ResourceWrapper',
    function ($resource, $window, ResourceWrapper) {
        var resource = $resource($window['config']['apiUrl'] + '/auth/:action', { }, {
            token:      { method: 'POST', params: { action: 'token' }, isArray: false },
            validate:   { method: 'POST', params: { action: 'validate' }, isArray: false },
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

api.factory('ProfileApi',
    [ '$resource', '$window', 'ResourceWrapper',
    function ($resource, $window, ResourceWrapper) {
        var resource = $resource($window['config']['apiUrl'] + '/profile/:action', { }, {
            read:       { method: 'GET', isArray: false },
            update:     { method: 'PUT', isArray: false },
            validate:   { method: 'POST', params: { action: 'validate' }, isArray: false },
        });

        return {
            read: function (params, noErrorHandler) {
                return ResourceWrapper(resource.read(params).$promise, noErrorHandler);
            },
            update: function (params, noErrorHandler) {
                return ResourceWrapper(resource.update(params).$promise, noErrorHandler);
            },
            validate: function (params, noErrorHandler) {
                return ResourceWrapper(resource.validate(params).$promise, noErrorHandler);
            },
        };
    } ]
);

api.factory('RoleApi',
    [ '$resource', '$window', 'ResourceWrapper',
    function ($resource, $window, ResourceWrapper) {
        var resource = $resource($window['config']['apiUrl'] + '/role/:id/:action', { }, {
            list:       { method: 'GET', isArray: true },
            create:     { method: 'POST', isArray: false },
            read:       { method: 'GET', params: { id: '@id' }, isArray: false },
            update:     { method: 'PUT', params: { id: '@id' }, isArray: false },
            delete:     { method: 'DELETE', params: { id: '@id' }, isArray: false },
            validate:   { method: 'POST', params: { action: 'validate' }, isArray: false },
        });

        return {
            list: function (params, noErrorHandler) {
                return ResourceWrapper(resource.list(params).$promise, noErrorHandler);
            },
            create: function (params, noErrorHandler) {
                return ResourceWrapper(resource.create(params).$promise, noErrorHandler);
            },
            read: function (params, noErrorHandler) {
                return ResourceWrapper(resource.read(params).$promise, noErrorHandler);
            },
            update: function (params, noErrorHandler) {
                return ResourceWrapper(resource.update(params).$promise, noErrorHandler);
            },
            delete: function (params, noErrorHandler) {
                return ResourceWrapper(resource.delete(params).$promise, noErrorHandler);
            },
            validate: function (params, noErrorHandler) {
                return ResourceWrapper(resource.validate(params).$promise, noErrorHandler);
            },
        };
    } ]
);

api.factory('UserApi',
    [ '$resource', '$window', 'ResourceWrapper',
    function ($resource, $window, ResourceWrapper) {
        var resource = $resource($window['config']['apiUrl'] + '/user/:id/:action', { }, {
            list:       { method: 'GET', isArray: true },
            create:     { method: 'POST', isArray: false },
            read:       { method: 'GET', params: { id: '@id' }, isArray: false },
            update:     { method: 'PUT', params: { id: '@id' }, isArray: false },
            delete:     { method: 'DELETE', params: { id: '@id' }, isArray: false },
            validate:   { method: 'POST', params: { action: 'validate' }, isArray: false },
        });

        return {
            list: function (params, noErrorHandler) {
                return ResourceWrapper(resource.list(params).$promise, noErrorHandler);
            },
            create: function (params, noErrorHandler) {
                return ResourceWrapper(resource.create(params).$promise, noErrorHandler);
            },
            read: function (params, noErrorHandler) {
                return ResourceWrapper(resource.read(params).$promise, noErrorHandler);
            },
            update: function (params, noErrorHandler) {
                return ResourceWrapper(resource.update(params).$promise, noErrorHandler);
            },
            delete: function (params, noErrorHandler) {
                return ResourceWrapper(resource.delete(params).$promise, noErrorHandler);
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
        var resource = $resource($window['config']['apiUrl'] + '/token/:id', { }, {
            list:       { method: 'GET', isArray: true },
            read:       { method: 'GET', params: { id: '@id' }, isArray: false },
            delete:     { method: 'DELETE', params: { id: '@id' }, isArray: false },
        });

        return {
            list: function (params, noErrorHandler) {
                return ResourceWrapper(resource.list(params).$promise, noErrorHandler);
            },
            read: function (params, noErrorHandler) {
                return ResourceWrapper(resource.read(params).$promise, noErrorHandler);
            },
            delete: function (params, noErrorHandler) {
                return ResourceWrapper(resource.delete(params).$promise, noErrorHandler);
            },
        };
    } ]
);

api.factory('NotificationApi',
    [ '$resource', '$window', 'ResourceWrapper',
    function ($resource, $window, ResourceWrapper) {
        var resource = $resource($window['config']['apiUrl'] + '/notification', { }, {
            create:     { method: 'POST', isArray: false },
        });

        return {
            create: function (params, noErrorHandler) {
                return ResourceWrapper(resource.create(params).$promise, noErrorHandler);
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
                            element.focus().select();
                            if (typeof model.assign == 'function')
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

forms.factory('ValidationCtrl',
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
                $timeout(function () {
                    if ($scope.processing)
                        return;
                    if (!$('.modal').is(':visible'))
                        return;
                    if (angular.isUndefined(validator))
                        return;

                    var params = {};
                    $.each($scope.model, function (key, item) {
                        if (angular.isObject(item) && angular.isDefined(item['value']))
                            params[key] = item.value;
                    });
                    params['_field'] = name;

                    validator(params)
                        .then(function (data) {
                            if (data.success)
                                return;

                            if (angular.isDefined(data.errors)) {
                                $.each(data.errors, function (index, value) {
                                    $scope.setValidationError(name, value);
                                });
                            }
                        });
                }, 250);
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
                        if (data.success) {
                            if (typeof $scope['$close'] == 'function')
                                $scope.$close(data);
                            return;
                        }

                        if (angular.isDefined(data.errors))
                            $scope.validation.errors = data.errors;
                        if (angular.isDefined(data.fields))
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
    [ '$modal', '$filter', 'ValidationCtrl', 'AuthApi',
    function ($modal, $filter, ValidationCtrl, AuthApi) {
        return function () {
            return $modal.open({
                controller: ValidationCtrl,
                templateUrl: 'modals/login.html',
                resolve: {
                    model: function () {
                        return {
                            email: { value: '', focus: true, required: true },
                            password: { value: '', focus: false, required: true },
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
    [ '$modal', '$filter', 'ValidationCtrl', 'ProfileApi',
    function ($modal, $filter, ValidationCtrl, ProfileApi) {
        return function (profile) {
            return $modal.open({
                controller: ValidationCtrl,
                templateUrl: 'modals/profile.html',
                resolve: {
                    model: function () {
                        return {
                            name: { value: profile.name, focus: true, required: false },
                            email: { value: profile.email, focus: false, required: true },
                            new_password: { value: '', focus: false, required: false },
                            retyped_password: { value: '', focus: false, required: false },
                        };
                    },
                    validator: function () { return ProfileApi.validate; },
                    submitter: function () { return ProfileApi.update; },
                }
            }).result;
        }
    } ]
);

forms.factory('CreateUserForm',
    [ '$modal', '$filter', 'ValidationCtrl', 'UserApi', 'PasswordGenerator',
    function ($modal, $filter, ValidationCtrl, UserApi, PasswordGenerator) {
        return function (preselectedRoles, allRoles) {
            return $modal.open({
                controller: ValidationCtrl,
                templateUrl: 'modals/create-user.html',
                resolve: {
                    model: function () {
                        return {
                            name: { value: '', focus: true, required: false },
                            email: { value: '', focus: false, required: true },
                            password: { value: '', focus: false, required: true },
                            retyped_password: { value: '', focus: false, required: true },
                            roles: { tree: allRoles, value: preselectedRoles, focus: false, required: false },
                            updateRoles: function () {
                                var model = this.roles;

                                function parseRole(role) {
                                    if (role.checked)
                                        model.value.push(role.id);
                                    $.each(role.roles, function (index, role) { parseRole(role) });
                                }

                                model.value = [];
                                $.each(model.tree, function (index, role) { parseRole(role); });
                            },
                            password_type: 'specified',
                            generatePassword: function () {
                                var text = PasswordGenerator.get(8);
                                this.password_type = 'generated';
                                this.password.value = text;
                                this.retyped_password.value = text;
                            },
                            specifyPassword: function () {
                                this.password_type = 'specified';
                                this.password.value = "";
                                this.retyped_password.value = "";
                                this.password.focus = true;
                            },
                        };
                    },
                    validator: function () {
                        return function (params) {
                            params['_form_type'] = 'create';
                            return UserApi.validate(params);
                        };
                    },
                    submitter: function () { return UserApi.create; },
                }
            }).result;
        }
    } ]
);

forms.factory('EditUserForm',
    [ '$modal', '$filter', 'ValidationCtrl', 'UserApi', 'PasswordGenerator',
    function ($modal, $filter, ValidationCtrl, UserApi, PasswordGenerator) {
        return function (user, roles) {
            return $modal.open({
                controller: ValidationCtrl,
                templateUrl: 'modals/edit-user.html',
                resolve: {
                    model: function () {
                        return {
                            id: { value: user.id, focus: false, required: false },
                            name: { value: user.name, focus: true, required: false },
                            email: { value: '', focus: false, required: true },
                            password: { value: '', focus: false, required: false },
                            retyped_password: { value: '', focus: false, required: false },
                            roles: { tree: roles, value: user.roles, focus: false, required: false },
                            updateRoles: function () {
                                var model = this.roles;

                                function parseRole(role) {
                                    if (role.checked)
                                        model.value.push(role.id);
                                    $.each(role.roles, function (index, role) { parseRole(role) });
                                }

                                model.value = [];
                                $.each(model.tree, function (index, role) { parseRole(role); });
                            },
                            password_type: 'specified',
                            generatePassword: function () {
                                var text = PasswordGenerator.get(8);
                                this.password_type = 'generated';
                                this.password.value = text;
                                this.retyped_password.value = text;
                            },
                            specifyPassword: function () {
                                this.password_type = 'specified';
                                this.password.value = "";
                                this.retyped_password.value = "";
                                this.password.focus = true;
                            },
                            email_changed: false,
                            original_email: user.email,
                            changeEmail: function () {
                                this.email_changed = true;
                                this.email.value = this.original_email;
                                this.email.focus = true;
                            },
                            cancelEmail: function () {
                                this.email_changed = false;
                                this.email.value = "";
                            },
                        };
                    },
                    validator: function () {
                        return function (params) {
                            params['_form_type'] = 'edit';
                            return UserApi.validate(params);
                        };
                    },
                    submitter: function () { return UserApi.update; },
                }
            }).result;
        }
    } ]
);

forms.factory('TokenPayloadForm',
    [ '$modal', '$filter', 'ValidationCtrl',
    function ($modal, $filter, ValidationCtrl) {
        return function (payload) {
            return $modal.open({
                controller: ValidationCtrl,
                templateUrl: 'modals/token-payload.html',
                resolve: {
                    model: function () {
                        return {
                            payload: { value: payload, focus: false, required: false },
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
                ProfileApi.read()
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
                icon: message.icon && $filter('glMessage')(message.icon, variables),
                title: message.title && $filter('glMessage')(message.title, variables),
                text: $filter('glMessage')(message.text, variables),
                mouse_reset: false,
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

var module = angular.module('state.send-notification', []);

module.controller("SendNotificationCtrl",
    [ '$scope', 'globalizeWrapper', 'NotificationApi',
    function ($scope, globalizeWrapper, NotificationApi) {
        if (!$scope.appControl.aclCheckCurrentState())
            return; // Disable this controller

        $scope.availableLocales = $scope.appControl.getProfile().locale.available;
        $scope.selectedLocale = $scope.availableLocales[0];

        $scope.premadeSelection = 'custom';
        $scope.modelCustom = {
            title: 'Notification',
            icon: 'glyphicon glyphicon-envelope',
            text: 'Sample text',
        };
        $scope.focusCustom = {
            title: true,
            icon: false,
            text: false,
        };
        $scope.modelShutdown = {
            minutes: '3',
        };
        $scope.focusShutdown = {
            minutes: true,
        };
        $scope.preview = {
            title: '',
            text: '',
        };

        $scope.sendButtonActive = false;

        $scope.updatePreview = function () {
            var gl = globalizeWrapper.getGlobalize($scope.selectedLocale);
            switch ($scope.premadeSelection) {
                case 'custom':
                    $scope.preview.title = $scope.modelCustom.title;
                    $scope.preview.icon = $scope.modelCustom.icon;
                    $scope.preview.text = $scope.modelCustom.text;
                    $scope.sendButtonActive = $scope.modelCustom.text.length > 0;
                    break;
                case 'shutdown':
                    var variables = { minutes: $scope.modelShutdown.minutes };
                    $scope.preview.title = gl.formatMessage('NOTIFICATION_SHUTDOWN_TITLE', variables);
                    $scope.preview.icon = gl.formatMessage('NOTIFICATION_SHUTDOWN_ICON', variables);
                    $scope.preview.text = gl.formatMessage('NOTIFICATION_SHUTDOWN_TEXT', variables);
                    $scope.sendButtonActive = $scope.modelShutdown.minutes.length > 0;
                    break;
            }
        };

        $scope.selectPremade = function (selection) {
            $scope.premadeSelection = selection;
            switch (selection) {
                case 'custom':
                    $scope.focusCustom.title = true;
                    break;
                case 'shutdown':
                    $scope.focusShutdown.minutes = true;
            }
            $scope.updatePreview();
        };

        $scope.sendNotification = function () {
            $scope.sendButtonActive = false;

            var params = {};
            switch ($scope.premadeSelection) {
                case 'custom':
                    params['text'] = $scope.modelCustom.text;
                    params['title'] = $scope.modelCustom.title;
                    params['icon'] = $scope.modelCustom.icon;
                    params['variables'] = {};
                    break;
                case 'shutdown':
                    params['text'] = 'NOTIFICATION_SHUTDOWN_TEXT';
                    params['title'] = 'NOTIFICATION_SHUTDOWN_TITLE';
                    params['icon'] = 'NOTIFICATION_SHUTDOWN_ICON';
                    params['variables'] = { minutes: $scope.modelShutdown.minutes };
                    break;
            }

            NotificationApi.create(params)
                .then(function () {
                    $scope.sendButtonActive = true;
                });
        };

        $scope.selectPremade('custom');
    } ]
);

'use strict';

var module = angular.module('state.token-list', []);

module.controller("TokenListCtrl",
    [ '$scope', '$window', '$filter', '$q', 'dynamicTable', 'UserApi', 'TokenApi', 'TokenPayloadForm', 'InfoDialog',
    function ($scope, $window, $filter, $q, dynamicTable, UserApi, TokenApi, TokenPayloadForm, InfoDialog) {
        if (!$scope.appControl.aclCheckCurrentState())
            return; // Disable this controller

        $scope.userEmail = null;
        UserApi.read({ id: $scope.$stateParams.userId })
            .then(function (data) {
                $scope.userEmail = data.email;
            });

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

        $scope.deleteToken = function () {
            var sel = $scope.tableCtrl.plugin.getSelected();

            InfoDialog({
                title: 'TOKEN_CONFIRM_DELETE_TITLE',
                text: 'TOKEN_CONFIRM_DELETE_TEXT',
                yes: 'TOKEN_CONFIRM_DELETE_BUTTON',
            }).result
                .then(function () {
                    var promises = [];
                    if (sel === 'all') {
                        promises.push(TokenApi.delete());
                    } else {
                        $.each(sel, function (index, value) {
                            promises.push(TokenApi.delete({ id: value }));
                        });
                    }

                    $q.all(promises)
                        .finally(function () {
                            $scope.tableCtrl.plugin.refresh();
                        });
                });
        };

        $scope.$watch('tableCtrl.event', function () {
            if (!$scope.tableCtrl.event)
                return;

            var event = $scope.tableCtrl.event;
            $scope.tableCtrl.event = null;

            if (event == 'http-error') {
                if ($scope.tableCtrl.statusCode == 401 || $scope.tableCtrl.statusCode == 403)
                    $window.location.reload();
                return;
            }

            var sel = $scope.tableCtrl.plugin.getSelected();
            $scope.hasSelection = (sel == 'all' || sel.length);
            $scope.hasSingleSelection = (sel != 'all' && sel.length == 1);
        });
    } ]
);

'use strict';

var module = angular.module('state.user-list', []);

module.controller("UserListCtrl",
    [ '$scope', '$window', '$filter', '$q', 'dynamicTable', 'RoleApi', 'UserApi', 'CreateUserForm', 'EditUserForm', 'InfoDialog',
    function ($scope, $window, $filter, $q, dynamicTable, RoleApi, UserApi, CreateUserForm, EditUserForm, InfoDialog) {
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

        $scope.createUser = function () {
            RoleApi.list()
                .then(function (roles) {
                    var preselected = [];
                    $.each(roles, function (index, role) {
                        if (role.handle == 'member') {
                            role.checked = true;
                            preselected.push(role.id);
                            return false;
                        }
                    });
                    if (roles.length > 0)
                        roles[0]['focus'] = true;
                    CreateUserForm(preselected, roles)
                        .then(function () {
                            $scope.tableCtrl.plugin.refresh();
                        });
                });
        };

        $scope.editUser = function () {
            var sel = $scope.tableCtrl.plugin.getSelected();
            $q.all([ UserApi.read({ id: sel[0] }), RoleApi.list() ])
                .then(function (result) {
                    var user = result[0];
                    var roles = result[1];
                    $.each(roles, function (index, role) {
                        if ($.inArray(role.id, user.roles) != -1)
                            role.checked = true;
                    });
                    if (roles.length > 0)
                        roles[0]['focus'] = true;
                    EditUserForm(user, roles)
                        .then(function () {
                            $scope.tableCtrl.plugin.refresh();
                        });
                });
        };

        $scope.deleteUser = function () {
            var sel = $scope.tableCtrl.plugin.getSelected();

            InfoDialog({
                title: 'USER_CONFIRM_DELETE_TITLE',
                text: 'USER_CONFIRM_DELETE_TEXT',
                yes: 'USER_CONFIRM_DELETE_BUTTON',
            }).result
                .then(function () {
                    var promises = [];
                    if (sel === 'all') {
                        promises.push(UserApi.delete());
                    } else {
                        $.each(sel, function (index, value) {
                            promises.push(UserApi.delete({ id: value }));
                        });
                    }

                    $q.all(promises)
                        .finally(function () {
                            $scope.tableCtrl.plugin.refresh();
                        });
                });
        };

        $scope.$watch('tableCtrl.event', function () {
            if (!$scope.tableCtrl.event)
                return;

            var event = $scope.tableCtrl.event;
            $scope.tableCtrl.event = null;

            if (event == 'http-error') {
                if ($scope.tableCtrl.statusCode == 401 || $scope.tableCtrl.statusCode == 403)
                    $window.location.reload();
                return;
            }

            var sel = $scope.tableCtrl.plugin.getSelected();
            $scope.hasSelection = (sel == 'all' || sel.length);
            $scope.hasSingleSelection = (sel != 'all' && sel.length == 1);
        });
    } ]
);
