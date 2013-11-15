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

var docviews = angular.module('documentviews', ['documents', 'upload', 'nav', 'ui.bootstrap', '$strap.directives', 'brijj', 'ui.bootstrap.progressbar', 'ui.select2', 'email', 'commonServices'], function($routeProvider, $locationProvider) {
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
            }
        }
    }
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

        // $scope.$on('$locationChangeSuccess', function(event) {delete $rootScope.errorMessage; });

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

        SWBrijj.tblm('document.my_company_library', ['doc_id', 'company', 'docname', 'last_updated', 'uploaded_by']).then(function(data) {
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
                    $scope.loadDocumentActivity(doc);
                    $scope.setDocumentStatusRatio(doc);
                });
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

        $scope.loadDocumentActivity = function (doc) {
            angular.forEach(doc.versions, function(version) {
                SWBrijj.tblmm("document.company_activity", "doc_id", version.doc_id).then(function(data) {
                    // This works assuming data is in descending chronological order.
                    version.last_event = data.sort($scope.compareEvents)[0];
                    var versionActivities = data.filter(function(el) {return el.person === version.investor && el.activity === "viewed";});
                    version.last_viewed = versionActivities.length > 0 ? versionActivities[0].event_time : null;
                    $scope.setVersionStatusRank(version);
                });
            });
            $scope.setSigRequired(doc);
        };

        $scope.compareEvents = function(a, b) {
              var initRank = $scope.eventRank(b) - $scope.eventRank(a);
              return initRank === 0 ? (b.event_time - a.event_time) : initRank;
        };

        $scope.eventRank = function (ev) {
            switch (ev.activity) {
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

        $scope.docOrder = 'docname';
        $scope.shareOrder = 'docname';
        $scope.versionOrder = 'statusRank';
        $scope.selectedDoc = 0;
        $scope.recipients = [];
        $scope.signaturedate = Date.today();
        $scope.signeeded = "No";
        $scope.messageText = "Add an optional message...";

        // Only allow docOrder to be set -- versionOrder is fixed
        $scope.setOrder = function(field) {
            $scope.docOrder = ($scope.docOrder == field) ? '-' + field : field;
        };

        $scope.searchFilter = function(obj) {
            var re = new RegExp($scope.query, 'i');
            /** @name obj#docname
             * @type { string} */
            return !$scope.query || re.test(obj.docname);
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
            $scope.documentUploadModal = false;
        };

        $scope.narrowopts = {
            backdropFade: true,
            dialogFade: true,
            dialogClass: 'narrowModal modal'
        };

        // File manipulation

        var mimetypes = ["application/pdf"];

        $scope.setFiles = function(element) {
            $scope.files = [];
            $scope.fileError = "";
            for (var i = 0; i < element.files.length; i++) {
                for (var j = 0; j < mimetypes.length; j++) {
                    if (element.files[i].size > 20000000) {
                        $scope.fileError = "Please choose a smaller file";
                    } else if (element.files[i].type != mimetypes[j]) {
                        $scope.fileError = "Please choose a pdf"
                    } else {
                        $scope.files.push(element.files[i]);
                    }
                    $scope.$apply();
                }
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
                $scope.$apply();
            });
            $scope.$on(
                "upload:error", function(evt, arg) {
                $rootScope.errorMessage = arg;
                $scope.showProgress = false;
                $scope.documentUploadClose();
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
                $scope.showProgress = false;
                $scope.showProcessing = false;
                $scope.documentUploadModal = false;
                $rootScope.errorMessage = '';
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

        $scope.opendetails = function(selected) {
            $scope.documents.forEach(function(doc) {
                if (selected.doc_id == doc.doc_id) {
                    doc.shown = doc.shown !== true;
                } else {
                    doc.shown = false;
                }
            });
        };

        $scope.momentFromNow = function(date, zerodate) {
            return moment(date).from(zerodate);
        };

        $scope.versionStatus = function(version) {
            if (version.last_event) {
                return (version.last_event.activity==='received' ? 'sent to ' : (version.last_event.activity + " by ")) +
                       (version.last_event.name || version.investor) +
                       " " + moment(version.last_event.event_time).from(version.last_event.timenow) +
                       (version.last_event.activity==='signed' ? " (awaiting countersign)" : "");
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

            /*
            if (doc.versions.length > 0) {
                var set = doc.versions.filter(function (el) {return el.last_event && el.last_event.event_time;});
                if (set.length === 0) {return $scope.defaultDocStatus(doc);}
                set.sort(function (a, b) {return b.last_event.event_time - a.last_event.event_time;});
                return $scope.versionStatus(set[0]);
            } else {
                return $scope.defaultDocStatus(doc);
            }
            */
        };

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
            if (version) {
                if (version.last_event && version.last_event.activity) {
                    if (version.last_event.activity==='signed') {
                        return 'signed, awaiting countersign';
                    } else if (version.last_event.activity==='received') {
                        return 'sent';
                    } else {
                        return version.last_event.activity;
                    }
                }
            }
        };

        $scope.docStatusNumComplete = function(doc) {
            if (doc.signature_required) {
                return $scope.versionsSigned(doc).length;
            } else {
                return $scope.versionsViewed(doc).length;
            }
        };

        $scope.docStatusNumVersions = function(doc) {
            if (doc.signature_required) {
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
                    /*
                     // If one ratio >= 1 and the other is < 1; display the ratio that's less than 1.
                     var signatureRatio = $scope.docSignatureRatio(doc);
                     var viewRatio = $scope.docViewRatio(doc);
                     if (signatureRatio <= 1 && $scope.versionsReqSig(doc).length > 0) {
                     return $scope.versionsSigned(doc).length + " / " + $scope.versionsReqSig(doc).length + " signatures";
                     } else if (viewRatio <= 1 && $scope.versionsReqView(doc).length > 0) {
                     return $scope.versionsViewed(doc).length + " / " + $scope.versionsReqView(doc).length + " views";
                     } else {
                     return $scope.docStatusNumComplete(doc) + " / " + $scope.docStatusNumVersions(doc) +
                     (doc.signature_required ? " signatures" : " views");
                     }
                     */
                    return ($scope.versionsSigned(doc).length + $scope.versionsViewed(doc).length) +
                        " / " +
                        doc.versions.length +
                        " documents";
                }
            }
        };

        $scope.docSignatureRatio = function(doc) {
            if (doc) {
                var initRatio = ($scope.versionsSigned(doc).length / $scope.versionsReqSig(doc).length) || 0;
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
                if (doc.versions.length > 0 && initRatio == 0) {
                    initRatio = (1 / doc.versions.length)
                }
                if (initRatio == 2) {
                    initRatio += (doc.versions.length)
                }
                if (initRatio === Infinity) {initRatio = 0;}
                return initRatio;
            }
        };

        $scope.versionsSigned = function(doc) {
            return doc.versions.filter(function(el) {return el.when_confirmed;});
        };

        $scope.versionsReqSig = function(doc) {
            return doc.versions.filter(function(el) {return el.signature_deadline;});
        };

        $scope.versionsViewed = function(doc) {
            return doc.versions.filter(function(el) {return el.last_viewed && !el.signature_deadline;});
        };

        $scope.versionsReqView = function(doc) {
            return doc.versions.filter($scope.isPendingView);
        };

        $scope.isPendingView = function(version) {
            return !version.signature_deadline && !version.last_viewed;
        };

        $scope.isPendingSignature = function(version) {
            return version.signature_deadline && !version.when_signed;
        };

        $scope.isPendingCountersignature = function(version) {
            return version.when_signed && !version.when_confirmed;
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

        $scope.versionIsComplete = function(version) {
            return (version.signature_deadline && version.when_confirmed) || (!version.signature_deadline && version.last_viewed);
        };

        $scope.defaultDocStatus = function (doc) {
            return "Uploaded " + moment(doc.last_updated).from($rootScope.servertime);
        };

        $scope.viewOriginal = function(doc) {
            $location.url("/company-view?doc=" + doc.doc_id + "&page=1");
        };

        $scope.viewStatus = function(doc) {
            $location.url("/company-status?doc=" + doc.doc_id);
        };

        $scope.viewInvestorCopy = function(doc, version) {
            $location.url("/company-view?doc=" + doc.doc_id + "&page=1" + "&investor=" + version.investor);
        };

        // Sharing modal functions

        $scope.shareDocOpen = function(doc) {
            $scope.docToShare = doc;
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

        $scope.share = function(message, email, sign) {
            sign = sign == "Yes";
            if (sign) {
                var date = Date.parse('22 November 2113');
            } else {
                date = null;
            }
            if (message === "Add an optional message...") {
                message = "";
            }
            SWBrijj.procm("document.share_document", $scope.docToShare.doc_id, email.toLowerCase(), message, Boolean(sign), date).then(function(data) {
                void(data);
                $scope.$emit("notification:success", "Document shared with " + email);
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
        };

        $scope.updateTitleClose = function() {
            $scope.updateTitleModal = false;
            $scope.$emit('updated:name', $scope.docForModal);
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

        $scope.deleteDocClose = function(docToDelete) {
            // TODO implement
            $scope.deleteDocModal = false;
        };

        // Multisharing modal functions

        $scope.multipeople = [];
        $scope.select2Options = {
            'multiple': true,
            'simple_tags': true,
            'tags': $scope.vInvestors,
            'placeholder': 'Select investors or type new ones in'
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
            if ($rootScope.navState.userid.indexOf("@sharewave.com") !== -1) {
                console.log("here");
                SWBrijj.procm("document.josh_multishare", tosee.substring(1), forview.substring(1), forsign.substring(1), Date.parse('22 November 2113')).then(function(data) {
                    console.log(data);
                    $scope.$emit("notification:success", "Documents shared");
                    $route.reload();
                }).except(function(x) {
                        void(x);
                        $scope.$emit("notification:fail", "Oops, something went wrong.");
                    });
            }
            else {
                SWBrijj.procm("document.multishare", tosee.substring(1), forview.substring(1), forsign.substring(1), Date.parse('22 November 2113')).then(function(data) {
                    console.log(data);
                    $scope.$emit("notification:success", "Documents shared");
                    $route.reload();
                }).except(function(x) {
                        void(x);
                        $scope.$emit("notification:fail", "Oops, something went wrong.");
                    });
            }
        }
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
        });

        $scope.docKey = parseInt($routeParams.doc, 10);
        $scope.urlInves = $routeParams.investor;
        $scope.invq = false;
        $scope.counterparty = !! $scope.urlInves;
        $scope.tester = false;
        $scope.signeeded = "No";
        $scope.messageText = "Add an optional message...";

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

        /*
        $scope.retract = function(cd) {
            SWBrijj.procm('document.retract_share', cd.doc_id).then(function(data) {
                void(data);
                $scope.getOriginal();
                $route.reload();
            })
        };

        $scope.renege = function(cd) {
            SWBrijj.procm("document.renege", cd.doc_id).then(function(data) {
                void(data);
                cd.when_confirmed = null;
                $route.reload();
            });
        };
        */

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
            console.log(version);
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


        $scope.rejectSignature = function(msg) {
            if (msg === "Add an optional message...") {
                msg = "";
            }
            SWBrijj.procm("document.reject_signature", $scope.docId, msg).then(function(data) {
                $scope.$emit("notification:success", "Document signature rejected.");
                void(data);
                $scope.$broadcast('rejcetSignature');
                // TODO FIX THIS WHEN_SIGNED IS NOT BEING BLANKED OUT
                //cd.when_signed = null;
                $location.path('/company-list').search({});
                //$route.reload();
            }).except(function(x) {
                void(x);
                $scope.$emit("notification:fail", "Oops, something went wrong.");
            });
        };

        $scope.$on('open_modal', function(event, modal) {
            switch (modal) {
                case 'reject':
                    $scope.rejectDocOpen();
                    break;
                case 'share':
                    $scope.shareDocOpen();
                    break;
                case 'confirm':
                    $scope.confirmDocOpen();
                    break;
            }
        });

        $scope.broadcastModalClose = function() {
            $scope.$broadcast('close_modal');
        };

        $scope.confirmDocOpen = function() {
            $scope.confirmModal = true;
        };

        $scope.confirmModalClose = function() {
            $('.docViewerHeader').data('affix').checkPosition();
            setCursor('default');
            $scope.processing = false;
            $scope.broadcastModalClose();
            $scope.confirmModal = false;
        };

        $scope.countersignDocument = function() {
            if (!$scope.confirmSignature) return; // didn't sign it
            $scope.processing = true;
            setCursor('wait');
            // before signing the document, I may need to save the existing annotations
            // In fact, I should send the existing annotations along with the signature request for a two-fer.

            var dce = angular.element(".docPanel").scope();
            SWBrijj.procm("document.countersign", $scope.docId, dce.getNoteData()).then(function(data) {
                //doc.when_signed = data;
                dce.removeAllNotes();
                $scope.confirmModalClose();
                // can't reload directly because of the modal -- need to pause for the modal to come down.
                $scope.$emit('refreshDocImage');
                $location.path('/company-list').search({});

            }).except(function(x) {
                void(x);
                $scope.confirmModalClose();
            });
        };

        $scope.remind = function(doc_id, user_email) {
            /*
            SWBrijj.procm("document.remind", version.doc_id, version.investor).then(function(data) {
                $scope.emit('event:remind');
            });
            */
        };

        // Rejecting modal functions

        $scope.rejectDocOpen = function() {
            $scope.rejectDocModal = true;
        };

        $scope.rejectDocClose = function() {
            $scope.broadcastModalClose();
            $scope.rejectDocModal = false;
        };

        // Sharing modal functions

        $scope.shareDocOpen = function() {
            $scope.shareDocModal = true;
        };

        $scope.shareDocClose = function() {
            $scope.broadcastModalClose();
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

        $scope.share = function(message, email, sign) {
            sign = sign == "Yes";
            if (sign) {
                var date = Date.parse('22 November 2113');
            } else {
                date = null;
            }
            if (message === "Add an optional message...") {
                message = "";
            }
            SWBrijj.procm("document.share_document", $scope.docId, email.toLowerCase(), message, Boolean(sign), date).then(function(data) {
                void(data);
                $scope.$emit("notification:success", "Document shared with " + email);
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

/*******************************************************************************************************************/

docviews.controller('CompanyDocumentStatusController', ['$scope', '$routeParams', '$rootScope', '$filter', '$location', 'SWBrijj', 'navState',
    function($scope, $routeParams, $rootScope, $filter, $location, SWBrijj, navState) {
        if (navState.role == 'investor') {
            $location.path('/investor-list');
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
            $scope.makeEventGroups();
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
        $scope.makeEventGroups = function() {
            $scope.eventGroups = [];
            var uniqueGroups = [];
            angular.forEach($scope.activity, function(event) {
                if (event.activity != "sent") {
                    var timeGroup = moment(event.event_time).from(event.timenow);
                    if (uniqueGroups.indexOf(timeGroup) != -1) {
                        $scope.eventGroups[uniqueGroups.indexOf(timeGroup)].push(event);
                    } else {
                        $scope.eventGroups[$scope.eventGroups.length] = [];
                        $scope.eventGroups[$scope.eventGroups.length-1].push(timeGroup);
                        $scope.eventGroups[$scope.eventGroups.length-1].push(event.event_time);
                        $scope.eventGroups[$scope.eventGroups.length-1].push(event);
                        uniqueGroups.push(timeGroup);
                    }
                }
            });
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

        $scope.share = function(message, email, sign) {
            SWBrijj.procm("document.share_document", docId, email.toLowerCase(), message, Boolean(sign)).then(function(data) {
            });
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
            dialogClass: 'modal shareModal'
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
            alert("failed")
        }

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
            angular.forEach($scope.documents, function(doc) {
                SWBrijj.tblmm("document.investor_activity", "doc_id", doc.doc_id).then(function(data) {
                    doc.last_event = data.sort($scope.compareEvents)[0];
                    var docActivities = data.filter(function(el) {return el.person === doc.investor && el.activity==="viewed";});
                    doc.last_viewed = docActivities.length > 0 ? docActivities[0].event_time : null;
                    $scope.setDocStatusRank(doc);
                });
            });
        };

        $scope.compareEvents = function(a, b) {
            var initRank = $scope.eventRank(b) - $scope.eventRank(a);
            return initRank === 0 ? (b.event_time - a.event_time) : initRank;
        };

        $scope.eventRank = function (ev) {
            switch (ev.activity) {
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

        $scope.setDocStatusRank = function(doc) {
            doc.statusRank = $scope.eventRank(doc.last_event);
        };

        $scope.momentFromNow = function(date) {
            return moment(date).from($rootScope.servertime);
        };

        $scope.docOrder = 'docname';
        $scope.shareOrder = 'docname';

        $scope.setOrder = function(field) {
            $scope.docOrder = $scope.docOrder == field ? '-' + field : field;
        };

        $scope.searchFilter = function(obj) {
            var re = new RegExp($scope.query, 'i');
            return !$scope.query || re.test(obj.docname);
        };

        $scope.time = function(doc) {
            return doc.when_signed || doc.signature_deadline;
        };

        $scope.gotoDoc = function(docid) {
            var link;
            link = "/documents/investor-view?doc=" + docid;
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

        $scope.isPendingCountersignature = function(doc) {
            return doc.when_signed && !doc.when_confirmed;
        };

        $scope.isPendingSignature = function(doc) {
            return doc.signature_deadline && !doc.when_signed;
        };

        $scope.isPendingView = function(doc) {
            return !doc.signature_deadline && !doc.last_viewed;
        };

        $scope.docIsComplete = function(doc) {
            return (doc.signature_deadline && doc.when_confirmed) ||
                   (!doc.signature_deadline && doc.last_viewed);
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
        });

        // $scope.$on('$locationChangeSuccess', function(event) {delete $rootScope.errorMessage; });

        $scope.docId = parseInt($routeParams.doc, 10);
        $scope.thisPage = $routeParams.page ? parseInt($routeParams.page, 10) : 1;
        $scope.library = "document.my_investor_library";
        $scope.pages = "document.my_investor_codex";
        $scope.tester = false;
        $scope.invq = true;
        //$scope.confirmModalClose();
        $scope.pageQueryString = function() {
            return "id=" + $scope.docId + "&investor=" + $scope.invq;
        };

        $scope.initDocView = function() {
            $scope.$broadcast('initDocView', $scope.docId, $scope.invq, $scope.library, $scope.pageQueryString(), $scope.pages);
        };

        $scope.getData = function () {
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
        };

        $scope.getData();

        //$scope.$on('initview', function(event) {$scope.getData();});

        $scope.$on('open_modal', function(event, modal) {
            switch (modal) {
                case 'confirm':
                    $scope.confirmDocOpen();
                    break;
            }
        });

        $scope.broadcastModalClose = function() {
            $scope.$broadcast('close_modal');
        };

        $scope.confirmDocOpen = function() {
            $scope.confirmModal = true;
        };

        $scope.confirmModalClose = function() {
            setCursor('default');
            $('.docViewerHeader').data('affix').checkPosition();
            $scope.processing = false;
            $scope.broadcastModalClose();
            $scope.confirmModal = false;
        };

        $scope.signable = function() {
            return $scope.document && $scope.document.signature_deadline && !$scope.document.when_signed;
        };

        $scope.signDocument = function(doc) {
            if (!$scope.confirmSignature) return; // didn't sign it
            $scope.processing = true;
            setCursor('wait');
            // before signing the document, I may need to save the existing annotations
            // In fact, I should send the existing annotations along with the signature request for a two-fer.

            var dce = angular.element(".docPanel").scope();
            SWBrijj.procm("document.sign_document", $scope.docId, dce.getNoteData()).then(function(data) {
                doc.when_signed = data;
                dce.removeAllNotes();
                $scope.confirmModalClose();
                // can't reload directly because of the modal -- need to pause for the modal to come down.
                $scope.$emit('refreshDocImage');
                $location.path('/investor-list').search({});

            }).except(function(x) {
                void(x);
                $scope.confirmModalClose();
            });
        };

        $scope.unSign = function(cd) {
            SWBrijj.procm('document.unsign', cd.doc_id).then(function(data) {
                void(data);
                cd.when_signed = null;
                $route.reload();
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

/* Filter to select the activity icon for document status */
docviews.filter('icon', function() {
    return function(activity) {
        if (activity == "received") return "icon-email";
        else if (activity == "viewed") return "icon-view";
        else if (activity == "reminder") return "icon-redo";
        else if (activity == "edited") return "icon-pencil";
        else if (activity == "signed") return "icon-pen";
        else if (activity == "uploaded") return "icon-star";
        else if (activity == "rejected") return "icon-circle-delete";
        else if (activity == "countersigned") return "icon-countersign";
        else return "hunh?";
    };
});

/* Filter to format the activity description on document status */
// TODO: reconcile this with Alison
docviews.filter('description', function() {
    return function(ac) {
        var activity = ac.activity;
        var person = ac.name;
        if (person === "") {
            person = ac.person;
        }
        if (activity == "sent") return "";
        else if (activity == "viewed") return "viewed Document";
        else if (activity == "reminder") return "reminded Document";
        else if (activity == "edited") return "edited Document";
        else if (activity == "signed") return "signed Document";
        else if (activity == "uploaded") return "uploaded Document";
        else if (activity == "received") return "received Document";
        else if (activity == "rejected") return "rejected Document";
        else if (activity == "countersigned") return "countersigned Document";
        else return activity + "ed Document";
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
