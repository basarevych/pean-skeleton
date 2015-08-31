'use strict';

var module = angular.module('state.user-list', []);

module.controller("UserListCtrl",
    [ '$scope', '$window', '$filter', 'dynamicTable',
    function ($scope, $window, $filter, dynamicTable) {
        if (!$scope.appControl.aclCheckCurrentState())
            return; // Disable this controller

        $scope.hasSelection = false;
        $scope.hasSingleSelection = false;
        $scope.tableCtrl = dynamicTable({
            url: $window['config']['apiUrl'] + '/user/table',
            row_id_column: 'id',
            sort_column: 'id',
            mapper: function (row) {
                if (row['created_at'] != null) {
                    var m = moment.unix(row['created_at']).local();
                    row['created_at'] = m.format($filter('glMessage')('DT_DATE_TIME_FORMAT'));
                }

                return row;
            },
        });

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
