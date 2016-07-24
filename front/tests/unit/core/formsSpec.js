'use strict';

describe('Form', function () {

    describe('InfoDialog', function () {

        window['config'] = { api_url: '/mock-api' };

        beforeEach(function (){
            angular.mock.module('services', function (globalizeWrapperProvider) {
                globalizeWrapperProvider.setMainResources([]);
                globalizeWrapperProvider.setSupplementalResources([]);
            });
        });

        it('Returns null if already open', inject(function (InfoDialog) {
            var first = InfoDialog({ title: 'Title', text: 'Text' });
            var second = InfoDialog({ title: 'Title', text: 'Text' });

            expect(first).not.toBe(null);
            expect(second).toBe(null);
        }));
    });

    describe('ValidationCtrl', function() {

        var ValidationCtrl, scope,
            model = {
                login:    { name: 'login',    value: '', focus: true, required: true },
                password: { name: 'password', value: '', focus: false, required: false },
            };

        beforeEach(angular.mock.module('forms'));

        beforeEach(inject(function (_ValidationCtrl_, $rootScope) {
            ValidationCtrl = _ValidationCtrl_.pop();
            scope = $rootScope.$new();

            var modal = $('<div class="modal"></div>');
            modal.css('display', 'block');
            modal.appendTo($('body'));
        }));


        it('initializes scope', function () {
            var ctrl = ValidationCtrl(scope, undefined, model, undefined, undefined);

            expect(scope.model).toEqual(model);
            expect(scope.validation).toEqual({ messages: [], errors: {} });
         })

        it('resets validation', function () {
            var ctrl = ValidationCtrl(scope, undefined, model, undefined, undefined);

            scope.validation.errors = { login: [ 'foo' ], password: [ 'bar' ] };
            scope.resetValidation();
            expect(scope.validation.errors).toEqual({});

            scope.validation.errors = { login: [ 'foo' ], password: [ 'bar' ] };
            scope.resetValidation('password');
            expect(scope.validation.errors).toEqual({ login: [ 'foo' ], password: [] });
        });

        it('validates', inject(function ($q, $timeout) {
            var deferred = $q.defer();

            var request;
            var validator = function (params) {
                request = params;
                return deferred.promise;
            }

            var ctrl = ValidationCtrl(scope, undefined, model, validator, undefined);
            scope.model.login.value = 'foo';
            scope.model.password.value = 'bar';

            scope.validate('login');
            $timeout.flush();

            deferred.resolve({ success: false, errors: [ 'foobar' ] });
            scope.$digest();
            expect(scope.validation.errors.login).toEqual([ 'foobar' ]);
        }));

        it('submits', inject(function ($q) {
            var deferred = $q.defer();

            var request;
            function worker(params) {
                request = params;
                return deferred.promise;
            }

            var ctrl = ValidationCtrl(scope, undefined, model, undefined, worker);

            scope.submit();

            deferred.resolve({ success: false, messages: [ 'baz' ], errors: { password: [ 'foobar' ] } });
            scope.$digest();
            expect(scope.validation.messages).toEqual([ 'baz' ]);
            expect(scope.validation.errors.password).toEqual([ 'foobar' ]);
            expect(scope.model.password.focus).toBeTruthy();
        }));

    });

});
