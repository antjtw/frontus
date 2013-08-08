//app for the program
var app = angular.module('AdminApp', ['ui.bootstrap', 'ui.event','brijj']);

//this is used to assign the correct template and controller for each URL path
app.config(function($routeProvider, $locationProvider){
  $locationProvider.html5Mode(true).hashPrefix('');

  $routeProvider.
      when('/', {controller:AdminCtrl, templateUrl:'admin.html'}).
      otherwise({redirectTo:'/'});
});

app.controller("MainProfileController", function($scope, $location) {
} );


function AdminCtrl($scope, $routeParams, SWBrijj, $rootScope){
    $scope.createCompany = function() {
      if (!$scope.domain) {
        $scope.domain = '';
      }
      SWBrijj.procm('account.create_company', $scope.email, $scope.name, $scope.domain, $scope.companyName).then(function(x) {
        $rootScope.notification.show("success", "Company created");
        $scope.email = $scope.name = $scope.domain = $scope.companyName = "";
      }).except(function(x) {
        console.log(x);
        $rootScope.notification.show("fail", "Error " + x.message);
      });
    };
};

function initPage($scope, x, row) {
  if(typeof(row)==='undefined') row = 1;
  var y = x[0]; // the fieldnames
  var z = x[row]; // the values
  
  for(var i=0;i<y.length;i++) { if (z[i] !== null) { $scope[y[i]]=z[i]; } }
}