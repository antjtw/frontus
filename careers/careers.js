var app = angular.module('careers', ['ui.bootstrap', 'brijj']);

app.config(function($routeProvider, $locationProvider){
  $locationProvider.html5Mode(true).hashPrefix('');

  $routeProvider.
      when('/', {}).
      otherwise({redirectTo:'/'});
});

function AccordionDemoCtrl($scope) {
  $scope.oneAtATime = true;
}
