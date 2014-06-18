'use strict';

app.directive('library', function() {
    return {
        restrict: 'A',
        link: function(scope, elm, attrs) {
            void(attrs);
            scope.listScrolls = function() {
                return elm[0].scrollHeight > elm[0].height;
            };
        }
    };
});

app.directive('myLoadingSpinner', function() {
    return {
        restrict: 'A',
        replace: true,
        transclude: true,
        scope: {processing: '=myLoadingSpinner'},
        template: '<div>' +
                      '<div ng-show="processing" class="my-loading-spinner-container"></div>' +
                      '<div ng-hide="processing" ng-transclude></div>' +
                  '</div>',
        link: function(scope, element, attrs) {
            var spinner = new Spinner().spin();
            var loadingContainer = element.find('.my-loading-spinner-container')[0];
            loadingContainer.appendChild(spinner.el);
        }
    };
});

app.directive('restrictContentEditable', function() {
    return {
        require: 'ngModel',
        link: function(scope, elm, attrs, ctrl) {
            // view -> model
            var ff = function() {
                scope.$apply(function() {
                    ctrl.$setViewValue(elm.text());
                });
                scope.$emit('updated:name');
            };

            elm.on('blur', ff);
            elm.bind("keydown keypress", function(event) {
                var allowedKeys = [8, 46, 37, 38, 39, 40, 27];
                // backspace, delete, up, down, left, right, esc
                if (event.which === 13) {
                    // key = enter
                    event.preventDefault();
                    event.currentTarget.blur();
                } else if (elm.html().length >= 58 && allowedKeys.indexOf(event.which) === -1 && !event.ctrlKey && !event.metaKey) {
                    // reached maxlength AND entered key is not allowed AND not key combination
                    event.preventDefault();
                } else if (event.which === 86 && (event.ctrlKey || event.metaKey)) {
                    // disallow paste
                    event.preventDefault();
                }
            });

            // model -> view
            ctrl.$render = function() {
                elm.text(ctrl.$viewValue);
            };

            // load init value from DOM
            ctrl.$setViewValue(elm.text());
        }
    };
});

app.directive('contenteditable', function() {
    return {
        require: 'ngModel',
        link: function(scope, elm, attrs, ctrl) {
            // view -> model
            var ff = function() {
                scope.$apply(function() {
                    ctrl.$setViewValue(elm.text());
                });
                scope.$emit('updated:name');
            };

            elm.on('blur', ff);
            elm.bind("keydown keypress", function(event) {
                if (event.which === 13) {
                    // key = enter
                    event.preventDefault();
                    event.currentTarget.blur();
                }
            });

            // model -> view
            ctrl.$render = function() {
                elm.text(ctrl.$viewValue);
            };

            // load init value from DOM
            ctrl.$setViewValue(elm.text());
        }
    };
});

app.directive('documentSummaryRow', function() {
    // must be used in a tbody for valid html
    return {
        restrict: "A",
        scope: {
            doc: '=',
            viewState: '=',
            modals: '=',
            docShareState: '=',
        },
        templateUrl: '/documents/partials/documentSummaryRow.html',
        controller: DocumentSummaryRowController
    };
});

app.directive('documentVersionRow', function() {
    // must be used in a tr for valid html
    return {
        restrict: "A",
        scope: {
            version: '=',
            viewState: '=',
            modals: '=',
        },
        templateUrl: '/documents/partials/documentVersionRow.html',
        controller: DocumentVersionRowController
    };
});

app.directive('annotationList', function() {
    return {
        restrict: "EA",
        scope: {
            docId: "=",
        },
        templateUrl: "/documents/partials/annotationList.html",
        controller: ["$scope", "$element", "$rootScope", "Annotations",
            function($scope, $element, $rootScope, Annotations) {
                $scope.annotations = [];
                $scope.$watch("docId", function(new_doc_id, old_doc_id) {
                    $scope.annotations = Annotations.getDocAnnotations(new_doc_id);
                });

                // weird hack to set a property on the annotation marking it as the first on the page ...
                var currentPage = -1;
                $scope.newPage = function(annotation) {
                    if (annotation.first || currentPage != annotation.page) {
                        annotation.first = true;
                    }
                    currentPage = annotation.page;
                    return annotation.first;
                };
            }
        ],
    };
});

app.directive('annotation', function() {
    return {
        restrict: "EA",
        scope: {
            annot: "=",
            isAnnotable: "=",
            signatureprocessing: "=",
        },
        templateUrl: "/documents/partials/annotation.html",
        controller: ["$scope", "$element", "$rootScope", "$document",
            function($scope, $element, $rootScope, $document) {
                $scope.annotext = "";
                $scope.investor_attributes = []; // TODO

                function ApplyLineBreaks(oTextarea) {
                    var max = Math.floor(parseInt(oTextarea.style.height)/12);
                    if (oTextarea.wrap) {
                        oTextarea.setAttribute("wrap", "off");
                    }
                    else {
                        oTextarea.setAttribute("wrap", "off");
                        var newArea = oTextarea.cloneNode(true);
                        newArea.value = oTextarea.value;
                        oTextarea.parentNode.replaceChild(newArea, oTextarea);
                        oTextarea = newArea;
                    }

                    var strRawValue = oTextarea.value;
                    oTextarea.value = "";
                    var nEmptyWidth = oTextarea.scrollWidth;
                    var nLastWrappingIndex = -1;

                    function testBreak(strTest) {
                        oTextarea.value = strTest;
                        return oTextarea.scrollWidth > nEmptyWidth;
                    }
                    function findNextBreakLength(strSource, nLeft, nRight) {
                        var nCurrent;
                        if(typeof(nLeft) == 'undefined') {
                            nLeft = 0;
                            nRight = -1;
                            nCurrent = 64;
                        }
                        else {
                            if (nRight == -1)
                                nCurrent = nLeft * 2;
                            else if (nRight - nLeft <= 1)
                                return Math.max(2, nRight);
                            else
                                nCurrent = nLeft + (nRight - nLeft) / 2;
                        }
                        var strTest = strSource.substr(0, nCurrent);
                        var bLonger = testBreak(strTest);
                        if(bLonger)
                            nRight = nCurrent;
                        else
                        {
                            if(nCurrent >= strSource.length)
                                return null;
                            nLeft = nCurrent;
                        }
                        return findNextBreakLength(strSource, nLeft, nRight);
                    }

                    var i = 0, j;
                    var strNewValue = "";
                    while (i < strRawValue.length) {
                        var breakOffset = findNextBreakLength(strRawValue.substr(i));
                        if (breakOffset === null) {
                            strNewValue += strRawValue.substr(i);
                            break;
                        }
                        nLastWrappingIndex = -1;
                        var nLineLength = breakOffset - 1;
                        for (j = nLineLength - 1; j >= 0; j--) {
                            var curChar = strRawValue.charAt(i + j);
                            if (curChar == ' ' || curChar == '-' || curChar == '+') {
                                nLineLength = j + 1;
                                break;
                            }
                        }
                        strNewValue += strRawValue.substr(i, nLineLength) + "\n";
                        i += nLineLength;
                    }
                    var re = /\n/g;
                    var lastre = /\n(?!.*\n)/;
                    var count = strNewValue.match(re);
                    if (count && max <= count.length) {
                        strNewValue = strNewValue.split("\n", max).join("\n");
                    }
                    oTextarea.value = strNewValue;
                    oTextarea.setAttribute("wrap", "hard");
                    return oTextarea.value.replace(new RegExp("\\n", "g"), "<br />");
                }

                var dragicon = $element.find("span.dragger");

                /* This is the drag - code -- its been moved to work on the drag widget */
                $scope.mousedown = function($event) {
                    $scope.initdrag($event);
                    return false;
                };

                // TODO: shouldn't bind here, but ng-mousedown appears to not stop propagation
                dragicon.bind('mousedown', $scope.mousedown);

                $scope.$watch('annot.val', function(newValue, oldValue) {
                    // prevent issuers from filling in the investor values
                    if ($rootScope.navState.role == "issuer" && $scope.annot.whosign == "Investor") {
                        $scope.annot.val = "";
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
                        return 0;
                    } else if (mouseY > bottomEdge - elementHeight) {
                        return (panelHeight - elementHeight);
                    } else {
                        return mouseY - topEdge;
                    }
                };

                var leftLocation = function(elementWidth, mouseX) {
                    var docPanel = document.querySelector('.docPanel');
                    var leftEdge = docPanel.offsetLeft;
                    var panelWidth = docPanel.offsetWidth;
                    var rightEdge = leftEdge + panelWidth;
                    if (mouseX < leftEdge) {
                        return 0;
                    } else if (mouseX > rightEdge - elementWidth) {
                        return (panelWidth - elementWidth);
                    } else {
                        return mouseX - leftEdge;
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
                    $scope.$apply(function() {
                        $scope.annot.position.coords.y = topLocation($element.height(), mousey);
                        $scope.annot.position.coords.x = leftLocation($element.width(), mousex);
                    });
                    return false;
                };
                $scope.newmousemove = function($event) {
                    $scope.$apply(function() {
                        var dx = $event.clientX - $scope.initialMouseX + document.documentElement.scrollLeft - $scope.initialScrollX;
                        var dy = $event.clientY - $scope.initialMouseY + document.documentElement.scrollTop - $scope.initialScrollY;
                        /*$element.css({
                            height: dy + 6 + 'px',
                            width: dx + 6 + 'px'
                        });*/
                        $scope.annot.position.size.height = dy - 4;
                        $scope.annot.position.size.width = dx - 8;
                        /*var bb = $element[0].querySelector("textarea");
                        bb.style.height = dy - 4 + "px";
                        bb.style.width = dx - 8 + "px";*/
                        return false;
                    });
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
                    $document.unbind('scroll', $scope.mousemove);
                    $document.unbind('mousemove', $scope.newmousemove);
                    $document.unbind('mouseup', $scope.newmouseup);
                    $scope.$apply(function() {
                        // TODO: fix this logic (check size.width and size.height instead of style, and remove from parent annots list)
                        var bb = $element[0].querySelector("textarea");
                        if (parseInt(bb.style.width) === 0 || parseInt(bb.style.height) < 12) {
                            var x = bb.parentElement.parentElement.parentElement.parentElement;
                            x.parentElement.removeChild(x);
                            for (var i = 0; i < $scope.notes.length; i++) {
                                if ($scope.notes[i][0] === x) {
                                    $scope.notes.splice(i, 1);
                                    return;
                                }
                            }
                        }
                        angular.element(bb.parentElement).scope().getme = true;
                        return false;
                    });
                };

                $scope.closeMe = function() {
                    // TODO: remove annot from $scope.$parent.annots
                    alert("remove me!");
                    /*var z = ev.currentTarget;
                    while (z.attributes.draggable === undefined) z = z.parentElement;
                    z.parentElement.removeChild(z);
                    for (var i = 0; i < $scope.notes.length; i++) {
                        if ($scope.notes[i][0] === z) {
                            $scope.notes.splice(i, 1);
                            return;
                        }
                    }*/
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
                    $scope.annot.position.coords.y = topLocation($element.height(), mousey);
                    $scope.annot.position.coords.x = leftLocation($element.width(), mousex);
                    if (document.attachEvent) {
                        document.attachEvent('on'+mousewheelevt, $scope.mousemove);
                    } else if (document.addEventListener) {
                        document.addEventListener(mousewheelevt, $scope.mousemove, false);
                    }
                    $document.bind('scroll', $scope.mousemove);
                    $document.bind('mousemove', $scope.newmousemove);
                    $document.bind('mouseup', $scope.newmouseup);
                };

                $scope.imageMine = function() {
                    var role = $rootScope.navState.role;
                    var whosign = $scope.annot.whosign;
                    return (role == "issuer" && whosign == "Issuer") ||
                           (role == "investor" && whosign == "Investor") ? true : false;
                };
                $scope.whosignssticky = function() {
                    var role = $rootScope.navState.role;
                    var whosign = $scope.annot.whosign;
                    return (role == "issuer" && whosign == "Investor") ||
                           (role == "investor" && whosign == "Issuer") ? true : false;
                };

                $scope.openBox = function(ev, event) {
                    if ($rootScope.navState.role == "issuer" && !$scope.countersignable($scope.lib)) {
                        $scope.getme = true;
                    }
                    if ($scope.annot.whattype == "ImgSignature" && (($scope.annot.whosign == 'Investor' && $rootScope.navState.role == 'investor') || ($scope.annot.whosign == 'Issuer' && $rootScope.navState.role == 'issuer'))) {
                        var textarea = event.currentTarget;
                        var width = parseInt(textarea.style.width);
                        var height = parseInt(textarea.style.height);
                        var boxwidth = 330;
                        var boxheight = 200;
                        var ratio;
                        if (height > width) {
                            ratio = boxheight / height;
                            height = boxheight;
                            width = width * ratio;
                        }
                        else {
                            ratio = boxwidth / width;
                            width = boxwidth;
                            height = height * ratio;
                        }
                        $scope.signaturestyle = {height: String(180), width: String(330) };
                        $scope.currentsignature = textarea;
                        $scope.signatureURL = '/photo/user?id=signature:';
                        $scope.sigModalUp();
                    }
                };

                function setDefaultText() {
                    if (($rootScope.navState.role == "issuer" && $scope.annot.whosign == "Issuer") || $rootScope.navState.role == "investor" && $scope.annot.whosign == "Investor") {
                        $scope.annotext = $scope.annotext.length === 0 && $scope.annot.whattype in $scope.investor_attributes ? $scope.investor_attributes[$scope.annot.whattype] : $scope.annotext;
                    }
                    else {
                        $scope.annotext = $scope.annotext.length === 0 ? "" : $scope.annotext;
                    }
                }

                $scope.setSign = function($event, value) {
                    $scope.annot.whosign = value;
                    setDefaultText();
                };

                $scope.setAnnot = function($event, sticky, value) {
                    $scope.annot.whattype = value;
                    //sticky.whattypelabel = value in $scope.attributelabels ? $scope.attributelabels[value] : value;
                    setDefaultText();
                };

                $scope.addLineBreaks = function() {
                    $scope.val = ApplyLineBreaks($scope.val);
                };

                $scope.closeBox = function() {
                    if ($rootScope.navState.role == "issuer") {
                        $scope.getme = false;
                    }
                };

                $scope.investorFixed= function() {
                    return $scope.annot.investorfixed && $rootScope.navState.role == 'investor' ? false : true;
                };

                $scope.$watch('annot.position.coords', function(new_coords) {
                    if (new_coords) {
                        $scope.annotationCoordsStyle = {
                            top: Math.max(0, new_coords.y) + "px",
                            left: Math.max(0, new_coords.x) + "px"
                        };
                    }
                }, true);

                $scope.$watch('annot.position.size', function(new_size) {
                    if (new_size) {
                        $scope.annotationSizeStyle = {
                            width: (new_size.width - 14) + "px",
                            height: (new_size.height - 10) + "px"
                        };
                    }
                }, true);

                $scope.$watch('annot.whosign', function(whosign) {
                    $scope.whosignlabel = (whosign == "Investor") ? "Recipient" : $rootScope.navState.name;
                });

                $scope.$watch('annot.whattype', function(whattype) {
                    // TODO: apply "attributelabels" from documentView.js
                    $scope.whattypelabel = whattype;
                });

                if ($scope.annot.initDrag) {
                    $scope.newinitdrag($scope.annot.initDrag);
                    delete $scope.annot.initDrag;
                }

                $scope.signaturepresent = $scope.$parent.signaturepresent;

                // MOCKS
                // TODO: fix these (probably references into parent scope)
                $scope.lib = {};
                $scope.countersignable = function() {
                    return false;
                };
            }
        ]
    };
});
