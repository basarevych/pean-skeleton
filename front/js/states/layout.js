'use strict';

var module = angular.module('state.layout', []);

module.controller("LayoutCtrl",
    [ '$scope', '$window', '$cookies', '$timeout', 'PasswordForm',
    function ($scope, $window, $cookies, $timeout, PasswordForm) {
        $scope.locale = $scope.appControl.getProfile().locale;
        $scope.locale.cookie = $cookies.get('locale');

        $scope.setLocale = function (locale) {
            if (locale === null)
                $cookies.remove('locale');
            else
                $cookies.put('locale', locale);
            $window.location.reload();
        };

        $scope.changePassword = function () {
            PasswordForm();
        };

        $scope.logout = function () {
            $scope.appControl.removeToken();
            $window.location.reload();
        };
    } ]
);
