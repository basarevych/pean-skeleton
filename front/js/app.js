'use strict';

var app = angular.module('app', [
    'ngResource',               // Angular HTTP $resource
    'ngCookies',                // Angluar Cookie support
    'angular-loading-bar',      // Loading spinner
    'globalizeWrapper',         // jQuery.Globalize wrapper
    'ui.router',                // AngularUI Router
    'ui.bootstrap',             // AngularUI Bootstrap
    'api',
    'services',
    'directives',
    'filters',
    'forms',
    'state.layout',
    'state.index',
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

app.run(
    [ '$rootScope', '$state', '$stateParams', '$filter', '$timeout', 'AppControl', 'LoginForm',
    function ($rootScope, $state, $stateParams, $filter, $timeout, AppControl, LoginForm) {
        $rootScope.pageTitle = 'Loading...',
        $rootScope.$state = $state;
        $rootScope.$stateParams = $stateParams;
        $rootScope.appControl = AppControl;
        $rootScope.login = function () {
            LoginForm()
                .then(function (data) {
                    AppControl.setToken(data.token);
                    $timeout(function () { AppControl.loadProfile(true); }, 101);
                });
        };

        $rootScope.$on('$stateChangeSuccess', function (event, toState) {
            $rootScope.pageTitle = $filter('glMessage')(toState.title);
        });

        AppControl.init();
    } ]
);
