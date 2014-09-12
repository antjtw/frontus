var app = angular.module('press', ['ngRoute', 'ui.bootstrap', 'nav', 'brijj', 'external'], function($routeProvider, $locationProvider){
  $locationProvider.html5Mode(true).hashPrefix('');

  $routeProvider.
      when('/press/', {}).
      otherwise({redirectTo:'/press/'});
});
