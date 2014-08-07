var app = angular.module('pricing', ['ngRoute', 'ui.bootstrap', 'nav', 'brijj', 'external', 'registerDirective'], function($routeProvider, $locationProvider){
  $locationProvider.html5Mode(true).hashPrefix('');

  $routeProvider.
      when('/pricing/', {}).
      otherwise({redirectTo:'/pricing/'});
});