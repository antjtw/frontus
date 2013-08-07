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
      SWBrijj.doCompanyActivate($scope.email.toLowerCase(), $scope.code, $scope.password, false).then(function(x) {
        SWBrijj.login($scope.email.toLowerCase(), $scope.password).then(function(x) {
          if(x) {
            document.location.href = x + "?msg=first";
          } else {
            document.location.href = '/login';
          }
        });
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
      console.log(x);
      if ($scope.activated) {
        if ($scope.redirect) {
          document.location.href = $scope.redirect;
        } else {
          document.location.href="/login";
        }
      }
    });

    $scope.doActivate = function() {
      SWBrijj.doActivate($scope.email.toLowerCase(), $scope.name, $scope.code, $scope.password, false).then(function(y) {
        SWBrijj.login($scope.email.toLowerCase(), $scope.password).then(function(x) {
          if ($scope.redirect) {
            document.location.href = $scope.redirect;
          } else {
            document.location.href = x + "?msg=first";;
          }
        });
      });
    }

    $scope.fieldCheck = function() {
      if ($scope.name && $scope.password && $scope.name.length > 1) {
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