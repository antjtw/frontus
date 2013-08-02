var app = angular.module('team', ['ui.bootstrap', 'brijj']);

app.config(function($routeProvider, $locationProvider){
  $locationProvider.html5Mode(true).hashPrefix('');

  $routeProvider.
      when('/', {}).
      otherwise({redirectTo:'/'});
});
