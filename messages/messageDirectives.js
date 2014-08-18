"use strict";

var mod = angular.module('messageDirectives', ['ui.select2', 'brijj', 'ui.filters']);

mod.directive('messageFilter', function(){
    return {
        scope: {sent: "="},
        // replace: true,
        // transclude: false,
        restrict: 'E',
        templateUrl: '/messages/partials/messageFilter.html',
        controller: ['$scope', '$rootScope', 'SWBrijj', '$route', 

        function($scope, $rootScope, SWBrijj, $route) {


        }]
    };
});

mod.directive('sentMessages', function(){
    return {
        scope: {sents: "="},
        // replace: true,
        // transclude: false,
        restrict: 'E',
        templateUrl: '/messages/partials/sent.html',
        controller: ['$scope', '$rootScope', 'SWBrijj', '$route', 

        function($scope, $rootScope, SWBrijj, $route) {


        }]
    };
});