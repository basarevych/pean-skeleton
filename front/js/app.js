'use strict';

var app = angular.module('app', [
    'ngResource',               // Angular HTTP $resource
    'ngCookies',                // Angluar Cookie support
    'ngAnimate',
    'angular-loading-bar',      // Loading spinner
    'globalizeWrapper',         // jQuery.Globalize wrapper
    'ui.router',                // AngularUI Router
    'ui.bootstrap',             // AngularUI Bootstrap
    'dynamicTable',             // DynamicTable
    'api',
    'services',
    'directives',
    'filters',
    'forms',
    'state.layout',
    'state.index',
    'state.user',
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
            .state('layout.user', {
                url: '/user',
                title: 'APP_TITLE',
                controller: 'UserCtrl',
                templateUrl: 'views/user.html',
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

app.run(
    [ '$rootScope', '$window', '$state', '$stateParams', '$filter', '$timeout', 'AppControl', 'LoginForm',
    function ($rootScope, $window, $state, $stateParams, $filter, $timeout, AppControl, LoginForm) {
        $rootScope.$state = $state;
        $rootScope.$stateParams = $stateParams;
        $rootScope.appControl = AppControl;
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
            $rootScope.initialized = true;
        });

        AppControl.init();
    } ]
);
