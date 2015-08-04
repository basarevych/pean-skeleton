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
        return function ($scope, $modalInstance, fields, validator, submitter) {
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

            var doValidate = function (name) {
                if ($scope.processing)
                    return;
                if (angular.isUndefined(validator))
                    return;

                var params = {
                    field: name,
                    form: {},
                };
                $.each($scope.model, function (key, item) {
                    params.form[item.name] = item.value;
                });

                validator(params)
                    .then(function (data) {
                        if (data.valid)
                            return;

                        $.each(data.errors, function (name, value) {
                            $.each(value, function (index, error) {
                                $scope.setValidationError(name, error);
                            });
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
                $timeout(function () {
                    if ($scope.processing || !$('.modal').is(':visible'))
                        return;

                    doValidate(name);
                }, 500);
            };

            $scope.submit = function () {
                $scope.resetValidation();
                $scope.processing = true;

                if (angular.isUndefined(submitter)) {
                    $scope.processing = false;
                    return;
                }

                var params = {};
                $.each($scope.model, function (key, item) {
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
                            { name: 'email',    value: '', focus: true },
                            { name: 'password', value: '', focus: false },
                        ];
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
                    fields: function () {
                        return [
                            { name: 'name',            value: profile.name,   focus: true },
                            { name: 'email',           value: profile.email,  focus: false },
                            { name: 'newPassword',     value: '',             focus: false },
                            { name: 'retypedPassword', value: '',             focus: false },
                        ];
                    },
                    validator: function () { return ProfileApi.validate; },
                    submitter: function () { return ProfileApi.updateList; },
                }
            }).result;
        }
    } ]
);
