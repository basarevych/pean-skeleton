'use strict';

var forms = angular.module('forms', []);

forms.factory('InfoDialog',
    [ '$uibModal', 'globalizeWrapper',
    function ($uibModal, globalizeWrapper) {
        var isOpened = false;

        var ModalCtrl = [ '$scope', '$uibModalInstance', 'title', 'text', 'yes', 'variables',
            function ($scope, $uibModalInstance, title, text, yes, variables) {
                $scope.title = title;
                $scope.text = text;
                $scope.yes = yes;
                $scope.variables = variables;
                $scope.globalizeReady = (globalizeWrapper.getLocale() != null);
            }
        ];

        return function (params) {
            if (isOpened)
                return null;

            isOpened = true;
            var modal = $uibModal.open({
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

forms.factory('FormHelper',
    [ '$timeout', '$filter',
    function ($timeout, $filter) {
        return {
            setFocus: function ($scope) {
                for (var key in $scope.model) {
                    if (!angular.isObject($scope.model[key]) || !angular.isDefined($scope.model[key].focus))
                        continue;
                    var errors = $scope.validation.errors[key];
                    if (angular.isObject(errors) && errors.length) {
                        $scope.model[key].focus = true;
                        return;
                    }
                }

                for (var key in $scope.model) {
                    if (!angular.isObject($scope.model[key]) || !angular.isDefined($scope.model[key].focus))
                        continue;
                    $scope.model[key].focus = true;
                    break;
                }
            },
            hasFieldErrors: function ($scope, field) {
                return (
                    angular.isArray($scope.validation.errors[field])
                        && $scope.validation.errors[field].length
                );
            },
            clearFieldErrors: function ($scope, field) {
                $scope.validation.messages = [];
                $scope.validation.errors[field] = [];
            },
            setFieldErrors: function ($scope, data, field) {
                if (this.hasFieldErrors($scope, field))
                    this.clearFieldErrors($scope, field);
                $scope.validation.errors[field] = data.errors;
            },
            clearErrors: function ($scope) {
                $scope.validation.messages = [];
                $scope.validation.errors = {};
            },
            setErrors: function ($scope, data) {
                if (data.success || !angular.isObject(data.errors))
                    this.clearErrors($scope);
                else
                    $scope.validation.errors = data.errors;

                if (angular.isArray(data.messages))
                    $scope.validation.messages = data.messages;
            },
        };
    } ]
);

forms.factory('ValidationCtrl',
    [ '$timeout', '$filter', 'FormHelper',
    function ($timeout, $filter, FormHelper) {
        return [ '$scope', '$uibModalInstance', 'model', 'validator', 'submitter',
            function ($scope, $uibModalInstance, model, validator, submitter) {
                $scope.model = model;
                $scope.validation = { messages: [], errors: {} }; 
                $scope.processing = false;

                $scope.resetValidation = function (name) {
                    if (name)
                        FormHelper.clearFieldErrors($scope, name);
                    else
                        FormHelper.clearErrors($scope);
                };

                $scope.validate = function (name) {
                    $timeout(function () {
                        if ($scope.processing)
                            return;
                        if (!$('.modal').is(':visible'))
                            return;
                        if (!validator)
                            return;

                        var params = {};
                        for (var key in $scope.model) {
                            var item = $scope.model[key];
                            if (angular.isObject(item) && angular.isDefined(item['value']))
                                params[key] = item.value;
                        }
                        params['_field'] = name;

                        validator(params)
                            .then(function (data) {
                                FormHelper.setFieldErrors($scope, data, name);
                            });
                    }, 250);
                };

                $scope.submit = function () {
                    if ($scope.processing)
                        return;

                    $scope.processing = true;

                    if (!submitter) {
                        FormHelper.clearErrors($scope);
                        $scope.processing = false;
                        return;
                    }

                    var params = {};
                    for (var key in $scope.model) {
                        var item = $scope.model[key];
                        if (angular.isObject(item) && angular.isDefined(item['value']))
                            params[key] = item.value;
                    }

                    submitter(params)
                        .then(function (data) {
                            FormHelper.setErrors($scope, data);
                            if (data.success) {
                                if (angular.isFunction($scope['$close']))
                                    $scope.$close(data);
                                return;
                            }
                            FormHelper.setFocus($scope);
                        })
                        .finally(function () {
                            $scope.processing = false;
                        });
                };
            }
        ];
    } ]
);

forms.factory('LoginForm',
    [ '$uibModal', '$filter', 'ValidationCtrl', 'AuthApi',
    function ($uibModal, $filter, ValidationCtrl, AuthApi) {
        return function () {
            return $uibModal.open({
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

forms.factory('CreateRoleForm',
    [ '$uibModal', '$filter', 'AppControl', 'ValidationCtrl', 'RoleApi',
    function ($uibModal, $filter, AppControl, ValidationCtrl, RoleApi) {
        return function (roles) {
            var locale = AppControl.getProfile().locale;
            var translations = {};
            locale.available.forEach(function (locale) {
                translations[locale] = {
                    title: "",
                };
            });

            return $uibModal.open({
                controller: ValidationCtrl,
                templateUrl: 'modals/create-role.html',
                resolve: {
                    model: function () {
                        return {
                            parent_id: { tree: roles, value: null, focus: false, required: true },
                            handle: { value: '', focus: true, required: true },
                            translations: { selected: locale.current, value: translations, focus: false, required: false },
                            locale: locale,
                            title_focus: false,
                        };
                    },
                    validator: function () { return RoleApi.validate; },
                    submitter: function () { return RoleApi.create; },
                }
            }).result;
        }
    } ]
);

forms.factory('EditRoleForm',
    [ '$uibModal', '$filter', 'AppControl', 'ValidationCtrl', 'RoleApi',
    function ($uibModal, $filter, AppControl, ValidationCtrl, RoleApi) {
        return function (role, roles) {
            var locale = AppControl.getProfile().locale;

            return $uibModal.open({
                controller: ValidationCtrl,
                templateUrl: 'modals/edit-role.html',
                resolve: {
                    model: function () {
                        return {
                            id: { value: role.id, focus: false, required: false },
                            parent_id: { tree: roles, value: role.parent_id, focus: true, required: true },
                            handle: { value: role.handle, focus: false, required: true },
                            translations: { selected: locale.current, value: role.translations, focus: false, required: false },
                            locale: locale,
                            title_focus: false,
                            handle_changed: false,
                            changeHandle: function () {
                                this.handle_changed = true;
                                this.handle.focus = true;
                            },
                            cancelHandle: function () {
                                this.handle_changed = false;
                                this.handle.value = role.handle;
                            },
                        };
                    },
                    validator: function () {
                        return function (params) {
                            params['_id'] = role.id;
                            return RoleApi.validate(params);
                        };
                    },
                    submitter: function () { return RoleApi.update; },
                }
            }).result;
        }
    } ]
);

forms.factory('CreatePermissionForm',
    [ '$uibModal', '$filter', 'AppControl', 'ValidationCtrl', 'PermissionApi',
    function ($uibModal, $filter, AppControl, ValidationCtrl, PermissionApi) {
        return function (roles) {
            return $uibModal.open({
                controller: ValidationCtrl,
                templateUrl: 'modals/create-permission.html',
                resolve: {
                    model: function () {
                        return {
                            role_id: { tree: roles, value: null, focus: true, required: true },
                            resource: { value: '', focus: false, required: false },
                            action: { value: '', focus: false, required: false },
                            locale: AppControl.getProfile().locale,
                        };
                    },
                    validator: function () { return PermissionApi.validate; },
                    submitter: function () { return PermissionApi.create; },
                }
            }).result;
        }
    } ]
);

forms.factory('EditPermissionForm',
    [ '$uibModal', '$filter', 'AppControl', 'ValidationCtrl', 'PermissionApi',
    function ($uibModal, $filter, AppControl, ValidationCtrl, PermissionApi) {
        return function (permission, roles) {
            return $uibModal.open({
                controller: ValidationCtrl,
                templateUrl: 'modals/edit-permission.html',
                resolve: {
                    model: function () {
                        return {
                            id: { value: permission.id, focus: false, required: false },
                            role_id: { tree: roles, value: permission.role_id, focus: true, required: true },
                            resource: { value: permission.resource, focus: false, required: false },
                            action: { value: permission.action, focus: false, required: false },
                            locale: AppControl.getProfile().locale,
                        };
                    },
                    validator: function () {
                        return function (params) {
                            params['_id'] = role.id;
                            return PermissionApi.validate(params);
                        };
                    },
                    submitter: function () { return PermissionApi.update; },
                }
            }).result;
        }
    } ]
);

forms.factory('CreateUserForm',
    [ '$uibModal', '$filter', 'AppControl', 'ValidationCtrl', 'UserApi', 'PasswordGenerator',
    function ($uibModal, $filter, AppControl, ValidationCtrl, UserApi, PasswordGenerator) {
        return function (preselectedRoles, roles) {
            return $uibModal.open({
                controller: ValidationCtrl,
                templateUrl: 'modals/create-user.html',
                resolve: {
                    model: function () {
                        return {
                            name: { value: '', focus: true, required: false },
                            email: { value: '', focus: false, required: true },
                            password: { value: '', focus: false, required: true },
                            retyped_password: { value: '', focus: false, required: true },
                            roles: { tree: roles, value: preselectedRoles, focus: false, required: false },
                            locale: AppControl.getProfile().locale,
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
                    validator: function () { return UserApi.validate },
                    submitter: function () { return UserApi.create; },
                }
            }).result;
        }
    } ]
);

forms.factory('EditUserForm',
    [ '$uibModal', '$filter', 'AppControl', 'ValidationCtrl', 'UserApi', 'PasswordGenerator',
    function ($uibModal, $filter, AppControl, ValidationCtrl, UserApi, PasswordGenerator) {
        return function (user, roles) {
            return $uibModal.open({
                controller: ValidationCtrl,
                templateUrl: 'modals/edit-user.html',
                resolve: {
                    model: function () {
                        return {
                            id: { value: user.id, focus: false, required: false },
                            name: { value: user.name, focus: true, required: false },
                            email: { value: user.email, focus: false, required: true },
                            password: { value: '', focus: false, required: false },
                            retyped_password: { value: '', focus: false, required: false },
                            roles: { tree: roles, value: user.roles, focus: false, required: false },
                            locale: AppControl.getProfile().locale,
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
                            changeEmail: function () {
                                this.email_changed = true;
                                this.email.focus = true;
                            },
                            cancelEmail: function () {
                                this.email_changed = false;
                                this.email.value = user.email;
                            },
                        };
                    },
                    validator: function () {
                        return function (params) {
                            params['_id'] = user.id;
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
    [ '$uibModal', '$filter', 'ValidationCtrl',
    function ($uibModal, $filter, ValidationCtrl) {
        return function (payload) {
            return $uibModal.open({
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

forms.factory('CreateJobForm',
    [ '$uibModal', '$filter', 'ValidationCtrl', 'JobApi',
    function ($uibModal, $filter, ValidationCtrl, JobApi) {
        return function (statuses) {
            return $uibModal.open({
                controller: ValidationCtrl,
                templateUrl: 'modals/create-job.html',
                resolve: {
                    model: function () {
                        return {
                            name: { value: '', focus: true, required: true },
                            queue: { value: '', focus: false, required: false },
                            status: { list: statuses, value: statuses[0], focus: false, required: true },
                            scheduled_for: { value: '', focus: false, required: false },
                            valid_until: { value: '', focus: false, required: false },
                            input_data: { value: '', focus: false, required: false },
                        };
                    },
                    validator: function () {
                        return function (params) {
                            if (params['scheduled_for'].trim().length)
                                params['scheduled_for'] = moment(params['scheduled_for']).unix();
                            if (params['valid_until'].trim().length)
                                params['valid_until'] = moment(params['valid_until']).unix();
                            return JobApi.validate(params);
                        };
                    },
                    submitter: function () {
                        return function (params) {
                            if (params['scheduled_for'].trim().length)
                                params['scheduled_for'] = moment(params['scheduled_for'].trim()).unix();
                            if (params['valid_until'].trim().length)
                                params['valid_until'] = moment(params['valid_until'].trim()).unix();
                            return JobApi.create(params);
                        };
                    },
                }
            }).result;
        }
    } ]
);

forms.factory('EditJobForm',
    [ '$uibModal', '$filter', 'ValidationCtrl', 'JobApi',
    function ($uibModal, $filter, ValidationCtrl, JobApi) {
        return function (job, statuses) {
            return $uibModal.open({
                controller: ValidationCtrl,
                templateUrl: 'modals/edit-job.html',
                resolve: {
                    model: function () {
                        return {
                            id: { value: job.id, focus: false, required: false },
                            name: { value: job.name, focus: true, required: true },
                            queue: { value: job.queue, focus: false, required: false },
                            status: { list: statuses, value: job.status, focus: false, required: true },
                            scheduled_for: { value: moment.unix(job.scheduled_for).format($filter('glMessage')('DT_DATE_TIME_FORMAT')), focus: false, required: false },
                            valid_until: { value: moment.unix(job.valid_until).format($filter('glMessage')('DT_DATE_TIME_FORMAT')), focus: false, required: false },
                            input_data: { value: JSON.stringify(job.input_data, undefined, 4), focus: false, required: false },
                        };
                    },
                    validator: function () {
                        return function (params) {
                            params['_id'] = job.id;
                            if (params['scheduled_for'].trim().length)
                                params['scheduled_for'] = moment(params['scheduled_for']).unix();
                            if (params['valid_until'].trim().length)
                                params['valid_until'] = moment(params['valid_until']).unix();
                            return JobApi.validate(params);
                        };
                    },
                    submitter: function () {
                        return function (params) {
                            if (params['scheduled_for'].trim().length)
                                params['scheduled_for'] = moment(params['scheduled_for'].trim()).unix();
                            if (params['valid_until'].trim().length)
                                params['valid_until'] = moment(params['valid_until'].trim()).unix();
                            return JobApi.update(params);
                        };
                    },
                }
            }).result;
        }
    } ]
);

forms.factory('JobOutputForm',
    [ '$uibModal', '$filter', 'ValidationCtrl',
    function ($uibModal, $filter, ValidationCtrl) {
        return function (output) {
            return $uibModal.open({
                controller: ValidationCtrl,
                templateUrl: 'modals/job-output.html',
                resolve: {
                    model: function () {
                        return {
                            output: { value: output, focus: false, required: false },
                        };
                    },
                    validator: function () { return null },
                    submitter: function () { return null },
                }
            }).result;
        }
    } ]
);
