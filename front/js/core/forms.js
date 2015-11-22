'use strict';

var forms = angular.module('forms', []);

forms.factory('InfoDialog',
    [ '$uibModal', 'globalizeWrapper',
    function ($uibModal, globalizeWrapper) {
        var isOpened = false;

        var ModalCtrl = function ($scope, $uibModalInstance, title, text, yes, variables) {
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

forms.factory('ValidationCtrl',
    [ '$timeout', '$filter',
    function ($timeout, $filter) {
        return [ '$scope', '$uibModalInstance', 'model', 'validator', 'submitter',
            function ($scope, $uibModalInstance, model, validator, submitter) {
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

forms.factory('ProfileForm',
    [ '$uibModal', '$filter', 'ValidationCtrl', 'ProfileApi',
    function ($uibModal, $filter, ValidationCtrl, ProfileApi) {
        return function (profile) {
            return $uibModal.open({
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

forms.factory('CreateRoleForm',
    [ '$uibModal', '$filter', 'ValidationCtrl', 'RoleApi',
    function ($uibModal, $filter, ValidationCtrl, RoleApi) {
        return function (roles) {
            return $uibModal.open({
                controller: ValidationCtrl,
                templateUrl: 'modals/create-role.html',
                resolve: {
                    model: function () {
                        return {
                            handle: { value: '', focus: true, required: true },
                            title: { value: '', focus: false, required: true },
                            parent_id: { tree: roles, value: null, focus: false, required: true },
                        };
                    },
                    validator: function () {
                        return function (params) {
                            params['_form_type'] = 'create';
                            return RoleApi.validate(params);
                        };
                    },
                    submitter: function () { return RoleApi.create; },
                }
            }).result;
        }
    } ]
);

forms.factory('EditRoleForm',
    [ '$uibModal', '$filter', 'ValidationCtrl', 'RoleApi',
    function ($uibModal, $filter, ValidationCtrl, RoleApi) {
        return function (role, roles) {
            return $uibModal.open({
                controller: ValidationCtrl,
                templateUrl: 'modals/edit-role.html',
                resolve: {
                    model: function () {
                        return {
                            id: { value: role.id, focus: false, required: false },
                            handle: { value: '', focus: false, required: true },
                            title: { value: role.title, focus: true, required: true },
                            parent_id: { tree: roles, value: role.parent_id, focus: false, required: true },
                            handle_changed: false,
                            original_handle: role.handle,
                            changeHandle: function () {
                                this.handle_changed = true;
                                this.handle.value = this.original_handle;
                                this.handle.focus = true;
                            },
                            cancelHandle: function () {
                                this.handle_changed = false;
                                this.handle.value = "";
                            },
                        };
                    },
                    validator: function () {
                        return function (params) {
                            params['_form_type'] = 'edit';
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
    [ '$uibModal', '$filter', 'ValidationCtrl', 'PermissionApi',
    function ($uibModal, $filter, ValidationCtrl, PermissionApi) {
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
    [ '$uibModal', '$filter', 'ValidationCtrl', 'PermissionApi',
    function ($uibModal, $filter, ValidationCtrl, PermissionApi) {
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
                        };
                    },
                    validator: function () { return PermissionApi.validate; },
                    submitter: function () { return PermissionApi.update; },
                }
            }).result;
        }
    } ]
);

forms.factory('CreateUserForm',
    [ '$uibModal', '$filter', 'ValidationCtrl', 'UserApi', 'PasswordGenerator',
    function ($uibModal, $filter, ValidationCtrl, UserApi, PasswordGenerator) {
        return function (preselectedRoles, allRoles) {
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
    [ '$uibModal', '$filter', 'ValidationCtrl', 'UserApi', 'PasswordGenerator',
    function ($uibModal, $filter, ValidationCtrl, UserApi, PasswordGenerator) {
        return function (user, roles) {
            return $uibModal.open({
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
                            status: { list: statuses, value: job.status, focus: false, required: true },
                            scheduled_for: { value: moment.unix(job.scheduled_for).format($filter('glMessage')('DT_DATE_TIME_FORMAT')), focus: false, required: false },
                            valid_until: { value: moment.unix(job.valid_until).format($filter('glMessage')('DT_DATE_TIME_FORMAT')), focus: false, required: false },
                            input_data: { value: JSON.stringify(job.input_data, undefined, 4), focus: false, required: false },
                            output_data: { value: JSON.stringify(job.output_data, undefined, 4), focus: false, required: false },
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
                            return JobApi.update(params);
                        };
                    },
                }
            }).result;
        }
    } ]
);
