'use strict';

app.controller('chooseGrantIssue',
    ["$scope", function($scope){

}]);

app.controller('docsGrantIssue',
    ["$scope", "captable", "grants", function($scope, captable, grants) {

        $scope.state = {evidenceQuery: ""};
        $scope.issue = grants.issue;
        console.log($scope.issue);

        $scope.handleDrop = function(item, bin) {

        }
}]);

app.controller('peopleGrantIssue',
    ["$scope", function($scope){

}]);
