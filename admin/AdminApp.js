
//app for the program
var app = angular.module('AdminApp', ['ui.bootstrap', 'ui.event','brijj'], function($routeProvider, $locationProvider){
//this is used to assign the correct template and controller for each URL path
  $locationProvider.html5Mode(true).hashPrefix('');

  $routeProvider.
      when('/', {controller: 'AdminCtrl', templateUrl:'admin.html'}).
      otherwise({redirectTo:'/'});
});

app.controller('AdminCtrl', ['$scope', 'SWBrijj', function($scope, SWBrijj, $rootScope){
    $scope.createCompany = function() {
      if (!$scope.domain) {
        $scope.domain = '';
      }
      /** @name SWBrijj#procm
       * @function
       * @param {string}
       * @param {...}
        */
      SWBrijj.procm('account.create_company', $scope.email.toLowerCase(), $scope.name, $scope.domain, $scope.companyName).then( function(x) {
        void(x);
        $rootScope.notification.show("success", "Company created");
        $scope.email = $scope.name = $scope.domain = $scope.companyName = "";
      }).except(function(x) {
        console.log(x);
        $rootScope.notification.show("fail", "Error " + x.message);
      });
    };
}]);
