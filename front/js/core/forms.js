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
                    submitter: function () { return ProfileApi.update; },
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
