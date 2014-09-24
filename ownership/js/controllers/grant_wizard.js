'use strict';

app.controller('chooseGrantIssue',
    ["$scope", function($scope){

}]);

app.controller('docsGrantIssue',
    ["$scope", "captable", "grants", function($scope, captable, grants) {

        $scope.state = {evidenceQuery: ""};
        $scope.issue = grants.issue;
        $scope.selected = { // need an object to bind through ng-if
            issue: ""
        };

        $scope.$watchCollection('issue', function(new_issue) {
            if (new_issue && new_issue[0]) {
                $scope.selected.issue = {
                    id: new_issue[0].name,
                    text: new_issue[0].name,
                    issue: new_issue[0]
                };
                console.log($scope.selected.issue);
            }
        });

        $scope.handleDrop = function(item, bin) {
            captable.addSpecificEvidence(parseInt($scope.selected.issue.issue.transactions[0].transaction), parseInt(item), String(bin), String(bin));
        }
}]);

app.controller('peopleGrantIssue',
    ["$scope", function($scope){

}]);
