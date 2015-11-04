'use strict';

var module = angular.module('state.permission-list', []);

module.controller("PermissionListCtrl",
    [ '$scope', '$window', '$filter', '$q', 'dynamicTable', 'RoleApi', 'PermissionApi', 'CreatePermissionForm', 'EditPermissionForm', 'InfoDialog',
    function ($scope, $window, $filter, $q, dynamicTable, RoleApi, PermissionApi, CreatePermissionForm, EditPermissionForm, InfoDialog) {
        if (!$scope.appControl.aclCheckCurrentState())
            return; // Disable this controller

        $scope.hasSelection = false;
        $scope.hasSingleSelection = false;
        $scope.tableCtrl = dynamicTable({
            url: $window['config']['apiUrl'] + '/permission/table',
            row_id_column: 'id',
            sort_column: 'id',
        });

        $scope.createPermission = function () {
            RoleApi.list({ view: 'tree' })
                .then(function (roles) {
                    if (roles.length)
                        roles[0]['focus'] = true;
                    CreatePermissionForm(roles)
                        .then(function () {
                            $scope.tableCtrl.plugin.refresh();
                        });
                });
        };

        $scope.editPermission = function () {
            var sel = $scope.tableCtrl.plugin.getSelected();
            $q.all([ PermissionApi.read({ id: sel[0] }), RoleApi.list({ view: 'tree' }) ])
                .then(function (result) {
                    var permission = result[0];
                    var roles = result[1];
                    if (roles.length)
                        roles[0]['focus'] = true;

                    EditPermissionForm(permission, roles)
                        .then(function () {
                            $scope.tableCtrl.plugin.refresh();
                        });
                });
        };

        $scope.deletePermission = function () {
            var sel = $scope.tableCtrl.plugin.getSelected();

            InfoDialog({
                title: 'PERMISSION_CONFIRM_DELETE_TITLE',
                text: 'PERMISSION_CONFIRM_DELETE_TEXT',
                yes: 'PERMISSION_CONFIRM_DELETE_BUTTON',
            }).result
                .then(function () {
                    var promises = [];
                    if (sel === 'all') {
                        promises.push(PermissionApi.delete());
                    } else {
                        $.each(sel, function (index, value) {
                            promises.push(PermissionApi.delete({ id: value }));
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
