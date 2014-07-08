'use strict';

app.controller('DocumentViewWrapperController', ['$scope', '$routeParams', '$route', '$rootScope', '$timeout', '$location', 'SWBrijj',
        'navState', 'Annotations', 'Documents', 'User',
    function($scope, $routeParams, $route, $rootScope, $timeout, $location, SWBrijj, navState, Annotations, Documents, User) {
        $scope.$watch('docId', function(new_doc_id) {
            $scope.doc = Documents.getDoc(new_doc_id);
        });

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
                $scope.toggleSide = false;
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
                        if ($rootScope.navState.company != data.company) {
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
        $scope.processing = false;

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
        }

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

        $scope.leave = function() {
            // TODO: save notes / smartdoc data
            if ($rootScope.lastPage
                && ($rootScope.lastPage.indexOf("/register/") === -1)
                && ($rootScope.lastPage.indexOf("/login/") === -1)
                && ($rootScope.lastPage.indexOf("-view") === -1)) {
                if ($rootScope.lastPage.indexOf("company-status") !== -1) {
                    $rootScope.lastPage = $rootScope.lastPage + "?doc=" + $scope.docId;
                }
                $location.url($rootScope.lastPage);
            } else if ($scope.invq) {
                $location.url('/documents/investor-list');
            } else {
                $location.url('/documents/company-list');
            }
        };

        $scope.signDocument = function() {
            $scope.processing = true;
            $scope.doc.sign().then(
                function(data) {
                    $scope.$emit("notification:success", "Document signed");
                    $scope.leave();
                },
                function(fail) {
                    $scope.$emit("notification:fail", "Oops, something went wrong.");
                    $scope.processing = false;
                }
            );
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

        $scope.countersignDocument = function() {
            $scope.processing = true;
            $scope.doc.countersign().then(
                function(data) {
                    $scope.$emit("notification:success", "Document countersigned");
                    $scope.leave();
                },
                function(fail) {
                    $scope.processing = false;
                    $scope.$emit("notification:fail", "Oops, something went wrong.");
                }
            );
        };

        $scope.finalizeDocument = function() {
            $scope.processing = true;
            $scope.doc.finalize().then(
                function(data) {
                    $scope.$emit("notification:success", "Document approved");
                    $scope.leave();
                },
                function(x) {
                    $scope.$emit("notification:fail", "Oops, something went wrong.");
                    $scope.processing = false;
                }
            );
        };
        $scope.rejectSignature = function(msg) {
            $scope.processing = true;
            $scope.doc.rejectSignature(msg).then(
                function(data) {
                    $scope.$emit("notification:success", "Document signature rejected.");
                    $scope.leave();
                },
                function(x) {
                    $scope.$emit("notification:fail", "Oops, something went wrong.");
                    $scope.processing = false;
                }
            );
        };

        $scope.confirmVoid = function() {
            $scope.processing = true;
            $scope.doc.void().then(
                function(data) {
                    $scope.$emit("notification:success", "Void request accepted and document voided");
                    $scope.leave();
                },
                function(fail) {
                    $scope.$emit("notification:fail", "Oops, something went wrong.");
                    $scope.processing = false;
                }
            );
        };

        $scope.rejectVoid = function(msg) {
            $scope.processing = true;
            $scope.doc.rejectVoid(msg).then(
                function(data) {
                    $scope.$emit("notification:success", "Void request rejected");
                    $scope.leave();
                },
                function(fail) {
                    $scope.$emit("notification:fail", "Oops, something went wrong.");
                    $scope.processing = false;
                }
            );
        };

        $scope.prepareable = function() {
            return ($scope.prepare && !$scope.invq && $scope.doc && !$scope.doc.signature_flow && !$scope.templateKey) || ($scope.templateKey);
        };

        $scope.unfilledAnnotation = function() {
            return $scope.doc.annotations.some(function(annot) {
                return (annot.required && annot.forRole($rootScope.navState.role) && !annot.filled(User.signaturepresent, $rootScope.navState.role));
            });
        }

        $scope.getData();
    }
]);
