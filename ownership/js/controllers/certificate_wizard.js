'use strict';

app.controller('createCertificate',
    ["$scope", "Documents", "captable", "$routeParams", "$location", function($scope, Documents, captable, $routeParams, $location){
        $scope.issue = [];
        /// issue picker
        // Get the company's Issues
        $scope.issues = captable.getCapTable().securities;
        $scope.selected = { // need an object to bind through ng-if
            issue: ""
        };

        $scope.issueSelectOptions = {
            data: [],
            placeholder: "Pick an equity",
        };

        $scope.transaction = $routeParams.transaction;

        $scope.$watchCollection('issues', function(issues) {
            // set up the select box
            if (issues) {
                $scope.issueSelectOptions.data.splice(0);
                issues.forEach(function(issue) {
                    if (["Equity", "Equity Common"].indexOf(issue.attrs.security_type) !== -1) {
                        $scope.issueSelectOptions.data.push({
                            id: issue.name,
                            text: issue.name,
                            issue: issue
                        });
                        if ($routeParams.issue && $routeParams.issue == issue.name) {
                            $scope.selected.issue = {
                                id: issue.name,
                                text: issue.name,
                                issue: issue
                            };
                        }
                    }
                });
                if ($scope.issueSelectOptions.data.length == 1)
                {
                    $scope.selected.issue = $scope.issueSelectOptions.data[0];
                }
            }
            $scope.docs = [];
            $scope.ready = function() {
                if ($scope.issue[0]) {
                    $scope.issue[0].getDocsPromise().then(function(docs) {
                        $scope.docs = docs
                        if (docs['issue certificate']) {
                            Documents.returnOriginalwithPromise(docs['issue certificate'].doc_id).then(function() {
                                if (Documents.getOriginal(docs['issue certificate'].doc_id).validTransaction()) {
                                    return true
                                } else {
                                    return false
                                }
                            });
                        } else {
                            return false
                        }
                    });
                }
            }
        });

        $scope.$watch('selected.issue', function(new_issue, old_issue) {
            if (new_issue && typeof(new_issue) !== "string" && (!$scope.issue || new_issue.text !== $scope.issue.name)) {
                $scope.issue[0] = new_issue.issue;
                $location.search('issue', new_issue.issue.name).replace();
                if ($scope.transaction) {
                    $scope.issue[0].getDocsPromise().then(function(docs) {
                        if (docs['issue certificate']) {
                            $scope.nextURL = '/app/documents/company_view?doc= ' + docs['issue certificate'].doc_id + '&transaction=' + $scope.transaction;
                        } else {
                            $scope.nextURL = '/app/ownership/company-captable'
                        }
                    });
                }
            }
        });
        /// end issue picker logic
}]);
