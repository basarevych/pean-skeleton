'use strict';

var module = angular.module('state.token-list', []);

module.controller("TokenListCtrl",
    [ '$scope', '$window', '$filter', '$q', 'dynamicTable', 'UserApi', 'TokenApi', 'TokenPayloadForm', 'InfoDialog',
    function ($scope, $window, $filter, $q, dynamicTable, UserApi, TokenApi, TokenPayloadForm, InfoDialog) {
        if (!$scope.appControl.aclCheckCurrentState())
            return; // Disable this controller

        $scope.userEmail = null;
        UserApi.read({ id: $scope.$stateParams.userId })
            .then(function (data) {
                $scope.userEmail = data.email;
            });

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
                    TokenPayloadForm(JSON.stringify(data.payload, undefined, 4));
                });
        };

        $scope.deleteToken = function () {
            var sel = $scope.tableCtrl.plugin.getSelected();

            InfoDialog({
                title: 'TOKEN_CONFIRM_DELETE_TITLE',
                text: 'TOKEN_CONFIRM_DELETE_TEXT',
                yes: 'TOKEN_CONFIRM_DELETE_BUTTON',
            }).result
                .then(function () {
                    var promises = [];
                    if (sel === 'all') {
                        promises.push(TokenApi.delete());
                    } else {
                        $.each(sel, function (index, value) {
                            promises.push(TokenApi.delete({ id: value }));
                        });
                    }

                    $q.all(promises)
                        .finally(function () {
                            $scope.tableCtrl.plugin.refresh();
                        });
                });
        };

        $scope.$watch('tableCtrl.event', function () {
            if (!$scope.tableCtrl.event)
                return;

            var event = $scope.tableCtrl.event;
            $scope.tableCtrl.event = null;

            if (event == 'http-error') {
                if ($scope.tableCtrl.statusCode == 401)
                    $window.location.reload();
                return;
            }

            var sel = $scope.tableCtrl.plugin.getSelected();
            $scope.hasSelection = (sel == 'all' || sel.length);
            $scope.hasSingleSelection = (sel != 'all' && sel.length == 1);
        });
    } ]
);
