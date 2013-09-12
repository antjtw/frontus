var app = angular.module('err', ['ui.bootstrap', 'nav', 'brijj']);

app.config(function($routeProvider, $locationProvider){
  $locationProvider.html5Mode(false).hashPrefix('/ERROR');

  $routeProvider.when('/', {});
});