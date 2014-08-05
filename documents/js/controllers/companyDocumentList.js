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
                $scope.documentUploadModal = true;
            };

            $scope.modals.documentUploadClose = function() {
                $scope.documentUploadModal = false;
            };

            $scope.wideopts = {
                backdropFade: true,
                dialogFade: true,
                dialogClass: 'wideModal modal'
            };
            $scope.verywideopts = {
                backdropFade: true,
                dialogFade: true,
                dialogClass: 'evenWiderModal modal'
            };
            $scope.doubleopts = {
                backdropFade: true,
                dialogFade: true,
                dialogClass: 'twoPieceModal modal'
            };
            $scope.opts = {
                backdropFade: true,
                dialogFade: true,
                dialogClass: 'modal'
            };
            $scope.narrowopts = {
                backdropFade: true,
                dialogFade: true,
                dialogClass: 'narrowModal modal'
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
                        $scope.uploadFile($scope.files);
                    }
                    $scope.modals.documentUploadClose();
                });
            };

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

            $scope.uploadFile = function(files) {
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
                    $scope.$emit("notification:success", "Success! We're preparing your file.");
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
                Intercom('update', {company : {"documents":$scope.documents.length+1}});
                for (var i = 0; i < files.length; i++) fd.append("uploadedFile", files[i]);
                var upxhr = SWBrijj.uploadFile(fd);
                upxhr.then(function(x) {
                    $scope.uploadprogress = x;
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
                var s = $location.search();
                if (!$scope.state.hideSharebar) {
                    s={};
                    $scope.state.hideSharebar = true;
                    $scope.restoreViewState();
                } else {
                    s.share=true;
                    $scope.saveAndClearViewState();
                    $scope.state.hideSharebar = false;
                }
                $location.search(s);
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
                $scope.retractDocModal = true;
            };

            $scope.modals.retractVersionClose = function() {
                $scope.modalArchive = false;
                $scope.retractDocModal = false;
            };


            $scope.retractVersion = function(version, archive) {
                SWBrijj.procm("document.retract_document", version.doc_id, archive).then(function(data) {
                    void(data);
                    $scope.retractDocModal = false;
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

            //Email
            var re = /^(([^<>()[\]\\.,;:\s@\"]+(\.[^<>()[\]\\.,;:\s@\"]+)*)|(\".+\"))@((\[[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\])|(([a-zA-Z\-0-9]+\.)+[a-zA-Z]{2,}))$/;

            //My parentheses format
            var regExp = /\(([^)]+)\)/;

            // TODO: all of these modals should be separate directives

            $scope.modals.updateTitleOpen = function(doc) {
                $scope.docForModal = doc;
                $scope.updateTitleModal = true;
                $scope.docForModal.tempName = $scope.docForModal.docname;
            };

            $scope.modals.updateTitleClose = function() {
                $scope.updateTitleModal = false;
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
                $scope.updateTagsModal = true;
            };
            $scope.modals.updateTagsClose = function() {
                $scope.updateTagsModal = false;
            };

            $scope.modals.deleteDocOpen = function(doc) {
                $scope.docForModal = doc;
                $scope.deleteDocModal = true;
            };

            $scope.modals.deleteDocClose = function() {
                $scope.deleteDocModal = false;
            };

            $scope.modals.exportLinkDropboxOpen = function(doc, role) {
                $scope.docForModal = doc;
                $scope.roleForModal = role;
                $scope.exportLinkDropboxModal = true;
            };

            $scope.modals.exportLinkDropboxClose = function() {
                $scope.exportLinkDropboxModal = false;
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
                $scope.voidDocModal = true;
            };

            $scope.modals.voidDocClose = function() {
                $scope.voidDocModal = false;
            };

            $scope.modals.remindDocOpen = function(doc) {
                $scope.reminddocForModal = doc;
                $scope.remindDocModal = true;
            };

            $scope.modals.remindDocClose = function() {
                $scope.remindDocModal = false;
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

            // Multisharing modal functions
            /* TODO: replace in ShareDocs service
            var docsharestateCOPY = angular.copy($scope.docShareState);
            $scope.checkmany = function(people, docs, compare) {
                var old_failed = true;
                var offender = "";
                if (compare) {
                    old_failed = $scope.checkmany(docsharestateCOPY.emails, docsharestateCOPY.doclist, false);
                }
                var anybad = false;
                var investors = [];
                var docids = [];
                angular.forEach(docs, function(doc) {
                    docids.push(doc.doc_id);
                });
                angular.forEach($scope.documents, function(doc) {
                    if (docids.indexOf(doc.doc_id)!==-1) {
                        angular.forEach(doc.versions, function(version) {
                            if (!doc.when_retracted) {
                                investors.push(version.investor);
                            }
                        });
                    }
                });
                var regExp = /\(([^)]+)\)/;
                angular.forEach(people, function(person) {
                    if (person.length != 1) {
                        var email;
                        var matches = regExp.exec(person);
                        if (matches === null) {
                            matches = ["", person];
                        }
                        email = matches[1];
                        if (!re.test(email)) {
                            anybad = true;
                        }
                        if (investors.indexOf(person)!==-1) {
                            anybad = true;
                        }
                    }
                });
                if (people && people.length === 0) {
                    anybad = true;
                }
                if (compare) {
                    docsharestateCOPY = angular.copy($scope.docShareState);
                    if (anybad && !old_failed && people.length > 0 && docs) {
                        $scope.$emit("notification:fail", "Oops, recipients have already received these documents.");
                    }
                }
                return anybad;
            };
            $scope.docsReadyToShare = function(docs) {
                if (!docs || docs.length===0) {
                    return false;
                }
                var count = 0;
                angular.forEach($scope.documents, function(doc) {
                    if (doc.forShare) {
                        count += 1;
                    }
                });
                if (count !== docs.length) {
                    return false;
                }
                var res = true;
                angular.forEach(docs, function(doc) {
                    // FIXME 'doc' is not the full doc, doesn't have is_prepared.
                    // get the full doc and check that
                    if (doc.signature_flow < 0) {
                        res = false;
                    }
                });
                return res;
            };*/

            $scope.shareDocuments = function() {
                $scope.processing = true;
                ShareDocs.shareDocuments().finally(function(result) {
                    $scope.processing = false;
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
                        if (s.preps !== null) {
                            s.preps = JSON.parse(s.preps);
                        }
                        s.type = typeVars.type;
                        s.statusRatio = s.status_ratio;

                        if (s.pages == null)
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

            // fully load all the documents in the weird case where we're in the middle of sharing / preparing a document
            function fullyLoadDocuments(callback) {
                if (loadState.document.fullyLoaded) {
                    callback();
                    return;
                }
                $scope.loaddocs();
                window.setTimeout(function() {fullyLoadDocuments(callback);}, 250);
                return 4;
            }

            function loadPrepareState() {
                var st1 = angular.fromJson(sessionStorage.getItem("docPrepareState"));
                sessionStorage.removeItem("docPrepareState");
                if (st1) {
                    fullyLoadDocuments(function() {
                        angular.forEach($scope.documents, function(doc) {
                            if (st1.template_id===doc.template_id || st1.doc_id===doc.doc_id) {
                                if (doc.is_prepared) {
                                    ShareDocs.updateShareType(doc, 2);
                                    $scope.$emit("notification:success",
                                        "Success! Document prepared for signature.");
                                } else {
                                    ShareDocs.updateShareType(doc, -1);
                                    $scope.$emit("notification:fail",
                                        "Oops, the document is not ready for signature. Please try again.");
                                }
                            }
                        });
                        $scope.finishedLoading = true;
                    });
                }
                return st1;
            }
            // TODO: store as part of ShareDocs service
            // If we can eliminate doc.sugnature_flow and only reference the ShareDocs version, that should work
            function initShareState() {
                loadPrepareState();
                if (ShareDocs.documents.length > 0) {
                    fullyLoadDocuments(function() {
                        // TODO: rewrite to not depend on having a fully loaded $scope.documents
                        angular.forEach($scope.documents, function(doc) {
                            angular.forEach(ShareDocs.documents, function(docToShare) {
                                if (doc.doc_id && doc.doc_id==docToShare.doc_id || (doc.template_id && doc.template_id==docToShare.template_id)) {
                                    doc.signature_flow = docToShare.signature_flow;
                                }
                            });
                        });
                    });
                }
            }

            initShareState();

            // Sharing stuff that should be move to a directive
            $scope.ShareDocs = ShareDocs;
            $scope.sharingSelect2Options = {
                'data': Investor.investors,
                'placeholder': 'Add Recipients',
                createSearchChoice: function(text) {
                    // if text was a legit user, would already be in the list, so don't check Investor service
                    return {id: text, text: text};
                },
            };
            $scope.addShareEmail = function(email) {
                // this gets triggered multiple times with multiple types when the data changes
                if (typeof(email) === "string") {
                    ShareDocs.addEmail(email);
                }
            }
            $scope.removeShareEmail = function(email) {
                ShareDocs.removeEmail(email);
            };
            $scope.getInvestorDisplay = function(email) {
                return Investor.getDisplayText(email);
            };
        }
    ]);
