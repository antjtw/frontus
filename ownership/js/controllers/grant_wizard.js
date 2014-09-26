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
    ["$scope", function($scope){

}]);

app.controller('reviewGrantIssue',
    ["$scope", "grants", "$rootScope", "$location", function($scope, grants, $rootScope, $location){
        $scope.send = function() {
            grants.docsshare.shareDocuments().then(function(res) {
                $rootScope.$emit("notification:success", "Options granted!");
                $location.path('/app/home/company'); // TODO: redirect to the grants page, once that page shows in-flight documents (not in the transaction table yet)
            }).catch(function(err) {
                if (err === "Not all documents prepared for all people") {
                    $rootScope.$emit("notification:fail", "Sorry, we couldn't understand some of the document data. Please re-prepare them and recheck the data.");
                } else {
                    $rootScope.$emit("notification:fail", "Oops, something went wrong.");
                }
            });
        };
}]);
