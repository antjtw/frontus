'use strict';

app.controller('DocumentViewController', ['$scope', '$rootScope', '$compile', '$location', '$routeParams', '$window', 'SWBrijj',
    function($scope, $rootScope, $compile, $location, $routeParams, $window, SWBrijj) {
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

        function getIntProperty(se, z) {
            var lh = getComputed(se, z);
            if(lh) {
                lh = parseFloat(lh.replace("px", ""));
            }
            return lh;
        }

        function getComputed(se, z) {
            var originalAnswer = se.currentStyle ? se.currentStyle[z] : document.defaultView.getComputedStyle(se, null).getPropertyValue(z);
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

        function getNoteBounds(nx, not_visible) {
            // [LEFT, TOP, WIDTH, HEIGHT]
            var top_padding = 120;
            var bds = [getIntProperty(nx, 'left'), getIntProperty(nx, 'top'), 0, 0];
            var dp = document.querySelector('.docPanel');
            //if (!dp.offsetTop && not_visible) {
            //    bds[1]-=top_padding;
            //}
            // 161 is fixed above due to timing issues -- the docPanel element is not available when notes are saved right before stamping.
            // this could be set as a static value during other pad calculations
            var ntyp = nx.notetype;
            var z, ibds;
            if (ntyp == 'text') {
                var t = nx.querySelector('textarea');
                z = t.offset;
                ibds = [0,0, parseInt(t.style.width)+14, parseInt(t.style.height)+10];
            } else if (ntyp == 'canvas') {
                var c = nx.querySelector('canvas');
                z = c.offset;
                ibds = [z[0], z[1], z[2], z[3]];
            } else if (ntyp == 'check') {
                ibds = [12, 27, 14, 14];
            }

            return [bds, ibds]; // [coords, size]
        }

        function boundBoxByPage(element) {
            var docPanel = document.querySelector('.docPanel');
            // FIXME does not work in firefox because position:absolute
            element.style["max-width"] = (docPanel.offsetWidth) + 'px';
            element.style["max-height"] = (docPanel.offsetHeight) + 'px';
        }

        function topFromBottomLocation(elementHeight, currBottom) {
            var docPanel = document.querySelector('.docPanel');
            var bottomEdge = docPanel.offsetTop + docPanel.offsetHeight;
            if (currBottom > bottomEdge) {
                return bottomEdge - elementHeight;
            } else {
                return currBottom - elementHeight;
            }
        }

        function leftFromRightLocation(elementWidth, currRight) {
            var docPanel = document.querySelector('.docPanel');
            var rightEdge = docPanel.offsetLeft + docPanel.offsetWidth;
            if (currRight > rightEdge) {
                return rightEdge - elementWidth;
            } else {
                return currRight - elementWidth;
            }
        }

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
            // TODO: evt.which is read-only ("TypeError: setting a property that has only a getter")
            evt.which = evt.which || e.keyCode;
            // Need the extra if so that the page change doesn't occur if you are currently focused into a sticky
            if (document.activeElement.tagName.toLowerCase() != 'textarea' ) {
                if (evt.which === 37) {
                    $scope.previousPage($scope.currentPage);
                } else if (evt.which === 39) {
                    $scope.nextPage($scope.currentPage);
                }
            }
        };
        // Tells JS to update the backgroundImage because the imgurl has changed underneath it.
        var refreshDocImage = function() {
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
            $scope.template_original = false;
            refreshDocImage();
            $scope.reqDocStatus($scope.docId); // sets $scope.doc_status
            $scope.loadPages();
            $scope.loadpreviousshares();
        });

        $scope.get_attribute = function(attribute, type, attributes) {
            if (type == "company") {
                if (attribute == "companyName") {
                    return attributes.name;
                }
                else if (attribute == "companyState") {
                    return attributes.state;
                }
            }
        };

        $scope.loadpreviousshares = function() {
            if ($rootScope.navState.role == 'issuer') {
                SWBrijj.procm('document.unretracted_shares', $scope.docId).then(function(is) {
                    $scope.alreadyshared = [];
                    angular.forEach(is, function(i) {
                        $scope.alreadyshared.push(i.unretracted_shares);
                    });
                });
            }
        };


        var regExp = /\(([^)]+)\)/;
        $scope.template_share = function(email, attributes, message, sign, deadline) {
            $scope.processing = true;
            var shareto = "";

            angular.forEach(email, function(person) {
                var matches = regExp.exec(person);
                if (matches === null) {
                    matches = ["", person];
                }
                shareto += "," +  matches[1];
            });

            SWBrijj.smartdoc_share_template($scope.templateKey, JSON.stringify(attributes), shareto.substring(1).toLowerCase(), message, sign, deadline).then(function(docid) {
                $scope.$emit("notification:success", "Successfully shared document");
                $location.path('/company-list').search({});
            }).except(function(err) {
                $scope.processing = false;
                console.log(err);
            });
        };

        $scope.signTemplate = function(attributes, saved, signed) {
            // This is hideous and can go away when the user profile is updated at the backend
            $scope.processing = true;
            var cleanatt = {};
            for (var key in attributes) {
                if (key == 'investorName') {
                    cleanatt.name = attributes[key];
                }
                else if (key == 'investorState') {
                    cleanatt.state = attributes[key];
                }
                else if (key == 'investorCountry') {
                    cleanatt.country = attributes[key];
                }
                else if (key == 'investorAddress') {
                    cleanatt.street = attributes[key];
                }
                else if (key == 'investorPhone') {
                    cleanatt.phone = attributes[key];
                }
                cleanatt[key] = attributes[key];
            }
            attributes = JSON.stringify(cleanatt);
            SWBrijj.smartdoc_investor_sign_and_save($scope.subId, $scope.templateId, attributes, saved).then(function(meta) {
                $scope.$emit("notification:success", "Signed Document");
                $location.path('/investor-list').search({});
            }).except(function(err) {
                $scope.processing = false;
                $scope.$emit("notification:fail", "Oops, something went wrong. Please try again.");
                console.log(err);
            });
        };


        $scope.$on('initTemplateView', function(event, templateId, subId) {
            $scope.templateId = templateId;
            $scope.isAnnotable = false;
            $scope.docLength = 0;
            $scope.stage = -1;
            $scope.template_original = true;
            $scope.used_attributes = {};
            $scope.template_email = [];

            SWBrijj.tblmm('smartdoc.document','template_id', $scope.templateId).then(function(meta) {
                $scope.lib = {};
                $scope.lib.docname = meta[0].template_name;
            });

            if ($rootScope.navState.role == "issuer") {
                SWBrijj.smartdoc_render_template($scope.templateId).then(function(raw_html) {
                    SWBrijj.procm('smartdoc.template_attributes', $scope.templateId).then(function(attributes) {
                        var attributes = attributes;
                        SWBrijj.tblm('account.my_company').then(function(company_info) {
                            $scope.company_info = company_info[0];

                            //Sort through all the !!! and make the appropriate replacement
                            // TODO: move to handlebars syntax and compile the doc
                            while (raw_html.match(/!!![^!]+!!!/g)) {
                                var thing = raw_html.match(/!!![^!]+!!!/);
                                thing = thing[0].substring(3,(thing[0].length)-3);
                                var replace = "";
                                angular.forEach(attributes, function (attribute) {
                                    if (thing == attribute.attribute ) {
                                        var first = thing.substring(0,7);
                                        if (first == "company") {
                                            var max_length = "";
                                            var extra_class = "";
                                            if (attribute.max_length) {
                                                max_length = " maxlength=" + attribute.max_length;
                                                extra_class = " length" + attribute.max_length;
                                            }

                                            replace = $scope.get_attribute(attribute.attribute, "company", $scope.company_info);
                                            $scope.used_attributes[attribute.attribute] = replace;
                                            replace = "<span class='template-label'>" +attribute.label + "</span><input class='"+ extra_class +"'" + max_length + " type='text' ng-model='$parent.used_attributes." + attribute.attribute + "'>";
                                        }
                                        else {
                                            if (attribute.attribute_type == "text") {
                                                replace = "<span class='template-label'>" +attribute.label + "</span><input disabled type='text'>";
                                            }
                                            else if (attribute.attribute_type == "check-box") {
                                                replace = "<button disabled type='text' ng-class='{\"selected\":" + attribute.attribute +"==true}' class='check-box-button'></button>";
                                            }
                                            else if (attribute.attribute_type == "textarea") {
                                                replace = "<textarea placeholder='" + attribute.label +"' disabled></textarea>";
                                            }
                                        }
                                    }
                                });
                                raw_html = raw_html.replace(/!!![^!]+!!!/, replace);
                            }
                            $scope.html = raw_html;
                        });
                    });
                });
            }
            else {
                $scope.forsigning = true;
                SWBrijj.smartdoc_render_investor_template($scope.subId).then(function(raw_html) {
                    SWBrijj.procm('smartdoc.template_attributes', $scope.templateId).then(function(attributes) {
                        SWBrijj.tblm('smartdoc.my_profile').then(function(inv_attributes) {
                            $scope.investor_attributes = {};
                            angular.forEach(inv_attributes, function(attr) {
                                $scope.investor_attributes[attr.attribute] = attr.answer;
                            });
                            $scope.investor_attributes.investorName = angular.copy($rootScope.person.name);
                            $scope.investor_attributes.investorState = angular.copy($rootScope.person.state);
                            $scope.investor_attributes.investorAddress = angular.copy($rootScope.person.street);
                            $scope.investor_attributes.investorPhone = angular.copy($rootScope.person.phone);
                            $scope.investor_attributes.investorEmail = angular.copy($rootScope.person.email);
                            $scope.investor_attributes.signatureDate = moment(Date.today()).format($rootScope.settings.lowercasedate.toUpperCase());
                            $scope.investor_attributes.signatoryTitle = "";
                            $scope.investor_attributes.signatoryName = "";
                            $scope.investor_attributes.investorSignature = "";

                            //Sort through all the !!! and make the appropriate replacement
                            while (raw_html.match(/!!![^!]+!!!/g)) {
                                var thing = raw_html.match(/!!![^!]+!!!/);
                                thing = thing[0].substring(3,(thing[0].length)-3);
                                var replace = "";
                                angular.forEach(attributes, function (attribute) {
                                    if (thing == attribute.attribute ) {
                                        var first = thing.split("_")[0];

                                        if (first != "company") {

                                            var max_length = "";
                                            var extra_class = "";
                                            if (attribute.max_length) {
                                                max_length = " maxlength=" + attribute.max_length;
                                                extra_class = " length" + attribute.max_length;
                                            }

                                            if (attribute.attribute_type == "text") {
                                                replace = "<span class='template-label'>" +attribute.label + "</span><input class='"+ extra_class +"'" + max_length + " type='text' ng-model='$parent.investor_attributes." + attribute.attribute + "'>";
                                            }
                                            else if (attribute.attribute_type == "check-box") {
                                                replace = "<button type='text' ng-click=\"$parent.booleanUpdate('"+attribute.attribute+"',$parent.investor_attributes."+ attribute.attribute +")\" ng-class=\"{'selected':$parent.investor_attributes." + attribute.attribute +"=='true'}\" ng-model='$parent.investor_attributes." + attribute.attribute + "' class='check-box-button check-box-attribute'><span data-icon='&#xe023;' aria-hidden='true'></span></button>";
                                            }
                                            else if (attribute.attribute_type == "textarea") {
                                                replace = "<span class='template-label'>" +attribute.label + "</span><textarea ng-model='$parent.investor_attributes." + attribute.attribute + "'></textarea>";
                                            }
                                        }
                                    }
                                });
                                raw_html = raw_html.replace(/!!![^!]+!!!/, replace);
                            }
                            $scope.html = raw_html;
                        });
                    });
                });
            }
        });

        $scope.stage = 0;
        $scope.confirmValue = 0;
        $scope.infoValue = 1;
        if (!$scope.rejectMessage) {$scope.rejectMessage = "Explain the reason for rejecting this document.";}
        $scope.notes = [];
        $scope.pageScroll = 0;
        $scope.isAnnotable = true;
        $('.docViewerHeader').affix({
            offset: {top: 40}
        });

        $scope.signatureURL = '/photo/user?id=signature:';

        $scope.setStage = function(n) {
            $scope.setConfirmValue(0);
            if (n==1) window.scrollTo(window.scrollX, 0);
            $scope.stage = n;
            if ($scope.stage === 0) {
                refreshDocImage();
            }
            if (!$scope.templateId && $scope.lib && $scope.isAnnotable && !$scope.countersignable($scope.lib)) {
                $scope.saveNoteData();
            }
        };
        $scope.setConfirmValue = function(n) {
            if ($scope.confirmValue === n) {
                $scope.confirmValue = 0;
            } else {
                $scope.confirmValue = n;
            }
            if ($scope.confirmValue !== -1) {
                //$scope.messageText = "Explain the reason for rejecting this document.";
                //"Add an optional message...";
            }
        };

        $scope.setinfoValue = function(n) {
            if ($scope.infoValue === n) {
                $scope.infoValue = 0;
            } else {
                $scope.infoValue = n;
            }
        };

        $scope.annotable = function() {
            return ($scope.invq && $scope.investorCanAnnotate()) || (!$scope.invq && $scope.issuerCanAnnotate());
        };

        $scope.investorCanAnnotate = function() {
            return (!$scope.lib.when_signed && $scope.lib.signature_deadline && $scope.lib.signature_flow===2);
        };

        $scope.issuerCanAnnotate = function() {
            return (!$scope.lib.when_countersigned && $scope.lib.when_signed && $scope.lib.signature_flow===2) ||
                   ($scope.lib && $scope.prepare);
        };

        $scope.resetMsg = function() {
            if ($scope.rejectMessage === "Explain the reason for rejecting this document.") {
                $scope.rejectMessage = "";
            }
        };


        $scope.countersignAction = function(conf, msg) {
            $scope.$emit('countersignAction', [conf, msg]);
        };
        $scope.finalizeAction = function(conf, msg) {
            $scope.$emit('finalizeAction', [conf, msg]);
        };

        $scope.voidAction = function(confirm, message) {
            $scope.processing = true;
            if (message == "Explain the reason for rejecting this document.") {
                message = " ";
            }
            SWBrijj.document_investor_void($scope.docId, confirm, message).then(function(data) {
                if (confirm == 1) {
                    $scope.$emit("notification:success", "Void request accepted and document voided");
                }
                else {
                    $scope.$emit("notification:success", "Void request rejected");
                }
                $scope.leave();
            }).except(function(x) {
                    console.log(x);
                    $scope.$emit("notification:fail", "Oops, something went wrong.");
                    $scope.processing = false;
                });
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
                for (var i = 0; i < data.length; i++) {
                    $scope.annotated[data[i].page - 1] = data[i].annotated;
                }
                loadAnnotations();
            });
        };

        $scope.pageImageUrl = function() {
            if ($scope.pageQueryString && $scope.currentPage) {
                return "/photo/docpg?" + $scope.pageQueryString + "&page=" + $scope.currentPage;
            } else {
                return '';
            }
        };

        $scope.fieldDisabled = function() {
            return $scope.countersignable($scope.lib);
        };

        $scope.openBox = function(ev, event) {
            if ($rootScope.navState.role == "issuer" && !$scope.countersignable($scope.lib)) {
                ev.getme = true;
            }
            if (ev.whattype == "ImgSignature" && ((ev.whosign == 'Investor' && $rootScope.navState.role == 'investor') || (ev.whosign == 'Issuer' && $rootScope.navState.role == 'issuer'))) {
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

        $scope.uploadSuccess = function() {
            $scope.signatureURL = '/photo/user?id=signature:';
            $scope.signatureprocessing = false;
            $scope.progressVisible = false;
            $scope.signaturepresent = true;
            var elements = document.getElementsByClassName('draggable imagesignature mysignature');
            angular.forEach(elements, function(element) {
                element = element.querySelector("textarea");
                if (element.style.backgroundImage == 'url(/photo/user?id=signature:)') {
                    element.style.backgroundImage = 'url(/photo/user?id=signature:1)';
                }
                else {
                    element.style.backgroundImage = 'url(/photo/user?id=signature:)';
                }
            });
            $scope.$emit("notification:success", "Signature uploaded");
            $scope.scribblemode = false;
            $scope.$apply();
        };

        $scope.uploadFail = function() {
            void(0);
            $scope.progressVisible = false;
            $scope.signatureprocessing = false;
            $scope.signatureURL = '/photo/user?id=signature:';
            $scope.$emit("notification:fail", "Oops, something went wrong.");
            // console.log(x);
        };

        $scope.uploadSignatureNow = function() {
            if ($scope.files || $scope.scribblemode) {
                $scope.signatureURL = "/img/image-loader-140.gif";
                $scope.signatureprocessing = true;
                $scope.progressVisible = true;
                var fd;
                if ($scope.scribblemode) {
                    var canvas = document.getElementById("scribbleboard");
                    fd = canvas.toDataURL();
                    $scope.signatureModal = false;
                    SWBrijj.uploadSignatureString(fd).then(function(x) {
                        $scope.uploadSuccess();
                    }).except(function(x) {
                            $scope.uploadFail();
                        });
                }
                else {
                    fd = new FormData();
                    for (var i = 0; i < $scope.files.length; i++) {
                        fd.append("uploadedFile", $scope.files[i]);
                    }
                    $scope.signatureModal = false;
                    SWBrijj.uploadSignatureImage(fd).then(function(x) {
                        $scope.uploadSuccess();
                    }).except(function(x) {
                        $scope.uploadFail();
                    });
                }
            }
            else {
                $scope.signatureModal = false;
            }

        };

        $scope.createNewSignature = function() {
            $scope.scribblemode = true;

            var canvas = document.getElementById("scribbleboard");

            var ctx = canvas.getContext('2d');
            canvas.height = 180;
            canvas.width = 330;
            console.log(ctx);
            console.log(canvas);
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
            }, true);
        };

        $scope.setFiles = function(element) {
            $scope.files = [];
            for (var i = 0; i < element.files.length; i++) {
                $scope.files.push(element.files[i]);

                var oFReader = new FileReader();
                oFReader.readAsDataURL($scope.files[0]);

                oFReader.onload = function (oFREvent) {
                    document.getElementById("signaturevisual").src = oFREvent.target.result;
                };
                $scope.scribblemode = false;
                $scope.$apply();
            }
        };

        $scope.addLineBreaks = function(ev) {
            ev.target = ApplyLineBreaks(ev.target);
        };

        $scope.closeBox = function(ev) {
            if ($rootScope.navState.role == "issuer") {
                ev.getme = false;
            }
        };

        $scope.investorFixed= function(ev) {
            return ev.$$nextSibling.investorfixed && $rootScope.navState.role == 'investor' ? false : true;
        };

        $scope.stickyrequired = function(ev) {
            return ev.$$nextSibling.required ? true : false;
        };

        $scope.signatureField = function (element) {
            return element.$$nextSibling.whattype == "Signature"  ? true : false;
        };

        $scope.imageField = function (element) {
            return element.$$nextSibling.whattype == "ImgSignature" ? true : false;
        };

        $scope.imageMine = function (element) {
            return ($rootScope.navState.role == "issuer" && element.$$nextSibling.whosign == "Issuer") || ($rootScope.navState.role == "investor" && element.$$nextSibling.whosign == "Investor") ? true : false;
        };

        $scope.signatureProcessing = function () {
            return $scope.signatureprocessing;
        };

        $scope.stickyfilled = function(ev) {
            return (ev.$$nextSibling.annotext && ev.$$nextSibling.annotext.length > 0) || (ev.$$nextSibling.whattype == "ImgSignature" && $scope.signaturepresent && (($rootScope.navState.role == "issuer" && ev.$$nextSibling.whosign == "Issuer") || ($rootScope.navState.role == "investor" && ev.$$nextSibling.whosign == "Investor"))) ? true : false;
        };

        $scope.whosignssticky = function(element) {
            return ($rootScope.navState.role == "issuer" && element.$$nextSibling.whosign == "Investor") || ($rootScope.navState.role == "investor" && element.$$nextSibling.whosign == "Issuer") ? true : false;
        };

        function createAttributes(inv_attributes) {
            $scope.investor_attributes = {};
            $scope.attributelabels = {};
            angular.forEach(inv_attributes, function(attr) {
                $scope.investor_attributes[attr.attribute] = attr.answer;
                $scope.attributelabels[attr.attribute] = attr.label;
            });
            $scope.investor_attributes.investorName = angular.copy($rootScope.person.name);
            $scope.investor_attributes.investorState = angular.copy($rootScope.person.state);
            $scope.investor_attributes.investorCountry = angular.copy($rootScope.person.country);
            $scope.investor_attributes.investorStreet = angular.copy($rootScope.person.street);
            $scope.investor_attributes.investorPhone = angular.copy($rootScope.person.phone);
            $scope.investor_attributes.investorEmail = angular.copy($rootScope.person.email);
            $scope.investor_attributes.investorPostalcode = angular.copy($rootScope.person.postalcode);
            $scope.investor_attributes.signatureDate = moment(Date.today()).format($rootScope.settings.lowercasedate.toUpperCase());
            $scope.attributelabels.investorName = "Name";
            $scope.attributelabels.investorState = "State";
            $scope.attributelabels.investorCountry = "Country";
            $scope.attributelabels.investorStreet = "Address";
            $scope.attributelabels.investorPhone = "Phone";
            $scope.attributelabels.investorEmail = "Email";
            $scope.attributelabels.investorPostalcode = "Zip code";
            $scope.attributelabels.signatureDate = "Date";
            $scope.attributelabels.ImgSignature = "Signature Image";
            $scope.attributelabels.Signature = "Signature Text";

        };

        SWBrijj.procm('account.have_signature').then(function(sig) {
            $scope.signaturepresent = sig[0].have_signature;
        });

        function loadAnnotations() {
            /** @name SWBrijj#tblm
             * @function
             * @param {string}
             * @param {...}
             */
            SWBrijj.tblm('smartdoc.my_profile').then(function(inv_attributes) {
                createAttributes(inv_attributes);
                SWBrijj.tblm($scope.library, "doc_id", $scope.docId).then(function(data) {
                    if ($scope.lib && $scope.lib.annotations && $scope.lib.annotations.length > 0) {
                        // don't load annotations twice
                        return;
                    }
                    $scope.lib = data;
                    $scope.isAnnotable = $scope.annotable(); // requires $scope.lib


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
                    // [i][1] type -> check or text or canvas (only text seems usable now)
                    //
                    // [i][2] value -> n/a or string or series of lines ([_, x0, y0, x1, y1])
                    //
                    // [i][3] style -> font size -- anything else?


                    if ($scope.lib.annotations) {
                        // restoreNotes
                        var annots;
                        if ($scope.countersignable($scope.lib) && $scope.lib.iss_annotations) {
                            annots = JSON.parse($scope.lib.iss_annotations);
                        }
                        else {
                            annots = JSON.parse($scope.lib.annotations);
                            if (data.iss_annotations) {
                                annots = annots.concat(JSON.parse(data.iss_annotations));
                            }
                        }
                        var sticky;
                        for (var i = 0; i < annots.length; i++) {
                            var annot = annots[i];
                            var newattr = [null, null, null];
                            if (5 == annot.length) {
                                newattr = annot[4];
                            }
                            if ($scope.isAnnotable) {
                                if ($scope.countersignable($scope.lib) && (newattr.whattype == "Signature" || newattr.whattype == "ImgSignature") || !$scope.countersignable($scope.lib)) {
                                    switch (annot[1]) {
                                        case "text":
                                            sticky = newBoxX(annot[0][0], annot[2][0], annot[3], newattr);
                                            break;
                                    }

                                    // the notes were pushed in the newXXX function
                                    sticky.css({
                                        top: Math.max(0, annot[0][1][1]),
                                        left: Math.max(0, annot[0][1][0])
                                    });
                                    var bb = sticky[0].querySelector("textarea");
                                    bb.style.width = annot[0][2][2]-14 + "px";
                                    bb.style.height = annot[0][2][3]-10 + "px";
                                }
                            }
                        }
                    } // json struct
                }).except(function(err) {
                    $scope.leave();
                });
            });
        }


        $window.addEventListener('beforeunload', function(event) {
            void(event);
            if (document.location.href.indexOf('-view') != -1) {
                var ndx = $scope.getNoteData(false);
                var ndx_inv = ndx[0];
                var ndx_iss = ndx[1];
                /** @name $scope#lib#annotations
                 * @type {[Object]}
                 */
                /*
                 if ((!$scope.lib) || ndx == $scope.lib.annotations || !$scope.isAnnotable){
                 console.log("OH NO!!!");
                 return; // no changes
                 }
                 */

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
                if (!$scope.template_original && !$scope.templateId && $scope.lib && $scope.isAnnotable && !$scope.countersignable($scope.lib)) {
                    var res = SWBrijj._sync('SWBrijj', 'saveNoteData', [$scope.docId, $scope.invq, !$scope.lib.original, ndx_inv, ndx_iss]);
                    if (!res) alert('failed to save annotations');
                }
                if ($scope.template_original && $scope.prepareable($scope.lib)) {
                    var res2 = SWBrijj._sync('SWBrijj', 'proc',
                        ["account.company_attribute_update",
                            "name",
                            $scope.used_attributes.companyName
                        ]
                    );
                    var res3 = SWBrijj._sync('SWBrijj', 'proc',
                        ["account.company_attribute_update",
                            "state",
                            $scope.used_attributes.companyState
                        ]
                    );
                    if (!res2 || !res3) alert('failed to save annotations');
                }
            }

        });

        /* Save the notes when navigating away */
        // There seems to be a race condition with using $locationChangeStart or Success
        $scope.$on('$locationChangeStart', function(event, newUrl, oldUrl) {
            void(oldUrl);
            // don't save note data if I'm being redirected to log in
            if (newUrl.match(/login([?]|$)/)) return;
            $scope.saveNoteData();
            $scope.saveSmartdocData();
        });

        $scope.$on('event:leave', $scope.leave);

        $scope.leave = function() {
            if ($rootScope.lastPage &&
                ($rootScope.lastPage.indexOf("/register/") === -1) &&
                ($rootScope.lastPage.indexOf("/login/") === -1) &&
                ($rootScope.lastPage.indexOf("-view") === -1)) {
                if (document.location.href.indexOf("share=true") !== -1) {
                    sessionStorage.setItem("docPrepareState",
                            angular.toJson({template_id: $scope.templateId,
                                            doc_id: $scope.docId}));
                    $rootScope.lastPage = $rootScope.lastPage + "?share";
                }
                if ($rootScope.lastPage.indexOf("company-status") !== -1) {
                    $rootScope.lastPage = $rootScope.lastPage + "?doc=" + $scope.docId;
                }
                $location.url($rootScope.lastPage);
            } else if ($scope.invq) {
                $location.url('/app/documents/investor-list');
            } else {
                $location.url('/app/documents/company-list');
            }
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

        // TODO: check against annotations service
        $scope.allUnfilled = function() {
            var unfilled = false;
            for (var i = 0; i < $scope.notes.length; i++) {
                var n = $scope.notes[i][0];
                var contents = n.querySelector("textarea");
                if (angular.element(n).scope().$$nextSibling.whattype == 'ImgSignature') {
                    if (!$scope.signaturepresent &&
                        ((angular.element(n).scope().$$nextSibling.whosign == 'Investor' && $rootScope.navState.role == 'investor') ||
                         (angular.element(n).scope().$$nextSibling.whosign == 'Issuer' && $rootScope.navState.role == 'issuer'))) {
                        unfilled = true;
                    }
                }
                else if (angular.element(n).scope().$$nextSibling.required && contents.value.length === 0) {
                    if ((angular.element(n).scope().$$nextSibling.whosign == 'Investor' && $rootScope.navState.role == 'investor') ||
                        (angular.element(n).scope().$$nextSibling.whosign == 'Issuer' && $rootScope.navState.role == 'issuer')) {
                        unfilled = true;
                    }
                }
            }
            return unfilled;
        };

        $scope.newnewBox = function(event) {
            if ($scope.isAnnotable && (!$scope.lib.when_shared && $rootScope.navState.role == "issuer") || (!$scope.lib.when_signed && $scope.lib.signature_flow > 0 &&  $rootScope.navState.role == "investor")) {
                var aa = newBoxX($scope.currentPage, '', null);
                aa.scope().newinitdrag(event);
            }
        };

        $scope.fixBox = function(bb) {
            var pad;
            var enclosingElement = bb.parentElement.parentElement.parentElement.parentElement;
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
            var currBottom = enclosingElement.offsetTop + enclosingElement.clientHeight;
            var currRight = enclosingElement.offsetLeft + enclosingElement.clientWidth;

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
                aa.style.setProperty('left', (dpRight - aa.offsetWidth)  + 'px');
            }
        };

        function newBoxX(page, val, style, newattr) {
            var aa = $compile('<div draggable ng-show="currentPage==' + page + '" class="row-fluid draggable">' +
                              '<fieldset>' +
                              '<div class="textarea-container">' +
                              '<textarea wrap="hard" ng-class="{\'roundedcorners\': navState.role==\'investor\'}" ng-trim="false" ng-disabled="fieldDisabled()" placeholder="{{whosignlabel}} {{whattypelabel}}" ui-event="{focus : \'openBox(this, $event)\'}" style="resize:none" ng-keyup="addLineBreaks($event)" ng-mousedown="$event.stopPropagation();" wrap="off" ng-model="annotext" class="row-fluid"/>' +
                              '</div>' +
                              '</fieldset>' +
                              '<span class="sticky-menu" ng-mousedown="$event.stopPropagation();" ng-show="navState.role == \'issuer\' && getme">' +
                                '<ul>' +
                                    '<li>' +
                                        '<ul>' +
                                            '<li>' +
                                                '<span>Who needs to complete?</span>' +
                                            '</li>' +
                                            '<li>' +
                                                '<ul class="dropdown-list drop-selector">' +
                                                    '<li class="dropdown standard">' +
                                                        '<a class="dropdown-toggle" data-toggle="dropdown" href="#">' +
                                                            '{{ whosignlabel }}' +
                                                        '</a>' +
                                                        '<ul class="dropdown-menu">' +
                                                            '<li>' +
                                                                '<a ng-click="setSign(this, \'Investor\')" class="button">Recipient</a>' +
                                                            '</li>' +
                                                            '<li>' +
                                                                '<a ng-click="setSign(this, \'Issuer\')" class="button">{{navState.name}}</a>' +
                                                            '</li>' +
                                                        '</ul>' +
                                                    '</li>' +
                                                '</ul>' +
                                            '</li>' +
                                        '</ul>' +
                                    '</li>' +
                                    '<li>' +
                                        '<ul>' +
                                            '<li>' +
                                                '<span>Type of Annotation?</span>' +
                                            '</li>' +
                                            '<li>' +
                                                '<ul class="dropdown-list drop-selector">' +
                                                    '<li class="dropdown standard">' +
                                                        '<a class="dropdown-toggle" data-toggle="dropdown" href="#">' +
                                                            '{{ whattypelabel }}' +
                                                        '</a>' +
                                                        '<ul class="dropdown-menu">' +
                                                            '<li>' +
                                                                '<a ng-click="setAnnot($event, this, \'Text\')" class="button">Text</a>' +
                                                            '</li>' +
                                                            '<li>' +
                                                                '<a ng-click="setAnnot($event, this, \'Signature\')" class="button">Signature Text</a>' +
                                                            '</li>' +
                                                            '<li>' +
                                                            '<a ng-click="setAnnot($event, this, \'ImgSignature\')" class="button">Signature Image</a>' +
                                                            '</li>' +
                                                            '<li>' +
                                                                '<a ng-click="setAnnot($event, this, \'investorName\')" class="button">Name</a>' +
                                                            '</li>' +
                                                            '<li>' +
                                                                '<a ng-click="setAnnot($event, this, \'investorStreet\')" class="button">Address</a>' +
                                                            '</li>' +
                                                            '<li>' +
                                                                '<a ng-click="setAnnot($event, this, \'investorState\')" class="button">State</a>' +
                                                            '</li>' +
                                                            '<li>' +
                                                            '<a ng-click="setAnnot($event, this, \'investorPostalcode\')" class="button">Zip code</a>' +
                                                            '</li>' +
                                                            '<li>' +
                                                                '<a ng-click="setAnnot($event, this, \'investorEmail\')" class="button">Email</a>' +
                                                            '</li>' +
                                                            '<li>' +
                                                                '<a ng-click="setAnnot($event, this, \'signatureDate\')" class="button">Date</a>' +
                                                            '</li>' +
                                                        '</ul>' +
                                                    '</li>' +
                                                '</ul>' +
                                            '</li>' +
                                        '</ul>' +
                                    '</li>' +
                                    '<li>' +
                                        '<ul class="required-row">' +
                                            '<li>' +
                                            '<button ng-class="{\'selected\':required}" ng-click="toggleRequired(this)" class="check-box-button"><span data-icon="&#xe023;" aria-hidden="true"></span></button>' +
                                            '</li>' +
                                            '<li class="required-text">' +
                                            'Required?' +
                                            '</li>' +
                                        '</ul>' +
                                    '</li>' +
                                    '<li>' +
                                        '<ul>' +
                                            '<li>' +
                                                '<div class="standard-button">' +
                                                    '<button ng-click="closeBox(this)" class="btn">Close</button>' +
                                                '</div>' +
                                            '</li>' +
                                        '</ul>' +
                                    '</li>' +
                                '</ul>' +
                              '</span>' +
                              '</div>')($scope);
            aa.scope().ntype = 'text';
            aa[0].notetype = 'text';
            aa.scope().growable = true; // for the growable icons

            var bb = aa[0].querySelector("textarea");
            bb.style.width = 0 + "px";
            bb.style.height = 0 + "px";
            boundBoxByPage(bb);

            window.addEventListener('resize', function() {
                $scope.moveBox(aa[0]);
            });

            bb.addEventListener('mousemove', function(e) {
                if (e.which !== 0) {
                    boundBoxByPage(bb);
                }
            });

            var ta = aa.find('textarea');
            ta.scope().investorfixed = newattr ? newattr.investorfixed : null;
            ta.scope().whosign = newattr ? newattr.whosign : "Investor";
            ta.scope().whosignlabel = ta.scope().whosign == "Investor" ? "Recipient" : $rootScope.navState.name;
            ta.scope().whattype = newattr ? newattr.whattype : "Text";
            ta.scope().whattypelabel = ta.scope().whattype in $scope.attributelabels ? $scope.attributelabels[ta.scope().whattype] : ta.scope().whattype;
            if ($rootScope.navState.role == "issuer") {
                ta.scope().required = newattr ? newattr.required : true;
            } else {
                ta.scope().required = newattr ? newattr.required : null;
            }
            ta.scope().annotext = val.length === 0 && ta.scope().whattype in $scope.investor_attributes && ta.scope().required ? $scope.investor_attributes[newattr.whattype] : val;

            ta.width(ta.width());
            if (style) {
                aa.find('textarea').css('fontSize', style[0]);
            }
            bb.value = val;

            return aa;
        }

        $scope.smartValue = function ($event) {
            if (($rootScope.navState.role == "issuer" && $event.whosign == "Issuer") || $rootScope.navState.role == "investor" && $event.whosign == "Investor") {
                $event.annotext = $event.annotext.length === 0 && $event.whattype in $scope.investor_attributes ? $scope.investor_attributes[$event.whattype] : $event.annotext;
            }
            else {
                $event.annotext = $event.annotext.length === 0 ? "" : $event.annotext;
            }
        };

        $scope.setSign = function($event, value) {
            $event.whosign = value;
            $event.whosignlabel = $event.whosign == "Investor" ? "Recipient" : $rootScope.navState.name;
            if (value == "Investor") {
                $event.annotext = "";
            }
            else {
                $scope.smartValue($event);
            }
        };

        $scope.setAnnot = function($event, sticky, value) {
            sticky.whattype = value;
            sticky.whattypelabel = value in $scope.attributelabels ? $scope.attributelabels[value] : value;
            sticky.annotext = "";
            $scope.smartValue(sticky);

        };

        $scope.toggleRequired = function($event) {
            $event.required = $event.required ? null : "Yes";
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

        $scope.prepareable = function(doc) {
            return ($scope.prepare && !$scope.invq && doc && !doc.signature_flow && !$scope.template_original) || ($scope.template_original);
        };

        $scope.signable = function(doc) {
            return $scope.invq && doc && doc.signature_flow > 0 && doc.signature_deadline && !doc.when_signed;
        };

        $scope.rejectable = function(doc) {
            // reject reject signature OR countersignature
            return (!$scope.invq && doc && doc.signature_flow > 0 && doc.when_signed && !doc.when_countersigned) || ($scope.invq && doc && doc.signature_flow > 0 && doc.when_countersigned && !doc.when_finalized);
        };

        $scope.countersignable = function(doc) {
            return !$scope.invq && doc && doc.signature_flow===2 && doc.when_signed && !doc.when_countersigned;
        };

        $scope.finalizable = function(doc) {
            return (!$scope.invq && doc && doc.signature_flow===1 && doc.when_signed && !doc.when_finalized) ||
                   ($scope.invq && doc && doc.signature_flow===2 && doc.when_countersigned && !doc.when_finalized);
        };

        $scope.voidable = function(doc) {
            return (doc && doc.signature_flow > 0 && doc.when_finalized && doc.when_void_requested && !doc.when_void_accepted && $rootScope.navState.role == "investor");
        };

        $scope.$on('refreshDocImage', function (event) {refreshDocImage();});

        $scope.reqDocStatus = function(doc_id) {
            if (doc_id) {$scope.$emit('reqVersionStatus', doc_id);}
        };

        $scope.$on('retVersionStatus', function(event, message) {
            $scope.doc_status = message;
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
                var bnds = getNoteBounds(nx, stamping);
                var pos = [parseInt(nx.page, 10), bnds[0], bnds[1], $scope.dp.width, $scope.dp.height];
                var typ = nx.notetype;
                var val = [];
                var style = [];
                var newstyle = {};
                var ndx = [pos, typ, val, style, newstyle];
                var se, lh;

                if (typ == 'text') {
                    newstyle.investorfixed = $rootScope.navState.role == "issuer" || (angular.element(nx).scope().$$nextSibling.investorfixed) ? true : null;
                    newstyle.whosign = (angular.element(nx).scope().$$nextSibling.whosign);
                    newstyle.whattype = (angular.element(nx).scope().$$nextSibling.whattype);
                    newstyle.required = (angular.element(nx).scope().$$nextSibling.required);
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
            var divided = [[], []];
            angular.forEach(noteData, function (note) {
                if (note[4].whosign == "Issuer") {
                    divided[1].push(note);
                }
                else {
                    divided[0].push(note);
                }
            });
            return [JSON.stringify(divided[0]), JSON.stringify(divided[1])];
        };

        $scope.saveSmartdocData = function(clicked) {
            if (!$scope.used_attributes || $rootScope.navState.role=='investor') {return;}
            SWBrijj.proc("account.company_attribute_update",
                    "state", ($scope.used_attributes.companyState || "")
            ).then(function(x) {
                void(x);
            });
            SWBrijj.proc("account.company_attribute_update",
                    "name", ($scope.used_attributes.companyName || "")
            ).then(function(x) {
                void(x);
            });
            if (clicked) {
                $scope.$emit("notification:success", "Saved annotations");
            }
        };
        $scope.saveNoteData = function(clicked) {
            $scope.last_save = new Date().getTime();
            var nd = $scope.getNoteData(false);
            var nd_inv = nd[0];
            var nd_iss = nd[1];
            if ($scope.lib === undefined) {
                // This happens when "saveNoteData" is called by $locationChange event on the target doc -- which is the wrong one
                // possibly no document loaded?
                return;
            }
            if (!$scope.isAnnotable) return;
            if ($scope.html) {
                return;
            }

            /** @name SWBrijj#saveNoteData
             * @function
             * @param {int}
             * @param {boolean}
             * @param {boolean}
             * @param {json}
             */
            SWBrijj.saveNoteData($scope.docId, $scope.invq, !$scope.lib.original, nd_inv, nd_iss).then(function(data) {
                void(data);
                if (clicked) $scope.$emit("notification:success", "Saved annotations");
            });
        };

        $scope.booleanUpdate = function(attribute, value) {
            if (value === null) {
                value = false;
            }
            $scope.investor_attributes[attribute] = value == "true" ? "false": "true";
        };

        $scope.notesComplete = function () {
            var returnvalue = false;
            for (var i = 0; i < $scope.notes.length; i++) {
                var n = $scope.notes[i][0];
                if (n.notetype == "text") {
                    var contents = n.querySelector("textarea");
                    if (angular.element(n).scope().$$nextSibling.whattype == 'ImgSignature') {
                        if (!$scope.signaturepresent && ((angular.element(n).scope().$$nextSibling.whosign == 'Investor' && $rootScope.navState.role == 'investor') || (angular.element(n).scope().$$nextSibling.whosign == 'Issuer' && $rootScope.navState.role == 'issuer'))) {
                            returnvalue = true;
                        }
                    }
                    else if (angular.element(n).scope().$$nextSibling.required && contents.value.length === 0) {
                        if ((angular.element(n).scope().$$nextSibling.whosign == 'Investor' && $rootScope.navState.role == 'investor') || (angular.element(n).scope().$$nextSibling.whosign == 'Issuer' && $rootScope.navState.role == 'issuer')) {
                            returnvalue = true;
                        }
                    }
                }
            }
            return returnvalue;
        };

        $scope.sigModalUp = function () {
            $scope.signatureModal = true;
        };

        $scope.sigclose = function () {
            $scope.signatureModal = false;
            $scope.scribblemode = false;
        };

        $scope.$on("$destroy", function( event ) {
                $window.onkeydown = null;
            }
        );
    }
]);
