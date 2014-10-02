'use strict';

app.controller('DocumentViewController', ['$scope', '$rootScope', '$compile', '$location', '$routeParams', '$window', 'SWBrijj', 'Annotations', 'Documents', 'User', 'ShareDocs', 'Investor', '$q',
    function($scope, $rootScope, $compile, $location, $routeParams, $window, SWBrijj, Annotations, Documents, User, ShareDocs, Investor, $q) {
        $scope.cachebuster = Math.random();
        $scope.annots = [];
        $scope.signatureprocessing = false;

        $scope.$watch('docId', function(new_doc_id) {
            $scope.doc = Documents.getDoc(new_doc_id); // gets blank doc for now ...
        });

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

        $scope.dp = {width: 0, height: 0};
        $scope.updateDocPanelSize = function(img_width, img_height) {
            var dp = $('.docPanel');
            var width = 928;
            if (dp) {
                dp.height((width/img_width)*img_height);
                $scope.dp.width = width;
                $scope.dp.height = dp.height();
            }
        };
        $window.onkeydown = function(evt) {
            // TODO: evt.which is read-only ("TypeError: setting a property that has only a getter")
            var ev = evt.which || evt.keyCode;
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
                var img = new Image();
                img.onload = function() {
                    $scope.updateDocPanelSize(img.width, img.height);
                };
                img.src = $scope.pageImageUrl();
            }
        };

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

        $scope.$on('initTemplateView', function(event, templateId, subId) {
            $scope.templateId = templateId;
            $scope.isAnnotable = false;
            $scope.docLength = 0;
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
                SWBrijj.smartdoc_render_investor_template($scope.subId).then(function(raw_html) {
                    SWBrijj.procm('smartdoc.template_attributes', $scope.templateId).then(function(attributes) {
                        SWBrijj.tblm('smartdoc.my_profile').then(function(inv_attributes) {
                            // TODO: use information from Annotations service for investor_attribute labels
                            angular.forEach(inv_attributes, function(attr) {
                                if (attr.answer !== null) {
                                    $scope.investor_attributes[attr.attribute] = attr.answer;
                                } else {
                                    $scope.investor_attributes[attr.attribute] = "";
                                }
                            });
                            $scope.investor_attributes.investorName = angular.copy($rootScope.person.name);
                            $scope.investor_attributes.investorState = angular.copy($rootScope.person.state);
                            $scope.investor_attributes.investorAddress = angular.copy($rootScope.person.street);
                            $scope.investor_attributes.investorPhone = angular.copy($rootScope.person.phone);
                            $scope.investor_attributes.investorEmail = angular.copy($rootScope.person.email);//might be wrong but doesn't matter because we don't support smartdocs now
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
                                                if ($scope.investor_attributes[attribute.attribute] === undefined) {
                                                    $scope.investor_attributes[attribute.attribute] = "";
                                                }
                                                replace = "<span class='template-label'>" +attribute.label + "</span><input class='"+ extra_class +"'" + max_length + " type='text' ng-model='$parent.investor_attributes." + attribute.attribute + "'>";
                                            }
                                            else if (attribute.attribute_type == "check-box") {
                                                if ($scope.investor_attributes[attribute.attribute] === undefined || $scope.investor_attributes[attribute.attribute] === "") {
                                                    $scope.investor_attributes[attribute.attribute] = "false"; // every value is strings, even the booleans
                                                }
                                                replace = "<button type='text' ng-click=\"$parent.booleanUpdate('"+attribute.attribute+"',$parent.investor_attributes."+ attribute.attribute +")\" ng-class=\"{'selected':$parent.investor_attributes." + attribute.attribute +"=='true'}\" ng-model='$parent.investor_attributes." + attribute.attribute + "' class='check-box-button check-box-attribute'><span data-icon='&#xe023;' aria-hidden='true'></span></button>";
                                            }
                                            else if (attribute.attribute_type == "textarea") {
                                                if ($scope.investor_attributes[attribute.attribute] === undefined) {
                                                    $scope.investor_attributes[attribute.attribute] = "";
                                                }
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

        $scope.isAnnotable = true;

        $scope.signatureURL = '/photo/user?id=signature:';

        $scope.loadPages = function () {
            /** @name SWBrijj#tblmm * @function
             * @param {string}
             * @param {...}
             */
            SWBrijj.tblmm($scope.pages, ['page'], "doc_id", $scope.docId).then(function(data) {
                $scope.doc.pages = data;
                $scope.docLength = data.length;
                loadAnnotations();
            });
        };

        $scope.pageImageUrl = function() {
            if ($scope.pageQueryString && $scope.doc && $scope.doc.currentPage) {
                return "/photo/docpg?" + $scope.pageQueryString + "&page=" + $scope.doc.currentPage + "&dontcache=" + $scope.cachebuster;
            } else {
                return '';
            }
        };

        function uploadSuccess() {
            User.signaturePresent = true;
            $scope.$emit("notification:success", "Signature uploaded");
        }

        function uploadFail() {
            void(0);
            $scope.$emit("notification:fail", "Oops, something went wrong.");
            // console.log(x);
        }

        function loadAnnotations() {
            /** @name SWBrijj#tblm
             * @function
             * @param {string}
             * @param {...}
             */
             SWBrijj.tblm($scope.library, "doc_id", $scope.docId).then(function(data) {
                 if ($scope.lib && $scope.lib.annotations && $scope.lib.annotations.length > 0) {
                     // don't load annotations twice
                     console.error("loading document twice");
                     return;
                 }
                 $scope.lib = data;
                 // TODO: migrate all uses of $scope.lib to $scope.doc
                 $scope.doc = Documents.setDoc($scope.docId, data); // save the doc so others can see it
                 $scope.doc.getPreparedFor(); // don't need the results here, just for it to exist for the annotations
                 $scope.doc.name = $scope.doc.name ? $scope.doc.name : $scope.doc.investor;
                 $scope.isAnnotable = $scope.doc.annotable($rootScope.navState.role) || $scope.prepare; // requires $scope.lib

                 $scope.annots = Annotations.getDocAnnotations($scope.doc);
                 if ($scope.doc.transaction_type === "issue certificate") {
                     // if we're issuing a certificate, we can assume we have prepareFor which is a transaction
                     var annot_p = $q.defer();
                     var annot_promise = annot_p.promise;
                     var annot_watch_cancel = $scope.$watchCollection('annots', function(annots) {
                         if (annots.length > 0) {
                             annot_watch_cancel();
                             annot_p.resolve($scope.annots);
                         }
                     });
                     // need to add a preparedFor entry, as that's all faked
                     var prep = $scope.doc.addPreparedFor($scope.prepareFor);
                     annot_promise.then(function(annots) {
                         annots.forEach(function(annot) {
                             if (annot.whattype == "document_id") {
                                 prep.overrides[annot.id] = "I'm a QR Code!";
                             }
                         });
                     });
                     SWBrijj.tblm('_ownership.my_company_draft_transactions', 'transaction', parseInt($scope.prepareFor, 10)).then(function (transaction_deets) {
                         annot_promise.then(function(annots) {
                             var attrs = JSON.parse(transaction_deets.attrs);
                             annots.forEach(function(annot) {
                                 if (annot.whattype == "grant_date") {
                                     prep.overrides[annot.id] = transaction_deets.effective_date;
                                 } else if (annot.whattype == "units") {
                                     prep.overrides[annot.id] = attrs.units;
                                 } else if (annot.whattype == "security") {
                                     prep.overrides[annot.id] = attrs.security;
                                 } else if (annot.whattype == "investor") {
                                     // TODO: look up cap table name
                                     prep.overrides[annot.id] = attrs.investor;
                                 }
                             });
                         });
                     });
                     SWBrijj.tblm('ownership.certificates', 'from_transaction', parseInt($scope.prepareFor, 10)).then(function (certificate_deets) {
                         annot_promise.then(function(annots) {
                             console.log("setting certificate details");
                             console.log(certificate_deets);
                             annots.forEach(function(annot) {
                                 if (annot.whattype == "certificate_id") {
                                     prep.overrides[annot.id] = 'S-asdf';
                                 }
                             });
                             // TODO: restrictions / par value?
                         });
                     });
                 }
             }).except(function(err) {
                 $scope.$parent.leave();
             });
        }

        $window.addEventListener('beforeunload', function(event) {
            void(event);
            if (document.location.href.indexOf('-view') != -1) {
                $scope.saveNoteData();
                $scope.saveSmartdocData();
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

        $scope.$watch('doc.currentPage', function(page) {
            if (page) {
                var s = $location.search();
                s.page = page;
                $location.search(s).replace();
                $('doc-viewer').scrollTop(0);
                refreshDocImage();
                $scope.active.annotation = null; // new page shouldn't have any annotations open
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
            if ($scope.isAnnotable && (!$scope.doc.when_shared && $rootScope.navState.role == "issuer") || (!$scope.doc.when_signed && $scope.doc.signature_flow > 0 &&  $rootScope.navState.role == "investor")) {
                var a = Annotations.createBlankAnnotation($scope.doc);
                a.page = $scope.doc.currentPage;
                a.position.docPanel = $scope.dp;
                a.position.size.width = 0;
                a.position.size.height = 0;
                a.initDrag = event;
                a.type = $scope.nextAnnotationType;
                if (a.type == 'highlight')
                {
                    a.whosign = 'Issuer';
                }
                if ($rootScope.navState.role == "issuer") {
                    a.investorfixed = true;
                } else {
                    a.investorfixed = false;
                }
                $scope.annots.push(a);
                $scope.active.annotation = a;
            }
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

        $scope.finalizable = function(doc) {
            return (!$scope.invq && doc && doc.signature_flow===1 && doc.when_signed && !doc.when_finalized) ||
                   ($scope.invq && doc && doc.signature_flow===2 && doc.when_countersigned && !doc.when_finalized);
        };

        $scope.voidable = function(doc) {
            return (doc && doc.signature_flow > 0 && doc.when_finalized && doc.when_void_requested && !doc.when_void_accepted && $rootScope.navState.role == "investor");
        };

        $scope.$on('refreshDocImage', function (event) {refreshDocImage();});

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
            if ($scope.lib === undefined) {
                // This happens when "saveNoteData" is called by $locationChange event on the target doc -- which is the wrong one
                // possibly no document loaded?
                return;
            }
            if ($scope.$parent.prepareFor) {
                $scope.doc.savePreparation($scope.$parent.prepareFor);
            }
            if (!$scope.isAnnotable) return;
            if ($scope.html) {
                // template ...
                return;
            }
            if ($scope.doc.when_signed) {
                // If there's a signature, no edits can be made
                return;
            }

            /** @name SWBrijj#saveNoteData
             * @function
             * @param {int}
             * @param {boolean}
             * @param {boolean}
             * @param {json}
             */
            var nd_inv = JSON.stringify(Annotations.getInvestorNotesForUpload($scope.docId));
            var nd_iss = JSON.stringify(Annotations.getIssuerNotesForUpload($scope.docId));
            SWBrijj.saveNoteData($scope.docId, $scope.invq, !$scope.doc.original, nd_inv, nd_iss).then(function(data) {
                void(data);
                if (clicked) {
                    $scope.$emit("notification:success", "Saved annotations");
                }
                $scope.doc.clearPreparedForCache();
                ShareDocs.clearPrepCache($scope.docId);
            });
        };

        $scope.booleanUpdate = function(attribute, value) {
            if (value === null) {
                value = false;
            }
            $scope.investor_attributes[attribute] = value == "true" ? "false": "true";
        };

        $scope.sigOptions = { open: false,
                                failureCallback: uploadFail,
                                successCallback: uploadSuccess,
                                labelrequired: false,
                                label: null,
                                type: '' };

        $scope.sigModalUp = function () {
            $scope.sigOptions.open = true;
        };

        $scope.sigclose = function () {
            $scope.sigOptions.open = false;
        };

        $scope.removeannot = function(annotation) {
            var idx = $scope.annots.indexOf(annotation);
            $scope.annots.splice(idx, 1);
        };

        $scope.$on("$destroy", function( event ) {
            $window.onkeydown = null;
        });

        $scope.user = User;


        $scope.$on('initDocView', function(event, docId, invq, library, pageQueryString, pages) {
            if (!docId) return;
            $scope.docId = docId;
            $scope.invq = invq;
            $scope.library = library;
            $scope.pageQueryString = pageQueryString;
            $scope.pages = pages;
            $scope.template_original = false;
            refreshDocImage();
            $scope.loadPages();
        });
        $scope.$emit('docViewerReady');
    }
]);
