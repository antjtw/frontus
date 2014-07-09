'use strict';

app.directive('internalRightRail', function() {
    return {
        restrict: 'E',
        scope: {
            sideToggle: '=toggleSide',

            // used for captable's sliding window
            windowToggle: '=',
            windowCallback: '&',
        },
        transclude: true,
        templateUrl: '/cmn/internal-rail/rail.html',
        controller: ['$scope', function($scope) {
            // Toggles sidebar back and forth
            $scope.complexSideToggleButton = function() {
                if (!$scope.windowToggle) {
                    $scope.sideToggle = !$scope.sideToggle;
                } else {
                    console.log("trying to exit!");
                    console.log($scope.windowCallback);
                    $scope.windowCallback();
                }
            };

        }]
    }
});
