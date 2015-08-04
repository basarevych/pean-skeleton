'use strict';

describe('Service', function() {

    describe('AppControl', function () {

        var AppControl, $httpBackend;

        var fakeLocale = {
            current: 'en_US',
            fallback: 'ru_RU',
            available: [ 'en_US', 'ru_RU' ],
        };

        beforeEach(function (){
            window['config'] = { apiUrl: '/mock-api' };

            angular.mock.module('services', function (globalizeWrapperProvider) {
                globalizeWrapperProvider.setMainResources([]);
                globalizeWrapperProvider.setSupplementalResources([]);
            });
        });

        beforeEach(inject(function (_AppControl_, _$httpBackend_) {
            AppControl = _AppControl_;
            $httpBackend = _$httpBackend_;
        }));

        afterEach(function () {
            $httpBackend.verifyNoOutstandingExpectation();
            $httpBackend.verifyNoOutstandingRequest();
        });


        it('Error methods should work', function () {
            expect(AppControl.isError()).toBeFalsy();
            expect(AppControl.getError()).toBe(null);

            AppControl.setError('INTERNAL');
            expect(AppControl.isError()).toBeTruthy();
            expect(AppControl.getError()).toBe('INTERNAL');
        });

        it('Token methods should work', inject(function ($http) {
            var storedToken = {
                key: null,
                value: null,
            };

            spyOn(localStorage, 'setItem').and.callFake(function (key, value) {
                storedToken.key = key;
                storedToken.value = value;
            });
            spyOn(localStorage, 'getItem').and.callFake(function (key) {
                expect(key).toBe(storedToken.key);
                return storedToken.value;
            });
            spyOn(localStorage, 'removeItem').and.callFake(function (key) {
                expect(key).toBe(storedToken.key);
                storedToken.value = null;
            });

            expect(AppControl.hasToken()).toBeFalsy();
            expect(storedToken.value).toBeNull();
            expect($http.defaults.headers.common['Authorization']).toBeUndefined();

            AppControl.setToken('foobar');
            expect(AppControl.hasToken()).toBeTruthy();
            expect(storedToken.value).toBe('foobar');
            expect($http.defaults.headers.common['Authorization']).toBe('Bearer foobar');

            AppControl.removeToken();
            expect(AppControl.hasToken()).toBeFalsy();
            expect(storedToken.value).toBeNull();
            expect($http.defaults.headers.common['Authorization']).toBeUndefined();
        }));

        it('isAllowed() method should work', inject(function ($state) {
            $httpBackend.expectGET('/mock-api/profile')
                .respond({
                    locale: fakeLocale,
                    userId: null,
                    login: 'anonymous',
                    roles: [ 'role1' ],
                });

            $httpBackend.expectGET('l10n/' + fakeLocale.current.substr(0, 2) + '.json')
                .respond({ });

            var publicState = {};
            var privateAllowedState = {
                roles: [ 'role1', 'role2' ]
            };
            var privateDeniedState = {
                roles: [ 'role3' ]
            };

            spyOn($state, 'get').and.callFake(function (name) {
                if (name == 'public')
                    return publicState;
                if (name == 'privateAllowed')
                    return privateAllowedState;
                if (name == 'privateDenied')
                    return privateDeniedState;
                fail('Unknown state requested');
            });

            AppControl.init(); // Get roles
            $httpBackend.flush();

            expect(AppControl.isAllowed('public')).toBeTruthy();
            expect(AppControl.isAllowed('privateAllowed')).toBeTruthy();
            expect(AppControl.isAllowed('privateDenied')).toBeFalsy();
        }));

        it('aclCheckCurrentState() is working', function () {
            var result = true;
            spyOn(AppControl, 'isAllowed').and.callFake(function() { return result; });
            expect(AppControl.aclCheckCurrentState()).toBeTruthy();
            expect(AppControl.isError()).toBeFalsy();
            expect(AppControl.getError()).toBeNull();

            result = false; 
            expect(AppControl.aclCheckCurrentState()).toBeFalsy();
            expect(AppControl.isError()).toBeTruthy();
            expect(AppControl.getError()).toBe('ACL');

            result = true;
            expect(AppControl.aclCheckCurrentState()).toBeTruthy();
            expect(AppControl.isError()).toBeFalsy();
            expect(AppControl.getError()).toBeNull();
        });

        it('loadProfile() sets headers', inject(function ($cookies, $http) {
            $httpBackend.whenGET('/mock-api/profile')
                .respond({
                    locale: fakeLocale,
                    userId: null,
                    name: 'anonymous',
                    email: null,
                    roles: [ 'role1' ],
                });

            $httpBackend.whenGET('l10n/' + fakeLocale.current.substr(0, 2) + '.json')
                .respond({ });

            var result;
            spyOn($cookies, 'get').and.callFake(function() { return result; });

            result = undefined;
            AppControl.loadProfile();
            $httpBackend.flush();
            expect($http.defaults.headers.common['Accept-Language']).toBeUndefined();

            result = 'en';
            AppControl.loadProfile();
            $httpBackend.flush();
            expect($http.defaults.headers.common['Accept-Language']).toBe('en');
        }));

        it('loadProfile() sets Globalize locale', inject(function (globalizeWrapper) {
            fakeLocale.current = 'ru';
            $httpBackend.whenGET('/mock-api/profile')
                .respond({
                    locale: fakeLocale,
                    userId: null,
                    name: 'anonymous',
                    email: null,
                    roles: [ 'role1' ],
                });
            $httpBackend.whenGET('l10n/' + fakeLocale.current.substr(0, 2) + '.json')
                .respond({ });

            AppControl.loadProfile();
            $httpBackend.flush();
            expect(globalizeWrapper.getLocale()).toBe(fakeLocale.current.substr(0, 2));
        }));

        it('loadProfile() runs done()', inject(function ($state, $stateParams) {
            $httpBackend.whenGET('/mock-api/profile')
                .respond({
                    locale: fakeLocale,
                    userId: null,
                    name: 'anonymous',
                    email: null,
                    roles: [ 'role1' ],
                });
            $httpBackend.whenGET('l10n/' + fakeLocale.current.substr(0, 2) + '.json')
                .respond({ });

            var called = false;
            AppControl.loadProfile(function () { called = true; })
            $httpBackend.flush();
            expect(called).toBeTruthy();
        }));

        it('init() requires config var', function () {
            window['config'] = undefined;
            AppControl.init();
            expect(AppControl.isReady()).toBeFalsy();
            expect(AppControl.isError()).toBeTruthy();
            expect(AppControl.getError()).toBe('CONFIG');
        });

        it('init() loads access token', function () {
            $httpBackend.expectGET('/mock-api/profile')
                .respond({
                    locale: fakeLocale,
                    userId: null,
                    name: 'anonymous',
                    email: null,
                    roles: [ 'role1' ],
                });
            $httpBackend.expectGET('l10n/' + fakeLocale.current.substr(0, 2) + '.json')
                .respond({ });

            var tokenKey = null;
            spyOn(localStorage, 'getItem').and.callFake(function (key) {
                tokenKey = key;
                return 'foobar';
            });

            var spy = spyOn(AppControl, 'setToken').and.callThrough();

            AppControl.init();
            $httpBackend.flush();
            expect(tokenKey).not.toBe(null);
            expect(spy).toHaveBeenCalledWith('foobar');
         });

        it('init() works', inject(function ($rootScope, $state) {
            $httpBackend.expectGET('/mock-api/profile')
                .respond({
                    locale: fakeLocale,
                    userId: null,
                    name: 'anonymous',
                    email: null,
                    roles: [ 'role1' ],
                });
            $httpBackend.expectGET('l10n/' + fakeLocale.current.substr(0, 2) + '.json')
                .respond({ });

            var broadcastSpy = spyOn($rootScope, '$broadcast').and.callThrough();
            var stateSpy = spyOn($state, 'go').and.returnValue(true);

            $state.go('foobar');
            AppControl.init();
            $httpBackend.flush();
            expect(AppControl.isReady()).toBeTruthy();
            expect(broadcastSpy).toHaveBeenCalledWith('AppInitialized');
            expect(stateSpy).toHaveBeenCalledWith('foobar');
        }));

    });

});
