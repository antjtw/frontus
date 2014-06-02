'use strict';

function DocumentSummaryRowController($scope, $rootScope, SWBrijj, basics, $location) {
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
        };
    }

    // dropdown list functions
    $scope.viewProfile = function(investor) {
        document.location.href = "/app/company/profile/view?id=" + investor.email;
    };

    $scope.viewStatus = function(doc) {
        if (doc.doc_id) {
            $location.url("/app/documents/company-status?doc=" + doc.doc_id);
        }
    };

    $scope.prepareDocument = function(doc) {
        if (doc.template_id) {
            $location.url("/app/documents/company-view?template=" + doc.template_id + "&share=true");
        } else {
            $location.url("/app/documents/company-view?doc=" + doc.doc_id + "&page=1&prepare=true&share=true");
        }
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
    $scope.exportOriginalToDropbox = function(doc) {
        SWBrijj.document_dropbox_export(doc.doc_id, doc.docname, 'company').then(function(x) {
            $scope.$emit("notification:success", "Successfully Exported to Dropbox");
        }).except(function(x) {
            $scope.response = x;
        });
    };
}
DocumentSummaryRowController.$inject = ['$scope', '$rootScope', 'SWBrijj', 'basics', '$location'];
