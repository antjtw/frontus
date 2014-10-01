'use strict';

app.controller('createCertificate',
    ["$scope", "Documents", "captable", function($scope, Documents, captable){
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
                    }
                });
                if ($scope.issueSelectOptions.data.length == 1)
                {
                    $scope.selected.issue = $scope.issueSelectOptions.data[0];
                }
            }
        });

        $scope.$watch('selected.issue', function(new_issue, old_issue) {
            if (new_issue && typeof(new_issue) !== "string" && (!$scope.issue || new_issue.text !== $scope.issue.name)) {
                $scope.issue[0] = new_issue.issue;
            }
        });
        /// end issue picker logic
}]);
