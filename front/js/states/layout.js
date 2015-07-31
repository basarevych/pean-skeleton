'use strict';

var module = angular.module('state.layout', []);

module.controller("LayoutCtrl",
    [ '$scope', '$cookies', '$timeout', 'PasswordForm',
    function ($scope, $cookies, $timeout, PasswordForm) {
        $scope.locale = $scope.appControl.getProfile().locale;
        $scope.locale.cookie = $cookies.get('locale');

        $scope.setLocale = function (locale) {
            if (locale === null)
                $cookies.remove('locale');
            else
                $cookies.put('locale', locale);

            $timeout(function () { $scope.appControl.loadProfile(true); }, 101);
        };

        $scope.changePassword = function () {
            PasswordForm();
        };

        $scope.logout = function () {
            $scope.appControl.removeToken();
            $timeout(function () { $scope.appControl.loadProfile(true); }, 101);
        };
    } ]
);
