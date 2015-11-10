'use strict';

var module = angular.module('state.send-notification', []);

module.controller("SendNotificationCtrl",
    [ '$scope', '$filter', 'globalizeWrapper', 'NotificationApi', 'UserApi', 'RoleApi', 'InfoDialog',
    function ($scope, $filter, globalizeWrapper, NotificationApi, UserApi, RoleApi, InfoDialog) {
        if (!$scope.appControl.aclCheckCurrentState())
            return; // Disable this controller

        $scope.recipientType = 'all';
        $scope.recipientRole = null;
        $scope.recipientUser = null;

        $scope.roleTree = [];
        RoleApi.list()
            .then(function (roles) {
                $scope.roleTree = roles;
                if (roles.length > 0)
                    $scope.recipientRole = { id: roles[0].id };
            });

        $scope.scheduledFor = 'now';
        $scope.scheduledTime = moment().format($filter('glMessage')('DT_DATE_TIME_FORMAT'));

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

            var targetValid = false;
            switch ($scope.recipientType) {
                case 'all':
                    targetValid = true;
                    break;
                case 'role':
                    targetValid = angular.isObject($scope.recipientRole) && angular.isDefined($scope.recipientRole['id']);
                    break;
                case 'user':
                    targetValid = angular.isObject($scope.recipientUser) && angular.isDefined($scope.recipientUser['id']);
                    break;
            }

            var composeValid = false;
            switch ($scope.premadeSelection) {
                case 'custom':
                    $scope.preview.title = $scope.modelCustom.title;
                    $scope.preview.icon = $scope.modelCustom.icon;
                    $scope.preview.text = $scope.modelCustom.text;
                    composeValid = $scope.modelCustom.text.length > 0;
                    break;
                case 'shutdown':
                    var variables = { minutes: $scope.modelShutdown.minutes };
                    $scope.preview.title = gl.formatMessage('NOTIFICATION_SHUTDOWN_TITLE', variables);
                    $scope.preview.icon = gl.formatMessage('NOTIFICATION_SHUTDOWN_ICON', variables);
                    $scope.preview.text = gl.formatMessage('NOTIFICATION_SHUTDOWN_TEXT', variables);
                    composeValid = $scope.modelShutdown.minutes.length > 0;
                    break;
            }

            $scope.sendButtonActive = targetValid && composeValid;
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
            switch ($scope.scheduledFor) {
                case 'now':
                    params['scheduled_for'] = null;
                    break;
                case 'time':
                    params['scheduled_for'] = moment($scope.scheduledTime).unix();
                    break;
            }

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

            switch ($scope.recipientType) {
                case 'role':
                    params['role_id'] = $scope.recipientRole.id;
                    break;
                case 'user':
                    params['user_id'] = $scope.recipientUser.id;
                    break;
            }

            NotificationApi.create(params)
                .then(function (data) {
                    if (!data.success) {
                        InfoDialog({
                            title: 'NOTIFICATION_ERROR_TITLE',
                            text: 'NOTIFICATION_ERROR_TEXT',
                        });
                    }
                    $scope.sendButtonActive = true;
                });
        };

        $scope.getEmail = function (search) {
            return UserApi.search({ criteria: 'email', search: search })
                .then(function (data) {
                    return data;
                });
        };

        $scope.$watch('recipientType', function () { $scope.updatePreview(); });
        $scope.$watch('recipientRole.id', function () { $scope.updatePreview(); });
        $scope.$watch('recipientUser.id', function () { $scope.updatePreview(); });

        $scope.selectPremade('custom');
    } ]
);
