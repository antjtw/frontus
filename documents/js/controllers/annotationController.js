'use strict';

function annotationController($scope, $rootScope, $element, $document, Annotations, $timeout, navState, SWBrijj, User) {
    $scope.navState = navState; // TODO: UI is very dependant on navState
    $scope.transaction_types_mapping = $rootScope.transaction_types_mapping;
    function applyLineBreaks(oTextarea) {
        // TODO: rewrite as an ngModel validator
        var max = Math.floor(parseInt(oTextarea.style.height)/12);
        if (oTextarea.wrap) {
            oTextarea.setAttribute("wrap", "off");
        } else {
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
        $scope.current.val = strNewValue;
        oTextarea.setAttribute("wrap", "hard");
        return oTextarea.value.replace(new RegExp("\\n", "g"), "<br />");
    }

    /* This is the drag - code -- its been moved to work on the drag widget */
    $scope.mousedown = function($event) {
        $scope.initdrag($event);
        $event.stopPropagation();
        return false;
    };

    $scope.$watch('current.val', function(newValue, oldValue) {
        // prevent issuers from filling in the investor values
        if (!$scope.annot.forRole(navState.role)) {
            $scope.current.val = "";
        }
    });

    $scope.signatureURL = function(annot) {
        if (annot.whattype != "ImgSignature" || !annot.forRole(navState.role))
            return "";
        if (!annot.val || annot.val.length === 0 || annot.val == "Personal")
            return "/photo/user?id=signature:";
        return '/photo/user?id=company_signature:' + annot.val;
    };

    $scope.$watch('annot.whattype', function(newval, oldval) {
        if (newval != oldval) { // don't run this on the first $watch call
            if ($scope.annot.type != 'highlight' && newval != "date") {
                $scope.annot.val = ""; // clear out value since the type changed
                setDefaultText();
            }
            if (newval == "qrcode")
            {
                $scope.annot.type = "qrcode";
                $scope.annot.val = "qrcode";
            }
            if (oldval == "qrcode" && newval != "qrcode")
                $scope.annot.type = "text";
        }
        // update type information
        $scope.annot.updateTypeInfo($scope.doc.annotation_types);
    });

    $scope.annot.whattypesetter = function(val) {
        // using a setter to prevent select2 from reformatting the whattype to it's prefered format...
        if (typeof(val) == "string") {
            $scope.annot.whattype = val;
            if (val == "ImgSignature" && $scope.annot.forRole(navState.role) && !User.signaturePresent)
            {
                $scope.sigModalUp();
            }
        }
        return $scope.annot.whattype;
    };
    function annotationOrderComp(typeA, typeB) {
        // type "Text" always takes priority
        if (typeA.id == "Text") {
            return -1;
        }
        if (typeB.id == "Text") {
            return 1;
        }
        // required == true should be higher than required == false, should be higher than required == undefined
        // this keeps transaction types at the top
        // otherwise, sort by alpha on type.text
        if (typeA.required === true) {
            if (typeB.required === true) {
                return typeA.text.localeCompare(typeB.text);
            } else {
                return -1;
            }
        }
        if (typeA.required === false) {
            if (typeB.required === true) {
                return 1;
            } else if (typeB.required === false) {
                return typeA.text.localeCompare(typeB.text);
            } else {
                return -1;
            }
        }
        if (typeA.required === undefined) {
            if (typeB.required !== undefined) {
                return 1;
            } else {
                return typeA.text.localeCompare(typeB.text);
            }
        }
    }
    $scope.select2TypeOptions = {
        data: function() {
            var res = [];
            $scope.doc.annotation_types.forEach(function(type) {
                if ($scope.unusedType(type)) {
                    res.push({id: type.name, text: type.display, required: type.required});
                }
            });
            return {results: res};
        },
        sortResults: function(data, container, query) {
            return data.sort(annotationOrderComp);
        },
        formatResultCssClass: function(type) {
            var classes = "annotation-dropdown-item";
            if (type.required === true) {
                classes += " dropdown-required";
            } else if (type.required === false) {
                classes += " dropdown-suggested";
            }
            return classes;
        },
        createSearchChoice: function(text) {
            if ($scope.doc.transaction_type != "issue certificate") {
                return {id: text, text: text};
            }
        },
    };

    $scope.unusedType = function(type) {
        // only want to filter transaction types that are already in used
        // we use type.required to determine if it's a transaction type or default type
        if (type.required === undefined) {
            return true;
        } else if (type.name == $scope.annot.type_info.name) {
            // want to show ourselves in the dropdown
            return true;
        } else {
            return !$scope.doc.hasAnnotationType(type.name);
        }
    };

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
            if ($scope.annot.type == "qrcode")
            {
                dx = dy = Math.max(dx, dy, 111);
            }
            $scope.annot.position.size.height = dy;
            $scope.annot.position.size.width = dx;
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
            if (parseInt($scope.annot.position.size.width) === 0 || parseInt($scope.annot.position.size.height) < 12) {
                $scope.closeMe();
            }
            $scope.getme = true;
        });
        if ($scope.annot.type == 'highlight')
        {
            Annotations.ocrHighlighted($scope.doc.doc_id, $scope.annot);
        }
        return false;
    };

    $scope.closeMe = function() {
        $scope.removeannot()($scope.annot);
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
        if (!bb)
        {
            bb = $element[0].querySelector("img");
        }
        $scope.startY = ev.clientY - dprt; // TODO can we get 6 dynamically?
        if (bb.style.height)
        {
            $scope.startY = $scope.startY - (parseInt(bb.style.height)/2);
        }
        else if (bb.height)
        {
            $scope.startY = $scope.startY - (parseInt(bb.height)/2);
        }
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
        $scope.startX = ev.clientX - dprl; // mouse start positions relative to the box/pad
        $scope.startY = ev.clientY - dprt;
        $scope.initialMouseX = ev.clientX;
        $scope.initialMouseY = ev.clientY;
        $scope.initialScrollX = document.documentElement.scrollLeft;
        $scope.initialScrollY = document.documentElement.scrollTop;
        var dx = ev.clientX - $scope.initialMouseX;
        var dy = ev.clientY - $scope.initialMouseY;
        var mousex = $scope.startX + dx;
        var mousey = $scope.startY + dy;
        $scope.annot.position.coords.y = topLocation(0, mousey); // box has no size (since it's new) so pass 0 instead of $element.height/width
        $scope.annot.position.coords.x = leftLocation(0, mousex);
        if (document.attachEvent) {
            document.attachEvent('on'+mousewheelevt, $scope.mousemove);
        } else if (document.addEventListener) {
            document.addEventListener(mousewheelevt, $scope.mousemove, false);
        }
        $document.bind('scroll', $scope.mousemove);
        $document.bind('mousemove', $scope.newmousemove);
        $document.bind('mouseup', $scope.newmouseup);
    };

    $scope.setDatepickerCurrent = function(ev) {
        // use timeout so we're certain to be set after openBox for this click;
        $timeout(function() {
            $scope.active.datepicker = ev.target;
        });
    };

    $scope.openBox = function() {
        $scope.active.annotation = $scope.annot;
        // kill any open datepicker if needed
        $($scope.active.datepicker).datepicker("hide");
        $scope.active.datepicker = null;
        if (navState.role == "issuer" && !$scope.doc.countersignable(navState.role)) {
            $scope.getme = true;
        }
        if ($scope.annot.whattype == "ImgSignature" &&
            ($scope.annot.forRole(navState.role) && !$scope.doc.countersignable(navState.role))) {
            $scope.signaturestyle = {height: 180, width: 330 };
            if (!User.signaturePresent)
                $scope.sigModalUp();
        }
    };

    function setDefaultText() {
        if ($scope.annot.val.length === 0) {
            if ($scope.annot.forRole(navState.role)) {
                $scope.annot.val = Annotations.investorAttribute([$scope.annot.whattype]);
            } else {
                $scope.annot.val = "";
            }
        }
    }

    $scope.setSign = function($event, value) {
        $scope.annot.whosign = value;
        $scope.annot.val = "";
        setDefaultText();
        if ($scope.annot.whattype == "ImgSignature" && $scope.annot.forRole(navState.role) && !User.signaturePresent)
        {
            $scope.sigModalUp();
        }
    };

    $scope.addLineBreaks = function($event) {
        $event.target = applyLineBreaks($event.target);
    };

    $scope.closeBox = function() {
        $scope.active.annotation = null;
        if (navState.role == "issuer") {
            $scope.getme = false;
        }
    };

    $scope.investorFixed= function() {
        return $scope.annot.investorfixed && navState.role == 'investor' ? false : true;
    };

    $scope.annotationCoordsStyle = {};
    $scope.annotationSizeStyle = {};
    $scope.annotationSizeImageStyle = {};
    $scope.annotationSizeQRStyle = {};
    $scope.annotationSizeQRStyle['min-height'] = '111 px';
    $scope.annotationSizeQRStyle['min-width'] = '111 px';
    $scope.annotationHighlightStyle = {'background': "rgba(255, 255, 0, 0.5)"};

    $scope.enumBoxMode = function() {
        // whether the annotation box should be a select2 dropdown
        // note that issuers see it in the blue popup, so it's always false for them
        return $scope.annot.type_info &&
               $scope.annot.type_info.typename == 'enum' &&
               $scope.annot.forRole(navState.role)&&
               (navState.role == 'investor' ||
                $scope.prepareFor);
    };

    $scope.dateBoxMode = function() {
        // whether the main annotation box should be a datepicker
        // note that issuers see it in the blue popup, so it's always false for them
        return $scope.annot.type_info &&
               $scope.annot.type_info.typename == 'date' &&
               $scope.annot.forRole(navState.role) &&
               (navState.role == 'investor' ||
                $scope.prepareFor);
    };

    $scope.$watch('annot.position.coords', function(new_coords) {
        if (new_coords) {
            $scope.annotationCoordsStyle.top = Math.max(0, new_coords.y) + "px";
            $scope.annotationCoordsStyle.left = Math.max(0, new_coords.x) + "px";
        }
    }, true);

    $scope.$watch('annot.position.size', function(new_size) {
        if (new_size) {
            $scope.annotationSizeStyle.width = (new_size.width - 14) + "px";
            $scope.annotationSizeStyle.height = (new_size.height - 10) + "px";
            $scope.annotationSizeImageStyle["max-width"] = (new_size.width - 14) + "px";
            $scope.annotationSizeImageStyle["max-height"] = (new_size.height - 10) + "px";
            $scope.annotationHighlightStyle.width = (new_size.width) + "px";
            $scope.annotationHighlightStyle.height = (new_size.height) + "px";
        }
    }, true);

    $scope.$watch('annot.fontsize', function(new_fontsize) {
        if (new_fontsize) {
            $scope.annotationSizeStyle["font-size"] = new_fontsize;
        }
    });

    if ($scope.annot.initDrag) {
        $scope.newinitdrag($scope.annot.initDrag);
        delete $scope.annot.initDrag;
    }

    $scope.$watch('annot.focus', function(focus) {
        // tell if we're supposed to start or become a focused attribute
        if (focus) {
            // using $timeout to avoid nested $digests
            $timeout(function() {
                $element.find('textarea').focus();
                $scope.openBox();
            });
        }
        delete $scope.annot.focus;
    });

    // create variables we can bind to for placeholder and value
    // depending on whether we're using the annotation proper, or an override value
    // TODO: look at using a getter/setter on custom.val to cut down on the number of watches
    $scope.current = {};
    $scope.$watch('annot.type_info.display', function(display) {
        if ((!$scope.prepareFor) || ($scope.annot.val.length === 0)) {
            $scope.current.placeholder = display;
        }
    });
    if ($scope.prepareFor) {
        $scope.$watch('annot.val', function(val) {
            if (val.length > 0) {
                $scope.current.placeholder = val;
            } else {
                $scope.current.placeholder = $scope.annot.type_info.display;
            }
        });
        $scope.$watch(function() {
            if ($scope.doc.preparedFor &&
                $scope.doc.preparedFor[$scope.prepareFor]) {
                return $scope.doc.preparedFor[$scope.prepareFor].overrides[$scope.annot.id];
            } else {
                return "";
            }
        }, function(override) {
            $scope.current.val = override;
        });
        $scope.$watch('current.val', function(val, old_val) {
            if (val == old_val) {
                // don't run the first time
                return;
            }
            // check for overrides value existance, then assign to it if it's not equal
            if ($scope.doc.preparedFor &&
                $scope.doc.preparedFor[$scope.prepareFor]) {
                if (val != $scope.doc.preparedFor[$scope.prepareFor].overrides[$scope.annot.id]) {
                    $scope.doc.preparedFor[$scope.prepareFor].overrides[$scope.annot.id] = val;
                }
            } else {
                if (!$scope.doc.preparedFor) {
                    $scope.doc.getPreparedFor();
                }
                if (!$scope.doc.preparedFor[$scope.prepareFor]) {
                    var hash = $scope.doc.addPreparedFor($scope.prepareFor);
                    hash.overrides[$scope.annot.id] = val;
                } else {
                    $scope.doc.preparedFor[$scope.prepareFor].overrides[$scope.annot.id] = val;
                }
            }
        });
    } else {
        $scope.$watch('annot.val', function(val) {
            if ($scope.current.val != val) {
                $scope.current.val = val;
            }
        });
        $scope.$watch('current.val', function(val) {
            if ($scope.annot.val != val) {
                $scope.annot.val = val;
            }
        });
    }
}

annotationController.$inject = ["$scope", "$rootScope", "$element", "$document", "Annotations", "$timeout", "navState", "SWBrijj", "User"];
