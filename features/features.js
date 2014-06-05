var app = angular.module('features', ['ngRoute', 'ui.bootstrap', 'nav', 'brijj'], function($routeProvider, $locationProvider){
  $locationProvider.html5Mode(true).hashPrefix('');

  $routeProvider.
      when('/features/', {
          controller: 'FeaturesCtrl',
          templateUrl:'/features/partials/overview.html'
      }).
      when('/features/cap', {
          controller: 'FeaturesCtrl',
          templateUrl:'/features/partials/captable.html'
      }).
      when('/features/doc', {
          controller: 'FeaturesCtrl',
          templateUrl:'/features/partials/documents.html'
      }).
      otherwise({redirectTo:'/features'});
});

app.controller('FeaturesCtrl', ['$rootScope', '$scope', 'SWBrijj', '$location',
    function($rootScope, $scope, SWBrijj, $location) {

    $scope.gotopage = function (link) {
        $location.url("/features/" + link);
        };
    }
]);