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
        controller: 'CompanyDocumentListController'
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

docviews.controller('CompanyDocumentListController', ['$scope', '$modal', '$q', '$location', '$rootScope', '$route', 'SWBrijj',
        'navState',
    function($scope, $modal, $q, $location, $rootScope, $route, SWBrijj, navState) {
        if (navState.role == 'investor') {
            $location.path('/investor-list'); // goes into a bottomless recursion ?
            return;
        }

        $scope.sideToggleName = "Hide";

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

        SWBrijj.tblm('smartdoc.document').then(function(data) {
            $scope.smarttemplates = data;
        }).except(function(x) {
            });

        SWBrijj.tblm('document.my_company_library', ['doc_id', 'template_id', 'company', 'docname', 'last_updated', 'uploaded_by']).then(function(data) {
            $scope.documents = data;
            if ($scope.documents.length === 0) {
                $scope.noDocs = true;
            } else {
                $scope.loadDocumentVersions();
            }
        });

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
            if (doc.versions.filter(function(el) {return el.signature_deadline;}).length > 0) {
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
        $scope.messageText = "Add an optional message...";
        $scope.query = "";

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
            return (obj.statusRatio < $scope.maxRatio) && (!$scope.query || re.test(obj.docname));
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
            /*
            SWBrijj.procd('sharewave-' + doc.doc_id + '.pdf', 'application/pdf', 'document.genCompanyPdf', doc.doc_id.toString()).then(function(url) {
                document.location.href = url;
            });
            */
        };
        $scope.exportOriginalDocidToPdf = function(docid) {
            SWBrijj.procd('sharewave-' + docid + '.pdf', 'application/pdf', 'document.genOriginalPdf', docid.toString()).then(function(url) {
                document.location.href = url;
            });
        };

        $scope.exportVersionToPdf = function(version) {
            SWBrijj.procd('sharewave-' + version.doc_id + '.pdf', 'application/pdf', 'document.genCounterpartyPdf', version.doc_id.toString()).then(function(url) {
                document.location.href = url;
            });
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

        // removed for now "application/vnd.openxmlformats-officedocument.wordpressingml.document","application/vnd.openxmlformats-officedocument.wordpressingml.template","application/msword"

        var mimetypes = ["application/pdf",
                         "application/msword",
                         "application/vnd.ms-powerpoint",
                         "text/csv"];

        $scope.setFiles = function(element) {
            $scope.files = [];
            $scope.fileError = "";
            for (var i = 0; i < element.files.length; i++) {
                if (element.files[i].size > 20000000) {
                    $scope.fileError = "Please choose a smaller file";
                } else if (mimetypes.indexOf(element.files[i].type) == -1) {
                    $scope.fileError = "Please choose a .pdf, .doc, .ppt or .csv";
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
                if ($scope.tester === true) {
                    $scope.fileError = x.message;
                } else {
                    $scope.fileError = "Oops, something went wrong. Please try again.";
                }
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
                if (selected.doc_id == doc.doc_id) {
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
            if (doc.versions) {
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
                return $scope.versionsFinalized(doc).length;
            } else {
                return $scope.versionsViewed(doc).length;
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
                    return ($scope.versionsFinalized(doc).length + $scope.versionsViewed(doc).length) +
                        " / " +
                        doc.versions.length +
                        " documents";
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
            if (doc) {
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
            }
        };

        $scope.versionsFinalized = function(doc) {
            return doc.versions.filter(function(el) {return el.when_finalized;});
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
            return version.signature_flow>0 && !version.when_signed;
        };

        $scope.isPendingCountersignature = function(version) {
            return version.when_signed && !version.when_countersigned && version.signature_flow===2;
        };

        $scope.isPendingInvestorFinalization = function(version) {
            return (version.signature_flow===2 && version.when_signed && version.when_countersigned && !version.when_finalized);
        };
        $scope.isPendingIssuerFinalization = function(version) {
            return (version.signature_flow===1 && version.when_signed && !version.when_finalized);
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

        $scope.versionIsComplete = function(version) {
            return  $scope.isCompleteSigned(version) || $scope.isCompleteViewed(version);
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

        $scope.viewTemplate = function(templateid) {
            $location.url("/company-view?template=" + templateid);
        };

        $scope.viewStatus = function(doc) {
            $location.url("/company-status?doc=" + doc.doc_id);
        };
        $scope.viewVersionStatus = function(doc) {
            $location.url("/company-status?doc=" + doc.original);
        };

        $scope.viewProfile = function(investor) {
            document.location.href = "/company/profile/view?id=" + investor.versions[0].investor;
        };

        $scope.viewInvestorCopy = function(version) {
            $location.url("/company-view?doc=" + version.original + "&page=1" + "&investor=" + version.investor);
        };

        // Toggles sidebar back and forth
        $scope.toggleSide = function () {
            if (!$scope.sideToggle) {
                $scope.sideToggleName = "Hide";
                return false
            } else {
                $scope.sideToggleName = "Templates";
                return true
            }
        };

        // Sharing modal functions

        $scope.shareDocOpen = function(doc) {
            $scope.docToShare = doc;
            $scope.shareDocModal = true;
        };

        $scope.shareDocClose = function() {
            $scope.shareDocModal = false;
        };

        $scope.shareTemplateOpen = function(templateid) {
            console.log("todo");
        };
        $scope.shareTemplateClose = function(templateid) {
            console.log("todo");
        };

        $scope.fakePlaceholder = function() {
            if ($scope.messageText == "Add an optional message...") {
                $scope.messageText = "";
            }
        };

        $scope.changeSig = function(value) {
            $scope.signeeded = value;
            if (value == "Yes") {
                $scope.messageText = "Hi, Your signature is requested";
            } else {
                $scope.messageText = "Add an optional message...";
            }
        };

        //Email
        var re = /^(([^<>()[\]\\.,;:\s@\"]+(\.[^<>()[\]\\.,;:\s@\"]+)*)|(\".+\"))@((\[[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\])|(([a-zA-Z\-0-9]+\.)+[a-zA-Z]{2,}))$/;
        //My parentheses format
        var regExp = /\(([^)]+)\)/;

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
                var matches = regExp.exec(person.id);
                if (matches == null) {
                    matches = ["", person.id];
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
                void(x);
                $scope.$emit("notification:fail", "Oops, something went wrong.");
                $scope.signeeded = "No";
            });
        };

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

        // Multisharing modal functions

        $scope.checkmany = function(people) {
            var anybad = false;
            angular.forEach(people, function(person) {
                var email;
                var matches = regExp.exec(person.id);
                if (matches === null) {
                    matches = ["", person.id];
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

        $scope.multipeople = [];
        $scope.select2Options = {
            'multiple': true,
            'simple_tags': true,
            'tags': $scope.vInvestors,
            'tokenSeparators': [",", " "],
            'placeholder': 'Enter email address & press enter'
        };

        $scope.multishareOpen = function() {
            $scope.multishareModal = true;
            $scope.sharemodalscreen = "1";
            $scope.sharedocs = [];
            angular.forEach($scope.documents, function(doc) {
                $scope.sharedocs.push({'doc_id':doc.doc_id, 'docname':doc.docname, 'picked': false, 'signature': false, 'versions': doc.versions})
            });
        };

        $scope.multishareClose = function() {
            $scope.multishareModal = false;
        };

        $scope.multishareopts = {
            backdropFade: true,
            dialogFade: true,
            dialogClass: 'modal multishareModal'
        };

        $scope.oneSelected = function(list, field) {
            var count = 0;
            angular.forEach(list, function(item) {
                count = item[field] ? count + 1: count;
            });
            return count;
        };

        $scope.gotoscreen = function(page) {
            if (page == "2") {
            }
            $scope.sharemodalscreen = page;
        };

        $scope.checkShareBox = function(doc, field) {
            doc[field] = !doc[field];
            if (field == "picked" && doc[field] == false) {
                doc['signature'] = false
            }
        };

        $scope.sharetoMany = function() {
            var forsign = "";
            var forview = "";
            var tosee = "";
            angular.forEach($scope.sharedocs, function(doc) {
                if (doc.picked) {
                    if (doc.signature) {
                        forsign += "," + doc.doc_id;
                    }
                    else {
                        forview += "," + doc.doc_id;
                    }
                }
            });
            forsign = forsign == "" ? "!!!" : forsign;
            forview = forview == "" ? "!!!" : forview;
            var regExp = /\(([^)]+)\)/;
            angular.forEach($scope.multipeople, function(person) {
                var matches = regExp.exec(person.id);
                if (matches == null) {
                    matches = ["", person.id];
                }
                tosee += "," +  matches[1];
            });
            tosee = tosee == "" ? "!!!" : tosee;
            SWBrijj.procm("document.multishare", tosee.substring(1).toLowerCase(), forview.substring(1), forsign.substring(1), Date.parse('22 November 2113')).then(function(data) {
                console.log(data);
                $scope.$emit("notification:success", "Documents shared");
                $route.reload();
            }).except(function(x) {
                    void(x);
                    $scope.$emit("notification:fail", "Oops, something went wrong.");
                });
        };
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

        $scope.docKey = parseInt($routeParams.doc, 10);
        $scope.templateKey = parseInt($routeParams.template, 10);
        $scope.subId = parseInt($routeParams.subid, 10);
        $scope.urlInves = $routeParams.investor;
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

        $scope.getData = function() {
            if ($scope.docKey) {
                SWBrijj.tblmm("document.my_counterparty_library", "original", $scope.docKey).then(function(data) {
                    if ($scope.counterparty) {
                        for (var i = 0; i < data.length; i++) {
                            var doc = data[i];
                            if (doc.investor == $scope.urlInves) {
                                $scope.version = doc;
                                $scope.getVersion(doc);
                                return;
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
        $scope.rejectSignature = function(msg) {
            $scope.processing = true;
            if (msg === "Add an optional message...") {
                msg = "";
            }
            SWBrijj.procm("document.reject_signature", $scope.docId, msg).then(function(data) {
                $scope.$emit("notification:success", "Document signature rejected.");
                void(data);
                $scope.$broadcast('rejectSignature');
                // TODO FIX THIS WHEN_SIGNED IS NOT BEING BLANKED OUT
                //cd.when_signed = null;
                $location.path('/company-list').search({});
            }).except(function(x) {
                void(x);
                $scope.$emit("notification:fail", "Oops, something went wrong.");
            });
        };
        
        $scope.countersignDocument = function() {
            $scope.processing = true;
            var dce = angular.element(".docPanel").scope();
            SWBrijj.procm("document.countersign", $scope.docId, dce.getNoteData(true)).then(function(data) {
                dce.removeAllNotes();
                // can't reload directly because of the modal -- need to pause for the modal to come down.
                $scope.$emit('refreshDocImage');
                $scope.$emit("notification:success", "Document countersigned");
                $location.path('/company-list').search({});
            }).except(function(x) {
                console.log(x);
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
            SWBrijj.procm("document.issuer_finalize", $scope.docId).then(function(data) {
                $scope.$emit('refreshDocImage');
                $scope.$emit("notification:success", "Document approved");
                $location.path('/company-list').search({});
            }).except(function(x) {
                console.log(x);
                $scope.$emit("notification:fail", "Oops, something went wrong.");
                $scope.processing = false;
            });
        };
        $scope.rejectSignature = function(msg) {
            $scope.processing = true;
            if (msg === "Add an optional message...") {
                msg = "";
            }
            SWBrijj.procm("document.reject_signature", $scope.docId, msg).then(function(data) {
                void(data);
                $scope.$emit("notification:success", "Document signature rejected.");
                $scope.$broadcast('rejectSignature');
                $location.path('/company-list').search({});
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
                    event.when = moment(event.time).from(event.timenow);
                    $scope.feed.push(event);
                }
            });
        };

        $scope.documentshareOpen = function() {
            // TODO open documentshare modal once implemented on this page
            $location.path('/company-list');
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
            $location.url("/company-view?doc=" + $scope.document.doc_id + "&page=1" + "&investor=" + investor);
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

        // Sharing modal functions

        $scope.shareDocOpen = function() {
            $scope.shareDocModal = true;
        };

        $scope.shareDocClose = function() {
            $scope.shareDocModal = false;
        };

        $scope.changeSig = function(value) {
            $scope.signeeded = value;
            if (value == "Yes") {
                $scope.messageText = "Hi, Your signature is requested";
            } else {
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
                var matches = regExp.exec(person.id);
                if (matches == null) {
                    matches = ["", person.id];
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
                var matches = regExp.exec(person.id);
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
            SWBrijj.procd('sharewave-' + doc.original + '.pdf', 'application/pdf', 'document.genOriginalPdf', doc.original.toString()).then(function(url) {
                document.location.href = url;
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

        $scope.signDocument = function(doc) {
            $scope.processing = true;
            // before signing the document, I may need to save the existing annotations
            // In fact, I should send the existing annotations along with the signature request for a two-fer.

            var dce = angular.element(".docPanel").scope();
            SWBrijj.procm("document.sign_document", $scope.docId, dce.getNoteData(true)).then(function(data) {
                doc.when_signed = data;
                dce.removeAllNotes();
                $scope.$emit('refreshDocImage');
                $scope.$emit("notification:success", "Document signed");
                $location.path('/investor-list').search({});
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
            SWBrijj.procm("document.finalize", $scope.docId).then(function(data) {
                $scope.$emit('refreshDocImage');
                $scope.$emit("notification:success", "Document approved");
                $location.path('/investor-list').search({});
            }).except(function(x) {
                console.log(x);
                $scope.$emit("notification:fail", "Oops, something went wrong.");
                $scope.processing = false;
            });
        };

        $scope.rejectCountersignature = function(msg) {
            $scope.processing = true;
            if (msg === "Add an optional message...") {
                msg = "";
            }
            //var dce = angular.element(".docPanel").scope();
            SWBrijj.procm("document.reject_countersignature", $scope.docId, msg).then(function(data) {
                $scope.$emit("notification:success", "Document countersignature rejected.");
                void(data);
                $location.path('/company-list').search({});
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
        else if (viewby == "investor") return "Investor";
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
