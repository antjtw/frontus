var app = angular.module('privacy', ['ui.bootstrap', 'nav', 'brijj'], function($routeProvider, $locationProvider){
  $locationProvider.html5Mode(true).hashPrefix('');

  $routeProvider.
      when('/', {}).
      otherwise({redirectTo:'/'});
});
