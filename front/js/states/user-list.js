'use strict';

var module = angular.module('state.user-list', []);

module.controller("UserListCtrl",
    [ '$scope', '$window', '$filter', '$q', 'dynamicTable', 'RoleApi', 'UserApi', 'CreateUserForm', 'EditUserForm',
    function ($scope, $window, $filter, $q, dynamicTable, RoleApi, UserApi, CreateUserForm, EditUserForm) {
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

                if (row['tokens'] > 0)
                    row['tokens'] = '<a href="/#/user/' + row['id'] + '/token">' + row['tokens'] + '</a>'

                return row;
            },
        });

        $scope.createUser = function () {
            RoleApi.list()
                .then(function (roles) {
                    var preselected = [];
                    $.each(roles, function (index, role) {
                        if (role.handle == 'member') {
                            role.checked = true;
                            preselected.push(role.id);
                            return false;
                        }
                    });
                    if (roles.length > 0)
                        roles[0]['focus'] = true;
                    CreateUserForm(preselected, roles)
                        .then(function () {
                            $scope.tableCtrl.plugin.refresh();
                        });
                });
        };

        $scope.editUser = function () {
            var sel = $scope.tableCtrl.plugin.getSelected();
            $q.all([ UserApi.read({ id: sel[0] }), RoleApi.list() ])
                .then(function (result) {
                    var user = result[0];
                    var roles = result[1];
                    $.each(roles, function (index, role) {
                        if ($.inArray(role.id, user.roles) != -1)
                            role.checked = true;
                    });
                    if (roles.length > 0)
                        roles[0]['focus'] = true;
                    EditUserForm(user, roles)
                        .then(function () {
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
                if ($scope.tableCtrl.statusCode == 401 || $scope.tableCtrl.statusCode == 403)
                    $window.location.reload();
                return;
            }

            var sel = $scope.tableCtrl.plugin.getSelected();
            $scope.hasSelection = (sel == 'all' || sel.length);
            $scope.hasSingleSelection = (sel != 'all' && sel.length == 1);
        });
    } ]
);
