var app = angular.module('team', ['ngRoute', 'ui.bootstrap', 'nav', 'brijj', 'external'], function($routeProvider, $locationProvider){
  $locationProvider.html5Mode(true).hashPrefix('');

  $routeProvider.
      when('/team/', {}).
      otherwise({redirectTo:'/team/'});
});
