var app = angular.module('careers', ['ngRoute', 'ui.bootstrap', 'nav', 'brijj', 'external'], function($routeProvider, $locationProvider){
  $locationProvider.html5Mode(true).hashPrefix('');

  $routeProvider.
      when('/careers/', {}).
      otherwise({redirectTo:'/careers/'});
});

app.controller('AccordionCtrl',['$scope', function($scope) {
  $scope.oneAtATime = true;
}]);

