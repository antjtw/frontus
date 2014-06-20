'use strict';

app.directive('subnav', function() {
    return {
        restrict: 'EA',
        scope: {
        },
        transclude: true,
        replace: true,
        templateUrl: '/cmn/subnav/subnav.html',
        controller: ['$scope', function($scope) {
        }]
    }
});
