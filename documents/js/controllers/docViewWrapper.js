'use strict';

app.controller('DocumentViewWrapperController', ['$scope', '$routeParams', '$route', '$rootScope', '$timeout', '$location', 'SWBrijj',
        'navState', 'Annotations', 'Documents', '$q', 'basics', 'ShareDocs', 'Investor',
    function($scope, $routeParams, $route, $rootScope, $timeout, $location, SWBrijj, navState, Annotations, Documents, $q, basics, ShareDocs, Investor) {
        $scope.investor_attributes = {}; // need investor attributes to be defined in this scope so we can save them
        $scope.nextAnnotationType = 'text';

        $scope.setTab = function() {
            if ($scope.doc.annotations.length > 0 && ($scope.actionNeeded() || $scope.prepareable())) {
                $scope.annottab = true;
                $scope.infotab = false;
            } else {
                $scope.infotab = true;
                $scope.annottab = false;
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
            var counterparty = !! $scope.urlInves;

            $scope.pageQueryString = function() {
                return "id=" + $scope.docId + "&investor=" + $scope.invq + "&counterparty=" + counterparty;
            };

            $scope.getVersion = function(doc) {
                /** @name doc#doc_id
                 * @type {number} */
                /** @name doc#signature_deadline
                 * @type {Date} */
                SWBrijj.tblmm("document.my_counterparty_page_views", "doc_id", doc.doc_id).then(function(data) {
                    $scope.docviews = data;
                    $scope.docviews.minimum = Math.min.apply(null,
                        Object.keys(data).map(function(e) {
                            return data[e]['max'];
                        }));
                }).except(function(x) {
                    console.log(x);
                });
                $scope.docId = doc.doc_id;
                $scope.initDocView();
            };

            $scope.getOriginal = function() {
                counterparty = false;
                $scope.docId = $scope.docKey;
                var z = $location.search();
                delete z.investor;
                $location.search(z);
                $scope.prepareFor = $routeParams.investorid; // investor id, if we're doing an investor specific preparation
                if ($routeParams.transaction) {
                    $scope.prepareFor = $routeParams.transaction;
                }
                $scope.initDocView();

                $scope.checkProcessing();
            };

            $scope.getData = function() {
                if ($scope.docKey) {
                    var field = "doc_id";
                    var tempdocid = parseInt($scope.urlInves);
                    if (counterparty) {
                        SWBrijj.tblmm("document.my_counterparty_library", field, tempdocid).then(function(data) {
                            SWBrijj.tblmm("ownership.doc_evidence", "doc_id", data[0].doc_id).then(function(data) {
                                $scope.doctrans = data;
                            });
                            SWBrijj.tblmm("document.my_company_doc_sendgrid_opens", "doc_id", data[0].doc_id).then(function(event) {
                                if (event && event[0]) {
                                    $scope.sendgrid = {'when_email_opened' : event[0].opened};
                                }
                                $scope.getVersion(data[0]);
                                return;
                            });
                        });
                    } else {
                        SWBrijj.tblmm("ownership.doc_evidence", "doc_id", tempdocid).then(function(data) {
                            $scope.doctrans = data;
                        });
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
                        if ($scope.document.signature_flow == "0") {
                            $scope.toggleSide = true;
                        }
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
                {}).except(function(data)
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

        var checkUploadTimeout;

        $scope.$on('$locationChangeStart', function(event, newUrl, oldUrl) {
            void(oldUrl);
            // don't save note data if I'm being redirected to log in
            if (checkUploadTimeout)
            {
                $timeout.cancel(checkUploadTimeout);
            }
        });

        $scope.signDocument = function() {
            return $scope.doc.sign().then(
                function(data) {
                    $scope.$emit("notification:success", "Document signed");
                    $rootScope.leave();
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
                        $scope.$emit("notification:success", "Document approved & transaction in process");
                    } else {
                        $scope.$emit("notification:success", "Document approved");
                    }
                    $rootScope.leave();
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
                    $rootScope.leave();
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
                    $rootScope.leave();
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
                    $rootScope.leave();
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
                    $rootScope.leave();
                },
                function(fail) {
                    $scope.$emit("notification:fail", "Oops, something went wrong.");
                }
            );
        };

        var emailRegExp = /^(([^<>()[\]\\.,;:\s@\"]+(\.[^<>()[\]\\.,;:\s@\"]+)*)|(\".+\"))@((\[[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\])|(([a-zA-Z\-0-9]+\.)+[a-zA-Z]{2,}))$/;
        $scope.issueCertificate = function() {
            var certificatedocument = [{}];
            certificatedocument[0].doc_id = $scope.doc.doc_id;
            $scope.doc.annotations.forEach(function(note) {
                if (note.whattype == "certificate_id") {
                    certificatedocument[0].sequence = parseInt($scope.doc.preparedFor[$scope.prepareFor].overrides[note.id].substring(2)); // parse the "S-" off the front
                }
                if (note.whattype == "security") {
                    certificatedocument[0].security = $scope.doc.preparedFor[$scope.prepareFor].overrides[note.id];
                }
            });
            SWBrijj.document_multishare(
                    $scope.doc.row.email.id.toLowerCase(),
                    JSON.stringify(certificatedocument),
                    "",
                    "22 November 2113"
                    ).then(function(data) {
                        $scope.$emit("notification:success", "Certificates issued.");
                        $rootScope.leave(["/ownership/grants/", '/ownership/certificate/', '/documents/company-view']);
                    }).except(function(err) {
                        console.error(err);
                        $scope.emit("notification:fail", "Oops, we were unable to issue this certificate.");
                });
        };

        $scope.rowSelect2Options = {
            data: function() {
                return {
                    results: Investor.investors
                };
            },
            createSearchChoice: Investor.createSearchChoice,
            placeholder: 'Pick name or type email'
        };

        $scope.updateSendRow = function(inv) {
            if (typeof(inv) === "string") {
                // select2-ui sets string and then object, generate the object from the string
                $scope.doc.row.email = Investor.createInvestorObject(inv);
            }
        };

        $scope.formCheck = function() {
            return $scope.doc.row && $scope.doc.row.email && $scope.doc.row.email.id.length > 0 && emailRegExp.test($scope.doc.row.email.id);
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
                return (annot.forRole(navState.role) && annot.isInvalid(navState.role));
            });
        };

        $scope.drawTime = function() {
            return $scope.doc && ($scope.doc.annotable(navState.role) || ($scope.doc && $scope.prepare)) && ((!$scope.doc.when_shared && navState.role == "issuer") || (!$scope.doc.when_signed && navState.role == "investor"));
        };

        $scope.downloadOriginalPdf = function() {
            SWBrijj.procd('sharewave-' + $scope.doc.doc_id + '.pdf', 'application/pdf', 'document.genOriginalPdf', $scope.doc.doc_id.toString()).then(function(url) {
                document.location.href = url;
            });
        };

        $scope.exportVersionPdf = function() {
            $scope.$emit("notification:success", "Export in progress.");
            var truthiness = navState.role == "investor" ? false : true;
            SWBrijj.genInvestorPdf('sharewave-'+$scope.doc.doc_id+'-'+$scope.doc.investor+'.pdf', 'application/pdf', $scope.doc.doc_id, truthiness, !$scope.versionIsFinalized($scope.doc)).then(function(url) {
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

        $scope.versionIsFinalized = function(version) {
            return basics.isCompleteSigned(version)
                || basics.isCompleteVoided(version);
        };

        $scope.versionIsComplete = function(version) {
            return basics.isCompleteSigned(version)
                || basics.isCompleteViewed(version)
                || basics.isCompleteVoided(version)
                || version.when_retracted;
        };

        $scope.completeDoc = function() {
            return $scope.versionIsComplete($scope.doc) || !$scope.doc.investor;
        };

        $scope.goToPreparation = function() {
            $location.url('/app/documents/prepare?doc=' + $scope.doc.doc_id);
        };


        var mimetypes = ["application/pdf", // .pdf
            // microsoft office
            "application/msword", // .doc
            "application/vnd.openxmlformats-officedocument.wordprocessingml.document", // .docx
            "application/vnd.ms-powerpoint", // .ppt
            "application/vnd.openxmlformats-officedocument.presentationml.presentation", // .pptx
            // open office
            "application/vnd.oasis.opendocument.text", // .odt
            "application/vnd.oasis.opendocument.presentation", // .odp
            "application/vnd.oasis.opendocument.image", // .odi
            "image/png", // .png
            "image/tiff", // .tiff
            "image/jpeg", // .jpg
            "text/plain", // .txt
            "application/rtf" // .rtf
        ];
        $scope.setSignedFiles = function(element) {
            // called from outside of angular, so $apply it
            $scope.$apply(function() {
                $scope.files = [];
                $scope.fileError = "";
                for (var i = 0; i < element.files.length; i++) {
                    if (element.files[i].size > 20000000) {
                        $scope.fileError = "Please choose a smaller file";
                    } else if (mimetypes.indexOf(element.files[i].type) == -1) {
                        $scope.$emit("notification:fail", "Sorry, this file type is not supported.");
                    } else {
                        $scope.files.push(element.files[i]);
                    }
                }
                if ($scope.files.length > 0) {
                    $scope.uploadSigned($scope.files);
                }
            });
        };

        $scope.checkSignedUploaded = function () {
            SWBrijj.tblm('document.my_counterparty_library', ['when_signature_provided', 'signed_uploaded', 'signed_upload_attempted'], 'doc_id', $scope.doc.doc_id).then(function(doc) {
                if ($scope.uploadprogress.indexOf(doc.signed_upload_attempted) > -1)
                {
                    if (doc.when_signature_provided)
                    {
                        $scope.doc.when_signed = doc.when_signature_provided;
                        $scope.doc.when_signature_provided = doc.when_signature_provided;
                        $scope.$broadcast('initDocView', $scope.docId, $scope.invq, $scope.library, $scope.pageQueryString() + "&newlysigned=true", $scope.pages);
                        $scope.uploading = false;
                        return;
                    }
                    else if (!doc.signed_uploaded)
                    {
                        $scope.$emit("notification:fail", "Signed copy rejected. Did it have the same number of pages as the original?");
                        $scope.uploading = false;
                        return;
                    }
                }
                checkUploadTimeout = $timeout($scope.checkSignedUploaded, 2000);
            }).except(function(data) {
                console.log(data);
            });
        };

        $scope.uploadSigned = function(files) {
            var fd = new FormData();
            if (window.location.hostname == "www.sharewave.com" || window.location.hostname == " wave.com") {
                _kmq.push(['record', 'doc uploader']);
                analytics.track('doc uploader');
            }
            for (var i = 0; i < files.length; i++) {fd.append("uploadedFile", files[i]);}
            if (fd.length > 1)
            {
                //throw error. Multiple docs doesn't make sense
                $scope.$emit("notification:fail", "Cannot upload multiple signed copies for a single investor");
                return;
            }
            var upxhr = SWBrijj.uploadSigned(fd);
            $scope.uploading = true;
            upxhr.then(function(x) {
                $scope.uploadprogress = x;

                SWBrijj.uploadSetType(x[0], "signed", $scope.doc.doc_id).then(function() {
                    checkUploadTimeout = $timeout($scope.checkSignedUploaded, 2000);
                    $scope.$emit("notification:success", "Uploading signed version . . .");
                    $scope.files = [];
                }).except(function(x) {
                    console.log(x);
                });
            }).except(function(x) {
                $scope.$emit("notification:fail", "Oops, something went wrong. Please try again.");
                $scope.files = [];
                $scope.uploading = false;
            });
        };

        $scope.shareThisDoc = function() {
            ShareDocs.upsertShareItem($scope.doc);
            $location.url("/app/documents/company-list?share");
        };

        $scope.returntoCreate = function() {
            $location.url("/app/ownership/certificate/create?issue=" + encodeURIComponent($scope.doc.issue) +  "&transaction=" + $scope.doc.transaction.transaction);
        };

        $scope.getData();
    }
]);
