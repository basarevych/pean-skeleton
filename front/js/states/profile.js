'use strict';

var module = angular.module('state.profile', []);

module.controller("ProfileCtrl",
    [ '$scope', '$timeout', '$filter', 'FormHelper', 'ProfileApi',
    function ($scope, $timeout, $filter, FormHelper, ProfileApi) {
        if (!$scope.appControl.getProfile().authenticated) {
            $scope.$state.go('layout.index');
            return;
        }

        // 'model' and 'validation' are FormHelper fields
        $scope.model = {
            name: { value: '', focus: false, required: false },
            new_password: { value: '', focus: false, required: false },
            retyped_password: { value: '', focus: false, required: false },
        };
        $scope.validation = { messages: [], errors: {} }; 

        $scope.loaded = false;
        $scope.processing = false;

        ProfileApi.read()
            .then(function (data) {
                $scope.model.name.value = data.name;
                $scope.loaded = true;
                FormHelper.setFocus($scope);
            });

        $scope.resetValidation = function (field) {
            FormHelper.clearFieldErrors($scope, field);
        };

        $scope.validate = function (field) {
            $timeout(function () {
                if ($scope.processing)
                    return;

                ProfileApi.validate({
                    _field: field,
                    name: $scope.model.name.value,
                    new_password: $scope.model.new_password.value,
                    retyped_password: $scope.model.retyped_password.value,
                }).then(function (data) {
                    FormHelper.setFieldErrors($scope, data, field);
                });
            }, 250);
        };

        $scope.submit = function () {
            $scope.processing = true;

            ProfileApi.update({
                name: $scope.model.name.value,
                new_password: $scope.model.new_password.value,
                retyped_password: $scope.model.retyped_password.value,
            }).then(function (data) {
                FormHelper.setErrors($scope, data);
                FormHelper.setFocus($scope);

                if (data.success) {
                    $scope.validation.messages = [ $filter('glMessage')('CHANGES_SAVED_LABEL') ];

                    var profile = $scope.appControl.getProfile();
                    profile.name = $scope.model.name.value;
                    $scope.appControl.setProfile(profile);
                }
            }).finally(function () {
                $scope.processing = false;
            });
        };
    } ]
);
