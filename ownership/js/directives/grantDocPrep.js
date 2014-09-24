'use strict';

app.directive('grantDocPrep', [function() {
    return {
        restrict: "E",
        scope: {
        },
        templateUrl: '/ownership/partials/grantDocPrep.html',
        controller: ["$scope", "grants", function($scope, grants) {
            // we can assume that grants contains an issue with a grant doc that's been suitable marked up by now
            $scope.issue = grants.issue;
        }]
    };
}]);
