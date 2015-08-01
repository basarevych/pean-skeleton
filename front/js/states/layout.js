'use strict';

var module = angular.module('state.layout', []);

module.controller("LayoutCtrl",
    [ '$scope', '$state', '$stateParams', '$cookies', '$timeout', 'PasswordForm',
    function ($scope, $state, $stateParams, $cookies, $timeout, PasswordForm) {
        $scope.locale = $scope.appControl.getProfile().locale;
        $scope.locale.cookie = $cookies.get('locale');

        $scope.setLocale = function (locale) {
            if (locale === null)
                $cookies.remove('locale');
            else
                $cookies.put('locale', locale);

            $scope.appControl.loadProfile(function () {
                $state.go($state.current.name, $stateParams, { reload: true });
            });
        };

        $scope.changePassword = function () {
            PasswordForm();
        };

        $scope.logout = function () {
            $scope.appControl.removeToken();

            $scope.appControl.loadProfile(function () {
                $state.go($state.current.name, $stateParams, { reload: true });
            });
        };
    } ]
);
