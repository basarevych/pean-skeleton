'use strict';

var module = angular.module('state.token-list', []);

module.controller("TokenListCtrl",
    [ '$scope', '$window', '$filter', 'dynamicTable', 'TokenApi', 'TokenPayloadForm',
    function ($scope, $window, $filter, dynamicTable, TokenApi, TokenPayloadForm) {
        if (!$scope.appControl.aclCheckCurrentState())
            return; // Disable this controller

        var urlParam = "?user_id=" + $scope.$stateParams.userId;

        $scope.hasSelection = false;
        $scope.hasSingleSelection = false;
        $scope.tableCtrl = dynamicTable({
            url: $window['config']['apiUrl'] + '/token/table' + urlParam,
            row_id_column: 'id',
            sort_column: 'id',
            mapper: function (row) {
                if (row['created_at'] != null) {
                    var m = moment.unix(row['created_at']).local();
                    row['created_at'] = m.format($filter('glMessage')('DT_DATE_TIME_FORMAT'));
                }

                if (row['updated_at'] != null) {
                    var m = moment.unix(row['updated_at']).local();
                    row['updated_at'] = m.format($filter('glMessage')('DT_DATE_TIME_FORMAT'));
                }

                return row;
            },
        });

        $scope.viewPayload = function () {
            var sel = $scope.tableCtrl.plugin.getSelected();
            TokenApi.read({ id: sel[0] })
                .then(function (data) {
                    TokenPayloadForm(data.payload);
                });
        };

        $scope.$watch('tableCtrl.event', function () {
            $scope.tableCtrl.event = null;
            if ($scope.tableCtrl.plugin == null)
                return;

            var sel = $scope.tableCtrl.plugin.getSelected();
            $scope.hasSelection = (sel == 'all' || sel.length);
            $scope.hasSingleSelection = (sel != 'all' && sel.length == 1);
        });
    } ]
);
