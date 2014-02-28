var app = angular.module('careers', ['ui.bootstrap', 'nav', 'brijj', 'external'], function($routeProvider, $locationProvider){
  $locationProvider.html5Mode(true).hashPrefix('');

  $routeProvider.
      when('/', {}).
      otherwise({redirectTo:'/'});
});

app.controller('AccordionCtrl',['$scope', function($scope) {
  $scope.oneAtATime = true;
}]);

