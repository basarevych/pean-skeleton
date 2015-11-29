'use strict';

var module = angular.module('state.role-list', []);

module.controller("RoleListCtrl",
    [ '$scope', '$window', '$filter', '$q', 'globalizeWrapper', 'dynamicTable', 'RoleApi', 'CreateRoleForm', 'EditRoleForm', 'InfoDialog',
    function ($scope, $window, $filter, $q, globalizeWrapper, dynamicTable, RoleApi, CreateRoleForm, EditRoleForm, InfoDialog) {
        if (!$scope.appControl.aclCheckCurrentState())
            return; // Disable this controller

        $scope.hasSelection = false;
        $scope.hasSingleSelection = false;
        $scope.tableCtrl = dynamicTable({
            url: $window['config']['apiUrl'] + '/role/table',
            row_id_column: 'id',
            sort_column: 'id',
            mapper: function (row) { return row; },
        });

        $scope.createRole = function () {
            RoleApi.list({ view: 'tree' })
                .then(function (roles) {
                    var translations = {};
                    translations[$scope.appControl.getProfile().locale.current] = {
                        title: $filter('glMessage')('TOP_ROLE_LABEL'),
                    };
                    roles.unshift({
                        id: null,
                        handle: "null",
                        roles: [],
                        translations: translations,
                        focus: true,
                    });
                    CreateRoleForm(roles)
                        .then(function () {
                            $scope.tableCtrl.plugin.refresh();
                        });
                });
        };

        $scope.editRole = function () {
            var sel = $scope.tableCtrl.plugin.getSelected();
            $q.all([ RoleApi.read({ id: sel[0] }), RoleApi.list({ view: 'tree' }) ])
                .then(function (result) {
                    var role = result[0];
                    var roles = result[1];

                    var translations = {};
                    translations[$scope.appControl.getProfile().locale.current] = {
                        title: $filter('glMessage')('TOP_ROLE_LABEL'),
                    };
                    roles.unshift({
                        id: null,
                        handle: "null",
                        roles: [],
                        translations: translations,
                        focus: true,
                    });

                    function disableRoles(arr) {
                        $.each(arr, function (index, item) {
                            if (item.id == role.id)
                                item.disabled = true;
                            disableRoles(item.roles);
                        });
                    }
                    disableRoles(roles);

                    EditRoleForm(role, roles)
                        .then(function () {
                            $scope.tableCtrl.plugin.refresh();
                        });
                });
        };

        $scope.deleteRole = function () {
            var sel = $scope.tableCtrl.plugin.getSelected();

            InfoDialog({
                title: 'ROLE_CONFIRM_DELETE_TITLE',
                text: 'ROLE_CONFIRM_DELETE_TEXT',
                yes: 'ROLE_CONFIRM_DELETE_BUTTON',
            }).result
                .then(function () {
                    var promises = [];
                    if (sel === 'all') {
                        promises.push(RoleApi.delete());
                    } else {
                        $.each(sel, function (index, value) {
                            promises.push(RoleApi.delete({ id: value }));
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
