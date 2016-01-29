'use strict';

var io = { connect: function () { return { on: function () {} }; } };

describe('Application', function() {

    window['config'] = { apiUrl: '/mock-api' };

    var $rootScope, spy, $httpBackend;

    var fakeLocale = {
        current: 'en',
        default: 'ru',
        available: [ 'en', 'ru' ],
    };

    beforeEach(function (){
        angular.mock.module('app', function (globalizeWrapperProvider) {
            globalizeWrapperProvider.setL10nBasePath('l10n');
            globalizeWrapperProvider.setMainResources([]);
            globalizeWrapperProvider.setSupplementalResources([]);
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

        $httpBackend.expectGET('l10n/' + fakeLocale.current.substr(0, 2) + '.json')
            .respond({ });

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
