function getIntProperty(se, z) {
    var lh = getComputed(se, z);
    lh = parseFloat(lh.replace("px", ""));
    return lh;
}

function getComputed(se, z) {
    originalAnswer = se.currentStyle ? se.currentStyle[z] : document.defaultView.getComputedStyle(se, null).getPropertyValue(z);
    return originalAnswer? originalAnswer : 1337;
}

function getCanvasOffset(ev) {
    var offx, offy;
    if (ev.offsetX === undefined) { // Firefox code
        offx = ev.layerX-ev.target.offsetLeft;
        offy = ev.layerY-ev.target.offsetTop;
    } else {
        offx = ev.offsetX;
        offy = ev.offsetY;
    }
    return [offx, offy];
}

function getNoteBounds(nx, pageBar, not_visible) {
    // [LEFT, TOP, WIDTH, HEIGHT]
    var top_padding = pageBar ? 161 : 120;
    var bds = [getIntProperty(nx, 'left'), getIntProperty(nx, 'top'), 0, 0];
    var dp = document.querySelector('.docPanel');
    if (!dp.offsetTop && not_visible) {
        bds[1]-=top_padding;
    }
    // 161 is fixed above due to timing issues -- the docPanel element is not available when notes are saved right before stamping.
    // this could be set as a static value during other pad calculations
    var ntyp = nx.notetype;
    var z, ibds;
    if (ntyp == 'text') {
        var t = nx.querySelector('textarea');
        z = t.offset;
        ibds = [z[0], z[1], z[2], z[3]];
    } else if (ntyp == 'canvas') {
        var c = nx.querySelector('canvas');
        z = c.offset;
        ibds = [z[0], z[1], z[2], z[3]];
    } else if (ntyp == 'check') {
        ibds = [12, 27, 14, 14];
    }

    return [bds, ibds]; // [coords, size]
}

function countCRs(str) {
    var z = str;
    var cnt = 0;
    while (true) {
        var a = z.indexOf('\n');
        if (a < 0) return cnt;
        cnt++;
        z = z.substring(a + 1);
    }
}

angular.module('draggable', [], function() {}).
directive('draggable', ['$window', '$document',
    function($window, $document) {
        return {
            restrict: 'EA',
            replace: true,
            transclude: true,
            scope: true,
            template: '<div class="sticky">' +
                        '<ul>' +
                            '<li ng-click="dragMe($event)" style="padding-right:10px"><span data-icon="&#xe043;"</span></li>' +
                            '<li ng-show="growable" ng-click="smallerMe($event)" style="padding-left:10px"><span data-icon="&#xe040;" aria-hidden="true"/></li>' +
                            '<li ng-show="growable" ng-click="biggerMe($event)" style="padding-left:10px"><span data-icon="&#xe041;" aria-hidden="true"/></li>' +
                            '<li></li>' +
                            '<li ng-click="closeMe($event)"><span data-icon="&#xe01b;"></span></li>' +
                        '</ul>' +
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

            controller: ["$scope", "$element",
                function($scope, $element) {
                    var dragicon = $element.find("ul>li:first-child");

                    /* This is the drag - code -- its been moved to work on the drag widget */
                    $scope.mousedown = function($event) {
                        $scope.initdrag($event);
                        return false;
                    };

                    dragicon.bind('mousedown', $scope.mousedown);

                    topLocation = function(elementHeight, mouseY) {
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

                    leftLocation = function(elementWidth, mouseX) {
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

                    topFromBottomLocation = function(elementHeight, currBottom) {
                        var docPanel = document.querySelector('.docPanel');
                        var bottomEdge = docPanel.offsetTop + docPanel.offsetHeight;
                        if (currBottom > bottomEdge) {
                            return bottomEdge - elementHeight;
                        } else {
                            return currBottom - elementHeight;
                        }
                    };

                    leftFromRightLocation = function(elementWidth, currRight) {
                        var docPanel = document.querySelector('.docPanel');
                        var rightEdge = docPanel.offsetLeft + docPanel.offsetWidth;
                        if (currRight > rightEdge) {
                            return rightEdge - elementWidth;
                        } else {
                            return currRight - elementWidth;
                        }
                    };

                    boundBoxByPage = function(element) {
                        var docPanel = document.querySelector('.docPanel');
                        // FIXME does not work in firefox because position:absolute
                        element.style["max-width"] = (docPanel.offsetWidth) + 'px';
                        element.style["max-height"] = (docPanel.offsetHeight) + 'px';
                    };

                    $scope.mousemove = function($event) {
                        // absolute mouse location (current): $event.clientX, $event.clientY
                        // absolute change in mouse location: dx, dy
                        // relative mouse location: mousex, mousey
                        var dx = $event.clientX - $scope.initialMouseX + $window.scrollX - $scope.initialScrollX;
                        var dy = $event.clientY - $scope.initialMouseY + $window.scrollY - $scope.initialScrollY;
                        var mousex = $scope.startX + dx;
                        var mousey = $scope.startY + dy;
                        $element.css({
                            top: (topLocation($element.height(), mousey)) + 'px',
                            left: (leftLocation($element.width(), mousex)) + 'px'
                        });
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

                    // Set startX/Y and initialMouseX/Y attributes.
                    // Bind mousemove and mousedown event callbacks.
                    //
                    $scope.initdrag = function(ev) {
                        var dp = document.querySelector(".docPanel");
                        var dpr = dp.getBoundingClientRect(); // top/left of docPanel
                        var dprl = dpr.left - dp.offsetLeft; // left of document itself
                        var dprt = dpr.top - dp.offsetTop; // top of document itself
                        $scope.startX = ev.clientX - dprl - 6; // mouse start positions relative to the box/pad
                        $scope.startY = ev.clientY - dprt - 6; // TODO can we get 6 dynamically?
                        $scope.initialMouseX = ev.clientX;
                        $scope.initialMouseY = ev.clientY;
                        $scope.initialScrollX = $window.scrollX;
                        $scope.initialScrollY = $window.scrollY;
                        if (document.attachEvent) {
                            document.attachEvent('on'+mousewheelevt, $scope.mousemove);
                        } else if (document.addEventListener) {
                            document.addEventListener(mousewheelevt, $scope.mousemove, false);
                        }
                        $document.bind('scroll', $scope.mousemove);
                        $document.bind('mousemove', $scope.mousemove);
                        $document.bind('mouseup', $scope.mouseup);
                    };

                    $scope.biggerMe = function(ev) {
                        void(ev);
                        var elem = $element.find('textarea');
                        var fs = elem.css('font-size');
                        elem.css('font-size', restrictFontSize(parseInt(fs.substr(0, fs.length - 2), 10) + 2));
                        $scope.fixBox(elem[0]);
                    };

                    $scope.smallerMe = function(ev) {
                        void(ev);
                        var elem = $element.find('textarea');
                        var fs = elem.css('font-size');
                        elem.css('font-size', restrictFontSize(parseInt(fs.substr(0, fs.length - 2), 10) - 2));
                        $scope.fixBox(elem[0]);
                    };

                    restrictFontSize = function(proposedSize) {
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
        templateUrl: 'docViewer.html',
        controller: 'DocumentViewController'
    };
});

docs.directive('templateViewer', function() {
    return {
        restrict: 'EA',
        scope: {
            html: '='
        },
        templateUrl: 'template.html',
        controller: 'TemplateViewController',
        link: function (scope, iElement, iAttrs) {
            var html = angular.element(scope.html);
            iElement.append(html);

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

docs.controller('DocumentViewController', ['$scope', '$rootScope', '$compile', '$location', '$routeParams', '$window', 'SWBrijj',
    function($scope, $rootScope, $compile, $location, $routeParams, $window, SWBrijj) {
        $scope.image = {width: 0, height: 0};
        $scope.dp = {width: 0, height: 0};
        $scope.updateDocPanelSize = function() {
            var dp = $('.docPanel');
            if (dp) {
                dp.height((dp.width()/$scope.image.width)*$scope.image.height);
                $scope.dp.width = dp.width();
                $scope.dp.height = dp.height();
            }
        };
        $scope.$watchCollection('image', $scope.updateDocPanelSize);
        window.onresize = $scope.updateDocPanelSize;
        $window.onkeydown = function(evt) {
            evt.which = evt.which || e.keyCode;
            if (evt.which === 37) {
                $scope.previousPage($scope.currentPage);
            } else if (evt.which === 39) {
                $scope.nextPage($scope.currentPage);
            }
        };
        // Tells JS to update the backgroundImage because the imgurl has changed underneath it.
        refreshDocImage = function() {
            var docpanel = document.querySelector(".docPanel");
            if (docpanel) {
                var imgurl;
                imgurl = docpanel.style.backgroundImage;
                docpanel.style.backgroundImage = imgurl;
                var img = new Image();
                img.onload = function() {
                    $scope.$apply(function() {
                        $scope.image.width = img.width;
                        $scope.image.height = img.height;
                        $scope.updateDocPanelSize();
                    });
                };
                img.src = $scope.pageImageUrl();
            }
        };

        $scope.$on('initDocView', function(event, docId, invq, library, pageQueryString, pages) {
            if (!docId || $scope.annotated) return;
            $scope.docId = docId;
            $scope.invq = invq;
            $scope.library = library;
            $scope.pageQueryString = pageQueryString;
            $scope.pages = pages;
            refreshDocImage();
            $scope.loadPages();
        });

        $scope.$on('initTemplateView', function(event, templateId) {
            $scope.templateId = templateId;
            $scope.isAnnotable = false;
            $scope.docLength = 0;
            $scope.stage = -1;
            $scope.code = "<div>Hello</div>";
        });

        $scope.stage = 0;
        $scope.confirmValue = 0;
        if (!$scope.rejectMessage) {$scope.rejectMessage = "Add an optional message...";}
        $scope.hidePage = false;
        $scope.notes = [];
        $scope.annotatedPages = [];
        $scope.pageScroll = 0;
        $scope.pageBarSize = 10;
        $scope.isAnnotable = true;
        $('.docViewerHeader').affix({
            offset: {top: 40}
        });

        $scope.setStage = function(n) {
            $scope.setConfirmValue(0);
            $scope.stage = n;
            if ($scope.stage === 0) {
                refreshDocImage();
            }
        };
        $scope.setConfirmValue = function(n) {
            if ($scope.confirmValue === n) {
                $scope.confirmValue = 0;
            } else {
                $scope.confirmValue = n;
            }
            if ($scope.confirmValue !== -1) {
                $scope.messageText = "Add an optional message...";
            }
        };

        $scope.setAnnotable = function() {
                $scope.isAnnotable = $scope.annotable();
        };

        $scope.annotable = function() {
            return ($scope.invq && $scope.investorCanAnnotate()) || (!$scope.invq && $scope.issuerCanAnnotate());
        };

        $scope.investorCanAnnotate = function() {
            return (!$scope.lib.when_signed && $scope.lib.signature_deadline);
        };

        $scope.issuerCanAnnotate = function() {
            return !$scope.lib.when_countersigned && $scope.lib.when_signed;
        };

        $scope.showPageBar = function() {
            if ($scope.docLength > 1 && $scope.annotatedPages.length > 0) {
                return true;
            } else {
                return false;
            }
        };

        $scope.resetMsg = function() {
            if ($scope.rejectMessage === "Add an optional message...") {
                $scope.rejectMessage = "";
            }
        };
        $scope.countersignAction = function(conf, msg) {
            $scope.$emit('countersignAction', [conf, msg]);
        };
        $scope.finalizeAction = function(conf, msg) {
            $scope.$emit('finalizeAction', [conf, msg]);
        };

        $scope.$emit('docViewerReady');

        if ($routeParams.page) {
            $scope.currentPage = parseInt($routeParams.page, 10);
        } else if (!$scope.currentPage) {
            $scope.currentPage = 1;
        }

        $scope.loadPages = function () {
            /** @name SWBrijj#tblmm * @function
             * @param {string}
             * @param {...}
             */
            SWBrijj.tblmm($scope.pages, 'annotated,page'.split(','), "doc_id", $scope.docId).then(function(data) {
                $scope.docLength = data.length;
                $scope.length_digits = data.length.toString().length * 8;
                $scope.annotated = new Array(data.length);
                $scope.annotatedPages = [];
                for (var i = 0; i < data.length; i++) {
                    $scope.annotated[data[i].page - 1] = data[i].annotated;
                    if (data[i].annotated) {$scope.annotatedPages.push(data[i].page);}
                }
                $scope.annotatedPages.sort(function(a,b){return a-b;});
                $scope.loadAnnotations();
            });
       };

        $scope.pageImageUrl = function() {
            if ($scope.pageQueryString && $scope.currentPage) {
                return "/photo/docpg?" + $scope.pageQueryString + "&page=" + $scope.currentPage;
            } else {
                return '';
            }
        };

        $scope.loadAnnotations = function() {
            /** @name SWBrijj#tblm
             * @function
             * @param {string}
             * @param {...}
             */
            SWBrijj.tblm($scope.library, "doc_id", $scope.docId).then(function(data) {
                if ($scope.lib && $scope.lib.annotations.length > 0) {
                    return;
                }
                $scope.lib = data;
                $scope.reqDocStatus($scope.docId);


                // data structure contents
                // aa -> [annot0...annotn-1]
                // [i] annoti -> [position, type, value, style]
                //
                // [i][0] position -> [page, coords, size, 700, 956]
                //
                // [i][0][0] page -> 0...n-1
                //
                // [i][0][1] coords (bds) -> [x, y, _, _]
                // [i][0][1][0] x
                // [i][0][1][1] y
                // [i][0][1][2] ?
                // [i][0][1][3] ?
                //
                // [i][0][2] size (ibds) -> [_, _, width, height]
                // [i][0][2][0] ?
                // [i][0][2][1] ?
                // [i][0][2][2] width or horizontal offset
                // [i][0][2][3] height or vertical offset
                //
                // [i][0][3] 700 dp.clientWidth
                //
                // [i][0][4] 956 dp.clientHeight
                //
                // [i][1] type -> check or text or canvas
                //
                // [i][2] value -> n/a or string or series of lines ([_, x0, y0, x1, y1])
                //
                // [i][3] style -> font size -- anything else?

                var aa = data.annotations;
                if (aa) {
                    // restoreNotes
                    var annots = JSON.parse(aa);
                    if (annots.length > 100) {
                        console.log("Error, too many notes.");
                        //$scope.removeAllNotes();
                        return;
                    }
                    var sticky;
                    for (var i = 0; i < annots.length; i++) {
                        var annot = annots[i];
                        switch (annot[1]) {
                            case "check":
                                sticky = $scope.newCheckX(annot[0][0]);
                                break;
                            case "text":
                                sticky = $scope.newBoxX(annot[0][0], annot[2][0], annot[3]);
                                break;
                            case "canvas":
                                sticky = $scope.newPadX(annot[0][0], annot[2][0]);
                                break;
                        }

                        // the notes were pushed in the newXXX function
                        sticky.css({
                            top: Math.max(0, annot[0][1][1]),
                            left: Math.max(0, annot[0][1][0])
                        });
                    }
                } // json struct
                $scope.setAnnotable();
            });
        };


        $window.addEventListener('beforeunload', function(event) {
            void(event);
            var ndx = $scope.getNoteData(false);
            /** @name $scope#lib#annotations
             * @type {[Object]}
             */
            if ((!$scope.lib) || ndx == $scope.lib.annotations) return; // no changes

            /** @name SWBrijj#_sync
             * @function
             * @param {string}
             * @param {string}
             * @param {string}
             * @param {...}
             */
            // This is a synchronous save
            /** @name $scope#lib#original
             * @type {int} */
            var res = SWBrijj._sync('SWBrijj', 'saveNoteData', [$scope.docId, $scope.invq, !$scope.lib.original, ndx]);
            // I expect this returns true (meaning updated).  If not, the data is lost
            if (!res) alert('failed to save annotations');
        });

        /* Save the notes when navigating away */
        // There seems to be a race condition with using $locationChangeStart or Success
        $scope.$on('$locationChangeStart', function(event, newUrl, oldUrl) {
            void(oldUrl);
            // don't save note data if I'm being redirected to log in
            // TODO why?
            if (newUrl.match(/login([?]|$)/)) return;
            $scope.saveNoteData();
        });

        $scope.$on('event:leave', $scope.leave);

        $scope.leave = function() {
            if ($rootScope.lastPage) {
                document.location.href = $rootScope.lastPage;
            } else if ($scope.invq) {
                $location.path('/investor-list').search({});
            } else {
                $location.path('/company-list').search({});
            }
        };

        $scope.showPages = function() {
            return $scope.range($scope.pageScroll,
                                Math.min($scope.pageScroll + $scope.pageBarSize,
                                         $scope.annotatedPages.length)
                                ).map(function(i){return $scope.annotatedPages[i];});
        };

        $scope.morePages = function() {
            return $scope.annotatedPages.length > $scope.pageScroll + $scope.pageBarSize + 1;
        };

        $scope.pageBarRight = function() {
            $scope.pageScroll = Math.min($scope.annotatedPages.length - $scope.pageBarSize,
                                         $scope.pageScroll + $scope.pageBarSize);
        };

        $scope.pageBarLeft = function() {
            $scope.pageScroll = Math.max(0, $scope.pageScroll - $scope.pageBarSize);
        };

        $scope.unsaved = function(page) {
            var nn = $scope.notes;
            for (var i = 0; i < nn.length; i++) {
                if (nn[i].scope().page == page) return true;
            }
            return false;
        };

        $scope.isAnnotated = function(page) {
            return $scope.unsaved(page) || $scope.annotated[page - 1];
        };

        $scope.removeAllNotes = function() {
            for (var i = 0; i < $scope.notes.length; i++) {
                document.querySelector('.docPanel').removeChild($scope.notes[i][0]);
            }
            $scope.notes = [];
        };

        $scope.$on('rejectSignature', function(event) {
            $scope.removeAllNotes();
        });

        $scope.closeMe = function(ev) {
            var z = ev.currentTarget;
            while (z.attributes.draggable === undefined) z = z.parentElement;
            z.parentElement.removeChild(z);
            for (var i = 0; i < $scope.notes.length; i++) {
                if ($scope.notes[i][0] === z) {
                    $scope.notes.splice(i, 1);
                    return;
                }
            }
        };

        $rootScope.$on("setPage", function(event, pg) { $scope.setPage(pg); });

        $scope.safeApply = function(fn) {
            var phase = this.$root.$$phase;
            if (phase === '$apply' || phase === '$digest') {
                if(fn && (typeof(fn) === 'function')) {
                    fn();
                }
            } else {
                this.$apply(fn);
            }
        };

        $scope.setPage = function(n) {
            $scope.currentPage = n;
            var s = $location.search();
            s.page = n;
            $location.search(s);
            scroll(0,0);
            refreshDocImage();
        };

        $scope.nextPage = function(value) {
            if ($scope.currentPage < $scope.docLength) {
                $scope.jumpPage(value+1);
            }
        };

        $scope.previousPage = function(value) {
            if ($scope.currentPage > 1) {
                $scope.jumpPage(value-1);
            }
        };

        $scope.jumpPage = function(value) {
            $scope.safeApply(function () {$scope.setPage(parseInt(value, 10));});
        };

        $scope.range = function(start, stop, step) {
            if (typeof stop == 'undefined') {
                stop = start;
                start = 0;
            }
            if (typeof step == 'undefined') {
                step = 1;
            }
            if ((step > 0 && start >= stop) || (step < 0 && start <= stop)) return [];
            var result = [];
            for (var i = start; step > 0 ? i < stop : i > stop; i += step) result.push(i);
            return result;
        };

        $scope.newBox = function(event) {
            var aa = $scope.newBoxX($scope.currentPage, '', null);
            aa.scope().initdrag(event);
        };

        $scope.fixBox = function(bb) {
            var pad;
            var enclosingElement = bb.parentElement.parentElement.parentElement.parentElement;
            bb.style.width = '140px';
            bb.style.height = '40px';
            var crs = countCRs(bb.value);
            if (bb.clientHeight < bb.scrollHeight) {
                pad = getIntProperty(bb, 'padding-top') + getIntProperty(bb, 'padding-bottom');
                bb.style.height = (bb.scrollHeight - pad) + "px";
            }
            if (bb.clientWidth < bb.scrollWidth) {
                // pad = getIntProperty(bb, 'padding-left') + getIntProperty(bb, 'padding-right');
                bb.style.width = (bb.scrollWidth + 10) + "px";
            }
            bb.fontSize = getIntProperty(bb, 'font-size');
            bb.lineHeight = Math.floor(bb.fontSize * 1.4);
            bb.style.lineHeight = 1.4;
            bb.rows = crs + 2;
            bb.style.height = "auto";
            bb.offset = [bb.offsetLeft, bb.offsetTop, bb.offsetWidth, bb.offsetHeight];

            // if the box is now off the page, move it over
            currBottom = enclosingElement.offsetTop + enclosingElement.clientHeight;
            currRight = enclosingElement.offsetLeft + enclosingElement.clientWidth;

            enclosingElement.style.top = topFromBottomLocation(enclosingElement.clientHeight, currBottom) + 'px';
            enclosingElement.style.left = leftFromRightLocation(enclosingElement.clientWidth, currRight) + 'px';
        };

        $scope.moveBox = function(aa) {
            var dp = $('.docPanel')[0];
            var dpBottom = dp.offsetTop + dp.offsetHeight;
            var dpRight = dp.offsetLeft + dp.offsetWidth;
            var boxBottom = parseInt(aa.style.top,10) + aa.offsetHeight;
            var boxRight = parseInt(aa.style.left,10) + aa.offsetWidth;
            if (boxBottom > dpBottom && aa.offsetHeight < dp.offsetHeight) {
                aa.style.setProperty('top', (dpBottom - aa.offsetHeight) + 'px');
            }
            if (boxRight > dpRight && aa.offsetHeight < dp.offsetHeight) {
                aa.style.setProperty('left', (dpRight - aa.offsetWidth) + 'px');
            }
        };

        $scope.newBoxX = function(page, val, style) {
            $scope.restoredPage = page;
            var aa = $compile('<div draggable ng-show="currentPage==' + page + '" class="row-fluid draggable">' +
                              '<fieldset><div><textarea wrap="off" ng-model="annotext" class="row-fluid"/></div></fieldset></div>')($scope);
            aa.scope().ntype = 'text';
            aa[0].notetype = 'text';
            aa.scope().growable = true; // for the growable icons

            var bb = aa[0].querySelector("textarea");

            boundBoxByPage(bb);

            bb.addEventListener('input', function(e) {
                void(e);
                $scope.fixBox(bb);
            });
            window.addEventListener('resize', function() {
                $scope.moveBox(aa[0]);
            });

            bb.addEventListener('mousemove', function(e) {
                if (e.which !== 0) {
                    boundBoxByPage(bb);
                }
            });

            var ta = aa.find('textarea');
            ta.scope().annotext = val;
            ta.width(ta.width());
            if (style) {
                aa.find('textarea').css('fontSize', style[0]);
            }
            bb.value = val;
            $scope.fixBox(bb);
            window.setTimeout(function() {
                if (bb.offsetWidth) $scope.fixBox(bb);
            }, 850);

            return aa;
        };

        $scope.newSignature = function(event) {
            var aa = $scope.newSignatureX($scope.currentPage, '', null);
            aa.scope().initdrag(event);
        };

        $scope.newSignatureX = function(page, val, style) {
            // TODO refactor to create a newPad with the image piped in as initial contents
            $scope.restoredPage = page;
            var aa = $compile('<div draggable ng-show="currentPage==' + page + '"class="row-fluid draggable">' +
                              '<img src="http://www.couponingtodisney.com/wp-content/uploads/2012/12/Mickey-Mouse-Signature.jpg" width="100"/></div>')($scope);
            aa.scope().ntype = 'signature';
            aa[0].notetype = 'signature';
            aa.scope().growable = true;
            return aa;
        };

        $scope.newCheck = function(event) {
            var aa = $scope.newCheckX($scope.currentPage);
            aa.scope().initdrag(event);
        };

        $scope.newCheckX = function(page) {
            $scope.restoredPage = page;
            var aa = $compile('<div draggable ng-show="currentPage==' + page + '"class="row-fluid draggable">' +
                '<span class="check-annotation" data-icon="&#xe023;"></i>' +
                '</div>')($scope);
            aa.scope().ntype = 'check';
            aa[0].notetype = 'check';
            window.addEventListener('resize', function() {
                $scope.fixBox(aa);
            });
            return aa;
        };

        $scope.newDate = function(event) {
            var d = new Date();
            var fmtdat = (d.getMonth() + 1) + "/" + d.getDate() + "/" + d.getFullYear();
            var aa = $scope.newBoxX($scope.currentPage, fmtdat);
            aa.scope().initdrag(event);
            return aa;
        };

        $scope.newPad = function(event) {
            var aa = $scope.newPadX($scope.currentPage, []);
            aa.scope().initdrag(event);
        };

        $scope.fixPad = function(aa) {
            var z = aa.find('canvas')[0];
            // width() and height() fns are very slow
            z.width = (aa.width() - 8);
            z.height = (aa.height() - 27);
            z.offset = [z.offsetLeft, z.offsetTop, z.offsetWidth, z.offsetHeight];
            aa.css('max-width', ($scope.maxPadWidth(aa[0].offsetLeft)) + 'px');
            aa.css('max-height', ($scope.maxPadHeight(aa[0].offsetTop)) + 'px');
            var strokes = z.strokes;
            var ctx = z.getContext('2d');
            ctx.lineCap = 'round';
            ctx.color = 'blue';
            ctx.lineWidth = 2;
            // ctx.setAlpha(0.5);
            for (var i = 0; i < strokes.length; i++) {
                var line = strokes[i];

                ctx.beginPath();
                ctx.moveTo(line[1], line[2]);
                ctx.lineTo(line[3], line[4]);
                //ctx.strokeStyle = line[0];
                ctx.stroke();
            }
        };

        $scope.movePad = function(aa) {
            var dp = $('.docPanel')[0];
            dpBottom = dp.offsetTop + dp.offsetHeight;
            dpRight = dp.offsetLeft + dp.offsetWidth;
            if (parseInt(aa.style.top,10) + aa.offsetHeight > dpBottom) {
                aa.style.setProperty('top', (dpBottom - aa.offsetHeight) + 'px');
            }
            if (parseInt(aa.style.left,10) + aa.offsetWidth > dpRight) {
                aa.style.setProperty('left', (dpRight - aa.offsetWidth) + 'px');
            }
        };

        $scope.newPadX = function(page, lines) {
            $scope.restoredPage = page;
            var aa = $compile('<div draggable ng-show="currentPage==' + page + '"class="row-fluid draggable">' +
                '<canvas style="background-color:white"></canvas></div>')($scope);
            aa.scope().ntype = 'canvas';
            aa[0].notetype = 'canvas';

            aa.css({
                resize: 'both',
                overflow: 'hidden'
            });
            window.addEventListener('resize', function() {
                $scope.movePad(aa[0]);
            });

            aa[0].addEventListener('mouseup', function(e) {
                void(e);
                $scope.fixPad(aa);
                $scope.resizeDown = false;
            });
            aa[0].addEventListener('mousemove', function(e) {
                if (e.which !== 0)
                    $scope.fixPad(aa);
            });
            // I don't, in fact, get the mousedown event

            var canvas = aa[0].querySelector('canvas');
            var ctx = canvas.getContext('2d');
            ctx.lineCap = 'round';
            ctx.color = "blue";
            ctx.lineWidth = 2;
            ctx.fillStyle = "white";
            // ctx.setAlpha(0);
            ctx.fillRect(0, 0, 200, 200);
            // ctx.setAlpha(0.5);

            canvas.addEventListener('mousedown', function(e) {
                canvas.down = true;
                var offs = getCanvasOffset(e);
                canvas.X = offs[0];
                canvas.Y = offs[1];
            }, false);

            canvas.addEventListener('mouseover', function(e) {
                void(e);
                canvas.down = false;
            });

            canvas.addEventListener('mouseout', function(e) {
                void(e);
                canvas.down = false;
            });

            canvas.addEventListener('mouseup', function(e) {
                void(e);
                canvas.down = false;
            });

            canvas.strokes = [];

            canvas.addEventListener('mousemove', function(e) {
                if (canvas.down) {
                    ctx.beginPath();
                    ctx.moveTo(canvas.X, canvas.Y);
                    var offs = getCanvasOffset(e);
                    ctx.lineTo(offs[0], offs[1]);
                    canvas.strokes.push([canvas.color, canvas.X, canvas.Y, offs[0], offs[1]]);
                    ctx.stroke();
                    canvas.X = offs[0];
                    canvas.Y = offs[1];
                }
                /* BEZIER CURVES?
                if (canvas.down) {
                    var inProgress, offs, cp1x, cp1y, cp2x, cp2y;
                    if (!inProgress) {
                        ctx.beginPath();
                        ctx.moveTo(canvas.X, canvas.Y);
                        offs = getCanvasOffset(e);
                        inProgress = true;
                        skip1 = true;
                        skip2 = false;
                    } else {
                        if (skip1) {
                            cp1x = canvas.X;
                            cp1y = canvas.Y;
                            skip1 = false;
                            skip2 = true;
                        }
                        if (skip2) {
                            cp2x = canvas.X;
                            cp2y = canvas.Y;
                            skip1 = false;
                            skip2 = false;
                        } else {
                            ctx.bezierCurveTo(cp1x, cp1y, cp2x, cp2y, canvas.X, canvas.Y);
                            skip1 = true;
                            skip2 = false;
                        }
                    }
                    canvas.strokes.push([canvas.color, canvas.X, canvas.Y, offs[0], offs[1]]);
                    ctx.stroke();
                    canvas.X = offs[0];
                    canvas.Y = offs[1];
                }
                */
            }, true); // cancel bubble
            canvas.strokes = lines;
            $scope.fixPad(aa);
            return aa;
        };

        $scope.acceptSign = function(sig) {
            void(sig);
            SWBrijj.procm("document.countersign", $scope.docId).then(function(data) {
                void(data);
                // should this be: ??
                // $route.reload();
                window.location.reload();
            });
        };

        $scope.signable = function(doc) {
            return $scope.invq && doc && doc.signature_deadline && !doc.when_signed;
        };

        $scope.rejectable = function(doc) {
            // reject reject signature OR countersignature
            return (!$scope.invq && doc && doc.when_signed && !doc.when_countersigned) || ($scope.invq && doc && doc.when_countersigned && !doc.when_finalized);
        };

        $scope.countersignable = function(doc) {
            return !$scope.invq && doc && doc.when_signed && !doc.when_countersigned;
        };

        $scope.finalizable = function(doc) {
            return $scope.invq && doc && doc.when_countersigned && !doc.when_finalized;
        };

        $scope.$on('refreshDocImage', function (event) {refreshDocImage();});

        $scope.reqDocStatus = function(doc_id) {
            if (doc_id) {$scope.$emit('reqVersionStatus', doc_id);}
        };

        $scope.$on('retVersionStatus', function(event, message) {
            $scope.doc_status = message;
        });

        $scope.openModal = function(modal) {
            $scope.hidePage = true;
            $scope.$emit('open_modal', modal);
        };

        $scope.$on('close_modal', function(event) {
            $scope.hidePage = false;
        });

        $scope.clearNotes = function(event) {
            void(event);
            SWBrijj.procm($scope.invq ? "document.delete_investor_page" : "document.delete_counterparty_page",
                $scope.docId, $scope.currentPage).then(function(x) {
                void(x);
                refreshDocImage();
            });
        };

        $scope.clearAllNotes = function(event) {
            void(event);
            for (var i = 1; i <= $scope.docLength; i++) {
                var z = i;
                // TODO i don't believe SWBrijj.deletePage exists
                /** @name SWBrijj#deletePage
                 * @function
                 * @param {int}
                 */
                SWBrijj.deletePage($scope.docId, i).then(function(x) {
                    void(x);
                    if (z === $scope.currentPage) {
                        refreshDocImage();
                    }
                });
            }
        };

        $scope.maxPadWidth = function(currLeft) {
            var docPanel = document.querySelector('.docPanel');
            return docPanel.offsetLeft + docPanel.offsetWidth - currLeft;
        };

        $scope.maxPadHeight = function(currTop, bottomEdge) {
            var docPanel = document.querySelector('.docPanel');
            return docPanel.offsetTop + docPanel.offsetHeight - currTop;
        };


        $scope.getNoteData = function(stamping) {
            var noteData = [];

            for (var i = 0; i < $scope.notes.length; i++) {
                var n = $scope.notes[i];
                var nx = n[0];
                var bnds = getNoteBounds(nx, $scope.showPageBar(), stamping);
                var pos = [parseInt(nx.page, 10), bnds[0], bnds[1], $scope.dp.width, $scope.dp.height];
                var typ = nx.notetype;
                var val = [];
                var style = [];
                var ndx = [pos, typ, val, style];
                var se, lh;

                if (typ == 'text') {
                    se = nx.querySelector("textarea");
                    val.push(se.value);
                    style.push(getIntProperty(se, 'font-size'));
                } else if (typ == 'check') {
                    se = nx.querySelector("span.check-annotation");
                    style.push(getIntProperty(se, 'font-size'));
                } else if (typ == 'canvas') {
                    se = nx.querySelector("canvas");
                    val.push(se.strokes);
                }

                noteData.push(ndx);
            }
            return JSON.stringify(noteData);
        };

        $scope.saveNoteData = function(clicked) {
            $scope.last_save = new Date().getTime();
            var nd = $scope.getNoteData(false);
            if ($scope.lib === undefined) {
                // This happens when "saveNoteData" is called by $locationChange event on the target doc -- which is the wrong one
                return;
            }

            if (nd == $scope.lib.annotations) {
                // When there are no changes
                if (clicked) {
                    $scope.$emit("notification:success", "Saved Annotations");
                }
                return;
            }

            /** @name SWBrijj#saveNoteData
             * @function
             * @param {int}
             * @param {boolean}
             * @param {boolean}
             * @param {json}
             */
            SWBrijj.saveNoteData($scope.docId, $scope.invq, !$scope.lib.original, nd).then(function(data) {
                void(data);
                if (clicked) $scope.$emit("notification:success", "Saved Annotations");
            });
        };
    }
]);

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
