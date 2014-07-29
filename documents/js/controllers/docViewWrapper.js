'use strict';

app.controller('DocumentViewWrapperController', ['$scope', '$routeParams', '$route', '$rootScope', '$timeout', '$location', 'SWBrijj',
        'navState', 'Annotations', 'Documents', 'User', '$q', 'basics',
    function($scope, $routeParams, $route, $rootScope, $timeout, $location, SWBrijj, navState, Annotations, Documents, User, $q, basics) {
        $scope.investor_attributes = {}; // need investor attributes to be defined in this scope so we can save them
        $scope.nextAnnotationType = 'text';

        $scope.setTab = function() {
            if ($scope.actionNeeded() || $scope.prepareable()) {
                $scope.annottab = "true";
                $scope.infotab = "false";
            } else {
                $scope.infotab = "true";
                $scope.annottab = "false";
            }
        };

        $scope.$watch('docId', function(new_doc_id) {
            $scope.doc = Documents.getDoc(new_doc_id);
            if ($scope.doc.doc_id) {
                $scope.setTab();
            } else {
                setTimeout(function(){
                    $scope.setTab();
                }, 1000);
            }
        });
        $scope.active = {}; // to keep track of which annotation the user is currently working with (if any)

        if ($routeParams.page) {
            $scope.currentPage = parseInt($routeParams.page, 10);
        } else if (!$scope.currentPage) {
            $scope.currentPage = 1;
        }

        $scope.toggleSide = false;

        SWBrijj.tblm('global.server_time').then(function(time) {
            $rootScope.servertime = time[0].fromnow;
        });

        // Set up event handlers
        $scope.$on('event:loginRequired', function() {
            document.location.href = '/login';
        });

        $scope.$on('event:reload', function(event) {
            void(event);
            $timeout(function() {
                $route.reload();
            }, 100);
        });

        $scope.$on('docViewerReady', function(event) {
            if ($scope.docId) {
                $scope.getData();//{$route.reload();}
            } else if ($scope.templateKey) {
                if (!$scope.invq) {
                    // investor needs the sidebar to sign, issuer doesn't
                    $scope.toggleSide = true;
                }
                $scope.$broadcast('initTemplateView', $scope.templateKey, $scope.subId);
            }
        });

        $scope.helpModalUp = function () {
            $scope.tourModal = true;
        };

        $scope.tourclose = function () {
            $scope.tourModal = false;
            if (!$scope.invq) {
                $scope.checkProcessing();
            }
        };

        $scope.sharinggot = function () {
            SWBrijj.procm("account.update_user_settings", "knows_sharing", "true").then(function(data) {
                void(data);
            });
        };

        $scope.signinggot = function () {
            SWBrijj.procm("account.update_user_settings", "knows_signing", "true").then(function(data) {
                void(data);
            });
        };

        $scope.touropts = {
            backdropFade: true,
            dialogFade: true,
            dialogClass: 'helpModal modal'
        };

        $scope.processedopts = {
            backdropFade: true,
            dialogFade: true,
            dialogClass: 'processedImageModal modal',
            backdropClick: false,
            backdrop: 'static'
        };

        if (navState.role == "issuer") {
            $scope.docKey = parseInt($routeParams.doc, 10);
            $scope.urlInves = $routeParams.investor;
            $scope.library = $scope.urlInves ? "document.my_counterparty_library" : "document.my_company_library";
            $scope.pages = $scope.urlInves ? "document.my_counterparty_codex" : "document.my_company_codex";
            $scope.invq = false;

            $scope.prepare = ($routeParams.prepare==='true') ? true : false;
            $scope.counterparty = !! $scope.urlInves;

            $scope.pageQueryString = function() {
                return "id=" + $scope.docId + "&investor=" + $scope.invq + "&counterparty=" + $scope.counterparty;
            };

            $scope.getVersion = function(doc) {
                /** @name doc#doc_id
                 * @type {number} */
                /** @name doc#signature_deadline
                 * @type {Date} */

                 SWBrijj.tblmm("document.my_counterparty_page_views", "doc_id", doc.doc_id).then(function(data) {
                        $scope.docviews = data;
                        /* Should not be required
                        angular.forEach($scope.docviews, function(view) {
                            view.max = view.max.addMinutes(-view.max.getTimezoneOffset())
                        });
                        */
                    }).except(function(x) {
                     console.log(x);
                 });
                $scope.docId = doc.doc_id;
                $scope.library = "document.my_counterparty_library";
                $scope.pages = "document.my_counterparty_codex";
                $scope.initDocView();
            };

            $scope.getOriginal = function() {
                $scope.counterparty = false;
                $scope.docId = $scope.docKey;
                $scope.library = "document.my_company_library";
                $scope.pages = "document.my_company_codex";
                var z = $location.search();
                delete z['investor'];
                $location.search(z);
                $scope.initDocView();

                $scope.checkProcessing();
            };

            $scope.getData = function() {
                var flag = !isNaN(parseInt($scope.urlInves));
                if ($scope.docKey || flag) {
                    var field = "original";
                    var tempdocid = $scope.docKey;
                    if (flag) {
                        field = "doc_id";
                        tempdocid = parseInt($scope.urlInves);
                    }
                    SWBrijj.tblmm("ownership.doc_evidence", "doc_id", tempdocid).then(function(data) {
                        $scope.doctrans = data;
                    });
                    if ($scope.counterparty) {
                        SWBrijj.tblmm("document.my_counterparty_library", field, tempdocid).then(function(data) {
                            if (flag) {
                                $scope.getVersion(data[0]);
                                return;
                            }
                            else {
                                // probably unused at this point
                                for (var i = 0; i < data.length; i++) {
                                    if (data[i].investor == $scope.urlInves) {
                                        $scope.getVersion(data[i]);
                                        return;
                                    }
                                }
                            }
                        });
                    } else {
                        $scope.getOriginal();
                    }
                }
            };
        } else if (navState.role == 'investor') {
            $scope.docId = parseInt($routeParams.doc, 10);
            $scope.library = "document.my_investor_library";
            $scope.pages = "document.my_investor_codex";
            $scope.invq = true;

            $scope.pageQueryString = function() {
                return "id=" + $scope.docId + "&investor=" + $scope.invq;
            };

            $scope.getData = function () {
                if ($scope.docId) {
                    SWBrijj.tblm("document.my_investor_library", "doc_id", $scope.docId).then(function(data) {
                        if (navState.company != data.company) {
                            $location.path("/investor-list?");
                            return;
                        }
                        $scope.document = data;
                        if (data.signature_flow == 1 && !data.when_signed) {
                            document.location.href = "/documents/investor-view?template=" + data.template_id + "&subid=" + data.doc_id;
                        }

                        if ($scope.doc.signable()) {
                            SWBrijj.tblm('account.user_settings', ["knows_signing"]).then(function(data) {
                                if (!data[0].knows_signing) {
                                    $scope.helpModalUp();
                                }
                            });
                        }

                        $scope.initDocView();
                    }).except(function(x) {
                        void(x);
                        $location.path("/investor-list?");
                    });
                }
            };
        }
        $scope.subId = parseInt($routeParams.subid, 10);
        $scope.templateKey = parseInt($routeParams.template, 10);

        if ($scope.prepare) {
            SWBrijj.tblm('account.user_settings', ["knows_sharing"]).then(function(data) {
                if (!data[0].knows_sharing) {
                    $scope.helpModalUp();
                    $scope.imageProcessedModal = false;
                }
            });
        }

        $scope.initDocView = function() {
            $scope.$broadcast('initDocView', $scope.docId, $scope.invq, $scope.library, $scope.pageQueryString(), $scope.pages);
        };

        $scope.checkProcessing = function() {
            if ($scope.tourModal)
                return; //don't step on other modal's toes
            SWBrijj.tblm("document.my_company_library", ["processing_approved"], "doc_id", $scope.docId).then(function (data)
            {
                var approved = data.processing_approved;
                if (!approved)
                {
                    $scope.selectProcessing('adjusted');
                    $scope.imageProcessedModal = true;
                    $scope.getProcessedPage();
                }
            });
        };

        $scope.selectProcessing = function(choice)
        {
            if (choice == "original")
            {
                $scope.adjustedSelected = false;
                $scope.adjustedColor = "gray";
                $scope.adjustedText = "";
                $scope.originalColor = "green";
                $scope.originalText = "whiteText";
            }
            else
            {
                $scope.adjustedSelected = true;
                $scope.adjustedColor = "green";
                $scope.adjustedText = "whiteText";
                $scope.originalColor = "gray";
                $scope.originalText = "";
            }
        };

        $scope.processedClose = function(erase) {
            $scope.imageProcessedModal = false;
            if (erase)
            {
                SWBrijj.procm("document.undo_processing", $scope.docId).then(function(data)
                {
                    $scope.$broadcast('refreshDocImage');
                }).except(function(data)
                {
                    console.log(data);
                });
            }
            else
            {
                SWBrijj.procm("document.approve_processing", $scope.docId).then(function(data)
                {;}).except(function(data)
                {
                    console.log(data);
                });
            }
        };

        $scope.getProcessedPage = function() {
            SWBrijj.procm("document.get_first_processed", $scope.docId).then(function(data) {
                var d = data[0].get_first_processed;
                if (!d)
                {
                    $scope.processedClose(false);
                }
                else
                {
                    $scope.pageForModal = d;
                    $scope.setProcessedImages();
                }
            });
        };

        $scope.setProcessedImages = function() {
            var original = document.getElementById("processedModalOriginalImage");
            var adjusted = document.getElementById("processedModalAdjustedImage");
            original.src = "/photo/docpg?" + $scope.pageQueryString() + "&page=" + $scope.pageForModal + "&thumb=true&original=true";
            original.width = 150;
            adjusted.src = "/photo/docpg?" + $scope.pageQueryString() + "&page=" + $scope.pageForModal + "&thumb=true";
            adjusted.width = "150";
        };

        $scope.setNextAnnotationType = function (type) {
            $scope.nextAnnotationType = type;
        };

        $scope.leave = function() {
            // TODO: save notes / smartdoc data
            if ($rootScope.lastPage
                && ($rootScope.lastPage.indexOf("/register/") === -1)
                && ($rootScope.lastPage.indexOf("/login/") === -1)
                && ($rootScope.lastPage.indexOf("-view") === -1)) {
		if (document.location.href.indexOf("share=true") !== -1) {
                    sessionStorage.setItem("docPrepareState",
					   angular.toJson({template_id: $scope.templateId,
							   doc_id: $scope.docId}));
                    $rootScope.lastPage = $rootScope.lastPage + "?share";
                }
                if ($rootScope.lastPage.indexOf("company-status") !== -1) {
                    $rootScope.lastPage = $rootScope.lastPage + "?doc=" + $scope.docId;
                }
                $location.url(encodeURIComponent($rootScope.lastPage));
            } else if ($scope.invq) {
                $location.url('/documents/investor-list');
            } else {
                $location.url('/documents/company-list');
            }
        };

        $scope.signDocument = function() {
            return $scope.doc.sign().then(
                function(data) {
                    $scope.$emit("notification:success", "Document signed");
                    $scope.leave();
                },
                function(fail) {
                    $scope.$emit("notification:fail", "Oops, something went wrong.");
                }
            );
        };

        $scope.signTemplate = function() {
            // This is hideous and can go away when the user profile is updated at the backend
            // TODO: prompt the user to save attributes if they so desire.
            var cleanatt = {};
            for (var key in $scope.investor_attributes) {
                if (key == 'investorName') {
                    cleanatt.name = $scope.investor_attributes[key];
                }
                else if (key == 'investorState') {
                    cleanatt.state = $scope.investor_attributes[key];
                }
                else if (key == 'investorCountry') {
                    cleanatt.country = $scope.investor_attributes[key];
                }
                else if (key == 'investorAddress') {
                    cleanatt.street = $scope.investor_attributes[key];
                }
                else if (key == 'investorPhone') {
                    cleanatt.phone = $scope.investor_attributes[key];
                }
                cleanatt[key] = $scope.investor_attributes[key];
            }
            var attributes = JSON.stringify(cleanatt);
            var promise = $q.defer();
            // TODO: move to Document service somehow
            SWBrijj.smartdoc_investor_sign_and_save($scope.subId, $scope.templateId, attributes, true).then(function(meta) {
                promise.resolve(meta);
                $scope.$emit("notification:success", "Signed Document");
                $location.path('/investor-list').search({});
            }).except(function(err) {
                promise.reject(err);
                $scope.$emit("notification:fail", "Oops, something went wrong. Please try again.");
                console.log(err);
            });
            return promise.promise;
        };

        $scope.countersignDocument = function() {
            return $scope.doc.countersign().then(
                function(data) {
                    if ($scope.doc.issue) {
                        $scope.$emit("notification:success", "Document approved & cap table entry added");
                    } else {
                        $scope.$emit("notification:success", "Document approved");
                    }
                    $scope.leave();
                },
                function(fail) {
                    $scope.$emit("notification:fail", "Oops, something went wrong.");
                }
            );
        };

        $scope.finalizeDocument = function() {
            return $scope.doc.finalize().then(
                function(data) {
                    $scope.$emit("notification:success", "Document approved");
                    $scope.leave();
                },
                function(x) {
                    $scope.$emit("notification:fail", "Oops, something went wrong.");
                }
            );
        };
        $scope.rejectSignature = function(msg) {
            return $scope.doc.rejectSignature(msg).then(
                function(data) {
                    $scope.$emit("notification:success", "Document signature rejected.");
                    $scope.leave();
                },
                function(x) {
                    $scope.$emit("notification:fail", "Oops, something went wrong.");
                }
            );
        };

        $scope.confirmVoid = function() {
            return $scope.doc.void().then(
                function(data) {
                    $scope.$emit("notification:success", "Void request accepted and document voided");
                    $scope.leave();
                },
                function(fail) {
                    $scope.$emit("notification:fail", "Oops, something went wrong.");
                }
            );
        };

        $scope.rejectVoid = function(msg) {
            return $scope.doc.rejectVoid(msg).then(
                function(data) {
                    $scope.$emit("notification:success", "Void request rejected");
                    $scope.leave();
                },
                function(fail) {
                    $scope.$emit("notification:fail", "Oops, something went wrong.");
                }
            );
        };

        $scope.prepareable = function() {
            return ($scope.prepare && !$scope.invq && $scope.doc && !$scope.doc.signature_flow && !$scope.templateKey) || ($scope.templateKey);
        };

        $scope.actionNeeded = function() {
            if ($scope.invq) {
                return ($scope.templateKey || $scope.doc.signable() || $scope.doc.voidable());
            } else {
                return ($scope.doc.countersignable(navState.role) || $scope.doc.finalizable());
            }
        };

        $scope.unfilledAnnotation = function() {
            return $scope.doc.annotations.some(function(annot) {
                return (annot.required && annot.forRole(navState.role) && !annot.filled(User.signaturePresent, navState.role));
            });
        };

        $scope.numAnnotations = function() {
            var num = 0;
            angular.forEach($scope.doc.annotations, function(annot) {
                num += annot.required && annot.forRole(navState.role) ? 1 : 0;
            });
            return num
        };

        $scope.numAnnotationsComplete = function() {
            var num = 0;
            angular.forEach($scope.doc.annotations, function(annot) {
                num += annot.required && annot.forRole(navState.role) && annot.filled(User.signaturePresent, navState.role) ? 1 : 0;
            });
            return num
        };

        $scope.drawTime = function() {
            return $scope.doc && ($scope.doc.annotable(navState.role) || ($scope.doc && $scope.prepare)) && ((!$scope.doc.when_shared && navState.role == "issuer") || (!$scope.doc.when_signed && navState.role == "investor"));
        };

        $scope.docCompleted = function() {
            console.log(doc);
        };

        $scope.downloadOriginalPdf = function() {
            SWBrijj.procd('sharewave-' + $scope.doc.doc_id + '.pdf', 'application/pdf', 'document.genOriginalPdf', $scope.doc.doc_id.toString()).then(function(url) {
                document.location.href = url;
            });
        };

        $scope.exportVersionPdf = function() {
            $scope.$emit("notification:success", "Export in progress.");
            var truthiness = navState.role == "investor" ? false : true;
            SWBrijj.genInvestorPdf('sharewave-'+$scope.doc.doc_id+'-'+$scope.doc.investor+'.pdf', 'application/pdf', $scope.doc.doc_id, truthiness, !$scope.versionIsComplete($scope.doc)).then(function(url) {
                document.location.href = url;
            }).except(function(x) {
                    console.log(x);
                    $scope.$emit("notification:fail", "Oops, something went wrong.");
                });
        };

        $scope.downloadPDF = function() {
            if ($scope.doc.investor) {
                $scope.exportVersionPdf();
            } else {
                $scope.downloadOriginalPdf();
            }
        };

        $scope.versionIsComplete = function(version) {
            return basics.isCompleteSigned(version)
                || basics.isCompleteViewed(version)
                || basics.isCompleteVoided(version)
                || version.when_retracted;
        };

        $scope.completeDoc = function() {
            return $scope.versionIsComplete($scope.doc) || !$scope.doc.investor
        };

        $scope.getData();
    }
]);
