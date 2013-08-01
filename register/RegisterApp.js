//app for the program
var app = angular.module('RegisterApp', ['brijj']);

//this is used to assign the correct template and controller for each URL path
app.config(function($routeProvider, $locationProvider){
  $locationProvider.html5Mode(true).hashPrefix('');

  $routeProvider.
      when('/', {controller:PeopleCtrl, templateUrl:'login.html'}).
      when('/company', {controller:CompanyCtrl, templateUrl: 'company.html'}).
      when('/people', {controller:PeopleCtrl, templateUrl: 'people.html'}).
      otherwise({redirectTo:'/'});
});


function CompanyCtrl($scope, $location, $routeParams, SWBrijj, $rootScope){
    $scope.code = $routeParams.code;
    SWBrijj.getInvitation($scope.code).then(function(x) {
      console.log(x);
      initPage($scope, x);
      if ($scope.activated) {
        document.location.href="/login";
      }
    });

    $scope.doActivate = function() {
      SWBrijj.doCompanyActivate($scope.email, $scope.code, $scope.password, false).then(function(x) {
        alert('OK');
        document.location.href="/login";
      });
    };  

    $scope.fieldCheck = function() {
      if ($scope.password) {
        return false;
      }
      else {
        return true;
      }
    };    
};

function PeopleCtrl($scope, $location, $routeParams, SWBrijj, $rootScope){
    $scope.code = $routeParams.code;
    SWBrijj.getInvitation($scope.code).then(function(x) {
      initPage($scope, x);
      if ($scope.activated) {
        document.location.href="/login";
      }
    });

    $scope.doActivate = function() {
      SWBrijj.doActivate($scope.email, $scope.name, $scope.code, $scope.password, false).then(function(x) {
        alert('OK');
        document.location.href="/login";
      });
    }

    $scope.fieldCheck = function() {
      if ($scope.name && $scope.password) {
        return false;
      }
      else {
        return true;
      }
    };   
};

function initPage($scope, x, row) {
  if(typeof(row)==='undefined') row = 1;
  var y = x[0]; // the fieldnames
  var z = x[row]; // the values
  
  for(var i=0;i<y.length;i++) { if (z[i] !== null) { $scope[y[i]]=z[i]; } }
}