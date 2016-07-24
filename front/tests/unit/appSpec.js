'use strict';

var io = { connect: function () { return { on: function () {} }; } };

describe('Application', function() {

    window['config'] = { api_url: '/mock-api' };

    var $rootScope, spy, $httpBackend;

    var fakeLocale = {
        current: 'en',
        default: 'ru',
        available: [ 'en', 'ru' ],
    };
    var cldrBasePath = 'bower_components/cldr-data';
    var l10nBasePath = 'tests/l10n';
    var mainResources = [
        'currencies.json',
        'ca-gregorian.json',
        'timeZoneNames.json',
        'numbers.json'
    ];
    var supplementalResources = [
        'currencyData.json',
        'likelySubtags.json',
        'plurals.json',
        'timeData.json',
        'weekData.json'
    ];

    beforeEach(function (){
        angular.mock.module('app', function (globalizeWrapperProvider) {
            globalizeWrapperProvider.setCldrBasePath(cldrBasePath);
            globalizeWrapperProvider.setL10nBasePath(l10nBasePath);
            globalizeWrapperProvider.setMainResources(mainResources);
            globalizeWrapperProvider.setSupplementalResources(supplementalResources);
        });
    });

    beforeEach(inject(function (_$rootScope_, _$httpBackend_) {
        $rootScope = _$rootScope_;
        spy = spyOn($rootScope, '$broadcast').and.callThrough();

        $httpBackend = _$httpBackend_;
        $httpBackend.expectGET('/mock-api/profile')
            .respond({
                locale: fakeLocale,
                user_id: null,
                name: 'anonymous',
                email: null,
                roles: [ 'role1' ],
            });

        fakeLocale.available.forEach(function (locale) {
            for (var i = 0; i < mainResources.length; i++) {
                var file = cldrBasePath + '/main/' + locale + '/' + mainResources[i];
                $httpBackend.expectGET(file).respond(readJSON(file));
            }
            var file = l10nBasePath + '/' + locale + '.json';
            $httpBackend.expectGET(file).respond(readJSON(file));
        });

        for (var i = 0; i < supplementalResources.length; i++) {
            var file = cldrBasePath + '/supplemental/' + supplementalResources[i];
            $httpBackend.expectGET(file).respond(readJSON(file));
        }

        $httpBackend.flush();
    }));

    afterEach(function () {
        $httpBackend.verifyNoOutstandingExpectation();
        $httpBackend.verifyNoOutstandingRequest();
    });


    it('root scope should have been initialized', function () {
        expect($rootScope.$state).toBeDefined();
        expect($rootScope.$stateParams).toBeDefined();
        expect($rootScope.appControl).toBeDefined();
        expect(spy).toHaveBeenCalledWith('AppInitialized');
    });

});
