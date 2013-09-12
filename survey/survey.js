var app = angular.module('survey', ['ui.bootstrap', 'nav', 'brijj']);

app.config(function($routeProvider, $locationProvider){
  $locationProvider.html5Mode(true).hashPrefix('');

  $routeProvider.
      when('/', {}).
      otherwise({redirectTo:'/'});
});
