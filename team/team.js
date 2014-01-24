var app = angular.module('team', ['ui.bootstrap', 'nav', 'brijj', 'external'], function($routeProvider, $locationProvider){
  $locationProvider.html5Mode(true).hashPrefix('');

  $routeProvider.
      when('/', {}).
      otherwise({redirectTo:'/'});
});
