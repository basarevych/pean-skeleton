'use strict';

var module = angular.module('state.user', []);

module.controller("UserCtrl",
    [ '$scope', '$window', '$filter', 'dynamicTable', 'Socket',
    function ($scope, $window, $filter, dynamicTable, Socket) {
        if (!$scope.appControl.aclCheckCurrentState())
            return; // Disable this controller

        $scope.socket = Socket.init();

        $scope.hasSelection = false;
        $scope.hasSingleSelection = false;
        $scope.tableCtrl = dynamicTable({
            url: $window['config']['apiUrl'] + '/user/table',
            row_id_column: 'id',
            sort_column: 'id',
            mapper: function (row) {
                if (row['created_at'] != null) {
                    var m = moment(row['created_at'] * 1000);
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
