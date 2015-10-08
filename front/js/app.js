'use strict';

var app = angular.module('app', [
    'ngResource',               // Angular HTTP $resource
    'ngCookies',                // Angular Cookie support
    'ngAnimate',                // Angular Animations
    'angular-loading-bar',      // Loading spinner
    'globalizeWrapper',         // jQuery.Globalize wrapper
    'ui.router',                // AngularUI Router
    'ui.bootstrap',             // AngularUI Bootstrap
    'dynamicTable',             // DynamicTable
    'hljs',                     // HighlightJS
    'api',
    'services',
    'directives',
    'filters',
    'forms',
    'state.layout',
    'state.index',
    'state.user-list',
    'state.token-list',
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
    [ '$rootScope', '$window', '$state', '$stateParams', '$filter', '$timeout', 'AppControl', 'Socket', 'LoginForm',
    function ($rootScope, $window, $state, $stateParams, $filter, $timeout, AppControl, Socket, LoginForm) {
        PNotify.prototype.options.styling = "bootstrap3";

        $rootScope.appControl = AppControl;
        $rootScope.socket = Socket;
        $rootScope.$state = $state;
        $rootScope.$stateParams = $stateParams;
        $rootScope.pageTitle = 'Loading...',
        $rootScope.initialized = false;

        $rootScope.login = function () {
            LoginForm()
                .then(function (data) {
                    AppControl.setToken(data.token);
                    AppControl.loadProfile(function () {
                        $state.go($state.current.name, $stateParams, { reload: true });
                    });
                });
        };

        $rootScope.$on('$stateChangeSuccess', function (event, toState) {
            $rootScope.pageTitle = $filter('glMessage')(toState.title);
        });
        $rootScope.$on('AppInitialized', function () {
            $timeout(function () { $rootScope.initialized = true; }, 101);
        });

        Socket.init();
        AppControl.init();
    } ]
);
