'use strict';
//Adds line breaks to the text areas

angular.module('draggable', [], function() {}).
directive('draggable', ['$window', '$document',
    function($window, $document) {
        return {
            restrict: 'EA',
            replace: true,
            transclude: true,
            scope: true,
            template: '<div ng-class="{\'redrequired\':stickyrequired(this), \'greenrequired\':stickyfilled(this), \'signature\':signatureField(this), \'imagesignature\':imageField(this), \'mysignature\':imageMine(this), \'processing\':signatureProcessing(), \'otherperson\':whosignssticky(this)}" class="sticky">' +
                            '<span class="dragger" ng-show="isAnnotable && investorFixed(this) && !countersignable(lib)" ng-mousedown="$event.stopPropagation();"><span><span data-icon="&#xe11a;"></span></span></span>' +
                            '<span class="close-button" ng-show="isAnnotable && investorFixed(this) && !countersignable(lib)" ng-mousedown="$event.stopPropagation();"  ng-click="closeMe($event); $event.stopPropagation()"><span data-icon="&#xe00f;"></span></span>' +
                            '<span ng-transclude></span>' +
                      '</div>',
            link: function(scope, elm, attrs) {
                // the elm[0] is to unwrap the angular element
                void(attrs);
                document.querySelector('.docPanel').appendChild(elm[0]);
                scope.page = scope.restoredPage || scope.currentPage;
                elm[0].page = scope.page;
                scope.$parent.notes.push(elm);
                elm.css({
                    position: 'absolute'
                });
            },

            controller: ["$scope", "$element", "$rootScope",
                function($scope, $element, $rootScope) {
                    var dragicon = $element.find("span.dragger");

                    /* This is the drag - code -- its been moved to work on the drag widget */
                    $scope.mousedown = function($event) {
                        $scope.initdrag($event);
                        return false;
                    };

                    dragicon.bind('mousedown', $scope.mousedown);

                    $scope.$watch('$$nextSibling.annotext', function(newValue, oldValue) {
                        if ($rootScope.navState.role == "issuer" && $scope.$$nextSibling.whosign == "Investor") {
                            $scope.$$nextSibling.annotext = "";
                        }
                    });

                    $scope.$watch('$$nextSibling.whattype', function(newval, oldval) {
                        var elem = $element.find('textarea');
                        if (newval == "Signature") {
                            elem.css('font-size', 18);
                            if (elem.height() < 37) {
                                elem.css('height', 37);
                                elem[0].parentNode.parentNode.parentNode.parentNode.style.height = 47 + "px";
                            }
                        }
                        else {
                            elem.css('font-size', 12);
                        }
                    }, true);

                    var topLocation = function(elementHeight, mouseY) {
                        var docPanel = document.querySelector('.docPanel');
                        var topEdge = docPanel.offsetTop;
                        var panelHeight = docPanel.offsetHeight;
                        var bottomEdge = topEdge + panelHeight;
                        if (mouseY < topEdge) {
                            return topEdge;
                        } else if (mouseY > bottomEdge - elementHeight) {
                            return (bottomEdge - elementHeight);
                        } else {
                            return mouseY;
                        }
                    };

                    var leftLocation = function(elementWidth, mouseX) {
                        var docPanel = document.querySelector('.docPanel');
                        var leftEdge = docPanel.offsetLeft;
                        var panelWidth = docPanel.offsetWidth;
                        var rightEdge = leftEdge + panelWidth;
                        if (mouseX < leftEdge) {
                            return leftEdge;
                        } else if (mouseX > rightEdge - elementWidth) {
                            return (rightEdge - elementWidth);
                        } else {
                            return mouseX;
                        }
                    };

                    $scope.mousemove = function($event) {
                        // absolute mouse location (current): $event.clientX, $event.clientY
                        // absolute change in mouse location: dx, dy
                        // relative mouse location: mousex, mousey
                        var dx = $event.clientX - $scope.initialMouseX + document.documentElement.scrollLeft - $scope.initialScrollX;
                        var dy = $event.clientY - $scope.initialMouseY + document.documentElement.scrollTop - $scope.initialScrollY;
                        var mousex = $scope.startX + dx;
                        var mousey = $scope.startY + dy;
                        $element.css({
                            top: (topLocation($element.height(), mousey)) + 'px',
                            left: (leftLocation($element.width(), mousex)) + 'px'
                        });
                        return false;
                    };
                    $scope.newmousemove = function($event) {
                        var dx = $event.clientX - $scope.initialMouseX + document.documentElement.scrollLeft - $scope.initialScrollX;
                        var dy = $event.clientY - $scope.initialMouseY + document.documentElement.scrollTop - $scope.initialScrollY;
                        $element.css({
                            height: dy + 6 + 'px',
                            width: dx + 6 + 'px'
                        });
                        var bb = $element[0].querySelector("textarea");
                        bb.style.height = dy - 4 + "px";
                        bb.style.width = dx - 8 + "px";
                        return false;
                    };


                    var mousewheelevt=(/Firefox/i.test(navigator.userAgent))? "DOMMouseScroll" : "mousewheel"; //FF doesn't recognize mousewheel as of FF3.x

                    $scope.mouseup = function(ev) {
                        $scope.mousemove(ev);
                        if (document.detachEvent) {
                            document.detachEvent('on'+mousewheelevt, $scope.mousemove);
                        } else if (document.removeEventListener) {
                            document.removeEventListener(mousewheelevt, $scope.mousemove, false);
                        }
                        $document.unbind('scroll', $scope.mousemove);
                        $document.unbind('mousemove', $scope.mousemove);
                        $document.unbind('mouseup', $scope.mouseup);
                        return false;
                    };

                    $scope.newmouseup = function(ev) {
                        if (document.detachEvent) {
                            document.detachEvent('on'+mousewheelevt, $scope.mousemove);
                        } else if (document.removeEventListener) {
                            document.removeEventListener(mousewheelevt, $scope.mousemove, false);
                        }
                        var bb = $element[0].querySelector("textarea");
                        $document.unbind('scroll', $scope.mousemove);
                        $document.unbind('mousemove', $scope.newmousemove);
                        $document.unbind('mouseup', $scope.newmouseup);
                        if (parseInt(bb.style.width) === 0 || parseInt(bb.style.height) < 12) {
                            var x = bb.parentElement.parentElement.parentElement.parentElement;
                            x.parentElement.removeChild(x);
                            var index = $scope.annotatedPages.indexOf($scope.currentPage);
                            if (index > -1) {
                                $scope.annotatedPages.splice(index, 1);
                            }
                            for (var i = 0; i < $scope.notes.length; i++) {
                                if ($scope.notes[i][0] === x) {
                                    $scope.notes.splice(i, 1);
                                    $scope.$apply();
                                    return;
                                }
                            }
                        }
                        angular.element(bb.parentElement).scope().getme = true;
                        $scope.$apply();
                        return false;
                    };

                    // Set startX/Y and initialMouseX/Y attributes.
                    // Bind mousemove and mousedown event callbacks.
                    //
                    $scope.initdrag = function(ev) {
                        var dp = document.querySelector(".docPanel");
                        var dpr = dp.getBoundingClientRect(); // top/left of docPanel
                        var dprl = dpr.left - dp.offsetLeft; // left of document itself
                        var dprt = dpr.top - dp.offsetTop; // top of document itself
                        $scope.startX = ev.clientX - dprl + 5; // mouse start positions relative to the box/pad
                        var bb = $element[0].querySelector("textarea");
                        $scope.startY = ev.clientY - dprt - (parseInt(bb.style.height)/2); // TODO can we get 6 dynamically?
                        $scope.initialMouseX = ev.clientX;
                        $scope.initialMouseY = ev.clientY;
                        $scope.initialScrollX = document.documentElement.scrollLeft;
                        $scope.initialScrollY = document.documentElement.scrollTop;
                        if (document.attachEvent) {
                            document.attachEvent('on'+mousewheelevt, $scope.mousemove);
                        } else if (document.addEventListener) {
                            document.addEventListener(mousewheelevt, $scope.mousemove, false);
                        }
                        $document.bind('scroll', $scope.mousemove);
                        $document.bind('mousemove', $scope.mousemove);
                        $document.bind('mouseup', $scope.mouseup);
                    };

                    $scope.newinitdrag = function(ev) {
                        var dp = document.querySelector(".docPanel");
                        var dpr = dp.getBoundingClientRect(); // top/left of docPanel
                        var dprl = dpr.left - dp.offsetLeft; // left of document itself
                        var dprt = dpr.top - dp.offsetTop; // top of document itself
                        $scope.startX = ev.clientX - dprl - 6; // mouse start positions relative to the box/pad
                        $scope.startY = ev.clientY - dprt - 6; // TODO can we get 6 dynamically?
                        $scope.initialMouseX = ev.clientX;
                        $scope.initialMouseY = ev.clientY;
                        $scope.initialScrollX = document.documentElement.scrollLeft;
                        $scope.initialScrollY = document.documentElement.scrollTop;
                        var dx = ev.clientX - $scope.initialMouseX;
                        var dy = ev.clientY - $scope.initialMouseY;
                        var mousex = $scope.startX + dx;
                        var mousey = $scope.startY + dy;
                        $element.css({
                            top: (topLocation($element.height(), mousey)) + 'px',
                            left: (leftLocation($element.width(), mousex)) + 'px'
                        });
                        if (document.attachEvent) {
                            document.attachEvent('on'+mousewheelevt, $scope.mousemove);
                        } else if (document.addEventListener) {
                            document.addEventListener(mousewheelevt, $scope.mousemove, false);
                        }
                        $document.bind('scroll', $scope.mousemove);
                        $document.bind('mousemove', $scope.newmousemove);
                        $document.bind('mouseup', $scope.newmouseup);
                    };

                    $scope.biggerMe = function(ev) {
                        ev.stopPropagation();
                        var elem = $element.find('textarea');
                        var fs = elem.css('font-size');
                        elem.css('font-size', restrictFontSize(parseInt(fs.substr(0, fs.length - 2), 10) + 2));
                        $scope.fixBox(elem[0]);
                    };

                    $scope.smallerMe = function(ev) {
                        ev.stopPropagation();
                        var elem = $element.find('textarea');
                        var fs = elem.css('font-size');
                        elem.css('font-size', restrictFontSize(parseInt(fs.substr(0, fs.length - 2), 10) - 2));
                        $scope.fixBox(elem[0]);
                    };

                    var restrictFontSize = function(proposedSize) {
                        if (proposedSize > 24) {
                            return 24;
                        } else if (proposedSize < 8) {
                            return 8;
                        } else {
                            return proposedSize;
                        }
                    };
                }
            ]
        };
    }
]);

var docs = angular.module('documents', ['ui.bootstrap', 'brijj', 'draggable'], function() {});

docs.directive('backImg', function() {
    return {
        restrict: 'A',
        link: function(scope, element, attrs) {
            attrs.$observe('backImg', function(url) {
                element.css({
                    'background-image': 'url(' + url + ')',
                    'background-size': 'cover'
                });
            });
        }
    };
});

docs.directive('docViewer', function() {
    return {
        restrict: 'EA',
        scope: true,
        templateUrl: '/documents/partials/docViewer.html',
        controller: 'DocumentViewController'
    };
});

docs.directive('templateViewer', function($compile) {
    return {
        restrict: 'EA',
        scope: {
            html: '='
        },
        templateUrl: '/documents/partials/template.html',
        controller: 'TemplateViewController',
        link: function (scope, iElement, iAttrs) {

            scope.$watch("html", function(newVals, oldVals) {
                return scope.add(newVals);
            }, true);

            scope.add = function(raw_html) {
                var html = angular.element($compile(raw_html)(scope));
                iElement.append(html);

            };

        }
    };
});

docs.controller('TemplateViewController', ['$scope', '$rootScope', '$compile', '$location', '$routeParams', '$window', 'SWBrijj',
    function($scope, $rootScope, $compile, $location, $routeParams, $window, SWBrijj) {
    }
]);

docs.filter('fromNow', function() {
    return function(date, servertime) {
        return moment(date).from(servertime);
    };
});

docs.directive('icon', function() {
    return {
        restrict: 'E',
        template: '<button><span data-icon="&#xe00d;" aria-hidden="true"></span></button>'
    };
});

docs.filter('uniqueandorder', function() {
    return function(pages) {
        var output = [];
        angular.forEach(pages, function(page) {
            if(output.indexOf(page) === -1) {
                output.push(page);
            }
        });
        output.sort(function(a,b){return a-b;});
        return output;
    };
});

/* Looking for a way to detect if I need to reload the page because the user has been logged out
 */
/* For images, the "login redirect" should return an image that says "Please login again"
 */
/*
 $('<img/>').attr('src', 'http://picture.de/image.png').load(function() {
 $(this).remove(); // prevent memory leaks as @benweet suggested
 $('body').css('background-image', 'url(http://picture.de/image.png)');
 });
    */
