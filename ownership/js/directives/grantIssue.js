'use strict';

app.directive('grantIssue', [function() {
    return {
        restrict: "E",
        scope: {
            choose: "@"
        },
        templateUrl: '/ownership/partials/grantIssue.html',
        controller: ["$scope", "captable", function($scope, captable) {
            // Get the company's Issues
            $scope.issues = captable.getCapTable().securities;
            $scope.selected = { // need an object to bind through ng-if
                issue: ""
            };

            $scope.issueSelectOptions = {
                data: [],
                placeholder: "Pick a security",
            };

            $scope.$watchCollection('issues', function(issues) {
                // set up the select box
                if (issues) {
                    $scope.issueSelectOptions.data.splice(0);
                    issues.forEach(function(issue) {
                        if (issue.attrs.security_type) {
                            $scope.issueSelectOptions.data.push({
                                id: issue.name,
                                text: issue.name,
                                issue: issue
                            });
                        }
                    });
                }
            });

            $scope.$watch('selected.issue', function(new_issue) {
                $scope.issue = new_issue.issue;
            });
        }]
    };
}]);
