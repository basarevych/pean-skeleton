'use strict';

var module = angular.module('state.layout', []);

module.controller("LayoutCtrl",
    [ '$scope', '$state', '$stateParams', '$cookies', '$window', 'ProfileForm', 'SocketServer',
    function ($scope, $state, $stateParams, $cookies, $window, ProfileForm, SocketServer) {
        $scope.locale = $scope.appControl.getProfile().locale;
        $scope.locale.cookie = $cookies.get('locale');
        $scope.socket = SocketServer;

        $scope.setLocale = function (locale) {
            if (locale === null)
                $cookies.remove('locale');
            else
                $cookies.put('locale', locale, { path: '/', expires: moment().add(1, 'year').toDate() });

            $scope.appControl.loadProfile(function () { $window.location.reload() });
        };

        $scope.changeProfile = function () {
            ProfileForm($scope.appControl.getProfile())
                .then(function () {
                    $scope.appControl.loadProfile();
                });
        };

        $scope.logout = function () {
            $scope.appControl.removeToken();
            $scope.appControl.loadProfile(function () {
                $state.go($state.current.name, $stateParams, { reload: true });
            });
        };
    } ]
);
