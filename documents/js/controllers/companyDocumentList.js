//'use strict';

app.controller('CompanyDocumentListController',
        ['$scope', '$timeout', '$modal', '$window', '$q', '$location',
         '$routeParams', '$rootScope', '$route', 'SWBrijj', 'navState',
         'basics', '$http',
    function($scope, $timeout, $modal, $window, $q, $location,
             $routeParams, $rootScope, $route, SWBrijj, navState,
             basics, $http) {
        $scope.docShareState={};
        if (navState.role == 'investor') {
            $location.path('/investor-list'); // goes into a bottomless recursion ?
            return;
        }
        $scope.syncShareAndURL = function() {
            if ($routeParams.share) {
                $scope.hideSharebar = false;
            } else {
                $scope.hideSharebar = true;
            }
        };
        $scope.$on('$routeChangeSuccess', function(current, previous) {
            $scope.syncShareAndURL();
        });
        $scope.syncShareAndURL();

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

        /* this investor list is used by the sharing email list drop-down */
        $scope.vInvestors = [];
        SWBrijj.tblm('global.investor_list', ['email', 'name']).then(function(data) {
            for (var i = 0; i < data.length; i++) {
                if (data[i].name) {
                    $scope.vInvestors.push(data[i].name + "  (" + data[i].email +")");
                }
                else {
                    $scope.vInvestors.push("(" +data[i].email+")");
                }
            }
        });
        // Needed for docIsPrepared
        var loaded_once = false;
        $scope.$on("profile_loaded", function() {
            if (loaded_once) {return;}
            loaded_once = true;
            SWBrijj.tblm('account.my_signature', ['signature']
            ).then(function(x) {
                if (x && x[0] && x[0].signature && x[0].signature.length>0) {
                    $rootScope.person.has_signature = true;
                }
                $scope.loadSmartDocuments();
            }).except(function(x) {
                console.log(x);
            });
        });
        if ($rootScope.person) {
            $rootScope.$broadcast("profile_loaded");
        }
        $scope.getShareState = function() {
            var st = angular.copy(angular.fromJson(sessionStorage.getItem("sharewave")));
            sessionStorage.removeItem("sharewave");
            if (!st || st==[] || st.length===0
                    || !st.doclist) {
                $scope.docShareState = $scope.emptyShareState();
            } else {
                $scope.docShareState = st;
            }
        };
        $scope.emptyShareState = function() {
            return {doclist: [], emails: [], message: ""};
        };
        $scope.loadPrepareState = function() {
            var st1 = angular.fromJson(sessionStorage.getItem("docPrepareState"));
            sessionStorage.removeItem("docPrepareState");
            if (st1) {
                angular.forEach($scope.documents, function(doc) {
                    if (st1.template_id===doc.template_id || st1.doc_id===doc.doc_id) {
                        if ($scope.docIsPrepared(doc)) {
                            $scope.updateShareType(doc, 2);
                            $scope.$emit("notification:success",
                                "Success! Document prepared for signature.");
                        } else {
                            $scope.updateShareType(doc, -1);
                            $scope.$emit("notification:fail",
                                "Oops, the document is not ready for signature. Please try again.");
                        }
                    }
                }); 
            }
            $scope.finishedLoading = true;
            $scope.loadDocumentVersions();
            return st1;
        };
        $scope.saveShareState = function(clear) {
            if (clear) {
                sessionStorage.removeItem("sharewave");
                sessionStorage.setItem("sharewave",
                        angular.toJson($scope.emptyShareState()));
            } else  {
                if (!$scope.docShareState) {
                    $scope.docShareState = $scope.emptyShareState();
                }
                //$scope.docShareState.emails = $scope.multipeople;
                $scope.docShareState.message = $scope.messageText;
                sessionStorage.setItem("sharewave",
                        angular.toJson($scope.docShareState));
            }
        };

        $scope.$on('$locationChangeStart', function (event, next, current) {
            $scope.saveShareState();
        });
        window.onbeforeunload = function() {
            if (document.location.href.indexOf('documents/company-list') != -1) {
                $scope.saveShareState();
            }
        };
        $scope.mergeSmartIntoDumb = function() {
            var smartdocs = [];
            var prepared = null;
            SWBrijj.tblm('account.my_company', ['name', 'state']
            ).then(function(data) {
                if (data[0].name && data[0].state && data[0].state!=="  ") {
                    prepared=true;
                }
                angular.forEach($scope.documents, function(doc) {
                    if (doc.template_id) {
                        smartdocs.push(doc.template_id);
                        doc.is_prepared = prepared;
                    }
                });
                angular.forEach($scope.smarttemplates, function(smart) {
                    if (smartdocs.indexOf(smart.template_id) === -1) {
                        $scope.documents.push(
                            {"docname": smart.template_name,
                             "uploaded_by": null,
                             "company": null,
                             "doc_id": null,
                             "template_id": smart.template_id,
                             "last_updated": null,
                             "annotations": null,
                             "versions": null,
                             "is_prepared": prepared
                            });
                    }
                });
                $scope.initShareState();
                $scope.loadTags();
            });

        };

        $scope.loadSmartDocuments = function() {
            SWBrijj.tblm('smartdoc.document').then(function(data) {
                $scope.smarttemplates = data;
                $scope.loadDocuments();
            }).except(function(x) {
            });
        };
        $scope.loadDocuments = function() {
            SWBrijj.tblm('document.my_company_library',
                    ['doc_id', 'template_id', 'company', 'docname', 'last_updated',
                     'uploaded_by', 'annotations', 'iss_annotations', 'tags']).then(function(data) {
                $scope.documents = data;
                angular.forEach($scope.documents, function(d) {
                    if (d.tags !== null) d.tags = JSON.parse(d.tags);
                });
                $scope.mergeSmartIntoDumb();
            });
        };
        $scope.initShareState = function() {
            $scope.getShareState();
            $scope.loadPrepareState();
            if ($scope.docShareState.doclist && $scope.docShareState.doclist.length > 0) {
                angular.forEach($scope.documents, function(doc) {
                    angular.forEach($scope.docShareState.doclist, function(docToShare) {
                        if (doc.doc_id && doc.doc_id==docToShare.doc_id || (doc.template_id && doc.template_id==docToShare.template_id)) {
                            doc.forShare = true;
                            doc.signature_flow = docToShare.signature_flow;
                        }
                    });
                });
            }
            $scope.messageText = $scope.docShareState.message;
            $scope.multipeople = $scope.docShareState.emails;
        };
        $scope.loadTags = function() {
            SWBrijj.tblm('document.my_company_tags').then(function(x) {
                $scope.available_tags = JSON.parse(x[0].tags).map(function(el) {
                    return el.replace(/"/g, "");
                });
            });
        };
        $scope.getAvailableTags = function() {return $scope.available_tags;};
        $scope.getTagClass = function() {return 'badge badge-info';};

        $scope.updateTags = function(doc) {
            var id = angular.copy(doc.doc_id);
            var new_tags = angular.copy(doc.new_tags);
            SWBrijj.procm('document.update_tags',
                          id, JSON.stringify(new_tags))
            .then(function(data) {
                $scope.updateTagsClose();
                angular.forEach($scope.documents, function(el) {
                    if (el.doc_id===doc.doc_id) {
                        el.tags = new_tags;
                    }
                });
                $scope.loadTags();
                $scope.$emit("notification:success", "Tags updated");
            }).except(function(err) {
                $scope.updateTagsClose();
                console.log(err);
                $scope.$emit("notification:fail", "Oops, something went wrong.");
            });
        };

        $scope.loadDocumentVersions = function () {
            SWBrijj.tblm("document.my_counterparty_library").then(function(data) {
                Intercom('update', {company : {"document_shares":data.length}});
                angular.forEach($scope.documents, function(doc) {
                    doc.versions = [];
                    angular.forEach(data, function(version) {
                        if (doc.doc_id === version.original) {
                            doc.versions.push(version);
                        }
                    });
                });
                $scope.loadDocumentActivity();
            });
        };

        $scope.setDocumentStatusRatio = function(doc) {
            doc.statusRatio = $scope.docStatusRatio(doc);
        };

        $scope.setSigRequired = function(doc) {
            if (doc.versions && doc.versions.filter(function(el) {return el.signature_deadline;}).length > 0) {
               doc.signature_required = true;
            }
        };

        $scope.setVersionStatusRank = function(version) {
            version.statusRank = $scope.eventRank(version.last_event);
        };

        $scope.constructDocumentsByInvestor = function() {
            $scope.investorDocs = null;
            angular.forEach($scope.documents, function(doc) {
                angular.forEach(doc.versions, function(version) {
                    if ($scope.investorDocs && $scope.investorDocs[version.investor]) {
                        $scope.investorDocs[version.investor].versions.push(version);
                    } else {
                        if (!$scope.investorDocs) {$scope.investorDocs = {};}
                        $scope.investorDocs[version.investor] = {'versions': [version],
                                                                   'name': version.name,
                                                                   'investor': version.investor};
                    }
                });
            });
            // convert dict to array for orderBy to work
            var tmp = [];
            angular.forEach($scope.investorDocs, function(investor) {
                tmp.push(investor);
            });
            $scope.investorDocs = tmp;
            angular.forEach($scope.investorDocs, function(investor) {
                investor.versions.sort(function(a,b) {return Date.parse(b.last_event.event_time)-Date.parse(a.last_event.event_time);});
                investor.statusRatio = $scope.docStatusRatio(investor);
            });
        };

        $scope.loadDocumentActivity = function() {
            SWBrijj.tblm("document.recent_company_activity").then(function(data) {
                angular.forEach($scope.documents, function(doc) {
                    angular.forEach(doc.versions, function(version) {
                        var version_activity = data.filter(function(el) {return el.doc_id === version.doc_id;});
                        version.last_event = version_activity.sort($scope.compareEvents)[0];
                        if (version.last_event.activity == 'finalized') {version.last_event.activity = 'approved';}
                        var version_activities = version_activity.filter(function(el) {return el.person === version.investor && el.activity === "viewed";});
                        version.last_viewed = version_activities.length > 0 ? version_activities[0].event_time : null;
                        $scope.setVersionStatusRank(version);
                    });
                    $scope.setDocumentStatusRatio(doc);
                    $scope.setSigRequired(doc);
                });
                $scope.constructDocumentsByInvestor();
            });
        };

        $scope.compareEvents = function(a, b) {
              var initRank = $scope.eventRank(b) - $scope.eventRank(a);
              return initRank === 0 ? (Date.parse(b.event_time) - Date.parse(a.event_time)) : initRank;
        };

        $scope.eventRank = function (ev) {
            return basics.eventRank(ev);
        };

        $scope.noInvestors = function() {
            return Object.keys($scope.investorDocs).length !== 0;
        };

        $scope.toggleMaxRatio = function() {
            $scope.maxRatio = ($scope.maxRatio===1000) ? 2 : 1000;
        };
        $scope.viewAll = function() {
            return $scope.maxRatio === 1000;
        };

        $scope.viewBy = 'document';
        $scope.docOrder = 'docname';
        $scope.shareOrder = 'docname';
        $scope.versionOrder = 'statusRank';
        $scope.investorOrder = 'name';
        $scope.maxRatio = 1000;
        $scope.selectedDoc = 0;
        $scope.recipients = [];
        $scope.signaturedate = Date.today();
        $scope.signeeded = "No";
        $scope.query = $routeParams.q || "";
        $scope.show_archived = false;
        $scope.setQuery = function(q) {
            $scope.query = q;
        };

        $scope.toggleArchived = function() {
            $scope.show_archived = !$scope.show_archived;
        };

        // Only allow docOrder to be set -- versionOrder is fixed
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
            var re = new RegExp($scope.query, 'i');
            /** @name obj#docname
             * @type { string} */
            if (!$scope.hideSharebar && obj.forShare) {
                return true;
            } else if ($scope.maxRatio!==1000 && obj.versions && obj.versions.length>0 && obj.versions.length==$scope.versionsCompleted(obj).length) {
                // if hide_completed and all versions are completed then return false
                return false;
            } else if (!$scope.show_archived && obj.versions && obj.versions.length>0 && obj.versions.length==$scope.versionsArchived(obj).length) {
                // if !show_archived and all versions are archived then return false
                return false;
            } else {
                return !$scope.query || re.test(obj.docname) || re.test(obj.tags);
            }
        };
        $scope.versionFilter = function(obj) {
            return $scope.maxRatio==1000 || !$scope.versionIsComplete(obj);
        };
        $scope.exportOriginalToPdf = function(doc) {
            SWBrijj.procd('sharewave-' + doc.doc_id + '.pdf', 'application/pdf', 'document.genOriginalPdf', doc.doc_id.toString()).then(function(url) {
                document.location.href = url;
            });
        };
        $scope.exportOriginalToDropbox = function(doc) {
            console.log("Posting: " + navState.company + " " + doc.doc_id + " " + doc.docname);
            $http.post('/amber/cgi/dropboxBackupFile.py', {
                'swid': navState.company,
                'docid': doc.doc_id,
                'filename': doc.docname,
                'role': 'company'
            }).error(function(x) {
                    $scope.response = x;
                });
        };
        $scope.exportOriginalDocidToPdf = function(docid) {
            SWBrijj.procd('sharewave-' + docid + '.pdf', 'application/pdf', 'document.genOriginalPdf', docid.toString()).then(function(url) {
                document.location.href = url;
            });
        };

        $scope.exportVersionToPdf = function(version) {
            $scope.$emit("notification:success", "Export in progress.");
            SWBrijj.genInvestorPdf('sharewave-'+version.doc_id+'-'+version.investor+'.pdf', 'application/pdf', version.doc_id, true).then(function(url) {
                document.location.href = url;
            }).except(function(x) {
                console.log(x);
                $scope.$emit("notification:fail", "Oops, something went wrong.");
            });
        };

        $scope.prepareDocument = function(doc) {
            if (doc.template_id) {
                $location.url("/app/documents/company-view?template=" + doc.template_id + "&share=true");
            } else {
                $location.url("/app/documents/company-view?doc=" + doc.doc_id + "&page=1&prepare=true&share=true");
            }
        };

        // Document Upload pieces
        // Modal Up and Down Functions

        $scope.documentUploadOpen = function() {
            $scope.files = [];
            $scope.showProgress = false;
            $scope.showProcessing = false;
            $scope.documentUploadModal = true;
        };

        $scope.documentUploadClose = function() {
            $scope.showProgress = false;
            $scope.showProcessing = false;
            $rootScope.errorMessage = '';
            $scope.documentUploadModal = false;
        };

        $scope.wideopts = {
            backdropFade: true,
            dialogFade: true,
            dialogClass: 'wideModal modal'
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
                $scope.$apply();
            }
        };

        $scope.checkReady = function() {
            // Cap at 10 then say error
            var incrementer = 0;
            SWBrijj.tblm('document.my_company_library', ['upload_id', 'doc_id']).then(function(data) {
                angular.forEach(data, function(doc) {
                        var index = $scope.uploadprogress.indexOf(doc.upload_id);
                    if (index != -1) {
                        $scope.uploadprogress.splice(index, 1);
                        angular.forEach($scope.documents, function(document) {
                            //In theory this match might get the wrong document, but (and please feel free to do the math) it's very, very unlikely...
                            if (document.doc_id == doc.upload_id) {
                                document.doc_id = doc.doc_id;
                                document.uploading = false;
                                $rootScope.billing.usage.documents_total+=1;
                            }
                        });
                    }
                });
                if ($scope.uploadprogress.length !== 0 && incrementer < 30) {
                    incrementer += 1;
                    $timeout($scope.checkReady, 2000);
                }
            });
        };

        $scope.uploadFile = function(files) {
            $scope.$on("upload:progress", function(evt, arg) {
                $scope.loadProgress = 100 * (arg.loaded / arg.total);
                $scope.showProgress = true;
                $scope.$apply();
            });
            $scope.$on("upload:load", function(evt, arg) {
                void(evt);
                void(arg);
                $rootScope.showProgress = false;
                $rootScope.showProcessing = true;
                $scope.documentUploadClose();
                $scope.$emit("notification:success", "Success! We're preparing your file.");
                $scope.$apply();
            });
            $scope.$on(
                "upload:error", function(evt, arg) {
                $rootScope.errorMessage = arg;
                $scope.showProgress = false;
                $scope.documentUploadClose();
                $scope.$emit("notification:fail", "Oops, something went wrong. Please try again.");
                $scope.$apply();
                console.log(arg);
            });
            $scope.$on(
                "upload:abort", function(evt, arg) {
                $rootScope.errorMessage = arg;
                $scope.showProgress = false;
                $scope.$apply();
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
                    var newdocument = {uploaded_by: $rootScope.person.email,
                        iss_annotations: null,
                        company: $rootScope.navState.company,
                        doc_id: x[i],
                        template_id: null,
                        last_updated:  new Date.today(),
                        annotations: null,
                        docname: files[i].name,
                        versions:
                            [  ],
                        statusRatio: 0,
                        uploading: true};
                    $scope.documents.push(newdocument);
                }
                $timeout($scope.checkReady, 2000);
                $scope.documentUploadClose();

            }).except(function(x) {
                $scope.$emit("notification:fail", "Oops, something went wrong. Please try again.");
                $scope.files = [];
                $scope.showProgress = false;
                $scope.$apply();
            });
        };

        $scope.remind = function(doc_id, user_email) {
            /*
            SWBrijj.procm("document.remind", version.doc_id, version.investor).then(function(data) {
                $scope.emit('event:remind');
            });
            */
        };

        $scope.opendetailsExclusive = function(selected) {
            $scope.documents.forEach(function(doc) {
                if (selected.indexOf(doc.doc_id) !== -1) {
                    doc.shown = doc.shown !== true;
                } else {
                    doc.shown = false;
                }
            });
        };

        $scope.opendetails = function(selected) {
            selected.shown = selected.shown !== true;
        };

        $scope.momentFromNow = function(date, zerodate) {
            return moment(date).from(zerodate);
        };

        $scope.versionStatus = function(version) {
            if (version.last_event) {
                return (version.last_event.activity==='received' ? 'sent to ' : (version.last_event.activity === 'retracted' ? (version.last_event.activity + " from ") : (version.last_event.activity + " by "))) +
                       (version.last_event.name || version.investor) +
                       " " + moment(version.last_event.event_time).from(version.last_event.timenow) +
                       (version.signature_flow===2 && version.last_event.activity==='signed' ? " (awaiting countersign)" : "");
            } else {
                return "";
            }
        };

        $scope.docStatus = function(doc) {
            if (doc.versions && doc.versions.length>0) {
                return "Last Updated " + moment(((doc.versions[0] && doc.versions[0].last_event) ?
                    doc.versions[0].last_event.event_time :
                    doc.last_updated)).from($rootScope.servertime);
            }
        };

        $scope.shortDocStatus = function(doc) {
            if (doc.versions) {
                if (doc.uploading) {
                    return "Processing";
                }
                else if (doc.versions.length === 0) {
                    return "Uploaded";
                } else if (doc.signature_required && $scope.docIsComplete(doc)) {
                    return "Complete";
                } else if (!doc.signature_required && $scope.docIsComplete(doc)) {
                    return "Complete";
                } else if (!$scope.docIsComplete(doc)) {
                    return "Pending";
                } else {
                    return "Error";
                }
            }
        };

        $scope.shortVersionStatus = function(version) {
            if (!version) return "";
            if ($scope.isVoided(version)) {
                return "Voided"
            }
            else if ($scope.isPendingVoid(version)) {
                return "Void requested by you"
            }
            else if ($scope.wasJustRejected(version) && $scope.lastEventByInvestor(version)) {
                return "Rejected by recipient";
            } else if ($scope.wasJustRejected(version) &&
                       !$scope.lastEventByInvestor(version)) {
                return "Rejected by you";
            } else if ($scope.isPendingSignature(version)){
                return "Sent for Signature";
            } else if ($scope.isPendingCountersignature(version)){
                return "Review and Sign";
            } else if ($scope.isPendingInvestorFinalization(version)) {
                return "Signed and Sent for Approval";
            } else if ($scope.isPendingIssuerFinalization(version)) {
                return "Awaiting Your Approval";
            } else if ($scope.isCompleteRetracted(version)) {
                return "Retracted";
            } else if ($scope.isCompleteSigned(version)){
                return "Completed";
            } else if ($scope.isPendingView(version)){
                return "Unviewed";
            } else if ($scope.isCompleteViewed(version)){
                return "Viewed";
            } else {
                return "Sent";
            }
        };

        $scope.lastEventByInvestor = function(doc) {
            return doc.investor == doc.last_event.person;
        };

        $scope.wasJustRejected = function(doc) {
            return doc.last_event && doc.last_event.activity == 'rejected';
        };

        $scope.docStatusNumComplete = function(doc) {
            if (doc.signature_flow>0) {
                return $scope.versionsFinalized(doc).length + $scope.versionsRetracted(doc).length;
            } else {
                return $scope.versionsViewed(doc).length + $scope.versionsRetracted(doc).length;
            }
        };

        $scope.docStatusNumVersions = function(doc) {
            if (doc.signature_flow>0) {
                return $scope.versionsReqSig(doc).length;
            } else {
                return $scope.versionsReqView(doc).length;
            }
        };

        $scope.formatDocStatusRatio = function(doc) {
            if (!doc.versions || doc.versions.length===0) return "Uploaded";


            var archived = $scope.versionsArchived(doc).length;
            var show_archived = $scope.show_archived;

            // fixme what if a completed document is archived?
            var completed = $scope.versionsCompleted(doc).length;
            var hide_completed = ($scope.maxRatio !== 1000);

            var num = (hide_completed ? 0 : completed);// + (show_archived ? archived : 0);
            var total = doc.versions.length;
            var display_total = doc.versions.length + (hide_completed ? -completed : 0);

            if (total == archived && !show_archived) {
                return "All documents archived";
            } else if (total == completed && hide_completed) {
                return "All documents completed";
            } else if (total == archived+completed && (!show_archived && hide_completed)) {
                return "All documents are archived or completed";
            } else {
                return num+" / "+display_total+" completed";
            }
        };

        $scope.docSignatureRatio = function(doc) {
            if (doc) {
                var initRatio = ($scope.versionsFinalized(doc).length / $scope.versionsReqSig(doc).length) || 0;
                if (initRatio === Infinity) {initRatio = 0;}
                return (initRatio % 1 === 0) ? initRatio + 1 : initRatio;
            }
        };

        $scope.docViewRatio = function(doc) {
            if (doc) {
                var initRatio = ($scope.versionsViewed(doc).length / $scope.versionsReqView(doc).length) || 0;
                if (initRatio === Infinity) {initRatio = 1;}
                return (initRatio % 1 === 0) ? initRatio + 1 : initRatio;
            }
        };

        $scope.docStatusRatio = function(doc) {
            if (doc && doc.versions) {
                var initRatio = (doc.versions.filter($scope.versionIsComplete).length / doc.versions.length) + 1 || 0;
                // This ensure documents with no versions appear before completed documents.
                // The idea is that documents which have no versions are not done -- there is an implicit pending share to be completed
                if (doc.versions.length > 0 && initRatio === 0) {
                    initRatio = (1 / doc.versions.length);
                }
                if (initRatio == 2) {
                    initRatio += (doc.versions.length);
                }
                if (initRatio === Infinity) {initRatio = 0;}
                return initRatio;
            } else {
                return 0;
            }
        };

        $scope.versionsArchived = function(doc) {
            return doc.versions.filter(function(el) {return el.archived;});
        };
        $scope.versionsCompleted = function(doc) {
            return doc.versions.filter($scope.versionIsComplete);
        };
        $scope.versionsFinalized = function(doc) {
            return doc.versions.filter(function(el) {return el.when_finalized;});
        };
        $scope.versionsRetracted = function(doc) {
            return doc.versions.filter(function(el) {return el.when_retracted;});
        };

        $scope.versionsReqSig = function(doc) {
            return doc.versions.filter(function(el) {return el.signature_flow>0;});
        };

        $scope.versionsViewed = function(doc) {
            return doc.versions.filter(function(el) {return el.last_viewed && el.signature_flow===0;});
        };

        $scope.versionsReqView = function(doc) {
            return doc.versions.filter($scope.isPendingView);
        };

        $scope.isPendingView = function(version) {
            return version.signature_flow===0 && !version.last_viewed;
        };

        $scope.isPendingSignature = function(version) {
            return version.signature_flow>0 && !version.when_signed && !version.when_retracted;
        };

        $scope.isPendingCountersignature = function(version) {
            return version.when_signed && !version.when_countersigned && !version.when_retracted && version.signature_flow===2;
        };

        $scope.isPendingInvestorFinalization = function(version) {
            return (version.signature_flow===2 && version.when_signed && version.when_countersigned && !version.when_finalized && !version.when_retracted);
        };
        $scope.isPendingIssuerFinalization = function(version) {
            return (version.signature_flow===1 && version.when_signed && !version.when_finalized && !version.when_retracted);
        };

        $scope.isPendingVoid = function(version) {
            return version.signature_flow > 0 && !version.when_void_accepted && version.when_void_requested;
        };

        $scope.isVoided = function(version) {
            return version.signature_flow > 0 && version.when_void_accepted && version.when_void_requested;
        };

        $scope.messageWritten = function(text) {
            return !text || !text.length > 0;
        };


        $scope.docIsComplete = function(doc) {
            if (doc.versions) {
                if (doc.versions.length === 0) {
                    return false;
                } else {
                    return doc.versions.length == doc.versions.filter($scope.versionIsComplete).length;
                }
            }
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
            return $scope.isCompleteSigned(version)
                || $scope.isCompleteViewed(version)
                || $scope.isCompleteRetracted(version);
        };

        $scope.defaultDocStatus = function (doc) {
            return "Uploaded " + moment(doc.last_updated).from($rootScope.servertime);
        };

        $scope.viewOriginal = function(doc) {
            $location.url("/app/documents/company-view?doc=" + doc.doc_id + "&page=1");
        };
        $scope.viewDoc = function(docid) {
            $location.url("/app/documents/company-view?doc=" + docid + "&page=1");
        };

        $scope.viewTemplate = function(doc) {
            $location.url("/app/documents/company-view?template=" + doc.template_id);
        };

        $scope.viewStatus = function(doc) {
            if (doc.doc_id) {
                $location.url("/app/documents/company-status?doc=" + doc.doc_id);
            }
        };

        $scope.viewVersionStatus = function(doc) {
            $location.url("/app/documents/company-status?doc=" + doc.original);
        };

        $scope.viewProfile = function(investor) {
            document.location.href = "/app/company/profile/view?id=" + investor.versions[0].investor;
        };

        $scope.viewInvestorCopy = function(version) {
            $location.url("/app/documents/company-view?doc=" + version.original + "&page=1" + "&investor=" + version.doc_id);
        };

        $scope.upsertShareItem = function(item, list) {
            var updated = false;
            var listcopy = angular.copy(list);
            angular.forEach(listcopy, function(el) {
                if (el.doc_id == item.doc_id
                    || (!el.doc_id && !item.doc_id
                        && el.template_id==item.template_id)) {
                    el.signature_flow = item.signature_flow;
                    updated = true;
                }
            });
            if (!updated) {
                listcopy.push(
                        {"doc_id": item.doc_id,
                         "template_id": item.template_id,
                         "signature_flow": item.signature_flow
                        });
            }
            return listcopy;
        };
        $scope.removeShareItem = function(item, list) {
            return list.filter(function(el) {
                return !(item.doc_id==el.doc_id
                         && item.template_id==el.template_id
                         && item.signature_flow==el.signature_flow);
            });
        };
        $scope.updateShareType = function(doc, tp) {
            if (doc.template_id && tp > 0) {
                tp = 1;
            }
            doc.signature_flow = tp;
            $scope.docShareState.doclist = $scope.upsertShareItem(doc, $scope.docShareState.doclist);
        };
        $scope.toggleSide = function () {
            var s = $location.search();
            if (!$scope.hideSharebar) {
                s={};
                $scope.hideSharebar = true;
                $scope.restoreViewState();
            } else {
                s.share=true;
                $scope.saveAndClearViewState();
                $scope.hideSharebar = false;
            }
            $location.search(s);
        };
        $scope.saveAndClearViewState = function() {
            $scope.viewState = {selectedDocs: $scope.clearSelectedDocs(),
                                viewBy: $scope.clearViewBy()};
        };
        $scope.restoreViewState = function() {
            if (!$scope.viewState) {return;}
            $scope.restoreSelectedDocs($scope.viewState.selectedDocs);
            $scope.setViewBy($scope.viewState.viewBy);
            delete $scope.viewState;
        };
        $scope.clearViewBy = function() {
            var res = $scope.viewBy;
            $scope.setViewBy('document');
            return res;
        };
        $scope.clearHideCompleted = function() {
            var res = $scope.maxRatio;
            $scope.maxRatio = 1000;
            return res;
        };
        $scope.restoreHideCompleted = function(oldratio) {
            $scope.maxRatio = oldratio;
        };
        $scope.clearSelectedDocs = function() {
            var res = [];
            $scope.documents.forEach(function(doc) {
                if (doc.shown) {
                    res.push(doc.doc_id);
                    doc.shown = false;
                }
            });
            return res;
        };
        $scope.clearSearchFilter = function() {
            var res = $scope.query;
            $scope.query = "";
            return res;
        };
        $scope.restoreSearchFilter = function(q) {
            $scope.query = q;
        };
        $scope.restoreSelectedDocs = function(docs) {
            $scope.opendetailsExclusive(docs);
        };
        $scope.toggleForShare = function(doc) {
            // $scope.docShareState = [{doc_id: ###, signature_flow: #}, ..]
            if (!doc.forShare) {
                $scope.docShareState.doclist
                    = $scope.upsertShareItem(doc, $scope.docShareState.doclist);
                doc.forShare = true;
            } else {
                $scope.docShareState.doclist
                    = $scope.removeShareItem(doc, $scope.docShareState.doclist);
                doc.forShare = false;
            }
        };
        $scope.getShareType = function(doc) {
            if (!doc) {return 0;}
            if (!doc.signature_flow && !doc.template_id) {
                doc.signature_flow = 0;
            } else if (!doc.signature_flow && doc.template_id) {
                doc.signature_flow = -1;
            }
            return doc.signature_flow;
        };
        $scope.formatShareType = function(tp) {
            if (!tp || tp === 0) {
                return 'View Only';
            } else if (tp < 0) {
                return 'Prepare for Signature';
            } else if (tp > 0) {
                return 'Request Signature';
            }
        };
        $scope.smartdocIsPrepared = function(doc) {
            return doc.template_id && doc.is_prepared;
        };
        $scope.dumbdocIsPrepared = function(doc) {
            if (!doc) {return false;}
            var res = true;
            if (doc.iss_annotations && doc.iss_annotations.length>5) {
                var notes = angular.fromJson(doc.iss_annotations);
                angular.forEach(notes, function(note) {
                    if (note[4].required) {
                        switch (note[4].whattype) {
                            case "Text":
                                if (!note[2][0]) {res = false;}
                                break;
                            case "ImgSignature":
                                if (!$rootScope.person.has_signature) {
                                    res = false;
                                }
                                break;
                            default:
                                if (!note[2][0]) {res = false;}
                                break;
                        }
                    }
                });
                return res;
            } else if (doc.annotations && doc.annotations.length>5) {
                return res;
            }
        };

        $scope.docIsPrepared = function(doc) {
            if (!doc) {return false;}
            if (doc.template_id) {
                return $scope.smartdocIsPrepared(doc);
            } else {
                return $scope.dumbdocIsPrepared(doc);
            }
        };

        $scope.retractVersionOpen = function(version) {
            $scope.docForModal = version;
            $scope.modalArchive = false;
            $scope.retractDocModal = true;
        };

        $scope.retractVersionClose = function() {
            $scope.modalArchive = false;
            $scope.retractDocModal = false;
        };


        $scope.retractVersion = function(version, archive) {
            SWBrijj.procm("document.retract_document", version.doc_id, archive).then(function(data) {
                void(data);
                $scope.$emit("notification:success", "Document retracted from " + (version.name || version.investor));
                version.when_retracted = new Date.today();
                version.last_event.activity = "retracted";
                version.last_event.event_time = new Date.today();
                version.last_event.timenow = new Date.today();
                version.last_event.person = $rootScope.person.name;
                if (archive) {
                    version.archived = true;
                }
            }).except(function(x) {
                void(x);
                $scope.$emit("notification:fail", "Oops, something went wrong.");
            });
        };
        $scope.switchSignatureFlow = function(version, sigflow) {
            SWBrijj.procm("document.update_signature_flow", version.doc_id, sigflow).then(function(x) {
                void(x);
                version.when_signed = null;
                version.when_countersigned = null;
                version.signature_flow = sigflow;
                $scope.$emit("notification:success", "Document switched to view only.");
            }).except(function(err) {
                console.log(err);
                $scope.$emit("notification:fail", "Oops, something went wrong.");
            });
        };

        $scope.fakePlaceholder = function() {
            if ($scope.messageText == "Add an optional message...") {
                $scope.messageText = "";
            }
        };


        //Email
        var re = /^(([^<>()[\]\\.,;:\s@\"]+(\.[^<>()[\]\\.,;:\s@\"]+)*)|(\".+\"))@((\[[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\])|(([a-zA-Z\-0-9]+\.)+[a-zA-Z]{2,}))$/;

        //My parentheses format
        var regExp = /\(([^)]+)\)/;

        $scope.updateTitleOpen = function(doc) {
            $scope.docForModal = doc;
            $scope.updateTitleModal = true;
            $scope.docForModal.originalName = $scope.docForModal.docname;
        };

        $scope.updateTitleClose = function() {
            $scope.updateTitleModal = false;
            $scope.$emit('updated:name', $scope.docForModal);
            if ($scope.docForModal.docname.length < 1) {
                $scope.docForModal.docname = $scope.docForModal.originalName;
            }
            $scope.docForModal = null;
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
        $scope.updateTagsOpen = function(doc) {
            $scope.docForModal = angular.copy(doc);
            $scope.docForModal.new_tags = angular.copy(doc.tags);
            $scope.updateTagsModal = true;
        };
        $scope.updateTagsClose = function() {
            $scope.updateTagsModal = false;
        };

        $scope.deleteDocOpen = function(doc) {
            $scope.docForModal = doc;
            $scope.deleteDocModal = true;
        };

        $scope.deleteDocClose = function() {
            $scope.deleteDocModal = false;
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
            if (!message || message.length == 0) {
                message = " ";
            }
            SWBrijj.document_issuer_request_void(doc.doc_id, message).then(function(data) {
                $scope.$emit("notification:success", "Void requested");
                doc.when_void_requested = new Date.today();
                doc.last_event.activity = "void requested";
                doc.last_event.event_time = new Date.today();
                doc.last_event.timenow = new Date.today();
                doc.last_event.person = $rootScope.person.name;
            }).except(function(x) {
                    $scope.$emit("notification:fail", "Oops, something went wrong.");
                    console.log(x);
                });
        };

        $scope.voidDocOpen = function(doc) {
            $scope.voiddocForModal = doc;
            $scope.voidDocModal = true;
        };

        $scope.voidDocClose = function() {
            $scope.voidDocModal = false;
        };

        $scope.remindDocOpen = function(doc) {
            $scope.reminddocForModal = doc;
            $scope.remindDocModal = true;
        };

        $scope.remindDocClose = function() {
            $scope.remindDocModal = false;
        };

        $scope.remindDocument = function(doc, message) {
            if (!message || message.length == 0) {
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

        $scope.versionsVisible = function(versions) {
            if (!versions) return false;
            var total = versions.length;
            if ($scope.maxRatio!==1000) {
                total -= versions.filter($scope.versionIsComplete)
                                 .length;
            } else if (!$scope.show_archived) {
                total -= versions.filter(function(el) {return el.archived;})
                                 .length;
            }
            return total > 0;
        };

        $scope.archiveDoc = function(version) {
            SWBrijj.procm("document.change_archive_state", version.doc_id, "true").then(function(data) {
                void(data);
                version.archived = true;
                $scope.$emit("notification:success", "Document archived.");
            }).except(function(x) {
                    void(x);
                    $scope.$emit("notification:fail", "Document archive failed.");
                });
        };

        $scope.unarchiveDoc = function(version) {
            SWBrijj.procm("document.change_archive_state", version.doc_id, "false").then(function(data) {
                void(data);
                version.archived = false;
                $scope.$emit("notification:success", "Document unarchived.");
            }).except(function(x) {
                    void(x);
                    $scope.$emit("notification:fail", "Document unarchive failed.");
                });
        };

        // Multisharing modal functions

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
            if (!docs || docs.length===0) {return false;}
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
        };

        $scope.select2Options = {
            'multiple': true,
            'simple_tags': true,
            'tags': $scope.vInvestors,
            'tokenSeparators': [",", " "],
            'placeholder': 'Enter email address & press enter'
        };

        $scope.shareDocuments = function(docsToShare, emails, message) {
            $scope.processing = true;
            if (message == "Add an optional message...") {
                message = null;
            }
            var tosee = "";
            var regExp = /\(([^)]+)\)/;
            angular.forEach($scope.docShareState.emails, function(person) {
                var matches = regExp.exec(person);
                if (matches == null) {
                    matches = ["", person];
                }
                tosee += "," +  matches[1];
            });
            tosee = tosee === "" ? "!!!" : tosee;
            SWBrijj.document_multishare(
                          tosee.substring(1).toLowerCase(),
                          JSON.stringify(docsToShare),
                          message,
                          "22 November 2113"
            ).then(function(data) {
                void(data);
                $scope.saveShareState(true);
                $scope.$emit("notification:success", "Documents shared");
                $location.search({});
                $route.reload();
                $scope.processing=false;
            }).except(function(err) {
                $scope.processing=false;
                console.log(err);
                $scope.$emit("notification:fail", "Oops, something went wrong.");
            });
        };


    }
]);



