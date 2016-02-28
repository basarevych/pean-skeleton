'use strict';

var module = angular.module('state.layout', []);

module.controller("LayoutCtrl",
    [ '$scope', '$state', '$stateParams', '$cookies', '$window', 'globalizeWrapper', 'LoginForm', 'ProfileForm',
    function ($scope, $state, $stateParams, $cookies, $window, globalizeWrapper, LoginForm, ProfileForm) {
        $scope.locale = $scope.appControl.getProfile().locale;

        $scope.login = function () {
            LoginForm()
                .then(function (data) {
                    $scope.appControl.setToken(data.token);
                    $scope.appControl.loadProfile();
                });
        };

        $scope.setLocale = function (locale) {
            $cookies.put('locale', locale, { path: '/', expires: moment().add(1, 'year').toDate() });
            globalizeWrapper.setLocale(locale);
        };

        $scope.changeProfile = function () {
            ProfileForm($scope.appControl.getProfile())
                .then(function () {
                    $scope.appControl.loadProfile();
                });
        };

        $scope.logout = function () {
            $scope.appControl.removeToken();
            $window.location.reload();
        };
    } ]
);
