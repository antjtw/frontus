'use strict';

app.directive('subnav', function() {
    return {
        restrict: 'EA',
        scope: {
        },
        transclude: true,
        replace: true,
        templateUrl: '/cmn/subnav/subnav.html',
        controller: ['$scope', 'navState', function($scope, navState) {
            if (navState.path.indexOf('/messages') != -1 || navState.path.indexOf('/account/profile') != -1) {
                $scope.forty = true;
            } else if (navState.path.indexOf('documents/company-view') != -1 || navState.path.indexOf('/ownership/company-trans') != -1) {
                $scope.twenty = true;
            } else if (navState.path.indexOf('/ownership/grants') != -1) {
                $scope.equalspace = true;
            }
        }]
    }
});
