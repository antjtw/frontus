'use strict';

app.directive('grantDocPrep', [function() {
    return {
        restrict: "E",
        scope: {
        },
        templateUrl: '/ownership/partials/grantDocPrep.html',
        controller: ["$scope", "grants", function($scope, grants) {
            // we can assume that grants contains an issue with grant docs that've been suitable marked up by now
            $scope.issue = grants.issue;
            // resync the docShare object
            var issue_docs = [];
            Object.keys(grants.issue[0].docs).forEach(function(key) {
                issue_docs.push(grants.issue[0].docs[key].doc_id);
            });
            // remove any existing doc to be shared that's no longer associated with the issue
            grants.docsshare.documents.forEach(function(ds_doc) {
                if (issue_docs.indexOf(ds_doc.doc_id) == -1) {
                    grants.docsshare.removeShareItem(ds_doc);
                }
            });
            // add docs from the issue (or update, if they're already there)
            Object.keys(grants.issue[0].docs).forEach(function(key) {
                grants.docsshare.upsertShareItem(grants.issue[0].docs[key]);
            });

            $scope.docs = grants.docsshare.documents;
            $scope.emails = grants.docsshare.emails;
        }]
    };
}]);
