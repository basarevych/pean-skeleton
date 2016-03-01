'use strict';

var module = angular.module('state.layout', []);

module.controller("LayoutCtrl",
    [ '$scope', '$state', '$stateParams', '$cookies', '$window', 'globalizeWrapper', 'LoginForm',
    function ($scope, $state, $stateParams, $cookies, $window, globalizeWrapper, LoginForm) {
        $scope.locale = $scope.appControl.getProfile().locale;

        $scope.setLocale = function (locale) {
            $cookies.put('locale', locale, { path: '/', expires: moment().add(1, 'year').toDate() });
            globalizeWrapper.setLocale(locale);
        };

        $scope.login = function () {
            LoginForm()
                .then(function (data) {
                    $scope.appControl.setToken(data.token);
                    $scope.appControl.loadProfile();
                });
        };

        $scope.logout = function () {
            $scope.appControl.removeToken();
            $window.location.reload();
        };
    } ]
);
