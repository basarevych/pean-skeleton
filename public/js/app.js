/* pean-skeleton - v0.0.0 - 2015-08-01 */

'use strict';

var app = angular.module('app', [
    'ngResource',               // Angular HTTP $resource
    'ngCookies',                // Angluar Cookie support
    'angular-loading-bar',      // Loading spinner
    'globalizeWrapper',         // jQuery.Globalize wrapper
    'ui.router',                // AngularUI Router
    'ui.bootstrap',             // AngularUI Bootstrap
    'api',
    'services',
    'directives',
    'filters',
    'forms',
    'state.layout',
    'state.index',
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

app.run(
    [ '$rootScope', '$state', '$stateParams', '$filter', '$timeout', 'AppControl', 'LoginForm',
    function ($rootScope, $state, $stateParams, $filter, $timeout, AppControl, LoginForm) {
        $rootScope.pageTitle = 'Loading...',
        $rootScope.$state = $state;
        $rootScope.$stateParams = $stateParams;
        $rootScope.appControl = AppControl;
        $rootScope.login = function () {
            LoginForm()
                .then(function (data) {
                    AppControl.setToken(data.token);
                    $timeout(function () { AppControl.loadProfile(true); }, 101);
                });
        };

        $rootScope.$on('$stateChangeSuccess', function (event, toState) {
            $rootScope.pageTitle = $filter('glMessage')(toState.title);
        });

        AppControl.init();
    } ]
);

'use strict';

var api = angular.module('api', []);

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
                        var test = $('<div>'), current;
                        test.appendTo($('body'));

                        for (var i = sizes.length - 1; i >= 0; i--) {
                            test.addClass('hidden-' + sizes[i]);
                            if (test.is(':hidden')) {
                                current = sizes[i];
                                break;
                            }
                        };
                        test.remove();

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
                    globalizeReady: globalizeWrapper.getLocale() != null,
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
        return function ($scope, $modalInstance, fields, parser, validator, submitter) {
            $scope.model = {};
            $scope.validation = { errors: [], fields: {} }; 
            $scope.processing = false;

            $.each(fields, function (index, item) {
                $scope.model[item.name] = item;
            });

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
                        $scope.model[key].focus = true;
                        return false;
                    });
                }
            };

            var requiredFieldsCheck = function (name) {
                var error = false;
                $.each($scope.model, function (key, item) {
                    if ((angular.isUndefined(name) || key == name)
                            && item.required && item.value.toString().trim().length == 0) {
                        error = true;
                        $scope.setValidationError(
                            key,
                            $filter('glMessage')('VALIDATOR_REQUIRED_FIELD')
                        );
                    }
                });
                return !error;
            };

            var doValidate = function (name) {
                if ($scope.processing)
                    return;

                if (!requiredFieldsCheck(name))
                    return;
                if (angular.isDefined(parser) && !parser($scope, 'validation'))
                    return;
                if (angular.isUndefined(validator))
                    return;

                var params = {
                    field: name,
                    form: {},
                };
                $.each($scope.model, function (key, item) {
                    if (!item.local)
                        params.form[item.name] = item.value;
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
                $timeout(function () { doValidate(name); }, 500);
            };

            $scope.submit = function () {
                $scope.resetValidation();
                $scope.processing = true;

                if (!requiredFieldsCheck()) {
                    $scope.processing = false;
                    resetFocus();
                    return;
                }
                if (angular.isDefined(parser) && !parser($scope, 'submission')) {
                    $scope.processing = false;
                    resetFocus();
                    return;
                }

                if (angular.isUndefined(submitter)) {
                    $scope.processing = false;
                    return;
                }

                var params = {};
                $.each($scope.model, function (key, item) {
                    if (!item.local)
                        params[item.name] = item.value;
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
                    fields: function () {
                        return [
                            { name: 'login',    required: true, value: '', local: false, focus: true },
                            { name: 'password', required: true, value: '', local: false, focus: false },
                        ];
                    },
                    parser: function () { return undefined; },
                    validator: function () { return AuthApi.validate; },
                    submitter: function () { return AuthApi.token; },
                }
            }).result;
        }
    } ]
);

forms.factory('PasswordForm',
    [ '$modal', '$filter', 'ModalFormCtrl', 'ProfileApi',
    function ($modal, $filter, ModalFormCtrl, ProfileApi) {
        return function () {
            function parser(scope, stage) {
                var error = false;

                var value1 = scope.model.newPassword.value,
                    value2 = scope.model.retypedPassword.value;

                if ((stage == 'validation' && value2.length)
                        || (stage == 'submission' && (value1.length || value2.length))) {
                    if (value1.trim() != value2.trim()) {
                        error = true;
                        scope.setValidationError(
                            'retypedPassword',
                            $filter('glMessage')('VALIDATOR_INPUT_MISMATCH')
                        );
                    }
                }

                return !error;
            }

            return $modal.open({
                controller: ModalFormCtrl,
                templateUrl: 'modals/password.html',
                resolve: {
                    fields: function () {
                        return [
                            { name: 'currentPassword', required: true, value: '', local: false, focus: true },
                            { name: 'newPassword',     required: true, value: '', local: false, focus: false },
                            { name: 'retypedPassword', required: true, value: '', local: true,  focus: false },
                        ];
                    },
                    parser: function () { return parser; },
                    validator: function () { return ProfileApi.validate; },
                    submitter: function () { return ProfileApi.updateList; },
                }
            }).result;
        }
    } ]
);

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
            loadProfile: function (reload) {
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

                        if (reload === true)
                            $window.location.reload();
                        else if (typeof reload == 'function')
                            reload();
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
    [ '$scope', '$cookies', '$timeout', 'PasswordForm',
    function ($scope, $cookies, $timeout, PasswordForm) {
        $scope.locale = $scope.appControl.getProfile().locale;
        $scope.locale.cookie = $cookies.get('locale');

        $scope.setLocale = function (locale) {
            if (locale === null)
                $cookies.remove('locale');
            else
                $cookies.put('locale', locale);

            $timeout(function () { $scope.appControl.loadProfile(true); }, 101);
        };

        $scope.changePassword = function () {
            PasswordForm();
        };

        $scope.logout = function () {
            $scope.appControl.removeToken();
            $timeout(function () { $scope.appControl.loadProfile(true); }, 101);
        };
    } ]
);
