'use strict';

var app = angular.module('app', [
    'ngResource',               // Angular HTTP $resource
    'ngCookies',                // Angular Cookie support
    'ngAnimate',                // Angular Animations
    'angular-loading-bar',      // Loading spinner
    'globalizeWrapper',         // jQuery.Globalize wrapper
    'ui.router',                // AngularUI Router
    'ui.bootstrap',             // AngularUI Bootstrap
    'ui.tree',                  // AngularUI Tree
    'dynamicTable',             // DynamicTable
    'hljs',                     // HighlightJS
    'api',
    'services',
    'directives',
    'filters',
    'forms',
    'state.layout',
    'state.index',
    'state.profile',
    'state.role-list',
    'state.permission-list',
    'state.user-list',
    'state.token-list',
    'state.job-list',
    'state.send-notification',
]);

app.config(
    [ '$stateProvider', '$urlRouterProvider',
    function ($stateProvider, $urlRouterProvider) {
        $stateProvider
            .state('layout', {
                abstract: true,
                controller: 'LayoutCtrl',
                templateUrl: 'views/layout.html',
            })
            .state('layout.index', {
                url: '/',
                title: 'APP_TITLE',
                controller: 'IndexCtrl',
                templateUrl: 'views/index.html',
            })
            .state('layout.profile', {
                url: '/profile',
                title: 'APP_TITLE',
                controller: 'ProfileCtrl',
                templateUrl: 'views/profile.html',
            })
            .state('layout.role-list', {
                url: '/role',
                title: 'APP_TITLE',
                controller: 'RoleListCtrl',
                templateUrl: 'views/role-list.html',
                roles: [ 'admin' ],
            })
            .state('layout.permission-list', {
                url: '/permission',
                title: 'APP_TITLE',
                controller: 'PermissionListCtrl',
                templateUrl: 'views/permission-list.html',
                roles: [ 'admin' ],
            })
            .state('layout.user-list', {
                url: '/user',
                title: 'APP_TITLE',
                controller: 'UserListCtrl',
                templateUrl: 'views/user-list.html',
                roles: [ 'admin' ],
            })
            .state('layout.token-list', {
                url: '/user/:userId/token',
                title: 'APP_TITLE',
                controller: 'TokenListCtrl',
                templateUrl: 'views/token-list.html',
                roles: [ 'admin' ],
            })
            .state('layout.job-list', {
                url: '/job',
                title: 'APP_TITLE',
                controller: 'JobListCtrl',
                templateUrl: 'views/job-list.html',
                roles: [ 'admin' ],
            })
            .state('layout.send-notification', {
                url: '/notify',
                title: 'APP_TITLE',
                controller: 'SendNotificationCtrl',
                templateUrl: 'views/send-notification.html',
                roles: [ 'admin' ],
            });

        $urlRouterProvider
            .otherwise('/');
    } ]
);

app.config(
    [ 'globalizeWrapperProvider',
    function (globalizeWrapperProvider) {
        globalizeWrapperProvider.setCldrBasePath('cldr');
        globalizeWrapperProvider.setL10nBasePath('l10n');
    } ]
);

app.config(
    [ 'dynamicTableProvider',
    function (dynamicTableProvider) {
        dynamicTableProvider.setTranslationFilter('glMessage');
    } ]
);

app.config(
    [ 'hljsServiceProvider',
    function (hljsServiceProvider) {
        hljsServiceProvider.setOptions({
            tabReplace: '    ',
        });
    } ]
);

app.run(
    [ '$rootScope', '$window', '$state', '$stateParams', '$filter', '$timeout', 'AppControl', 'SocketServer',
    function ($rootScope, $window, $state, $stateParams, $filter, $timeout, AppControl, SocketServer) {
        PNotify.prototype.options.styling = "bootstrap3";

        $rootScope.appControl = AppControl;
        $rootScope.socketServer = SocketServer;
        $rootScope.$state = $state;
        $rootScope.$stateParams = $stateParams;
        $rootScope.pageTitle = 'Loading...',
        $rootScope.initialized = false;

        $rootScope.$on('$stateChangeSuccess', function (event, toState) {
            $rootScope.pageTitle = $filter('glMessage')(toState.title);
        });
        $rootScope.$on('AppInitialized', function () {
            $timeout(function () { $rootScope.initialized = true; }, 101);
        });

        AppControl.init();
    } ]
);
