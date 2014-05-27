'use strict';

function DocumentSummaryRowController($scope, SWBrijj, basics) {
    // load the versions
    // TODO: load on hover, since most of this data is hidden?
    $scope.doc.versions = [];
    SWBrijj.tblmm("document.my_counterparty_library", "original", $scope.doc.doc_id).then(function(data) {
        angular.forEach(data, function(version) {
            $scope.doc.versions.push(version);
        });
        loadDocumentActivity();
    });

    function loadDocumentActivity() {
        SWBrijj.tblmm("document.recent_company_activity", "original", $scope.doc.doc_id).then(function(data) {
            angular.forEach($scope.doc.versions, function(version) {
                var version_activity = data.filter(
                    function(el) {
                        return el.doc_id === version.doc_id;
                    });
                version.last_event = version_activity.sort(compareEvents)[0];
                if (version.last_event.activity == 'finalized') {
                    version.last_event.activity = 'approved';
                }
                var version_activities = version_activity.filter(
                    function(el) {
                        return el.person === version.investor && el.activity === "viewed";
                    });
                version.last_viewed = version_activities.length > 0 ? version_activities[0].event_time : null;
                version.statusRank = eventRank(version.last_event);
            });
            // move this to loadDocuments once status data is available
            $scope.doc.statusRatio = $scope.docStatusRatio($scope.doc);
        });
    }

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

    $scope.opendetails = function() {
        $scope.doc.shown = $scope.doc.shown !== true;
    };

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

    function compareEvents(a, b) {
        var initRank = eventRank(b) - eventRank(a);
        return initRank === 0 ? (Date.parse(b.event_time) - Date.parse(a.event_time)) : initRank;
    };

    function eventRank(ev) {
        return basics.eventRank(ev);
    };
}
DocumentSummaryRowController.$inject = ['$scope', 'SWBrijj', 'basics']
