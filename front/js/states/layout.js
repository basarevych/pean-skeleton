'use strict';

var module = angular.module('state.layout', []);

module.controller("LayoutCtrl",
    [ '$scope', '$state', '$stateParams', '$cookies', '$window', 'globalizeWrapper', 'ProfileForm',
    function ($scope, $state, $stateParams, $cookies, $window, globalizeWrapper, ProfileForm) {
        $scope.locale = $scope.appControl.getProfile().locale;

        $scope.setLocale = function (locale) {
            $cookies.put('locale', locale, { path: '/', expires: moment().add(1, 'year').toDate() });
            globalizeWrapper.setLocale(locale);
        };

        $scope.changeProfile = function () {
            ProfileForm($scope.appControl.getProfile())
                .then(function () {
                    $scope.appControl.loadProfile(function () {
                        $state.go($state.current.name, $stateParams, { reload: true });
                    });
                });
        };

        $scope.logout = function () {
            $scope.appControl.removeToken();
            $window.location.reload();
        };
    } ]
);
