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

        $scope.handleDrop = function(item, bin) {
            $scope.issue[0].addSpecificEvidence(parseInt(item), String(bin), String(bin));
        };
}]);

app.controller('peopleGrantIssue',
    ["$scope", "grants", function($scope, grants){
        //grants.updateUnitsFromDocs();

}]);

app.controller('reviewGrantIssue',
    ["$scope", function($scope){

}]);
