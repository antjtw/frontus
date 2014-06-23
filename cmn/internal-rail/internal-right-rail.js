'use strict';

app.directive('internalRightRail', function() {
    return {
        restrict: 'EA',
        scope: {
            tabs: '=tabarr',
            selected: '=',
            sideToggle: '=toggleSide',
        },
        transclude: true,
        // TODO: can do multiple transcludes (per tab) if done carefully
        // see: http://stackoverflow.com/questions/22079587/transcluding-multiple-sub-elements-in-a-single-angular-directive
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
