'use strict';

function DocumentSummaryRowController($scope, SWBrijj, basics) {
    $scope.versionOrder = 'statusRank';
    // TODO: pull from parentContext
    $scope.viewState.show_archived;
    $scope.viewState.maxRatio;

    // load the versions
    // TODO: load on hover, since most of this data is hidden?
    $scope.doc.versions = [];
    var loadingVersions = false
    function loadVersions() {
        if (loadingVersions) {
            return
        }
        loadingVersions = true;
        SWBrijj.tblmm("document.my_counterparty_library", "original", $scope.doc.doc_id).then(function(data) {
            angular.forEach(data, function(version) {
                $scope.doc.versions.push(version);
            });
            loadDocumentActivity();
        });
    }

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
        });
    }

    $scope.versionsVisible = function(doc) {
        var total = doc.version_count;
        if ($scope.viewState.maxRatio != 1000) {
            total -= doc.complete_count;
        } else if (!$scope.viewState.show_archived) {
            total -= doc.archive_count;
        }
        return total > 0;
    };

    $scope.opendetails = function() {
        $scope.doc.shown = $scope.doc.shown !== true;
        loadVersions();
    };

    $scope.docIsComplete = function(doc) {
        return (doc.version_count > 0 && doc.version_count == doc.complete_count);
    };

    function compareEvents(a, b) {
        var initRank = eventRank(b) - eventRank(a);
        return initRank === 0 ? (Date.parse(b.event_time) - Date.parse(a.event_time)) : initRank;
    };

    function eventRank(ev) {
        return basics.eventRank(ev);
    };

    $scope.formatDocStatusRatio = function(doc) {
        if (doc.version_count == 0) return "Uploaded";

        var show_archived = $scope.viewState.show_archived;

        var hide_completed = ($scope.viewState.maxRatio !== 1000);

        // fixme what if a completed document is archived?
        var num = (hide_completed ? 0 : doc.complete_count);// + (show_archived ? archived : 0);
        var total = doc.version_count;
        var display_total = doc.version_count - (hide_completed ? doc.complete_count : 0);

        if (total == doc.archive_count && !show_archived) {
            return "All documents archived";
        } else if (total == doc.complete_count && hide_completed) {
            return "All documents completed";
        } else if (total == (doc.archive_count + doc.complete_count) && (!show_archived && hide_completed)) {
            return "All documents are archived or completed";
        } else {
            return num + " / " + display_total + " completed";
        }
    };
}
DocumentSummaryRowController.$inject = ['$scope', 'SWBrijj', 'basics'];
