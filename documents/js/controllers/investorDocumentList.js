//'use strict';


app.controller('InvestorDocumentListController', ['$scope', 'SWBrijj', '$location', '$rootScope', 'navState', 'basics',
    function($scope, SWBrijj, $location, $rootScope, navState, basics) {
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
            return basics.eventRank(ev);
        };

        $scope.setDocStatusRank = function(doc) {
            doc.statusRank = $scope.eventRank(doc.last_event);
        };

        $scope.momentFromNow = function(date) {
            return moment(date).from($rootScope.servertime);
        };

        // by default sort in reverse chronological order
        // even though there's no way to restore this sort order via the ui
        $scope.docOrder = '-when_shared';
        $scope.shareOrder = 'docname';
        $scope.hideCompleted = false;

        $scope.setOrder = function(field) {
            $scope.docOrder = $scope.docOrder == field ? '-' + field : field;
        };
        $scope.toggleHideCompleted = function() {
            $scope.hideCompleted = !$scope.hideCompleted;
        };

        $scope.searchFilter = function(obj) {
            var res = [];
            if ($scope.query) {
                var items = $scope.query.split(" ");
                angular.forEach(items, function(item) {
                    res.push(new RegExp(item, 'i'))
                });
            }
            var truthiness = res.length;
            var result = 0;
            angular.forEach(res, function(re) {
                if (re.test(obj.docname)) {
                    result += 1;
                }
            });
            return !($scope.hideCompleted && $scope.docIsComplete(obj)) && (!$scope.query || truthiness == result);
        };

        $scope.time = function(doc) {
            return doc.when_signed || doc.signature_deadline;
        };

        $scope.gotoDoc = function(doc) {
            var link;
            if (doc.template_id && !doc.when_signed) link = "/app/documents/investor-view?template=" + doc.template_id + "&subid=" + doc.doc_id;
            else link = "/app/documents/investor-view?doc=" + doc.doc_id;
            $location.url(link);
        };

        $scope.exportOriginalToPdf = function(doc) {
            SWBrijj.procd('sharewave-' + doc.original + '.pdf', 'application/pdf', 'document.genInvestorOriginalPdf', doc.original.toString()).then(function(url) {
                document.location.href = url;
            });
        };
        $scope.exportVersionToPdf = function(doc) {
            $scope.$emit("notification:success", "Export in progress.");
            SWBrijj.genInvestorPdf('sharewave-'+doc.doc_id+'-'+doc.investor+'.pdf', 'application/pdf', doc.doc_id, false, !$scope.versionIsFinalized(doc)).then(function(url) {
                document.location.href = url;
            }).except(function(x) {
                console.log(x);
                $scope.$emit("notification:fail", "Oops, something went wrong.");
            });
        };
        
        $scope.versionIsFinalized = function(version) {
            return $scope.isCompleteSigned(version)
                || basics.isCompleteVoided(version);
        };

        $scope.remind = function(doc_id, user_email) {
            /*
            SWBrijj.procm("document.remind", version.doc_id, version.investor).then(function(data) {
                $scope.emit('event:remind');
            });
            */
        };

        $scope.docStatusa = function(doc) {
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
            if ($scope.isvoided(version)) {
                return "Voided"
            }
            else if ($scope.isPendingVoid(version)) {
                return "Void requested by company"
            } else if ($scope.wasJustRejected(version) && $scope.lastEventByInvestor(version)) {
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
            return basics.isCompleteSigned(version);
        };
        $scope.isCompleteViewed = function(version) {
            return basics.isCompleteViewed(version);
        };

        $scope.docIsComplete = function(doc) {
            return  $scope.isCompleteSigned(doc) || $scope.isCompleteViewed(doc);
        };

        $scope.isPendingVoid = function(version) {
            return version.signature_flow > 0 && !version.when_void_accepted && version.when_void_requested;
        };

        $scope.isvoided = function(version) {
            return version.signature_flow > 0 && version.when_void_accepted && version.when_void_requested;
        };


        $scope.showtooltip = function(doc){
            if(doc.length > 40 && doc.indexOf(' ') >= 0){
                return doc;
            }
        }

    }
]);
