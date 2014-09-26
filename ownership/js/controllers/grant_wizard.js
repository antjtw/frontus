'use strict';

app.controller('chooseGrantIssue',
    ["$scope", "grants", function($scope, grants){
        $scope.issue = grants.issue;
}]);

app.controller('docsGrantIssue',
    ["$scope", "captable", "grants", function($scope, captable, grants) {

        $scope.state = {evidenceQuery: "",
                        originalOnly: true};
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
            }
        });

        $scope.handleDrop = function(item, bin) {
            $scope.issue[0].addSpecificEvidence(parseInt(item), String(bin), String(bin));
        };
}]);

app.controller('peopleGrantIssue',
    ["$scope", function($scope){

}]);

app.controller('reviewGrantIssue',
    ["$scope", function($scope){

}]);
