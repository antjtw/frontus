'use strict';

function DocumentSummaryRowController($scope, $rootScope, SWBrijj, basics) {
    // TODO: need the ordering correct from the server for paging, but statusRank is computed locally ...
    $scope.versionOrder = 'statusRank';

    // load the versions
    $scope.versions = [];
    var loadingVersions = false
    $scope.loadVersions = function() {
        if (loadingVersions || $scope.doc.version_count == 0) {
            return
        }
        loadingVersions = true;
        var queryParam = "";
        var queryVal = null;
        if ($scope.doc.type == 'doc') {
            queryParam = "original";
            queryVal = $scope.doc.doc_id;
        } else if ($scope.doc.type == "investor") {
            queryParam = "investor";
            queryVal = $scope.doc.email;
        }
        SWBrijj.tblmm("document.my_counterpart_document_library_view", queryParam, queryVal).then(function(data) {
            angular.forEach(data, function(version) {
                if (version.last_event_activity == 'finalized') {
                    version.last_event_activity = 'approved';
                }
                version.statusRank = basics.eventRank({activity: version.last_event_activity});
                $scope.versions.push(version);
            });
        });
    };
    if ($scope.doc.shown) {
        $scope.loadVersions();
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
        $scope.loadVersions();
    };

    $scope.docIsComplete = function(doc) {
        return (doc.version_count > 0 && doc.version_count == doc.complete_count);
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

    $scope.versionIsComplete = function(version) {
        return basics.isCompleteSigned(version)
            || basics.isCompleteViewed(version)
            || version.when_retracted;
    };

    $scope.docStatus = function(doc) {
        return "Last Updated " + moment(((doc.last_event_time) ?
                                         doc.last_event_time :
                                         doc.last_updated)).from($rootScope.servertime);
    };

    $scope.viewProfile = function(investor) {
        document.location.href = "/app/company/profile/view?id=" + investor.email;
    };

}
DocumentSummaryRowController.$inject = ['$scope', '$rootScope', 'SWBrijj', 'basics'];
