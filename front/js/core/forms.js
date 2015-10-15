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
                $timeout(function () {
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
                            if (data.success)
                                return;

                            $.each(data.errors, function (index, value) {
                                $scope.setValidationError(name, value);
                            });
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
    [ '$modal', '$filter', 'ModalFormCtrl', 'ProfileApi',
    function ($modal, $filter, ModalFormCtrl, ProfileApi) {
        return function (profile) {
            return $modal.open({
                controller: ModalFormCtrl,
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
    [ '$modal', '$filter', 'ModalFormCtrl', 'UserApi', 'PasswordGenerator',
    function ($modal, $filter, ModalFormCtrl, UserApi, PasswordGenerator) {
        return function (roles) {
            return $modal.open({
                controller: ModalFormCtrl,
                templateUrl: 'modals/create-user.html',
                resolve: {
                    model: function () {
                        return {
                            form_type: { value: 'create', focus: false, required: false },
                            name: { value: '', focus: true, required: false },
                            email: { value: '', focus: false, required: true },
                            password: { value: '', focus: false, required: true },
                            retyped_password: { value: '', focus: false, required: true },
                            roles: { tree: roles, value: [], focus: false, required: false },
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
                    validator: function () { return UserApi.validate; },
                    submitter: function () { return UserApi.create; },
                }
            }).result;
        }
    } ]
);

forms.factory('EditUserForm',
    [ '$modal', '$filter', 'ModalFormCtrl', 'UserApi', 'PasswordGenerator',
    function ($modal, $filter, ModalFormCtrl, UserApi, PasswordGenerator) {
        return function (user, roles) {
            return $modal.open({
                controller: ModalFormCtrl,
                templateUrl: 'modals/edit-user.html',
                resolve: {
                    model: function () {
                        return {
                            form_type: { value: 'edit', focus: false, required: false },
                            id: { value: user.id, focus: false, required: false },
                            name: { value: user.name, focus: true, required: false },
                            email: { value: '', focus: false, required: true },
                            password: { value: '', focus: false, required: true },
                            retyped_password: { value: '', focus: false, required: true },
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
                    validator: function () { return UserApi.validate; },
                    submitter: function () { return UserApi.update; },
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
