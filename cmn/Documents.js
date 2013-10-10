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
        // this only works for finding offsets in canvas elements
        offx = ev.pageX-$('canvas').offset().left;
        offy = ev.pageY-$('canvas').offset().top;
    } else {
        offx = ev.offsetX;
        offy = ev.offsetY;
    }
    return [offx, offy];
}

function getNoteBounds(nx) {
    // [LEFT, TOP, WIDTH, HEIGHT]
    var dp = document.querySelector('.docPanel');
    var dpo = [dp.offsetLeft, dp.offsetTop];
    var bds = [getIntProperty(nx, 'left'), getIntProperty(nx, 'top'), 0, 0];
    var ntyp = nx.notetype;
    var z, ibds;
    if (ntyp == 'text') {
        var t = nx.querySelector('textarea');
        z = t.offset;
        ibds = [2*z[0], 2*z[1], z[2], z[3]];
        ibds[0] -= dpo[0];
        ibds[1] -= dpo[1];
    } else if (ntyp == 'canvas') {
        var c = nx.querySelector('canvas');
        z = c.offset;
        ibds = [z[0], z[1], z[2], z[3]];
        ibds[0] -= dpo[0];
        ibds[1] -= dpo[1];
    } else if (ntyp == 'check') {
        ibds = [12, 27, 14, 14];
        ibds[0] -= dpo[0];
        ibds[1] -= dpo[1];
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
directive('draggable', ['$document',
    function($document) {
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
       /*           $transclude(function(clone, scope) {
                        $scope.annotation = scope;
                     // $element.prepend(clone);
                    });
       */
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
                        console.log("rightEdge: " + rightEdge);
                        if (currRight > rightEdge) {
                            return rightEdge - elementWidth;
                        } else {
                            return currRight - elementWidth;
                        }
                    };

                    boundBoxByPage = function(element) {
                        var docPanel = document.querySelector('.docPanel');
                        // FIXME does not work in firefox because position:absolute
                        element.style["max-width"] = (docPanel.offsetWidth - 22) + 'px';
                        element.style["max-height"] = (docPanel.offsetHeight - 35) + 'px';
                    };

                    $scope.mousemove = function($event) {
                        // absolute mouse location (current): $event.clientX, $event.clientY
                        // absolute change in mouse location: dx, dy
                        // relative mouse location: mousex, mousey
                        var dx = $event.clientX - $scope.initialMouseX;
                        var dy = $event.clientY - $scope.initialMouseY;
                        var mousex = $scope.startX + dx;
                        var mousey = $scope.startY + dy;
                        $element.css({
                            top: (topLocation($element.height(), mousey)) + 'px',
                            left: (leftLocation($element.width(), mousex)) + 'px'
                        });
                        return false;
                    };

                    $scope.mouseup = function() {
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
                        $scope.mousemove(ev);
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
])
/*.directive('checkbox', function() {
      return {
        restrict: 'A',
        template: '<i class="button icon-ok icon-2x" background-color:white"></i>'
      }}) */
;



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
        scope: {
            docId: '=docId',
            invq: '=invq',
            pageQueryString: '=pageQueryString'
        },
        templateUrl: '/cmn/docViewer.html',
        controller: 'DocumentViewController'
    };
});

docs.filter('fromNow', function() {
    return function(date) {
        return moment(date).fromNow();
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
        $scope.features = {
            annotations: true
        };

        if ($scope.features.annotations) {
            $window.addEventListener('beforeunload', function(event) {
                void(event);
                var ndx = $scope.getNoteData();
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
        }

        $scope.refreshPageBar = function(pg) {
            $scope.pageScroll = Math.floor(pg/$scope.pageBarSize) * $scope.pageBarSize;
        };

        $scope.showPages = function() {
            return $scope.range($scope.pageScroll + 1, Math.min($scope.pageScroll + $scope.pageBarSize, $scope.docLength + 1));
        };

        $scope.morePages = function() {
            return $scope.docLength > $scope.pageScroll + $scope.pageBarSize;
        };

        $scope.pageBarRight = function() {
            $scope.pageScroll = Math.min($scope.docLength - $scope.pageBarSize + 1, $scope.pageScroll + ($scope.pageBarSize - 1));
        };

        $scope.pageBarLeft = function() {
            $scope.pageScroll = Math.max(0, $scope.pageScroll - ($scope.pageBarSize - 1));
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

        // Investor can annotate after a document has been shared with the investor and before the investor has signed.
        investorCanAnnotate = function(investorQuery, signatureDate, signatureDeadline) {
            return investorQuery && !signatureDate && signatureDeadline;
        };

        // Issuer can annotate when:
        //     1) it's not an investorQuery
        //     2) has not been counter signed
        //     3) has been signed by the investor
        issuerCanAnnotate = function(investorQuery, signatureDate, countersignDate) {
            return !investorQuery && !countersignDate && signatureDate;
        };

        $scope.annotable = function() {
            if ($scope.lib === undefined) {
                return false;
            } else {
                return investorCanAnnotate($scope.invq, $scope.lib.when_signed, $scope.lib.signature_deadline) ||
                       issuerCanAnnotate($scope.invq, $scope.lib.when_signed, $scope.lib.when_confirmed);
                    // original id is there when the document being viewed is not the original
                    // doc_id will refer to versions viewed at later stages in the workflow
            }
        };

        $scope.init = function() {
            $scope.notes = [];
            $scope.pageScroll = 0;
            $scope.pageBarSize = 9;
            $scope.showPageBar = true;

            if ($routeParams.page) {
                $scope.currentPage = parseInt($routeParams.page, 10);
            } else if (!$scope.currentPage) {
                $scope.currentPage = 1;
            }
            if (!$scope.docId) return;

            /** @name SWBrijj#tblmm
             * @function
             * @param {string}
             * @param {...}
             */
            SWBrijj.tblmm($scope.$parent.pages, 'annotated,page'.split(','), "doc_id", $scope.docId).then(function(data) {
                $scope.docLength = data.length;

                $scope.annotated = new Array(data.length);
                for (var i = 0; i < data.length; i++) {
                    $scope.annotated[data[i].page - 1] = data[i].annotated;
                }
            });

            /** @name SWBrijj#tblm
             * @function
             * @param {string}
             * @param {...}
             */
            // This gets called twice because init gets called twice
            // because Angular verifies the data has stabilized.
            // That doubles up the notes, so we need to delete
            // all the notes that init created the first time around.
            SWBrijj.tblm($scope.$parent.library, "doc_id", $scope.docId).then(function(data) {
                $scope.lib = data;
                // if there were notes left over, delete them
                $scope.removeAllNotes();

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
            });
        };

        $scope.$watch("docId", $scope.init);

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

        $scope.setPage = function(n) {
            $scope.currentPage = n;
            var s = $location.search();
            s.page = n;
            $location.search(s);
            $scope.refreshPageBar(n);
        };

        $scope.nextPage = function(value) {
            if ($scope.currentPage < $scope.docLength) {
                $scope.setPage(value + 1);
            }
        };

        $scope.previousPage = function(value) {
            if ($scope.currentPage > 1) {
                $scope.setPage(value - 1);
            }
        };

        $scope.jumpPage = function(value) {
            $scope.setPage(value);
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

        $scope.showPageBar = function(evt) {

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

        // Tells JS to update the backgroundImage because the imgurl has changed underneath it.
        // TODO: determine precisely where this is necessary...i.e. when are images being stamped vs. notes json modified?
        refreshDocImage = function() {
            var docpanel = document.querySelector(".docPanel");
            if (docpanel) {
                var imgurl;
                imgurl = docpanel.style.backgroundImage;
                docpanel.style.backgroundImage = imgurl;
            }
        };

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

        $scope.getNoteData = function() {
            var noteData = [];
            var dp = document.querySelector(".docPanel");
            for (var i = 0; i < $scope.notes.length; i++) {
                var n = $scope.notes[i];
                var nx = n[0];
                var bnds = getNoteBounds(nx);
                var pos = [nx.page, bnds[0], bnds[1], dp.clientWidth, dp.clientHeight];
                var typ = nx.notetype;
                var val = [];
                var style = [];
                var ndx = [pos, typ, val, style];
                var se, lh;

                if (typ == 'text') {
                    se = nx.querySelector("textarea");
                    val.push(se.value);
                    style.push(getIntProperty(se, 'font-size'));
                    ndx[0][2][0] += 5;
                    ndx[0][2][1] -= 6;
                } else if (typ == 'check') {
                    se = nx.querySelector("span.check-annotation");
                    lh = getIntProperty(se, 'line-height');
                    style.push(getIntProperty(se, 'font-size'));
                    ndx[0][2][1] += 6;
                } else if (typ == 'canvas') {
                    se = nx.querySelector("canvas");
                    val.push(se.strokes);
                }

                noteData.push(ndx);
            }

            /*
    notData.sort(function(x,y) { if (x[0][0] == y[0][0]) {

    } else return x[0][0] < y[0][0] });
  */
            return JSON.stringify(noteData);
        };

        $scope.saveNoteData = function() {
            var nd = $scope.getNoteData();
            if ($scope.lib === undefined) return;
            // This happens when "saveNoteData" is called by $locationChange event on the target doc -- which is the wrong one

            if (nd == $scope.lib.annotations) return;
            // When there are no changes

            /** @name SWBrijj#saveNoteData
             * @function
             * @param {int}
             * @param {boolean}
             * @param {boolean}
             * @param {json}
             */
            SWBrijj.saveNoteData($scope.docId, $scope.invq, !$scope.lib.original, nd).then(function(data) {
                void(data);
                refreshDocImage();
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
