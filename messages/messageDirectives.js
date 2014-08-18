"use strict";

var m = angular.module('messageDirectives', ['ui.select2', 'brijj', 'ui.filters']);

m.directive('messageFilter', function(){
    return {
        scope: false,
        // replace: true,
        // transclude: false,
        restrict: 'E',
        templateUrl: '/messages/partials/messageFilter.html',
        controller: ['$scope', '$rootScope', 'SWBrijj', '$route', 

        function($scope, $rootScope, SWBrijj, $route) {




        }]
    };
});