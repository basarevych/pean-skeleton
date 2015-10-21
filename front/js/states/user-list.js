'use strict';

var module = angular.module('state.user-list', []);

module.controller("UserListCtrl",
    [ '$scope', '$window', '$filter', '$q', 'dynamicTable', 'RoleApi', 'UserApi', 'CreateUserForm', 'EditUserForm', 'InfoDialog',
    function ($scope, $window, $filter, $q, dynamicTable, RoleApi, UserApi, CreateUserForm, EditUserForm, InfoDialog) {
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
            RoleApi.list({ view: 'tree' })
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
            $q.all([ UserApi.read({ id: sel[0] }), RoleApi.list({ view: 'tree' }) ])
                .then(function (result) {
                    var user = result[0];
                    var roles = result[1];

                    function selectRoles(arr) {
                        $.each(arr, function (index, role) {
                            if ($.inArray(role.id, user.roles) != -1)
                                role.checked = true;
                            selectRoles(role.roles);
                        });
                    }
                    selectRoles(roles);

                    if (roles.length > 0)
                        roles[0]['focus'] = true;
                    EditUserForm(user, roles)
                        .then(function () {
                            $scope.tableCtrl.plugin.refresh();
                        });
                });
        };

        $scope.deleteUser = function () {
            var sel = $scope.tableCtrl.plugin.getSelected();

            InfoDialog({
                title: 'USER_CONFIRM_DELETE_TITLE',
                text: 'USER_CONFIRM_DELETE_TEXT',
                yes: 'USER_CONFIRM_DELETE_BUTTON',
            }).result
                .then(function () {
                    var promises = [];
                    if (sel === 'all') {
                        promises.push(UserApi.delete());
                    } else {
                        $.each(sel, function (index, value) {
                            promises.push(UserApi.delete({ id: value }));
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
