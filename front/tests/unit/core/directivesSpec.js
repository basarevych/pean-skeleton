'use strict';

describe('Directive', function() {

    var element, scope;

    function compileDirective(tpl) {
        inject(function ($compile) {
            element = $compile(tpl)(scope);
            element.appendTo(document.body);
        });
        scope.$digest();
    }


    describe('aclSref', function () {

        var statesTested, isAllowed;

        beforeEach(function () {
            angular.mock.module('directives', function ($provide) {
                $provide.provider('AppControl', function () { 
                    this.$get = function () {
                        return {
                            isAllowed: function (state) {
                                statesTested.push(state);
                                return isAllowed;
                            },
                        };
                    };
                });
            });
        });

        beforeEach(inject(function ($rootScope) {
            scope = $rootScope.$new();
        }));

        it('should hide and show', function () {
            statesTested = [];
            isAllowed = true;
            compileDirective('<div acl-sref="state1 state2"></div>');
            expect(element.css('display')).toBe('block');
            expect(statesTested).toEqual([ 'state1', 'state2' ]);

            statesTested = [];
            isAllowed = false;
            compileDirective('<div acl-sref="state1 state2"></div>');
            expect(element.css('display')).toBe('none');
            expect(statesTested).toEqual([ 'state1', 'state2' ]);
        });

    });

    describe('onKeyEnter', function () {

        beforeEach(angular.mock.module('directives'));

        beforeEach(inject(function ($rootScope) {
            scope = $rootScope.$new();
            scope.execute = function (value) {
                scope.executed = value;
            };
        }));

        it('should execute on enter key', function () {
            scope.executed = false;
            compileDirective('<input on-key-enter="execute(true)">');

            var e = jQuery.Event('keypress');
            e.keyCode = 42;
            element.trigger(e);
            expect(scope.executed).toBeFalsy();

            var e = jQuery.Event('keypress');
            e.keyCode = 13;
            element.trigger(e);
            expect(scope.executed).toBeTruthy();
        });

    });

    describe('focusOn', function () {

        beforeEach(angular.mock.module('directives'));

        beforeEach(inject(function ($rootScope) {
            scope = $rootScope.$new();
        }));

        it('should set focus', inject(function ($timeout) {
            scope.setFocus = false;
            compileDirective('<input focus-on="setFocus">');
            expect(scope.setFocus).toBeFalsy();
            expect(element[0]).not.toBe(document.activeElement);

            scope.setFocus = true;
            compileDirective('<input focus-on="setFocus">');
            $timeout.flush();
            expect(scope.setFocus).toBeFalsy();
            expect(element[0]).toBe(document.activeElement);
        }));

    });

    describe('sidebar', function () {

        beforeEach(angular.mock.module('directives'));

        beforeEach(inject(function ($rootScope) {
            scope = $rootScope.$new();
        }));

        it('should set fixed position for md sidebar in lg window', function () {
            var style = $('<style type="text/css"></style>');
            style.html(
                '.hidden-lg { display: none !important; } '
                + '.hidden-md { display: block !important; } '
                + '.hidden-sm { display: block !important; } '
                + '.hidden-xs { display: block !important; } '
            );
            style.appendTo($('head'));

            compileDirective('<div sidebar="md"></div>');
            expect(element.css('position')).toBe('fixed');
        });

        it('should set fixed position for md sidebar in md window', function () {
            var style = $('<style type="text/css"></style>');
            style.html(
                '.hidden-lg { display: block !important; } '
                + '.hidden-md { display: none !important; } '
                + '.hidden-sm { display: block !important; } '
                + '.hidden-xs { display: block !important; } '
            );
            style.appendTo($('head'));

            compileDirective('<div sidebar="md"></div>');
            expect(element.css('position')).toBe('fixed');
        });

        it('should set static position for md sidebar in sm window', function () {
            var style = $('<style type="text/css"></style>');
            style.html(
                '.hidden-lg { display: block !important; } '
                + '.hidden-md { display: block !important; } '
                + '.hidden-sm { display: none !important; } '
                + '.hidden-xs { display: block !important; } '
            );
            style.appendTo($('head'));

            compileDirective('<div sidebar="md"></div>');
            expect(element.css('position')).toBe('static');
        });

        it('should set static position for md sidebar in xs window', function () {
            var style = $('<style type="text/css"></style>');
            style.html(
                '.hidden-lg { display: block !important; } '
                + '.hidden-md { display: block !important; } '
                + '.hidden-sm { display: block !important; } '
                + '.hidden-xs { display: none !important; } '
            );
            style.appendTo($('head'));

            compileDirective('<div sidebar="md"></div>');
            expect(element.css('position')).toBe('static');
        });

    });

});
