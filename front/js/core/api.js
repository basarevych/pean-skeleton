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
                        if ($rootScope.appControl.hasToken()) {
                            $rootScope.appControl.removeToken();
                            $window.location.reload();
                        }
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
        var resource = $resource($window['config']['api_url'] + '/auth/:action', { }, {
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
        var resource = $resource($window['config']['api_url'] + '/profile/:action', { }, {
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
        var resource = $resource($window['config']['api_url'] + '/roles/:id/:action', { }, {
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

api.factory('PermissionApi',
    [ '$resource', '$window', 'ResourceWrapper',
    function ($resource, $window, ResourceWrapper) {
        var resource = $resource($window['config']['api_url'] + '/permissions/:id/:action', { }, {
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
        var resource = $resource($window['config']['api_url'] + '/users/:id/:action', { }, {
            list:        { method: 'GET', isArray: true },
            create:      { method: 'POST', isArray: false },
            read:        { method: 'GET', params: { id: '@id' }, isArray: false },
            update:      { method: 'PUT', params: { id: '@id' }, isArray: false },
            delete:      { method: 'DELETE', params: { id: '@id' }, isArray: false },
            validate:    { method: 'POST', params: { action: 'validate' }, isArray: false },
            search:      { method: 'POST', params: { action: 'search' }, isArray: true },
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
            search: function (params, noErrorHandler) {
                return ResourceWrapper(resource.search(params).$promise, noErrorHandler);
            },
        };
    } ]
);

api.factory('TokenApi',
    [ '$resource', '$window', 'ResourceWrapper',
    function ($resource, $window, ResourceWrapper) {
        var resource = $resource($window['config']['api_url'] + '/tokens/:id', { }, {
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

api.factory('JobApi',
    [ '$resource', '$window', 'ResourceWrapper',
    function ($resource, $window, ResourceWrapper) {
        var resource = $resource($window['config']['api_url'] + '/jobs/:id/:action', { }, {
            list:       { method: 'GET', isArray: true },
            create:     { method: 'POST', isArray: false },
            read:       { method: 'GET', params: { id: '@id' }, isArray: false },
            update:     { method: 'PUT', params: { id: '@id' }, isArray: false },
            delete:     { method: 'DELETE', params: { id: '@id' }, isArray: false },
            validate:   { method: 'POST', params: { action: 'validate' }, isArray: false },
            statuses:   { method: 'GET', params: { action: 'statuses' }, isArray: true },
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
            statuses: function (params, noErrorHandler) {
                return ResourceWrapper(resource.statuses(params).$promise, noErrorHandler);
            },
        };
    } ]
);
