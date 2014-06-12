'use strict';

app.directive('internalRightRail', function() {
    return {
        restrict: 'EA',
        scope: {
            tabs: '=',
            selected: '='
        },
        transclude: true,
        templateUrl: '/cmn/internal-rail/rail.html',
        controller: ['$scope', function($scope) {
            // Toggles sidebar back and forth
            $scope.toggleSide = function () {
                if (!$scope.sideToggle) {
                    $scope.sideToggleName = "Hide";
                    return false;
                } else {
                    $scope.sideToggleName = "Details";
                    return true;
                }
            };

        }]
    }
});
