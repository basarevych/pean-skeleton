'use strict';

var directives = angular.module('directives', []);

directives.directive('aclSref',
    [ 'AppControl',
    function (AppControl) {
        return {
            link: function (scope, element, attrs) {
                var states = attrs.aclSref.split(' ');
                var check = function () {
                    var allowed = false;
                    angular.forEach(states, function (value) {
                        if (AppControl.isAllowed(value))
                            allowed = true;
                    });

                    if (allowed)
                        element.show();
                    else
                        element.hide();
                };

                check();
            }
        };
    } ]
);

directives.directive('onKeyEnter',
    [ function () {
        return {
            restrict: 'A',
            link: function(scope, element, attrs, ngModelCtrl) {
                element.bind('keypress', function(event) {
                    if (event.keyCode === 13) {
                        event.preventDefault();
                        scope.$apply(function () {
                            scope.$eval(attrs.onKeyEnter);
                        });
                    }
                });
            }
        };
    } ]
);

directives.directive('focusOn',
    [ '$parse', '$timeout',
    function ($parse, $timeout) {
        return {
            restrict: 'A',
            link: function (scope, element, attrs) {
                var model = $parse(attrs.focusOn);
                scope.$watch(model, function (value) {
                    if (value === true) {
                        $timeout(function() {
                            element.focus().select();
                            scope.$apply(model.assign(scope, false));
                        });
                    }
                });
            }
        };
    } ]
);

directives.directive('sidebar',
    [ function () {
        return {
            link: function(scope, element, attrs) {
                var win = $(window), edge = attrs.sidebar;
                var sizes = ['xs', 'sm', 'md', 'lg'];

                var onResize = function() {
                    element.css({ position: 'fixed' });

                    var bottom = element.position().top + element.outerHeight(true),
                        position = win.height() < bottom ? 'static' : undefined;

                    if (angular.isUndefined(position)) {
                        var current;
                        for (var i = sizes.length - 1; i >= 0; i--) {
                            var test = $('<div></div>');
                            test.addClass('hidden-' + sizes[i]).appendTo($('body'));
                            var visible = test.is(':visible');
                            test.remove();

                            if (!visible) {
                                current = sizes[i];
                                break;
                            }
                        };

                        if (angular.isDefined(current))
                            position = sizes.indexOf(edge) > sizes.indexOf(current) ? 'static' : 'fixed';
                    }

                    if (angular.isDefined(position))
                        element.css({ position: position });

                    element.css({ width: element.parent().width() });
                };

                win.bind('resize', onResize);
                onResize();
            }
        };
    } ]
);
