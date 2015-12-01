'use strict';

var module = angular.module('state.job-list', []);

module.controller("JobListCtrl",
    [ '$scope', '$window', '$filter', '$q', 'dynamicTable', 'JobApi', 'CreateJobForm', 'EditJobForm', 'InfoDialog',
    function ($scope, $window, $filter, $q, dynamicTable, JobApi, CreateJobForm, EditJobForm, InfoDialog) {
        if (!$scope.appControl.aclCheckCurrentState())
            return; // Disable this controller

        $scope.hasSelection = false;
        $scope.hasSingleSelection = false;
        $scope.tableCtrl = dynamicTable({
            url: $window['config']['apiUrl'] + '/job/table',
            row_id_column: 'id',
            sort_column: 'id',
            mapper: function (row) {
                if (row['created_at'] != null) {
                    var m = moment.unix(row['created_at']).local();
                    row['created_at'] = m.format($filter('glMessage')('DT_DATE_TIME_FORMAT'));
                }

                if (row['scheduled_for'] != null) {
                    var m = moment.unix(row['scheduled_for']).local();
                    row['scheduled_for'] = m.format($filter('glMessage')('DT_DATE_TIME_FORMAT'));
                }

                if (row['valid_until'] != null) {
                    var m = moment.unix(row['valid_until']).local();
                    row['valid_until'] = m.format($filter('glMessage')('DT_DATE_TIME_FORMAT'));
                }

                return row;
            },
        });

        $scope.createJob = function () {
            JobApi.statuses()
                .then(function (statuses) {
                    CreateJobForm(statuses)
                        .then(function () {
                            $scope.tableCtrl.plugin.refresh();
                        });
                });
        };

        $scope.editJob = function () {
            var sel = $scope.tableCtrl.plugin.getSelected();
            $q.all([ JobApi.read({ id: sel[0] }), JobApi.statuses() ])
                .then(function (result) {
                    var job = result[0];
                    var statuses = result[1];
                    EditJobForm(job, statuses)
                        .then(function () {
                            $scope.tableCtrl.plugin.refresh();
                        });
                });
        };

        $scope.deleteJob = function () {
            var sel = $scope.tableCtrl.plugin.getSelected();

            InfoDialog({
                title: 'JOB_CONFIRM_DELETE_TITLE',
                text: 'JOB_CONFIRM_DELETE_TEXT',
                yes: 'JOB_CONFIRM_DELETE_BUTTON',
            }).result
                .then(function () {
                    var promises = [];
                    if (sel === 'all') {
                        promises.push(JobApi.delete());
                    } else {
                        $.each(sel, function (index, value) {
                            promises.push(JobApi.delete({ id: value }));
                        });
                    }

                    $q.all(promises)
                        .then(function (result) {
                            $scope.tableCtrl.plugin.refresh();

                            var failure = null;
                            result.some(function (item) {
                                if (item.success == false) {
                                    failure = item.errors.join('<br>');
                                    return true;
                                }
                                return false;
                            });

                            if (failure) {
                                InfoDialog({
                                    title: 'ERROR_OPERATION_FAILED',
                                    text: failure,
                                });
                            }
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
