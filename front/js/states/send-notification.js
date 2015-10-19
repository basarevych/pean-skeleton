'use strict';

var module = angular.module('state.send-notification', []);

module.controller("SendNotificationCtrl",
    [ '$scope', 'globalizeWrapper', 'NotificationApi',
    function ($scope, globalizeWrapper, NotificationApi) {
        if (!$scope.appControl.aclCheckCurrentState())
            return; // Disable this controller

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
            switch ($scope.premadeSelection) {
                case 'custom':
                    $scope.preview.title = $scope.modelCustom.title;
                    $scope.preview.icon = $scope.modelCustom.icon;
                    $scope.preview.text = $scope.modelCustom.text;
                    $scope.sendButtonActive = $scope.modelCustom.text.length > 0;
                    break;
                case 'shutdown':
                    var variables = { minutes: $scope.modelShutdown.minutes };
                    $scope.preview.title = gl.formatMessage('NOTIFICATION_SHUTDOWN_TITLE', variables);
                    $scope.preview.icon = gl.formatMessage('NOTIFICATION_SHUTDOWN_ICON', variables);
                    $scope.preview.text = gl.formatMessage('NOTIFICATION_SHUTDOWN_TEXT', variables);
                    $scope.sendButtonActive = $scope.modelShutdown.minutes.length > 0;
                    break;
            }
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

            NotificationApi.create(params)
                .then(function () {
                    $scope.sendButtonActive = true;
                });
        };

        $scope.selectPremade('custom');
    } ]
);
