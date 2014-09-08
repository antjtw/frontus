'use strict';

app.controller('CompanyDocumentListController',
    ['$scope', '$timeout', '$modal', '$window', '$location',
        '$routeParams', '$rootScope', '$route', 'SWBrijj', 'navState',
        'basics', '$http', 'ShareDocs', 'Investor',
        function($scope, $timeout, $modal, $window, $location,
                 $routeParams, $rootScope, $route, SWBrijj, navState,
                 basics, $http, ShareDocs, Investor) {
            $scope.state = {
                hideSharebar: true,
                maxRatio: 1000,
                show_archived: false,
                query: $routeParams.q || ""
            };
            $scope.modals = {};
            $scope.scrollParent = angular.element(".leftBlock");

            if (navState.role == 'investor') {
                $location.path('/investor-list'); // goes into a bottomless recursion ?
                return;
            }
            function syncShareAndURL() {
                if ($routeParams.share) {
                    $scope.state.hideSharebar = false;
                } else {
                    $scope.state.hideSharebar = true;
                }
            }
            $scope.$on('$routeChangeSuccess', function(current, previous) {
                syncShareAndURL();
            });
            syncShareAndURL();

            SWBrijj.tblm('global.server_time').then(function(time) {
                $rootScope.servertime = time[0].fromnow;
            });

            // Set up event handlers
            $scope.$on('event:loginRequired', function() {
                document.location.href = '/login';
            });
            $scope.$on('event:brijjError', function(event, msg) {
                $rootScope.errorMessage = msg;
            });

            if ($rootScope.person) {
                $rootScope.$broadcast("profile_loaded");
            }

            function loadTags() {
                SWBrijj.tblm('document.my_company_tags').then(function(x) {
                    $scope.available_tags = JSON.parse(x[0].tags).map(function(el) {
                        return el.replace(/"/g, "");
                    });
                });
            }
            loadTags();

            $scope.getAvailableTags = function() {return $scope.available_tags;};
            $scope.getTagClass = function() {return 'badge badge-info';};

            $scope.updateTags = function(doc) {
                var id = angular.copy(doc.doc_id);
                var new_tags = angular.copy(doc.new_tags);
                SWBrijj.procm('document.update_tags',
                        id, JSON.stringify(new_tags))
                    .then(function(data) {
                        $scope.modals.updateTagsClose();
                        angular.forEach($scope.documents, function(el) {
                            if (el.doc_id===doc.doc_id) {
                                el.tags = new_tags;
                            }
                        });
                        loadTags();
                        $scope.$emit("notification:success", "Tags updated");
                    }).except(function(err) {
                        $scope.modals.updateTagsClose();
                        console.log(err);
                        $scope.$emit("notification:fail", "Oops, something went wrong.");
                    });
            };

            $scope.toggleMaxRatio = function() {
                $scope.state.maxRatio = ($scope.state.maxRatio===1000) ? 2 : 1000;
            };

            $scope.viewBy = 'document';
            $scope.docOrder = 'docname';
            $scope.investorOrder = 'display_name';
            $scope.selectedDoc = 0;
            $scope.recipients = [];
            $scope.signaturedate = Date.today();
            $scope.signeeded = "No";

            $scope.toggleArchived = function() {
                $scope.state.show_archived = !$scope.state.show_archived;
            };

            // only allow docOrder to be set
            $scope.setOrder = function(field) {
                $scope.docOrder = ($scope.docOrder == field) ? '-' + field : field;
            };

            $scope.setInvestorOrder = function(field) {
                $scope.investorOrder = ($scope.investorOrder == field) ? '-' + field : field;
            };

            $scope.setViewBy = function(viewby) {
                $scope.viewBy = viewby;
            };

            $scope.searchFilter = function(obj) {
                var res = [];
                if ($scope.state.query) {
                    var items = $scope.state.query.split(" ");
                    angular.forEach(items, function(item) {
                        res.push(new RegExp(item, 'i'))
                    });
                }
                /** @name obj#docname
                 * @type { string} */
                if (!$scope.state.hideSharebar && obj.forShare) {
                    return true;
                } else if ($scope.state.maxRatio!==1000 && obj.version_count == obj.complete_count && obj.complete_count > 0) {
                    // if hide_completed and all versions are completed then return false
                    return false;
                } else if (!$scope.state.show_archived && obj.version_count == obj.archive_count && obj.archive_count > 0) {
                    // if !show_archived and all versions are archived then return false
                    return false;
                } else {
                    if (obj.type == "doc") {
                        var truthiness = res.length;
                        var result = 0;
                        angular.forEach(res, function(re) {
                            if (re.test(obj.docname) || re.test(obj.tags)) {
                                result += 1;
                            }
                        });
                        return !$scope.state.query || truthiness == result;
                    } else {
                        var truthiness = res.length;
                        var result = 0;
                        angular.forEach(res, function(re) {
                            if (re.test(obj.name) || re.test(obj.email)) {
                                result += 1;
                            }
                        });
                        return !$scope.state.query ||truthiness == result ;
                    }
                }
            };
            $scope.versionFilter = function(obj) {
                return $scope.state.maxRatio==1000 || !$scope.versionIsComplete(obj);
            };

            // Document Upload pieces
            // Modal Up and Down Functions

            $scope.modals.documentUploadOpen = function() {
                $scope.files = [];
                $scope.uploadType = null;
                $scope.uploadDocid = null;
                $scope.documentUploadModal = $modal.open({
                    templateUrl: "/documents/modals/uploadDoc.html",
                    scope: $scope,
                    windowClass: "modal twoPieceModal",
                });
            };

            $scope.modals.documentUploadClose = function() {
                $scope.documentUploadModal.dismiss();
            };

            $scope.modals.signedUploadOpen = function(docid) {
                $scope.files = [];
                $scope.uploadType = 'signed';
                $scope.uploadDocid = docid;
                $scope.signedUploadModal = $modal.open({
                    templateUrl: "/documents/modals/uploadSignedDoc.html",
                    scope: $scope,
                    windowClass: "modal evenWiderModal",
                });
            };

            $scope.modals.signedUploadClose = function() {
                $scope.signedUploadModal.dismiss();
            };

            // File manipulation

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
            $scope.setFiles = function(element) {
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
                        $scope.uploadFile($scope.files, $scope.uploadType, $scope.uploadDocid);
                    }
                    $scope.modals.documentUploadClose();
                });
            };

            $scope.checkSignedUploaded = function() {
                SWBrijj.tblm('document.my_counterparty_library', ['doc_id', 'when_signature_provided', 'signed_uploaded', 'signed_upload_attempted']).then(function(data) {
                    angular.forEach(data, function(doc) {
                        if ($scope.uploadprogress.indexOf(doc.signed_upload_attempted) > -1)
                        {
                            var ind = $scope.modals.uploadedSignedDocs.indexOf(doc.doc_id);
                            if (ind > -1)
                            {
                                if (doc.when_signature_provided)
                                {
                                    $scope.modals.uploadedSignedDocs.splice(ind, 1);
                                    //update row TODO: find a way to refresh row without refreshing page
                                    $route.reload();
                                }
                                else if (!doc.signed_uploaded)
                                {
                                    $scope.modals.uploadedSignedDocs.splice(ind, 1);
                                    //notify failure
                                    $scope.$emit("notification:fail", "Signed copy rejected. Did it have the same number of pages as the original?");
                                }
                            }
                        }
                    });
                    if ($scope.modals.uploadedSignedDocs.length > 0)
                    {
                        $timeout($scope.checkSignedUploaded, 2000);
                    }
                }).except(function(data) {
                    console.log(data);
                });
            }

            $scope.checkUploaded = function() {
                SWBrijj.tblm('document.my_company_library', ['doc_id', 'pages']).then(function(data) {
                    var repeat = false;
                    angular.forEach(data, function(doc) {
                        if (doc.pages == null)
                        {
                            repeat = true;
                        }
                        else
                        {
                            angular.forEach($scope.documents, function(document) {
                                if ((document.pages == null) &&
                                    (document.doc_id == doc.doc_id))
                                {
                                    document.pages = doc.pages;
                                }
                            });
                        }
                    });
                    if (repeat)
                    {
                        $timeout($scope.checkUploaded, 2000);
                    }
                }).except(function(data) {
                    console.log(data);
                });
            };

            $scope.checkReady = function() {
                // Cap at 10 then say error
                var incrementer = 0;
                SWBrijj.tblm('document.my_company_library', ['upload_id', 'doc_id', 'pages']).then(function(data) {
                    angular.forEach(data, function(doc) {
                        var index = $scope.uploadprogress.indexOf(doc.upload_id);
                        if (index != -1) {
                            if (doc.pages != null)
                            {
                                $scope.uploadprogress.splice(index, 1);
                                angular.forEach($scope.documents, function(document) {
                                    //In theory this match might get the wrong document, but (and please feel free to do the math) it's very, very unlikely...
                                    if (document.doc_id == doc.upload_id) {
                                        document.doc_id = doc.doc_id;
                                        document.uploading = false;
                                        document.pages = doc.pages;
                                        $rootScope.billing.usage.documents_total+=1;
                                    }
                                });
                            }
                        }
                    });
                    if ($scope.uploadprogress.length !== 0 && incrementer < 30) {
                        incrementer += 1;
                        $timeout($scope.checkReady, 2000);
                    }
                }).except(function(data) {
                    console.log(data);
                });
            };

            $scope.uploadFile = function(files, type, docid) {
                $scope.$on("upload:progress", function(evt, arg) {
                    $scope.loadProgress = 100 * (arg.loaded / arg.total);
                    $scope.showProgress = true;
                });
                $scope.$on("upload:load", function(evt, arg) {
                    void(evt);
                    void(arg);
                    $rootScope.showProgress = false;
                    $rootScope.showProcessing = true;
                    $scope.modals.documentUploadClose();
                    if (type == "signed")
                    {
                        $scope.$emit("notification:success", "Uploading signed version . . .");
                    }
                    else
                    {
                        $scope.$emit("notification:success", "Success! We're preparing your file.");
                    }
                });
                $scope.$on(
                    "upload:error", function(evt, arg) {
                        $rootScope.errorMessage = arg;
                        $scope.showProgress = false;
                        $scope.modals.documentUploadClose();
                        $scope.$emit("notification:fail", "Oops, something went wrong. Please try again.");
                        console.log(arg);
                    });
                $scope.$on(
                    "upload:abort", function(evt, arg) {
                        $rootScope.errorMessage = arg;
                        $scope.showProgress = false;
                        console.log(evt);
                        console.log(arg);
                    });
                var fd = new FormData();
                if (window.location.hostname == "www.sharewave.com" || window.location.hostname == " wave.com") {
                    _kmq.push(['record', 'doc uploader']);
                    analytics.track('doc uploader');
                }
                if (type == null)
                {
                    Intercom('update', {company : {"documents":$scope.documents.length+1}});
                }
                for (var i = 0; i < files.length; i++) {fd.append("uploadedFile", files[i]);}
                var upxhr;
                if (type == "signed")
                {
                    if (fd.length > 1)
                    {
                        //throw error. Multiple docs doesn't make sense
                        $scope.$emit("notification:fail", "Cannot upload multiple signed copies for a single investor");
                        return;
                    }
                    upxhr = SWBrijj.uploadSigned(fd);
                }
                else
                {
                    upxhr = SWBrijj.uploadFile(fd);
                }
                upxhr.then(function(x) {
                    $scope.uploadprogress = x;
                    if (type == "signed")
                    {
                        SWBrijj.uploadSetType(x[0], type, docid).then(function() {
                            $scope.modals.uploadedSignedDocs.push(docid);
                            $timeout($scope.checkSignedUploaded, 2000);
                        }).except(function(x) {
                            console.log(x);
                        });
                        $scope.modals.signedUploadClose();
                    }
                    else
                    {
                        for (var i = 0; i < files.length; i++) {
                            var newdocument = {
                                uploaded_by: $rootScope.person.email,
                                iss_annotations: null,
                                company: $rootScope.navState.company,
                                doc_id: x[i],
                                template_id: null,
                                annotations: null,
                                docname: files[i].name,
                                version_count: 0,
                                complete_count: 0,
                                archive_complete_count: 0,
                                archive_count: 0,
                                statusRatio: 0,
                                uploading: true,
                                type: "doc"
                            };
                            $scope.documents.push(newdocument);
                        }
                        $timeout($scope.checkReady, 2000);
                        $scope.modals.documentUploadClose();
                    }

                }).except(function(x) {
                    $scope.$emit("notification:fail", "Oops, something went wrong. Please try again.");
                    $scope.files = [];
                    $scope.showProgress = false;
                });
            };

            $scope.momentFromNow = function(date, zerodate) {
                return moment(date).from(zerodate);
            };

            // TODO is it necessary to wrap with new functions?
            $scope.isCompleteSigned = function(version) {
                return basics.isCompleteSigned(version);
            };
            $scope.isCompleteViewed = function(version) {
                return basics.isCompleteViewed(version);
            };
            $scope.isCompleteVoided = function(version) {
                return basics.isCompleteVoided(version);
            };
            $scope.isCompleteRetracted = function(version) {
                return version.when_retracted;
            };

            $scope.versionIsComplete = function(version) {
                return $scope.isCompleteSigned(version) ||
                       $scope.isCompleteViewed(version) ||
                       $scope.isCompleteRetracted(version);
            };

            $scope.defaultDocStatus = function (doc) {
                return "Uploaded " + moment(doc.last_updated).from($rootScope.servertime);
            };

            $scope.viewDoc = function(docid) {
                $location.url("/app/documents/company-view?doc=" + docid + "&page=1");
            };

            $scope.toggleSide = function () {
                if (!$scope.state.hideSharebar) {
                    $scope.state.hideSharebar = true;
                    $scope.restoreViewState();
                    $location.search('share', null).replace();
                } else {
                    $scope.saveAndClearViewState();
                    $scope.state.hideSharebar = false;
                    $location.search('share', true).replace();
                }
            };
            $scope.saveAndClearViewState = function() {
                $scope.viewState = {
                    viewBy: $scope.clearViewBy()};
            };
            $scope.restoreViewState = function() {
                if (!$scope.viewState) {return;}
                $scope.setViewBy($scope.viewState.viewBy);
                delete $scope.viewState;
            };
            $scope.clearViewBy = function() {
                var res = $scope.viewBy;
                $scope.setViewBy('document');
                return res;
            };
            $scope.clearHideCompleted = function() {
                var res = $scope.state.maxRatio;
                $scope.state.maxRatio = 1000;
                return res;
            };
            $scope.restoreHideCompleted = function(oldratio) {
                $scope.state.maxRatio = oldratio;
            };

            $scope.modals.retractVersionOpen = function(version) {
                $scope.docForModal = version;
                $scope.modalArchive = false;
                $scope.retractDocModal = $modal.open({
                    templateUrl: "/documents/modals/retractDoc.html",
                    scope: $scope,
                    windowClass: "modal",
                });
            };

            $scope.modals.retractVersionClose = function() {
                $scope.modalArchive = false;
                $scope.retractDocModal.dismiss();
            };


            $scope.retractVersion = function(version, archive) {
                SWBrijj.procm("document.retract_document", version.doc_id, archive).then(function(data) {
                    void(data);
                    $scope.retractDocModal.dismiss();
                    $scope.$emit("notification:success", "Document retracted from " + (version.name || version.investor));
                    version.when_retracted = new Date.today();
                    version.last_event_activity = "retracted";
                    version.last_event_time = new Date.today();
                    version.last_event_name = $rootScope.person.name;
                    if (archive) {
                        version.archived = true;
                    }
                }).except(function(x) {
                        void(x);
                        $scope.$emit("notification:fail", "Oops, something went wrong.");
                    });
            };

            // TODO: all of these modals should be separate directives

            $scope.modals.updateTitleOpen = function(doc) {
                $scope.docForModal = doc;
                $scope.updateTitleModal = $modal.open({
                    templateUrl: "/documents/modals/updateTitle.html",
                    scope: $scope,
                    windowClass: "modal",
                });
                $scope.docForModal.tempName = $scope.docForModal.docname;
            };

            $scope.modals.updateTitleClose = function() {
                $scope.updateTitleModal.dismiss();
                $scope.docForModal = null;
            };

            $scope.updateTitle = function() {
                if ($scope.docForModal.tempName.length < 1) {
                    return;
                }
                $scope.docForModal.docname = $scope.docForModal.tempName;
                $scope.$emit('updated:name', $scope.docForModal);
                $scope.modals.updateTitleClose();
            };

            $scope.$on('updated:name', function(ev, doc) {
                if (doc) {
                    SWBrijj.update("document.my_company_library", {
                        docname: doc.docname
                    }, {
                        doc_id: doc.doc_id
                    });
                }
            });
            $scope.modals.updateTagsOpen = function(doc) {
                $scope.docForModal = angular.copy(doc);
                $scope.docForModal.new_tags = angular.copy(doc.tags);
                $scope.updateTagsModal = $modal.open({
                    templateUrl: "/documents/modals/updateTags.html",
                    scope: $scope,
                    windowClass: "modal wideModal",
                });
            };
            $scope.modals.updateTagsClose = function() {
                $scope.updateTagsModal.dismiss();
            };

            $scope.modals.deleteDocOpen = function(doc) {
                $scope.docForModal = doc;
                $scope.deleteDocModal = $modal.open({
                    templateUrl: "/documents/modals/deleteDoc.html",
                    scope: $scope,
                    windowClass: "modal",
                });
            };

            $scope.modals.deleteDocClose = function() {
                $scope.deleteDocModal.dismiss();
            };

            $scope.modals.exportLinkDropboxOpen = function(doc, role) {
                $scope.docForModal = doc;
                $scope.roleForModal = role;
                $scope.exportLinkDropboxModal = $modal.open({
                    templateUrl: "/documents/modals/dropboxExport.html",
                    scope: $scope,
                    windowClass: "modal evenWiderModal",
                });
            };

            $scope.modals.exportLinkDropboxClose = function() {
                $scope.exportLinkDropboxModal.dismiss();
            };

            $scope.modals.exportToDropbox = function(doc, role) {
                if ($rootScope.access_token)
                {
                    var filename = doc.docname;
                    if ('undefined' !== typeof(doc.investor))
                    {
                        filename = doc.investor + "-" + doc.docname;
                    }
                    SWBrijj.document_dropbox_export(doc.doc_id, filename, role).then(function(x) {
                        $scope.$emit("notification:success", "Successfully Exported to Dropbox");
                    }).except(function(x) {
                        $scope.response = x;
                    });
                }
                else
                {
                    $scope.modals.exportLinkDropboxOpen(doc, role);
                }
            };

            $scope.startOauth = function(svc, doc, role) {
                SWBrijj.start_oauth(svc).then(function(x) {
                    document.domain = "sharewave.com";
                    window.oauthSuccessCallback = function(x){
                        $scope.$apply(function() {
                            $rootScope.access_token = 1;
                            $rootScope.$emit("notification:success", "Linked to Dropbox");
                            if (doc != null) {
                                $scope.modals.exportToDropbox(doc, role);
                            }
                        });
                    };
                    window.open(x);
                }).except(function(x) {
                    console.log(x);
                    $scope.response = x;
                });
            };

            $scope.reallyDeleteDoc = function(doc) {
                ShareDocs.removeShareItem(doc);
                SWBrijj.procm("document.delete_document", doc.doc_id).then(function(data) {
                    void(data);
                    $rootScope.billing.usage.documents_total -= 1;
                    $scope.$emit("notification:success", doc.docname + " deleted.");
                    $scope.documents.splice($scope.documents.indexOf(doc), 1);
                }).except(function(x) {
                    $scope.$emit("notification:fail", x);
                });
            };


            $scope.voidDocument = function(doc, message) {
                if (!message || message.length === 0) {
                    message = " ";
                }
                SWBrijj.document_issuer_request_void(doc.doc_id, message).then(function(data) {
                    $scope.$emit("notification:success", "Void requested");
                    doc.when_void_requested = new Date.today();
                    doc.last_event_activity = "void requested";
                    doc.last_event_time = new Date.today();
                    doc.last_event_name = $rootScope.person.name;
                    // TODO: determine if doc.doc was archived, if so, decrement doc.doc.archive_complete_count
                    //doc.doc.complete_count -= 1; // current db logic counts documents in void requested status as complete ...
                }).except(function(x) {
                    $scope.$emit("notification:fail", "Oops, something went wrong.");
                    console.log(x);
                });
            };

            $scope.modals.voidDocOpen = function(doc) {
                $scope.voiddocForModal = doc;
                $scope.voidDocModal = $modal.open({
                    templateUrl: "/documents/modals/voidDoc.html",
                    scope: $scope,
                    windowClass: "modal",
                });
            };

            $scope.modals.voidDocClose = function() {
                $scope.voidDocModal.dismiss();
            };

            $scope.modals.remindDocOpen = function(doc) {
                $scope.reminddocForModal = doc;
                $scope.remindDocModal = $modal.open({
                    templateUrl: "/documents/modals/remindDoc.html",
                    scope: $scope,
                    windowClass: "modal",
                });
            };

            $scope.modals.remindDocClose = function() {
                $scope.remindDocModal.dismiss();
            };

            $scope.remindDocument = function(doc, message) {
                if (!message || message.length === 0) {
                    message = " ";
                }
                SWBrijj.procm("document.remind_investor", doc.doc_id, message).then(function(data) {
                    $scope.$emit("notification:success", "Reminder sent.");
                    void(data);
                }).except(function(x) {
                        $scope.$emit("notification:fail", "Oops, something went wrong.");
                        console.log(x);
                    });
            };

            // Infinite Scroll
            // TODO: move all of this into a service
            $scope.documents = [];
            $scope.investorDocs = [];
            // TODO: we maintain 8 seperate lists because it's hard to tell when to scroll otherwise
            // would be much better to maintain only 2 lists and share the data
            var loadState = {
                quantity: 10,
                "document": {
                    doTags: true,
                    list: $scope.documents,
                    type: "doc",
                    view: "document.my_company_library_view_list",
                    identifier: "doc_id",
                    fullyLoaded: false,
                    "docname": {
                        iteration: 0,
                        reverseIteration: 0,
                        forwardList: [],
                        reverseList: [],
                        orderKey: "docname",
                    },
                    "statusRatio": {
                        iteration: 0,
                        reverseIteration: 0,
                        forwardList: [],
                        reverseList: [],
                        orderKey: "status_ratio",
                    },
                },
                "name": {
                    doTags: false,
                    list: $scope.investorDocs,
                    type: "investor",
                    view: "document.my_company_library_view_recipient_list",
                    identifier: "email",
                    fullyLoaded: false,
                    "display_name": {
                        iteration: 0,
                        reverseIteration: 0,
                        forwardList: [],
                        reverseList: [],
                        orderKey: "display_name",
                    },
                    "statusRatio": {
                        iteration: 0,
                        reverseIteration: 0,
                        forwardList: [],
                        reverseList: [],
                        orderKey: "status_ratio",
                    },
                },
            };
            $scope.loadingDocs = false;
            $scope.loaddocs = function() {
                if ($scope.loadingDocs) {
                    return;
                } else {
                    $scope.loadingDocs = true;
                }
                var typeVars = loadState[$scope.viewBy];
                // handle '-' in docOrder and investorOrder
                var sortkey = ($scope.viewBy == "document" ? $scope.docOrder : $scope.investorOrder);
                var ascending = true;
                if (sortkey[0] == '-') {
                    sortkey = sortkey.slice(1);
                    ascending = false;
                }
                var loopState = typeVars[sortkey];
                if (typeVars.fullyLoaded) {
                    $scope.loadingDocs = false;
                    return;
                }
                SWBrijj.tblmlimitorder(typeVars.view,
                                       loadState.quantity,
                                       loadState.quantity * (ascending? loopState.iteration : loopState.reverseIteration),
                                       loopState.orderKey + (ascending? "" : " DESC")).then(function(data) {
                    if (ascending) {
                        loopState.iteration += 1;
                    } else {
                        loopState.reverseIteration += 1;
                    }
                    $scope.loadingDocs = false;
                    $scope.finishedLoading = true;
                    var myList;
                    if (ascending) {
                        myList = loopState.forwardList;
                    } else {
                        myList = loopState.reverseList;
                    }
                    var stillUploading = false;
                    angular.forEach(data, function(s) {
                        if (typeVars.doTags && s.tags !== null) {
                            s.tags = JSON.parse(s.tags);
                        }
                        if (typeVars.doTags && s.preps !== null) {
                            s.preps = JSON.parse(s.preps);
                        }
                        s.type = typeVars.type;
                        s.statusRatio = s.status_ratio;

                        if (typeVars.doTags && s.pages == null)
                        {
                            stillUploading = true;
                        }

                        // check for existing item in typeVars.list and update instead of duplicating
                        if (!myList.some(function(val, idx, arr) {
                            if (val[typeVars.identifier] == s[typeVars.identifier]) {
                                s.versions = val.versions;
                                val = s;
                                return true;
                            } else {
                                return false;
                            }
                        })) {
                            myList.push(s);
                        }
                    });
                    if (data.length < loadState.quantity) {
                        typeVars.fullyLoaded = true;
                        // have all the summary rows, so populate all the lists
                        // TODO: un-hardcode these list assignments
                        if ($scope.viewBy == "document") {
                            typeVars.docname.forwardList = myList;
                            typeVars.docname.reverseList = myList;
                            typeVars.statusRatio.forwardList = myList;
                            typeVars.statusRatio.reverseList = myList;
                        } else if ($scope.viewBy == "name") {
                            typeVars.display_name.forwardList = myList;
                            typeVars.display_name.reverseList = myList;
                            typeVars.statusRatio.forwardList = myList;
                            typeVars.statusRatio.reverseList = myList;
                        }
                    }
                    if ($scope.viewBy == "document") {
                        $scope.documents = myList;
                        if (stillUploading)
                        {
                            $timeout($scope.checkUploaded, 2000);
                        }
                    } else if ($scope.viewBy == "name") {
                        $scope.investorDocs = myList;
                    }
                });
            };
            // fire loaddocs whenever the sort order or viewby type changes
            function loadDocsTrigger(newval, oldval) {
                if (!oldval || oldval == newval) {
                    // inital setting, do nothing
                    return;
                }
                if (!$scope.loadingDocs) {
                    $scope.loaddocs();
                } else {
                    window.setTimeout(loadDocsTrigger(newval, oldval), 500);
                }
            }
            $scope.$watch('viewBy', loadDocsTrigger);
            $scope.$watch('docOrder', loadDocsTrigger);
            $scope.$watch('investorOrder', loadDocsTrigger);

            // watch q, hide completed, and show archived and fire a few scroll events when they change
            function stateChangeTrigger() {
                $('.recipientInfo').scroll();
            }
            $scope.$watch('state.query', stateChangeTrigger);
            $scope.$watch('state.maxRatio', stateChangeTrigger);
            $scope.$watch('state.show_archived', stateChangeTrigger);

            // Sharing stuff that should be move to a directive
            $scope.ShareDocs = ShareDocs;
            function filterInvestors(investorList, emails) {
                return investorList.filter(function(val, idx, arr) {
                    return ! emails.some(function(emval, eidx, earr) {
                        return val.id == emval;
                    });
                });
            }

            //Email
            var emailRegExp = /^(([^<>()[\]\\.,;:\s@\"]+(\.[^<>()[\]\\.,;:\s@\"]+)*)|(\".+\"))@((\[[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\])|(([a-zA-Z\-0-9]+\.)+[a-zA-Z]{2,}))$/;

            $scope.sharingSelect2Options = {
                data: function() {
                    return {
                        'results': filterInvestors(Investor.investors, ShareDocs.emails)
                    };
                },
                placeholder: 'Add Recipients',
                createSearchChoice: function(text) {
                    // if text was a legit user, would already be in the list, so don't check Investor service
                    if (text.indexOf(',') !== -1 || text.indexOf(' ') !== -1) {
                        // comma separated list detected. We don't even care anymore, just validate in $scope.addShareEmail
                        return {id: text, text: "multiple emails"};
                    }
                    if (emailRegExp.test(text)) {
                        return {id: text, text: text};
                    } else {
                        return false;
                    }
                },
            };
            $scope.badEmails = [];
            $scope.addShareEmail = function(email_input) {
                // this gets triggered multiple times with multiple types when the data changes
                if (typeof(email_input) === "string") {
                    email_input.split(/[\,, ]/).forEach(function(email) {
                        email = email.trim();
                        if (email.length < 3) {
                            // can't be an email, probably gibberish
                            return;
                        }
                        if (emailRegExp.test(email)) {
                            ShareDocs.addEmail(email);
                        } else {
                            // doesn't look like an email, warn the user
                            if ($scope.badEmails.indexOf(email) === -1) {
                                $scope.badEmails.push(email);
                            }
                        }
                    });
                }
            };
            $scope.removeShareEmail = function(email) {
                ShareDocs.removeEmail(email);
            };
            $scope.getInvestorDisplay = function(email) {
                if (Investor.names[email]) {
                    return Investor.names[email];
                } else {
                    return email;
                }
            };

            $scope.encodeURIComponent = encodeURIComponent;
        }
    ]);
