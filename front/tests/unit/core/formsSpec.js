'use strict';

describe('Form', function () {

    describe('InfoDialog', function () {

        window['config'] = { apiUrl: '/mock-api' };

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

    describe('ModalFormCtrl', function() {

        var ModalFormCtrl, scope,
            fields = [
                { name: 'login',    value: '', focus: true },
                { name: 'password', value: '', focus: false },
            ];

        beforeEach(angular.mock.module('forms'));

        beforeEach(inject(function (_ModalFormCtrl_, $rootScope) {
            ModalFormCtrl = _ModalFormCtrl_;
            scope = $rootScope.$new();

            var modal = $('<div class="modal"></div>');
            modal.css('display', 'block');
            modal.appendTo($('body'));
        }));


        it('initializes scope', function () {
            var ctrl = ModalFormCtrl(scope, undefined, fields, undefined, undefined),
                model = {
                    login:    { name: 'login',    value: '', focus: true },
                    password: { name: 'password', value: '', focus: false },
                };

            expect(scope.model).toEqual(model);
            expect(scope.validation).toEqual({ errors: [], fields: {} });
         })

        it('resets validation', function () {
            var ctrl = ModalFormCtrl(scope, undefined, fields, undefined, undefined);

            scope.validation.fields = { field1: [ 'foo' ], field2: [ 'bar' ] };
            scope.resetValidation();
            expect(scope.validation.fields).toEqual({});

            scope.validation.fields = { field1: [ 'foo' ], field2: [ 'bar' ] };
            scope.resetValidation('field2');
            expect(scope.validation.fields).toEqual({ field1: [ 'foo' ], field2: undefined });
        });

        it('validates', inject(function ($q, $timeout) {
            var deferred = $q.defer();

            var request;
            var validator = function (params) {
                request = params;
                return deferred.promise;
            }

            var ctrl = ModalFormCtrl(scope, undefined, fields, validator, undefined);
            scope.model.login.value = 'foo';
            scope.model.password.value = 'bar';

            scope.validate();
            $timeout.flush();

            deferred.resolve({ valid: false, errors: { login: [ 'foobar' ] } });
            scope.$digest();
            expect(scope.validation.fields.login).toEqual([ 'foobar' ]);
        }));

        it('submits', inject(function ($q) {
            var deferred = $q.defer();

            var request;
            function worker(params) {
                request = params;
                return deferred.promise;
            }

            var ctrl = ModalFormCtrl(scope, undefined, fields, undefined, worker);

            scope.submit();

            deferred.resolve({ valid: false, errors: [ 'baz' ], fields: { password: [ 'foobar' ] } });
            scope.$digest();
            expect(scope.validation.errors).toEqual([ 'baz' ]);
            expect(scope.validation.fields.password).toEqual([ 'foobar' ]);
            expect(scope.model.password.focus).toBeTruthy();
        }));

    });

});