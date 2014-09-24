'use strict';

app.controller('chooseGrantIssue',
    ["$scope", function($scope){

}]);

app.controller('docsGrantIssue',
    ["$scope", function($scope){

        $scope.state = {evidenceQuery: ""};
        $scope.windowToggle = false;
        $scope.sideToggle = true;
}]);

app.controller('peopleGrantIssue',
    ["$scope", function($scope){

}]);
