var ext = angular.module('external', []);


ext.directive('rightRail', function() {
    return {
        restrict: 'A',
        scope: false,
        templateUrl: '/cmn/external-rail/rail.html',
        controller: ['$scope', function($scope) {
        }]
    }
});