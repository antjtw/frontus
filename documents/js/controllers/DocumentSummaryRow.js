'use strict';

function DocumentSummaryRowController($scope, $rootScope, SWBrijj, basics, $location, ShareDocs) {
    $scope.versionOrder = 'statusRank';

    // load the versions
    $scope.versions = [];
    var loadingVersions = false;
    $scope.loadVersions = function() {
        if (loadingVersions || $scope.doc.version_count === 0) {
            return;
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
                version.doc = $scope.doc;
                // console.log($scope.doc)
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
        var uploadState = (doc.pages >= 1) ? "Uploaded": "Uploading . . .";
        if (doc.version_count === 0) return (doc.template_id === null ? uploadState : "Pre-loaded");

        var show_archived = $scope.viewState.show_archived;

        var hide_completed = ($scope.viewState.maxRatio !== 1000);

        var num = (hide_completed ? 0 : (!show_archived ? doc.complete_count - doc.archive_complete_count : doc.complete_count));
        var total = doc.version_count;
        var display_total = doc.version_count - (hide_completed ? doc.complete_count : 0) - (!show_archived ? doc.archive_count : 0) + ((hide_completed && !show_archived) ? doc.archive_complete_count : 0);

        if (total == doc.archive_count && !show_archived) {
            return "All documents archived";
        } else if (total == doc.complete_count && hide_completed) {
            return "All documents completed";
        } else if (total == (doc.archive_count + doc.complete_count - doc.archive_complete_count) && (!show_archived && hide_completed)) {
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

    $scope.forShare = function() {
        return ShareDocs.documents.some(function(d){
            return d.doc_id == $scope.doc.doc_id;
        });
    };
    $scope.toggleForShare = function() {
        // $scope.docShareState = [{doc_id: ###, signature_flow: #}, ..]
        if (!$scope.forShare()) {
            ShareDocs.upsertShareItem($scope.doc);
        } else {
            ShareDocs.removeShareItem($scope.doc);
        }
    };

    $scope.docStatus = function(doc) {
        if (doc.last_event_time || doc.last_updated) {
            return "Last Updated " + moment(((doc.last_event_time) ?
                                              doc.last_event_time :
                                              doc.last_updated)).from($rootScope.servertime);
        } else {
            return "";
        }
    };

    $scope.title = function(summary) {
        if (summary.type == "doc") {
            return summary.docname;
        } else if (summary.type == "investor") {
            return summary.name || summary.email;
        }
    };

    $scope.titleClick = function() {
        if (!(!$scope.doc.uploaded_by || $scope.doc.pages > 0)) {
            return;
        }
        if ($scope.doc.type != 'doc') {
            return;
        }
        if (!$scope.viewState.hideSharebar) {
            $scope.toggleForShare();
        } else {
            if ($scope.doc.doc_id) { // can only view templates
                $scope.viewOriginal($scope.doc);
            }
        }
    };

    $scope.showtooltip = function(doc){
        if(doc.length > 50 && doc.indexOf(' ') >= 0){
            return doc;
        }
    };

    // dropdown list functions
    $scope.viewProfile = function(investor) {
        document.location.href = "/app/company/profile/view?id=" + investor.email;
    };

    $scope.viewTemplate = function(doc) {
        $location.url("/app/documents/company-view?template=" + doc.template_id);
    };

    $scope.viewOriginal = function(doc) {
        $location.url("/app/documents/company-view?doc=" + doc.doc_id + "&page=1");
    };

    $scope.exportOriginalToPdf = function(doc) {
        SWBrijj.procd('sharewave-' + doc.doc_id + '.pdf', 'application/pdf', 'document.genOriginalPdf', doc.doc_id.toString()).then(function(url) {
            document.location.href = url;
        });
    };
}
DocumentSummaryRowController.$inject = ['$scope', '$rootScope', 'SWBrijj', 'basics', '$location', 'ShareDocs'];
