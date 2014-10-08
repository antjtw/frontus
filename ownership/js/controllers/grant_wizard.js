'use strict';

app.controller('chooseGrantIssue',
    ["$scope", "grants", "Documents", function($scope, grants, Documents){
        $scope.issue = grants.issue;

        $scope.ready = function() {
            return grants.isChooseReady();
        };
}]);

app.controller('docsGrantIssue',
    ["$scope", "$rootScope", "captable", "grants", "$routeParams", function($scope, $rootScope, captable, grants, $routeParams) {

        $scope.state = {evidenceQuery: "",
                        originalOnly: true};

        $rootScope.$watchCollection(function() {
            return captable.getCapTable().securities;
        }, function(securities) {
            securities.some(function(sec) {
                if (sec.name == $routeParams.issue) {
                    $scope.issue = [sec];
                }
            });
        });

        $scope.flow = $routeParams.flow;

        if ($scope.flow == 'grant') {
            $scope.doclist = ['plan', 'grant', 'exercise'];
        } else if ($scope.flow == 'certificate') {
            $scope.doclist = ['issue certificate'];
        } else if ($scope.flow = 'security') {
            $scope.doclist = ['plan', 'issue certificate'];
        }

        $scope.backurl = function() {
            if ($scope.flow == 'certificate') {
                return '/app/ownership/certificate/create?issue=' + $routeParams.issue;
            }
            return '/app/ownership/grants/issue';
        };

        $scope.handleDrop = function(item, bin) {
            $scope.issue[0].addSpecificEvidence(parseInt(item), String(bin), String(bin));
        };
}]);

app.controller('peopleGrantIssue',
    ["$scope", "grants", "Documents", function($scope, grants, Documents){
        $scope.issue = grants.issue;

        $scope.ready = function() {
            return grants.isPeopleReady();
        };
}]);

app.controller('reviewGrantIssue',
    ["$scope", "grants", "$rootScope", "$location", function($scope, grants, $rootScope, $location){
        $scope.processing = false;
        $scope.send = function() {
            if ($scope.processing) {
                return;
            }
            $scope.processing = true;
            grants.docsshare.shareDocuments().then(function(res) {
                $rootScope.$emit("notification:success", "Option grants sent!");
                $scope.processing = false;
                $location.path('/app/home/company'); // TODO: redirect to the grants page, once that page shows in-flight documents (not in the transaction table yet)
            }).catch(function(err) {
                if (err === "Not all documents prepared for all people") {
                    $rootScope.$emit("notification:fail", "Sorry, we couldn't understand some of the document data. Please re-prepare them and recheck the data.");
                } else {
                    $rootScope.$emit("notification:fail", "Oops, something went wrong.");
                }
                $scope.processing = false;
            });
        };
}]);
