'use strict';

var module = angular.module('state.index', []);

module.controller("IndexCtrl",
    [ '$scope',
    function ($scope) {
        if (!$scope.appControl.aclCheckCurrentState())
            return; // Disable this controller
    } ]
);
