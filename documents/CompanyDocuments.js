'use strict';

/* App Module */
/* hack to set the cursor style -- gets around a webkit bug */

function setCursor(cursor) {
    if (document.body.style.cursor != cursor) {
        var wkch = document.createElement("div");
        wkch.style.overflow = "hidden";
        wkch.style.position = "absolute";
        wkch.style.left = "0px";
        wkch.style.top = "0px";
        wkch.style.width = "100%";
        wkch.style.height = "100%";
        var wkch2 = document.createElement("div");
        wkch2.style.width = "200%";
        wkch2.style.height = "200%";
        wkch.appendChild(wkch2);
        document.body.appendChild(wkch);
        document.body.style.cursor = cursor;
        wkch.scrollLeft = 1;
        wkch.scrollLeft = 0;
        document.body.removeChild(wkch);
    }
}

var docviews = angular.module('documentviews', ['documents', 'upload', 'nav', 'ui.bootstrap', '$strap.directives', 'brijj', 'ui.bootstrap.progressbar', 'ui.select2', 'email', 'commonServices', 'activityDirective'], function($routeProvider, $locationProvider) {
    $locationProvider.html5Mode(true).hashPrefix('');
    $routeProvider.
    when('/company-list', {
        templateUrl: 'companyList.html',
        controller: 'CompanyDocumentListController',
        reloadOnSearch: false
    }).
    when('/company-view', {
        templateUrl: 'companyViewer.html',
        controller: 'CompanyDocumentViewController',
        reloadOnSearch: false
    }).
    when('/company-status', {
        templateUrl: 'companyStatus.html',
        controller: 'CompanyDocumentStatusController'
    }).
    when('/investor-list', {
        templateUrl: 'investorList.html',
        controller: 'InvestorDocumentListController'
    }).
    when('/investor-view', {
        templateUrl: 'investorViewer.html',
        controller: 'InvestorDocumentViewController',
        reloadOnSearch: false
    }).
    otherwise({
        redirectTo: '/investor-list'
    });
});

docviews.directive('library', function() {
    return {
        restrict: 'A',
        link: function(scope, elm, attrs) {
            void(attrs);
            scope.listScrolls = function() {
                return elm[0].scrollHeight > elm[0].height;
            };
        }
    };
});

docviews.directive('myLoadingSpinner', function() {
    return {
        restrict: 'A',
        replace: true,
        transclude: true,
        scope: {processing: '=myLoadingSpinner'},
        template: '<div>' +
                      '<div ng-show="processing" class="my-loading-spinner-container"></div>' +
                      '<div ng-hide="processing" ng-transclude></div>' +
                  '</div>',
        link: function(scope, element, attrs) {
            var spinner = new Spinner().spin();
            var loadingContainer = element.find('.my-loading-spinner-container')[0];
            loadingContainer.appendChild(spinner.el);
        }
    };
});


docviews.run(function($rootScope, $document) {
    $document.on('click', function(event) {
        void(event);
        delete $rootScope.errorMessage;
    });

    $rootScope.$on('$routeChangeError', function(x, y) {
        console.log(x);
        console.log(y);
    });
});
/************************************************************************************************
 ISSUER CONTROLLERS
 ************************************************************************************************/

docviews.controller('CompanyDocumentListController', ['$scope', '$modal', '$q', '$location', '$routeParams', '$rootScope', '$route', 'SWBrijj', 'navState',
    function($scope, $modal, $q, $location, $routeParams, $rootScope, $route, SWBrijj, navState) {
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
        $scope.$on('$routeUpdate', $scope.syncShareAndURL);
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
        $scope.$on("profile_loaded", function() {
            SWBrijj.tblm('account.my_signature', ['signature']).then(function(x) {
                if (x[0].signature.length>0) {
                    $rootScope.person.has_signature = true;
                }
            }).except(function(x) {
                console.log(x);
            });
        });
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
            $scope.saveShareState();
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
            });

        };

        $scope.loadSmartDocuments = function() {
            SWBrijj.tblm('smartdoc.document').then(function(data) {
                $scope.smarttemplates = data;
                $scope.loadDocuments();
            }).except(function(x) {
            });
        };
        $scope.loadSmartDocuments();
        $scope.loadDocuments = function() {
            SWBrijj.tblm('document.my_company_library',
                    ['doc_id', 'template_id', 'company', 'docname', 'last_updated',
                     'uploaded_by', 'annotations', 'iss_annotations']).then(function(data) {
                $scope.documents = data;
                $scope.mergeSmartIntoDumb();
            });
        };
        $scope.initShareState = function() {
            $scope.getShareState();
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
            $scope.loadPrepareState();
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
            // signed or rejected can come either before or after each other depending on chronological ordering.
            // ambiguity is resolve in $scope.compareEvents
            switch (ev.activity) {
                case "retracted":
                    return 10;
                case "finalized":
                case "countersigned":
                case "signed":
                case "rejected":
                    return 4;
                case "viewed":
                    return 3;
                case "received":
                    return 2;
                case "uploaded":
                    return 1;
                default:
                    return 0;
            }
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
        $scope.query = "";
        $scope.archivestate = false;

        $scope.toggleArchived = function() {
            $scope.archivestate = !$scope.archivestate;
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
            if ($scope.hideSharebar) {
                return (obj.statusRatio < $scope.maxRatio) && (!$scope.query || re.test(obj.docname));
            } else {
                return obj.forShare || (!$scope.query || re.test(obj.docname));
            }
        };
        $scope.investorSearchFilter = function(obj) {
            var testString = $scope.query.replace(/[\\\.\+\*\?\^\$\[\]\(\)\{\}\/\'\#\:\!\=\|]/ig, "\\$&");
            var re = new RegExp(testString, 'i');
            // need to backslash all special characters
            return (obj.statusRatio < $scope.maxRatio) && (!$scope.query || re.test(obj.name) || re.test(obj.investor));
        };

        $scope.exportOriginalToPdf = function(doc) {
            SWBrijj.procd('sharewave-' + doc.doc_id + '.pdf', 'application/pdf', 'document.genOriginalPdf', doc.doc_id.toString()).then(function(url) {
                document.location.href = url;
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
        /*
        $scope.exportVersionToPdf = function(version) {
            SWBrijj.procd('sharewave-' + version.doc_id + '.pdf', 'application/pdf', 'document.genCounterpartyPdf', version.doc_id.toString()).then(function(url) {
                document.location.href = url;
            });
        };
        */
        $scope.prepareDocument = function(doc) {
            if (doc.template_id) {
                $location.url("/company-view?template=" + doc.template_id);
            } else {
                $location.url("/company-view?doc=" + doc.doc_id + "&page=1&prepare=true");
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
                         //"application/vnd.oasis.opendocument.image", // .odi
                         //"image/png", // .png
                         //"image/tiff", // .tiff
                         //"image/jpeg", // .jpg
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
                    //$scope.fileError = "Please choose a .pdf, .doc, .docx, .odt, .txt, .rtf, .ppt, .pptx, .odp, .jpg, .png, or a .tiff.";
                } else {
                    $scope.files.push(element.files[i]);
                }
                $scope.$apply();
            }
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
            }
            Intercom('update', {company : {"documents":$scope.documents.length+1}});
            for (var i = 0; i < files.length; i++) fd.append("uploadedFile", files[i]);
            var upxhr = SWBrijj.uploadFile(fd);
            upxhr.then(function(x) {
                void(x);
                $scope.dropText = moreDocs;
                $scope.documentUploadClose();
                $scope.$apply();
                $route.reload();
            }).except(function(x) {
                /*
                if ($scope.tester === true) {
                    $scope.fileError = x.message;
                } else {
                    $scope.fileError = "Oops, something went wrong. Please try again.";
                }
                */
                $scope.$emit("notification:fail", "Oops, something went wrong. Please try again.");
                $scope.files = [];
                $scope.dropText = moreDocs;
                $scope.showProgress = false;
                $scope.$apply();
            });
        };

        $scope.gotoDoc = function(docid) {
            var link;
            link = "/documents/company-view?doc=" + docid;
            document.location.href = link;
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
                return (version.last_event.activity==='received' ? 'sent to ' : (version.last_event.activity + " by ")) +
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
        /*
        $scope.investorStatus = function(investor) {
            if (investor && investor.versions) {
                return "Last Updated " + moment(investor.versions[0] && investor.versions[0].last_event && investor.versions[0].last_event.event_time).from($rootScope.servertime);
            }
        };
        */

        $scope.shortDocStatus = function(doc) {
            if (doc.versions) {
                if (doc.versions.length === 0) {
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
            if ($scope.wasJustRejected(version) && $scope.lastEventByInvestor(version)) {
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
            if (doc.versions) {
                if (doc.versions.length === 0) {
                    return "";
                } else {
                    var total = 0;
                    var archived = 0;
                    if ($scope.archivestate) {
                        total = doc.versions.length;
                    }
                    else {
                        angular.forEach(doc.versions, function (version) {
                            if (!version.archived) {
                                total += 1;
                            }
                            else {
                                archived += 1
                            }
                        });
                    }
                    var docnumber = ($scope.versionsFinalized(doc).length + $scope.versionsViewed(doc).length + $scope.versionsRetracted(doc).length - archived)
                    if (!docnumber && !total) {
                        return "All documents archived";
                    }
                    else {
                        return docnumber +
                            " / " +
                            total +
                            " documents";
                    }
                }
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

        $scope.docIsComplete = function(doc) {
            if (doc.versions) {
                if (doc.versions.length === 0) {
                    return false;
                } else {
                    return doc.versions.length == doc.versions.filter($scope.versionIsComplete).length;
                }
            }
        };
        $scope.isCompleteSigned = function(version) {
            return version.signature_flow>0 && version.when_finalized;
        };
        $scope.isCompleteViewed = function(version) {
            return version.signature_flow===0 && version.last_viewed;
        };
        $scope.isCompleteRetracted = function(version) {
            return version.when_retracted;
        };

        $scope.versionIsComplete = function(version) {
            return  $scope.isCompleteSigned(version) || $scope.isCompleteViewed(version) || $scope.isCompleteRetracted(version);
        };

        $scope.defaultDocStatus = function (doc) {
            return "Uploaded " + moment(doc.last_updated).from($rootScope.servertime);
        };

        $scope.viewOriginal = function(doc) {
            $location.url("/company-view?doc=" + doc.doc_id + "&page=1");
        };
        $scope.viewDoc = function(docid) {
            $location.url("/company-view?doc=" + docid + "&page=1");
        };

        $scope.viewTemplate = function(doc) {
            $location.url("/company-view?template=" + doc.template_id);
        };

        $scope.viewStatus = function(doc) {
            if (doc.doc_id) {
                $location.url("/company-status?doc=" + doc.doc_id);
            }
        };

        $scope.viewVersionStatus = function(doc) {
            $location.url("/company-status?doc=" + doc.original);
        };

        $scope.viewProfile = function(investor) {
            document.location.href = "/company/profile/view?id=" + investor.versions[0].investor;
        };

        $scope.viewInvestorCopy = function(version) {
            $location.url("/company-view?doc=" + version.original + "&page=1" + "&investor=" + version.doc_id);
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
                                searchQuery:  $scope.clearSearchFilter(),
                                maxRatio: $scope.clearHideCompleted(),
                                viewBy: $scope.clearViewBy()};
        };
        $scope.restoreViewState = function() {
            if (!$scope.viewState) {return;}
            $scope.restoreSearchFilter($scope.viewState.searchQuery);
            $scope.restoreSelectedDocs($scope.viewState.selectedDocs);
            $scope.restoreHideCompleted($scope.viewState.maxRatio);
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
            $scope.retractDocModal = true;
        };

        $scope.retractVersionClose = function() {
            $scope.retractDocModal = false;
        };

        $scope.retractVersion = function(version) {
            SWBrijj.procm("document.retract_document", version.doc_id).then(function(data) {
                void(data);
                $scope.$emit("notification:success", "Document retracted from " + (version.name || version.investor));
                version.when_retracted = new Date.today();
                version.last_event.activity = "retracted";
                version.last_event.event_time = new Date.today();
                version.last_event.timenow = new Date.today();
                version.last_event.person = $rootScope.person.name;
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

        /*
        $scope.share = function(message, emails, sign) {
            $scope.processing = true;
            sign = sign == "Yes";
            var tosee = "";
            if (sign) {
                var date = Date.parse('22 November 2113');
            } else {
                date = null;
            }
            if (message === "Add an optional message...") {
                message = "";
            }
            angular.forEach(emails, function(person) {
                var matches = regExp.exec(person);
                if (matches == null) {
                    matches = ["", person];
                }
                tosee += "," +  matches[1];
            });
            SWBrijj.procm("document.share_document",
                              $scope.docToShare.doc_id,
                              0, '',
                              tosee.substring(1).toLowerCase(),
                              message,
                              Boolean(sign) ? 2 : 0,
                              date
                          ).then(function(data) {
                void(data);
                $scope.$emit("notification:success", "Document shared");
                $scope.signeeded = "No";
                $route.reload();
            }).except(function(x) {
                $scope.processing = false;
                void(x);
                $scope.$emit("notification:fail", "Oops, something went wrong.");
                $scope.signeeded = "No";
            });
        };
        */

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
                $scope.$emit("notification:success", doc.docname + " deleted.");
                $scope.documents.splice($scope.documents.indexOf(doc), 1);
            }).except(function(x) {
                console.log(x);
                $scope.$emit("notification:fail", "Document deletion failed.");
            });
        };

        $scope.allArchived = function(versions) {
            var result = 0;
            if ($scope.archivestate) {
                result = 1;
            }
            else {
                angular.forEach(versions, function(version) {
                    if (!version.archived) {
                        result += 1;
                    }
                });
            }
            return result > 0 ? true : false;
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
            });
            if (people && people.length === 0) {
                anybad = true;
            }
            if (compare) {
                docsharestateCOPY = angular.copy($scope.docShareState);
                if (anybad && !old_failed && people && docs) {
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

        $scope.$watch(function() {return $(".leftBlock").height(); }, function(newValue, oldValue) {
            $scope.stretchheight = {height: String(newValue + 150) + "px"};
        });
    }
]);

/*********************************************************************************************************************/

docviews.controller('CompanyDocumentViewController', ['$scope', '$routeParams', '$route', '$rootScope', '$timeout', '$location', 'SWBrijj',
        'navState',
    function($scope, $routeParams, $route, $rootScope, $timeout, $location, SWBrijj, navState) {
        if (navState.role == 'investor') {
            $location.path('/investor-view');
            return;
        }

        SWBrijj.tblm('global.server_time').then(function(time) {
            $rootScope.servertime = time[0].fromnow;
        });

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

        // Set up event handlers
        $scope.$on('event:loginRequired', function() {
            document.location.href = '/login';
        });
        $scope.$on('event:brijjError', function(event, msg) {
            $scope.$emit("notification:fail", msg);//"Oops, something went wrong.");
        });

        $scope.$on('event:reload', function(event) {
            void(event);
            $timeout(function() {
                $route.reload();
            }, 100);
        });

        $scope.$on('docViewerReady', function(event) {
            if ($scope.docId) $scope.getData();//{$route.reload();}
            else if ($scope.templateKey) $scope.$broadcast('initTemplateView', $scope.templateKey, $scope.subId);
        });

        $scope.helpModalUp = function () {
            $scope.tourModal = true;
        };

        $scope.tourclose = function () {
            $scope.hideSharebar = false;
            $scope.tourModal = false;
        };

        $scope.sharinggot = function () {
            SWBrijj.procm("account.update_user_settings", "knows_sharing", "true").then(function(data) {
                void(data);
            });
        };

        $scope.touropts = {
            backdropFade: true,
            dialogFade: true,
            dialogClass: 'helpModal modal'
        };

        $scope.docKey = parseInt($routeParams.doc, 10);
        $scope.templateKey = parseInt($routeParams.template, 10);
        $scope.subId = parseInt($routeParams.subid, 10);
        $scope.urlInves = $routeParams.investor;
        $scope.prepare = ($routeParams.prepare==='true') ? true : false;
        $scope.invq = false;
        $scope.counterparty = !! $scope.urlInves;
        $scope.tester = false;
        $scope.signeeded = "No";

        // For Email sharing
        $scope.recipients = [];
        /* this investor list is used by the sharing email list drop-down */
        $scope.vInvestors = [];
        SWBrijj.tblm('global.investor_list', ['email', 'name']).then(function(data) {
            for (var i = 0; i < data.length; i++) $scope.vInvestors.push(data[i].email);
        });

        $scope.library = $scope.urlInves ? "document.my_counterparty_library" : "document.my_company_library";
        $scope.pages = $scope.urlInves ? "document.my_counterparty_codex" : "document.my_company_codex";

        if ($scope.prepare) {
            SWBrijj.tblm('account.user_settings', ["knows_sharing"]).then(function(data) {
                if (!data[0].knows_sharing) {
                    $scope.helpModalUp();
                }
            });
        }

        $scope.getData = function() {
            var flag = !isNaN(parseInt($scope.urlInves));
            if ($scope.docKey || flag) {
                var field = "original";
                var tempdocid = $scope.docKey;
                if (flag) {
                    field = "doc_id";
                    tempdocid = parseInt($scope.urlInves);
                }
                SWBrijj.tblmm("document.my_counterparty_library", field, tempdocid).then(function(data) {
                    if ($scope.counterparty) {
                        if (flag) {
                            $scope.version = data[0];
                            $scope.getVersion(data[0]);
                            return;
                        }
                        else {
                            for (var i = 0; i < data.length; i++) {
                                var doc = data[i];
                                if (doc.investor == $scope.urlInves) {
                                    $scope.version = doc;
                                    $scope.getVersion(doc);
                                    return;
                                }
                            }
                        }
                    } else {
                        $scope.getOriginal();
                    }
                });
            }
        };

        $scope.getData();

        $scope.getVersion = function(doc) {
            $scope.invq = false;
            $scope.counterparty = true;
            /** @name doc#doc_id
             * @type {number} */
            /** @name doc#signature_deadline
             * @type {Date} */
            $scope.docId = doc.doc_id;
            $scope.library = "document.my_counterparty_library";
            $scope.pages = "document.my_counterparty_codex";

            var z = $location.search();
            z.investor = doc.investor;
            z.page = 1;
            $location.search(z);
            $scope.initDocView();
        };

        $scope.jumpToPage = function(pg) {
            $rootScope.$broadcast("setPage", pg);
        };

        $scope.getOriginal = function() {
            $scope.invq = false;
            $scope.counterparty = false;
            $scope.docId = $scope.docKey;
            $scope.library = "document.my_company_library";
            $scope.pages = "document.my_company_codex";
            var z = $location.search();
            delete z['investor'];
            z.page = 1;
            $location.search(z);
            $scope.initDocView();
        };

        $scope.initDocView = function() {
            $scope.$broadcast('initDocView', $scope.docId, $scope.invq, $scope.library, $scope.pageQueryString(), $scope.pages);
        };


        $scope.pageQueryString = function() {
            return "id=" + $scope.docId + "&investor=" + $scope.invq + "&counterparty=" + $scope.counterparty;
        };

        $scope.fakeSign = function(cd) {
            /** @name SWBrijj#spoof_procm
             * @function
             * @param {string} investor
             * @param {string} company
             * @param {string} procname
             * @param {...*}
             */
            SWBrijj.spoof_procm(cd.investor, cd.company, "investor", "document.sign_document", cd.doc_id, "[]").then(function(data) {
                cd.when_signed = data;
                $route.reload();
            });
        };

        $scope.loadDocumentActivity = function() {
            SWBrijj.tblmm("document.company_activity", "doc_id", $scope.version.doc_id).then(function(data) {
                $scope.version.last_event = data.sort($scope.compareEvents)[0];
                var versionViews = data.filter(function(el) {return el.person===$scope.version.investor && el.activity==='viewed';});
                $scope.version.last_viewed = versionViews.length > 0 ? versionViews[0].event_time : null;
            });
        };

        $scope.$on("reqVersionStatus", function(event, doc_id) {
            $scope.$broadcast("retVersionStatus", $scope.versionStatus($scope.version));
        });

        $scope.versionStatus = function(version) {
            if (version && version.last_event) {
                return "" + version.last_event.activity +
                       " by " + (version.last_event.name || version.investor) +
                       " " + moment(version.last_event.event_time).from($rootScope.servertime);
            } else {
                return "";
            }
        };

        $scope.compareEvents = function(a, b) {
              var initRank = $scope.eventRank(b) - $scope.eventRank(a);
              return initRank === 0 ? (b.event_time - a.event_time) : initRank;
        };

        $scope.setVersionStatusRank = function(version) {
            version.statusRank = $scope.eventRank(version.last_event);
        };

        $scope.eventRank = function (ev) {
            switch (ev.activity) {
                case "finalized":
                    return 7;
                case "countersigned":
                    return 6;
                // signed or rejected can come either before or after each other depending on chronological ordering.
                // ambiguity is resolve in $scope.compareEvents
                case "signed":
                case "rejected":
                    return 4;
                case "viewed":
                    return 3;
                case "received":
                    return 2;
                case "uploaded":
                    return 1;
                default:
                    return 0;
            }
        };
        $scope.leave = function() {
            if ($rootScope.lastPage && (document.location.pathname.indexOf("/register/") === -1)) {
                document.location.href = $rootScope.lastPage;
            } else if ($scope.invq) {
                $location.path('/investor-list').search({});
            } else {
                $location.path('/company-list').search({});
            }
        };
        $scope.$on('countersignAction', function(evt, data) {
            $scope.countersignAction(data);
        });
        $scope.countersignAction = function(data) {
            if (data[0] === 1) {
                $scope.countersignDocument();
            } else if (data[0] === -1) {
                $scope.rejectSignature(data[1]);
            }
        };
        
        $scope.countersignDocument = function() {
            $scope.processing = true;
            var dce = angular.element(".docPanel").scope();
            SWBrijj.document_countersign( $scope.docId, dce.getNoteData(true)[1]).then(function(data) {
                dce.removeAllNotes();
                // can't reload directly because of the modal -- need to pause for the modal to come down.
                $scope.$emit('refreshDocImage');
                $scope.$emit("notification:success", "Document countersigned");
                $scope.leave();
                //$location.path('/company-list').search({});
            }).except(function(x) {
                console.log(x);
                $scope.processing = false;
                $scope.$emit("notification:fail", "Oops, something went wrong.");
            });
        };

        $scope.$on('finalizeAction', function(evt, data) {
            $scope.finalizeAction(data);
        });
        $scope.finalizeAction = function(data) {
            if (data[0] === 1) {
                $scope.finalizeDocument();
            } else if (data[0] === -1) {
                $scope.rejectSignature(data[1]);
            }
        };
        $scope.finalizeDocument = function() {
            $scope.processing = true;
            SWBrijj.document_issuer_finalize($scope.docId).then(function(data) {
                $scope.$emit('refreshDocImage');
                $scope.$emit("notification:success", "Document approved");
                $scope.leave();
                //$location.path('/company-list').search({});
            }).except(function(x) {
                console.log(x);
                $scope.$emit("notification:fail", "Oops, something went wrong.");
                $scope.processing = false;
            });
        };
        $scope.rejectSignature = function(msg) {
            $scope.processing = true;
            if (msg === "Explain the reason for rejecting this document.") {
                msg = "";
            }
            SWBrijj.procm("document.reject_signature", $scope.docId, msg).then(function(data) {
                void(data);
                $scope.$emit("notification:success", "Document signature rejected.");
                $scope.$broadcast('rejectSignature');
                $scope.leave();
                //$location.path('/company-list').search({});
            }).except(function(x) {
                void(x);
                $scope.$emit("notification:fail", "Oops, something went wrong.");
            });
        };

        $scope.remind = function(doc_id, user_email) {
            /* TODO
            SWBrijj.procm("document.remind", version.doc_id, version.investor).then(function(data) {
                $scope.emit('event:remind');
            });
            */
        };

        //Email
        var re = /^(([^<>()[\]\\.,;:\s@\"]+(\.[^<>()[\]\\.,;:\s@\"]+)*)|(\".+\"))@((\[[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\])|(([a-zA-Z\-0-9]+\.)+[a-zA-Z]{2,}))$/;
        //My parentheses format
        var regExp = /\(([^)]+)\)/;

        $scope.checkmany = function(people) {
            var anybad = false;
            angular.forEach(people, function(person) {
                var email;
                var matches = regExp.exec(person);
                if (matches === null) {
                    matches = ["", person];
                }
                email = matches[1];
                if (!re.test(email)) {
                    anybad = true;
                }
            });
            if (people && people.length === 0) {
                anybad = true;
            }
            return anybad;
        };

        $scope.select2Options = {
            'multiple': true,
            'simple_tags': true,
            'tags': $scope.vInvestors,
            'tokenSeparators': [",", " "],
            'placeholder': 'Enter email address & press enter'
        };

        $scope.drawTime = function() {
            return $scope.$$childTail.isAnnotable && $scope.$$childTail.lib && ((!$scope.$$childTail.lib.when_shared && $rootScope.navState.role == "issuer") || (!$scope.$$childTail.lib.when_signed && $rootScope.navState.role == "investor"))
        }
    }
]);

/*******************************************************************************************************************/

docviews.controller('CompanyDocumentStatusController', ['$scope', '$routeParams', '$rootScope', '$filter', '$location', 'SWBrijj', 'navState', '$route',
    function($scope, $routeParams, $rootScope, $filter, $location, SWBrijj, navState, $route) {
        if (navState.role == 'investor') {
            $location.path('/investor-list');
            return;
        }

        $scope.signeeded = "No";
        $scope.archivestate = false;

        $scope.toggleArchived = function() {
            $scope.archivestate = !$scope.archivestate;
        };

        SWBrijj.tblm('global.server_time').then(function(time) {
            $rootScope.servertime = time[0].fromnow;
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

        $scope.select2Options = {
            'multiple': true,
            'simple_tags': true,
            'tags': $scope.vInvestors,
            'tokenSeparators': [",", " "],
            'placeholder': 'Enter email address & press enter'
        };

        // Set up event handlers
        $scope.$on('event:loginRequired', function() {
            document.location.href = '/login';
        });
        $scope.$on('event:brijjError', function(event, msg) {
            $rootScope.errorMessage = msg;
        });

        // $scope.$on('$locationChangeSuccess', function(event) {delete $rootScope.errorMessage; });

        var docId = parseInt($routeParams.doc);
        SWBrijj.tblm("document.my_company_library", ['doc_id', 'company', 'docname', 'last_updated', 'uploaded_by', 'pages'], "doc_id", docId).then(function(data) {
            $scope.document = data;
        });

        SWBrijj.tblmm("document.my_counterparty_library", "original", docId).then(function(data) {
            $scope.docversions = data;
            if ($scope.docversions && $scope.docversions[0]) {
                $scope.setLastLogins();
                $scope.setLastDeadline();
            }
        });

        $scope.setLastLogins = function() {
            SWBrijj.tblm("document.user_tracker").then(function (logins) {
                angular.forEach($scope.docversions, function (person) {
                    angular.forEach(logins, function (login) {
                        if (login.email === person.investor) {
                            person.lastlogin = login.logintime;
                        }
                    });
                });
            });
        };

        SWBrijj.tblmm("document.company_activity", "original", docId).then(function(data) {
            $scope.activity = data;
            $scope.setLastUpdates();
            $scope.makeFeed();
        });

        $scope.initInfoVar = function(infoVar, eventTime) {
            if(!infoVar || eventTime > infoVar) {infoVar = eventTime;}
        };
        $scope.initLastSent = function(act) {
            if (!$scope.lastsent) {
                $scope.lastsent = act.event_time;
            } else if (act.event_time > $scope.lastsent) {
                $scope.lastsent = act.event_time;
            }
        };
        $scope.initLastEdit = function(act) {
            if (!$scope.lastedit) {
                $scope.lastedit = act.event_time;
            } else if (act.event_time > $scope.lastedit) {
                $scope.lastedit = act.event_time;
            }
        };
        $scope.initLastDeadline = function(act) {
            $scope.initInfoVar($scope.lastdeadline, act.event_time);
        };
        $scope.setLastDeadline = function() {
            var lastdeadline = $scope.docversions[0].signature_deadline;
            for (var i=0; i++; i<$scope.docversions.length-1) {
                if ($scope.docversions[i].signature_deadline > lastdeadline) {
                    lastdeadline = $scope.docversions[i].signature_deadline;
                }
            }
            $scope.lastdeadline = lastdeadline;
        };
        $scope.setLastUpdates = function() {
            var i = 0;
            while ((!$scope.lastsent || !$scope.lastedit) &&
                    i <= $scope.activity.length-1) {
                switch ($scope.activity[i].activity) {
                    case "received":
                    case "reminder":
                        $scope.initLastSent($scope.activity[i]);
                        break;
                    case "edited":
                        $scope.initLastEdit($scope.activity[i]);
                        break;
                    case "uploaded":
                        $scope.initLastEdit($scope.activity[i]);
                        break;
                }
                i++;
            }
        };
        $scope.makeFeed = function() {
            $scope.feed = [];
            angular.forEach($scope.activity, function(event) {
                if (event.activity != "sent") {
                    event.when = moment(event.event_time).from(event.timenow);
                    $scope.feed.push(event);
                }
            });
        };

        $scope.documentshareOpen = function() {
            $location.path('/company-list?share');
            $location.search({});
        };

        $scope.$watch('document.docname', function(newValue, oldValue) {
            if (newValue === "") {
                return "Untitled";
            } else {
                return oldValue;
            }
        });

        $scope.activityOrder = function(card) {
            if (card.activity == "Uploaded by ") {
                return 0;
            } else {
                return -card.event_time;
            }
        };

        $scope.editorEnabled = false;

        $scope.enableEditor = function() {
            $scope.editorEnabled = true;
            $scope.editableTitle = $scope.page_title;
        };

        $scope.disableEditor = function() {
            $scope.editorEnabled = false;
        };

        $scope.save = function() {
            var newname = $scope.editableTitle;
            $scope.page_title = newname;
            $scope.disableEditor();
            SWBrijj.procm("document.title_change", docId, newname).then(function(data) {
            });
        };

        $scope.viewOriginal = function() {
            $location.url("/company-view?doc=" + $scope.document.doc_id + "&page=1");
        };

        $scope.viewInvestorCopy = function(investor) {
            $location.url("/company-view?doc=" + investor.original + "&page=1" + "&investor=" + investor.doc_id);
        };

        $scope.rejectSignature = function(cd) {
            SWBrijj.procm("document.reject_signature", cd.doc_id).then(function(data) {
                void(data);
                cd.when_signed = null;
                //$scope.$apply();
                $scope.$$childHead.init();
            });
        };

        $scope.formatLastLogin = function(lastlogin) {
            return lastlogin ? "Last Login " + moment(lastlogin).from($rootScope.servertime) : "Never Logged In";
        };

        $scope.formatDate = function(date, fallback) {
            if (!date) {
                return fallback ? fallback : "ERROR";
            } else {
                return "" + $filter('date')(date, $rootScope.settings.dateformat) + "\n" + $filter('date')(date, 'shortTime');
            }
        };

        $scope.investorOrder = 'investor';

        $scope.setOrder = function(field) {
            $scope.investorOrder = ($scope.investorOrder == field) ? '-' + field : field;
        };

        /*$scope.remind = function(message, email) {
            SWBrijj.procm("document.remind_document", docId, email.toLowerCase(), message).then(function(data) {
            });
        };
        */

        $scope.showStatusDetail = function(person) {
            $scope.docversions.forEach(function(name) {
                if (name === person) name.shown = !name.shown;
                else name.shown = false;
            });
        };

        $scope.reminder = "";

        $scope.opts = {
            backdropFade: true,
            dialogFade: true,
            dialogClass: 'modal wideModal'
        };

        $scope.remmodalUp = function(name) {
            $scope.reminder = name;
            $scope.remModal = true;
        };

        $scope.remclose = function() {
            $scope.remModal = false;
        };

        $scope.remopts = {
            backdropFade: true,
            dialogFade: true
        };


        function failed() {
            alert("failed");
        }

        $scope.shareDocument = function(doc) {
            void(doc);
            $location.url("/company-list?share");
        };

        $scope.prepareDocument = function(doc) {
            $location.url("/company-view?doc=" + doc.doc_id + "&page=1&prepare=true");
        };
        // Sharing modal functions

        $scope.shareDocOpen = function() {
            $scope.messageText = "Add an optional message...";
            $scope.signeeded = "No";
            $scope.shareDocModal = true;
        };

        $scope.shareDocClose = function() {
            $scope.shareDocModal = false;
            $scope.messageText = "Add an optional message...";
            $scope.signeeded = "No";
        };

        $scope.changeSig = function(value) {
            $scope.signeeded = value;
            if ($scope.messageText==="") {
                $scope.messageText = "Add an optional message...";
            }
        };

        //Email
        var re = /^(([^<>()[\]\\.,;:\s@\"]+(\.[^<>()[\]\\.,;:\s@\"]+)*)|(\".+\"))@((\[[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\])|(([a-zA-Z\-0-9]+\.)+[a-zA-Z]{2,}))$/;
        //My parentheses format
        var regExp = /\(([^)]+)\)/;

        $scope.fieldCheck = function(email) {
            var matches = regExp.exec(email);
            if (matches == null) {
                matches = ["", email];
            }
            email = matches[1];
            return re.test(email);
        };

        $scope.checkmany = function(people) {
            var anybad = false;
            angular.forEach(people, function(person) {
                var email
                var matches = regExp.exec(person);
                if (matches == null) {
                    matches = ["", person];
                }
                email = matches[1];
                if (!re.test(email)) {
                    anybad = true
                }
            });
            if (people.length == 0) {
                anybad = true
            }
            return anybad
        };

        $scope.share = function(message, emails, sign) {
            sign = sign == "Yes";
            var tosee = "";
            if (sign) {
                var date = Date.parse('22 November 2113');
            } else {
                date = null;
            }
            if (message === "Add an optional message...") {
                message = "";
            }
            angular.forEach(emails, function(person) {
                var matches = regExp.exec(person);
                if (matches == null) {
                    matches = ["", person.id];
                }
                tosee += "," +  matches[1];
            });
            SWBrijj.procm("document.share_document",
                              $scope.document.doc_id,
                              0, '',
                              tosee.substring(1).toLowerCase(),
                              message,
                              Boolean(sign) ? 2 : 0,
                              date
                          ).then(function(data) {
                void(data);
                $scope.$emit("notification:success", "Document shared");
                $scope.signeeded = "No";
                $route.reload();
            }).except(function(x) {
                    void(x);
                    $scope.$emit("notification:fail", "Oops, something went wrong.");
                    $scope.signeeded = "No";
                });
        };

    }
]);

/*************************************************************************************************
  INVESTOR CONTROLLERS
*************************************************************************************************/

docviews.controller('InvestorDocumentListController', ['$scope', 'SWBrijj', '$location', '$rootScope', 'navState',
    function($scope, SWBrijj, $location, $rootScope, navState) {
        if (navState.role == 'issuer') {
            $location.path("/company-list");
            return;
        }

        SWBrijj.tblm('global.server_time').then(function(time) {
            $rootScope.servertime = time[0].fromnow;
        });

        $scope.selectedCompany = navState.company;

        // Set up event handlers
        $scope.$on('event:loginRequired', function() {
            document.location.href = '/login';
        });
        $scope.$on('event:brijjError', function(event, msg) {
            $rootScope.errorMessage = msg;
        });

        // $scope.$on('$locationChangeSuccess', function(event) {delete $rootScope.errorMessage; });

        SWBrijj.tblm("document.this_investor_library").then(function(data) {
            $scope.documents = data;
            $scope.loadDocumentActivity();
        });

        $scope.loadDocumentActivity = function() {
            SWBrijj.tblm("document.investor_activity").then(function(data) {
                angular.forEach($scope.documents, function(doc) {
                    var doc_activity = data.filter(function(el) {return el.doc_id === doc.doc_id;});
                    doc.last_event = doc_activity.sort($scope.compareEvents)[0];
                    if (doc.last_event.activity == 'finalized') {doc.last_event.activity = 'approved';}
                    var doc_activities = doc_activity.filter(function(el) {return el.person === doc.investor && el.activity === "viewed";});
                    doc.last_viewed = doc_activities.length > 0 ? doc_activities[0].event_time : null;
                    $scope.setDocStatusRank(doc);
                });
            });
        };

        $scope.compareEvents = function(a, b) {
            var initRank = $scope.eventRank(b) - $scope.eventRank(a);
            return initRank === 0 ? (Date.parse(b.event_time) - Date.parse(a.event_time)) : initRank;
        };

        $scope.eventRank = function (ev) {
            // signed or rejected can come either before or after each other depending on chronological ordering.
            // ambiguity is resolve in $scope.compareEvents
            switch (ev.activity) {
                case "finalized":
                case "countersigned":
                case "signed":
                case "rejected":
                    return 4;
                case "viewed":
                    return 3;
                case "received":
                    return 2;
                case "uploaded":
                    return 1;
                default:
                    return 0;
            }
        };

        $scope.setDocStatusRank = function(doc) {
            doc.statusRank = $scope.eventRank(doc.last_event);
        };

        $scope.momentFromNow = function(date) {
            return moment(date).from($rootScope.servertime);
        };

        $scope.docOrder = 'docname';
        $scope.shareOrder = 'docname';
        $scope.hideCompleted = false;

        $scope.setOrder = function(field) {
            $scope.docOrder = $scope.docOrder == field ? '-' + field : field;
        };
        $scope.toggleHideCompleted = function() {
            $scope.hideCompleted = !$scope.hideCompleted;
        };

        $scope.searchFilter = function(obj) {
            var re = new RegExp($scope.query, 'i');
            return !($scope.hideCompleted && $scope.docIsComplete(obj)) && (!$scope.query || re.test(obj.docname));
        };

        $scope.time = function(doc) {
            return doc.when_signed || doc.signature_deadline;
        };

        $scope.gotoDoc = function(doc) {
            var link;
            if (doc.template_id && !doc.when_signed) link = "/documents/investor-view?template=" + doc.template_id + "&subid=" + doc.doc_id;
            else link = "/documents/investor-view?doc=" + doc.doc_id;
            document.location.href = link;
        };

        $scope.exportOriginalToPdf = function(doc) {
            SWBrijj.procd('sharewave-' + doc.original + '.pdf', 'application/pdf', 'document.genInvestorOriginalPdf', doc.original.toString()).then(function(url) {
                document.location.href = url;
            });
        };
        $scope.exportVersionToPdf = function(doc) {
            $scope.$emit("notification:success", "Export in progress.");
            SWBrijj.genInvestorPdf('sharewave-'+doc.doc_id+'-'+doc.investor+'.pdf', 'application/pdf', doc.doc_id, false).then(function(url) {
                document.location.href = url;
            }).except(function(x) {
                console.log(x);
                $scope.$emit("notification:fail", "Oops, something went wrong.");
            });
        };

        $scope.remind = function(doc_id, user_email) {
            /*
            SWBrijj.procm("document.remind", version.doc_id, version.investor).then(function(data) {
                $scope.emit('event:remind');
            });
            */
        };

        $scope.docStatus = function(doc) {
            if (doc.last_event) {
                return doc.last_event.activity +
                       " by " +
                       doc.last_event.person +
                       " " + moment(doc.last_event.event_time).from($rootScope.servertime);
            } else {
                return "";
            }
        };

        $scope.shortStatus = function(version) {
            if (!version) return "";
            if ($scope.wasJustRejected(version) && $scope.lastEventByInvestor(version)) {
                return "Rejected by you";
            } else if ($scope.wasJustRejected(version) &&
                       !$scope.lastEventByInvestor(version)) {
                return "Rejected by company";
            } else if ($scope.isPendingSignature(version)){
                return "Review and Sign";
            } else if ($scope.isPendingCountersignature(version)){
                return "Signed and Sent for Review";
            } else if ($scope.isPendingFinalization(version)) {
                return "Awaiting Your Approval";
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
            return doc.last_event.person == navState.userid;
        };

        $scope.wasJustRejected = function(doc) {
            return doc.last_event && doc.last_event.activity == 'rejected';
        };

        $scope.isPendingFinalization = function(doc) {
            return (doc.signature_flow===2 && doc.when_countersigned && !doc.when_finalized);
        };

        $scope.isPendingCountersignature = function(doc) {
            return (doc.when_signed && !doc.when_countersigned && doc.signature_flow===2)
                    || (doc.when_signed && !doc.when_finalized && doc.signature_flow===1);
        };

        $scope.isPendingSignature = function(doc) {
            return doc.signature_flow>0 && !doc.when_signed;
        };

        $scope.isPendingView = function(doc) {
            return doc.signature_flow===0 && !doc.last_viewed;
        };
        $scope.isCompleteSigned = function(version) {
            return version.signature_flow>0 && version.when_finalized;
        };
        $scope.isCompleteViewed = function(version) {
            return version.signature_flow===0 && version.last_viewed;
        };

        $scope.docIsComplete = function(doc) {
            return  $scope.isCompleteSigned(doc) || $scope.isCompleteViewed(doc);
        };

    }
]);

/*************************************************************************************************/

docviews.controller('InvestorDocumentViewController', ['$scope', '$location', '$route', '$rootScope', '$routeParams', '$timeout', 'SWBrijj',
        'navState',
    function($scope, $location, $route, $rootScope, $routeParams, $timeout, SWBrijj, navState) {
        // Switch to company view if the role is issuer
        /** @name $routeParams#doc
         * @type {string} */
        if (navState.role == 'issuer') {
            $location.path("/company-view");
            return;
        }

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

        $scope.$on('event:reload', function(event) {
            void(event);
            $timeout(function() {
                $route.reload();
            }, 100);
        });

        $scope.$on('docViewerReady', function(event) {
            if ($scope.docId) $scope.getData();
            else if ($scope.templateKey) $scope.$broadcast('initTemplateView', $scope.templateKey, $scope.subId);
        });

        $scope.docId = parseInt($routeParams.doc, 10);
        $scope.templateKey = parseInt($routeParams.template, 10);
        $scope.subId = parseInt($routeParams.subid, 10);
        $scope.thisPage = $routeParams.page ? parseInt($routeParams.page, 10) : 1;
        $scope.library = "document.my_investor_library";
        $scope.pages = "document.my_investor_codex";
        $scope.tester = false;
        $scope.invq = true;
        $scope.pageQueryString = function() {
            return "id=" + $scope.docId + "&investor=" + $scope.invq;
        };
        $scope.processing = false;

        $scope.helpModalUp = function () {
            $scope.tourModal = true;
        };

        $scope.tourclose = function () {
            $scope.sideToggle = false;
            $scope.tourModal = false;
        };

        $scope.touropts = {
            backdropFade: true,
            dialogFade: true,
            dialogClass: 'helpModal modal'
        };

        $scope.signinggot = function () {
            SWBrijj.procm("account.update_user_settings", "knows_signing", "true").then(function(data) {
                void(data);
            });
        };

        $scope.initDocView = function() {
            $scope.$broadcast('initDocView', $scope.docId, $scope.invq, $scope.library, $scope.pageQueryString(), $scope.pages);
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

                    if ($scope.signable()) {
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

        $scope.getData();

        $scope.signable = function() {
            return $scope.document && $scope.document.signature_deadline && !$scope.document.when_signed;
        };

        $scope.leave = function() {
            if ($rootScope.lastPage && (document.location.pathname.indexOf("/register/") === -1)) {
                document.location.href = $rootScope.lastPage;
            } else if ($scope.invq) {
                $location.path('/investor-list').search({});
            } else {
                $location.path('/company-list').search({});
            }
        };

        $scope.signDocument = function(doc) {
            $scope.processing = true;
            // before signing the document, I may need to save the existing annotations
            // In fact, I should send the existing annotations along with the signature request for a two-fer.

            var dce = angular.element(".docPanel").scope();
          SWBrijj.sign_document($scope.docId,dce.getNoteData(true)[0]).then(function(data) {
                doc.when_signed = data;
                $scope.$emit('refreshDocImage');
                $scope.$emit("notification:success", "Document signed");
                $scope.leave();
                //$location.path('/investor-list').search({});
            }).except(function(x) {
                console.log(x);
                $scope.$emit("notification:fail", "Oops, something went wrong.");
                $scope.processing = false;
            });
        };

        $scope.$on('finalizeAction', function(evt, data) {
            $scope.finalizeAction(data);
        });
        $scope.finalizeAction = function(data) {
            if (data[0] === 1) {
                $scope.finalizeDocument();
            } else if (data[0] === -1) {
                $scope.rejectCountersignature(data[1]);
            }
        };

        $scope.finalizeDocument = function() {
            $scope.processing = true;
            //var dce = angular.element(".docPanel").scope();
            SWBrijj.document_finalize($scope.docId).then(function(data) {
                $scope.$emit('refreshDocImage');
                $scope.$emit("notification:success", "Document approved");
                $scope.leave();
                //$location.path('/investor-list').search({});
            }).except(function(x) {
                console.log(x);
                $scope.$emit("notification:fail", "Oops, something went wrong.");
                $scope.processing = false;
            });
        };

        $scope.rejectCountersignature = function(msg) {
            $scope.processing = true;
            if (msg === "Explain the reason for rejecting this document.") {
                msg = "";
            }
            //var dce = angular.element(".docPanel").scope();
            SWBrijj.procm("document.reject_countersignature", $scope.docId, msg).then(function(data) {
                $scope.$emit("notification:success", "Document countersignature rejected.");
                void(data);
                $scope.leave();
                //$location.path('/company-list').search({});
            }).except(function(x) {
                void(x);
                $scope.$emit("notification:fail", "Oops, something went wrong.");
                $scope.processing = false;
            });
        };
    }
]);


/************************************************************
 *  Filters
 *  *********************************************************/


/* Filter to format the activity time */
docviews.filter('fromNow', function() {
    return function(date, servertime) {
        return moment(date).from(servertime);
    };
});

docviews.filter('viewByPrinter', function() {
    return function(viewby) {
        if (viewby == "document") return "Document";
        else if (viewby == "name") return "Name";
        else return order;
    };
});

docviews.filter('fromNowSortandFilter', function() {
    return function(events) {
        if (events) {
            events.sort(function (a, b) {
                if (a[1] > b[1]) return -1;
                if (a[1] < b[1]) return 1;
                return 0;
            });
        }
        return events;
    };
});

docviews.filter('fileLength', function() {
    return function(word) {
        if (word) {
            if (word.length > 21) {
                return word.substring(0, 20) + "..";
            } else {
                return word;
            }
        }
        return '';
    };
});

docviews.filter('lengthLimiter', function() {
    return function(word) {
        return word && word.length > 58 ? word.substring(0, 57) + "..." : word;
    };
});

docviews.filter('nameoremail', function() {
    return function(person) {
        var word = person.name || person.investor;
        return word.length > 24 ? word.substring(0, 23) + "..." : word;
    };
});

docviews.directive('restrictContentEditable', function() {
    return {
        require: 'ngModel',
        link: function(scope, elm, attrs, ctrl) {
            // view -> model
            var ff = function() {
                scope.$apply(function() {
                    ctrl.$setViewValue(elm.text());
                });
                scope.$emit('updated:name');
            };

            elm.on('blur', ff);
            elm.bind("keydown keypress", function(event) {
                var allowedKeys = [8, 46, 37, 38, 39, 40, 27];
                // backspace, delete, up, down, left, right, esc
                if (event.which === 13) {
                    // key = enter
                    event.preventDefault();
                    event.currentTarget.blur();
                } else if (elm.html().length >= 58 && allowedKeys.indexOf(event.which) === -1 && !event.ctrlKey && !event.metaKey) {
                    // reached maxlength AND entered key is not allowed AND not key combination
                    event.preventDefault();
                } else if (event.which === 86 && (event.ctrlKey || event.metaKey)) {
                    // disallow paste
                    event.preventDefault();
                }
            });

            // model -> view
            ctrl.$render = function() {
                elm.text(ctrl.$viewValue);
            };

            // load init value from DOM
            ctrl.$setViewValue(elm.text());
        }
    };
});


docviews.directive('contenteditable', function() {
    return {
        require: 'ngModel',
        link: function(scope, elm, attrs, ctrl) {
            // view -> model
            var ff = function() {
                scope.$apply(function() {
                    ctrl.$setViewValue(elm.text());
                });
                scope.$emit('updated:name');
            };

            elm.on('blur', ff);
            elm.bind("keydown keypress", function(event) {
                if (event.which === 13) {
                    // key = enter
                    event.preventDefault();
                    event.currentTarget.blur();
                }
            });

            // model -> view
            ctrl.$render = function() {
                elm.text(ctrl.$viewValue);
            };

            // load init value from DOM
            ctrl.$setViewValue(elm.text());
        }
    };
});

// Returns the rows not including the selected investor
docviews.filter('archived', function () {
    return function (versions, archive) {
        var returnrows = [];
        angular.forEach(versions, function (version) {
            if (archive || version.archived == false) {
                returnrows.push(version);
            }
        });
        return returnrows;
    };
});
