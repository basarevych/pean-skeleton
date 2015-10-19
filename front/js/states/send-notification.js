'use strict';

var module = angular.module('state.send-notification', []);

module.controller("SendNotificationCtrl",
    [ '$scope', 'globalizeWrapper', 'NotificationApi', 'UserApi', 'InfoDialog',
    function ($scope, globalizeWrapper, NotificationApi, UserApi, InfoDialog) {
        if (!$scope.appControl.aclCheckCurrentState())
            return; // Disable this controller

        $scope.recipientType = 'all';
        $scope.recipientUser = null;

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
                case 'user':
                    targetValid = angular.isObject($scope.recipientUser)
                        && typeof $scope.recipientUser['id'] != 'undefined';
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
            return UserApi.lookupEmail({ search: search })
                .then(function (data) {
                    return data;
                });
        };

        $scope.$watch('recipientType', function () { $scope.updatePreview(); });
        $scope.$watch('recipientUser', function () { $scope.updatePreview(); });

        $scope.selectPremade('custom');
    } ]
);
