'use strict';

app.controller('DocumentViewController', ['$scope', '$rootScope', '$compile', '$location', '$routeParams', '$window', 'SWBrijj', 'Annotations', 'Documents',
    function($scope, $rootScope, $compile, $location, $routeParams, $window, SWBrijj, Annotations, Documents) {
        $scope.annots = [];
        $scope.signatureprocessing = false;

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
            var ev = evt.which || e.keyCode;
            // Need the extra if so that the page change doesn't occur if you are currently focused into a sticky
            if (document.activeElement.tagName.toLowerCase() != 'textarea' ) {
                $scope.$apply(function() {
                    if (ev === 37) {
                        $scope.previousPage($scope.doc.currentPage);
                    } else if (ev === 39) {
                        $scope.nextPage($scope.doc.currentPage);
                    }
                });
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
            $scope.doc = Documents.getDoc(docId); // gets blank doc for now ...
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
                            // TODO: use information from Annotations service for investor_attributes
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

        $scope.loadPages = function () {
            /** @name SWBrijj#tblmm * @function
             * @param {string}
             * @param {...}
             */
            SWBrijj.tblmm($scope.pages, 'annotated,page'.split(','), "doc_id", $scope.docId).then(function(data) {
                $scope.doc.pages = data;
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
            if ($scope.pageQueryString && $scope.doc && $scope.doc.currentPage) {
                return "/photo/docpg?" + $scope.pageQueryString + "&page=" + $scope.doc.currentPage;
            } else {
                return '';
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

        SWBrijj.procm('account.have_signature').then(function(sig) {
            $scope.signaturepresent = sig[0].have_signature;
        });

        function loadAnnotations() {
            /** @name SWBrijj#tblm
             * @function
             * @param {string}
             * @param {...}
             */
             SWBrijj.tblm($scope.library, "doc_id", $scope.docId).then(function(data) {
                 if ($scope.lib && $scope.lib.annotations && $scope.lib.annotations.length > 0) {
                     // don't load annotations twice
                     return;
                 }
                 $scope.lib = data;
                 // TODO: migrate all uses of $scope.lib to $scope.doc
                 $scope.doc = Documents.setDoc($scope.docId, data); // save the doc so others can see it
                 $scope.isAnnotable = $scope.annotable(); // requires $scope.lib

                 if ($scope.lib.annotations) {
                     // restoreNotes
                     var annots;
                     // TODO: should probably load all annotations into $scope.annots, and only display as relevant (probably already works)
                     if ($scope.countersignable($scope.lib) && $scope.lib.iss_annotations) {
                         // if we're receiving this back from the recipient, only show my annotations (all others stamped?)
                         annots = JSON.parse($scope.lib.iss_annotations);
                     } else {
                         annots = JSON.parse($scope.lib.annotations);
                         if (data.iss_annotations) {
                             annots = annots.concat(JSON.parse(data.iss_annotations));
                         }
                     }
                     $scope.annots = Annotations.setDocAnnotations($scope.docId, annots);
                     var sticky;
                     for (var i = 0; i < annots.length; i++) {
                         var annot = annots[i];
                     }
                 } else {
                     // ensure annotations are linked to the service even if we didn't fetch any
                     $scope.annots = Annotations.getDocAnnotations($scope.docId);
                 }
             }).except(function(err) {
                 $scope.leave();
             });
        }


        $window.addEventListener('beforeunload', function(event) {
            void(event);
            if (document.location.href.indexOf('-view') != -1) {
                var ndx_inv = JSON.stringify(Annotations.getInvestorNotesForUpload($scope.docId));
                var ndx_iss = JSON.stringify(Annotations.getIssuerNotesForUpload($scope.docId));
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
                    $rootScope.lastPage = $rootScope.lastPage + "?doc=" + $scope.docKey;
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
            // TODO
            for (var i = 0; i < $scope.notes.length; i++) {
                document.querySelector('.docPanel').removeChild($scope.notes[i][0]);
            }
            $scope.notes = [];
        };

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

        $scope.$watch('doc.currentPage', function(page) {
            if (page) {
                var s = $location.search();
                s.page = page;
                $location.search(s);
                scroll(0,0);
                refreshDocImage();
            }
        });

        $scope.nextPage = function(value) {
            if ($scope.doc.currentPage < $scope.docLength) {
                $scope.doc.currentPage += 1;
            }
        };

        $scope.previousPage = function(value) {
            if ($scope.doc.currentPage > 1) {
                $scope.doc.currentPage -= 1;
            }
        };

        $scope.newnewBox = function(event) {
            if ($scope.isAnnotable && (!$scope.lib.when_shared && $rootScope.navState.role == "issuer") || (!$scope.lib.when_signed && $scope.lib.signature_flow > 0 &&  $rootScope.navState.role == "investor")) {
                var a = new Annotation();
                a.page = $scope.doc.currentPage;
                a.position.docPanel = $scope.dp;
                a.initDrag = event;
                $scope.annots.push(a);
            }
        };

        /*
        function newBoxX(annot) {
            bb.addEventListener('mousemove', function(e) {
                if (e.which !== 0) {
                    boundBoxByPage(bb); // TODO?
                }
            });
        }*/

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
                $scope.docId, $scope.doc.currentPage).then(function(x) {
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
                    if (z === $scope.doc.currentPage) {
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
            var nd_inv = JSON.stringify(Annotations.getInvestorNotesForUpload($scope.docId));
            var nd_iss = JSON.stringify(Annotations.getIssuerNotesForUpload($scope.docId));
            if ($scope.lib === undefined) {
                // This happens when "saveNoteData" is called by $locationChange event on the target doc -- which is the wrong one
                // possibly no document loaded?
                return;
            }
            if (!$scope.isAnnotable) return;
            if ($scope.html) {
                // template ...
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
            return returnvalue;
        };

        $scope.sigModalUp = function () {
            $scope.signatureModal = true;
        };

        $scope.sigclose = function () {
            $scope.signatureModal = false;
            $scope.scribblemode = false;
        };

        $scope.removeannot = function(annotation) {
            var idx = $scope.annots.indexOf(annotation);
            $scope.annots.splice(idx, 1);
        };

        $scope.$on("$destroy", function( event ) {
            $window.onkeydown = null;
        });

        $scope.drawTime = function() {
            return $scope.isAnnotable && $scope.lib && ((!$scope.when_shared && $rootScope.navState.role == "issuer") || (!$scope.lib.when_signed && $rootScope.navState.role == "investor"));
        };
    }
]);
