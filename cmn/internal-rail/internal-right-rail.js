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
                console.log($scope.windowToggle);
                if (!$scope.windowToggle) {
                    $scope.sideToggle = !$scope.sideToggle;
                } else {
                    $scope.windowCallback();

                }
                // if($sco)
            };

    

            var aboveBottomHeight = 0;

            $scope.$watch(function() {
                var bp = document.getElementById('bottom-part');
                if (bp) {
                    return bp.offsetHeight;
                } else {
                    return 0;
                }
            }, function(height) {
                if (isNaN(height)) {
                    aboveBottomHeight = 0;
                } else {
                    aboveBottomHeight = height;
                }
                if (document.querySelector("internal-right-rail .tab-content")) {
                    document.querySelector("internal-right-rail .tab-content").style.bottom = aboveBottomHeight + "px";
                }
            });
        }]
    };
});
