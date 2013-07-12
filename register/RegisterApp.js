//app for the program
var app = angular.module('RegisterApp', ['brijj']);

//this is used to assign the correct template and controller for each URL path
app.config(function($routeProvider, $locationProvider){
  $locationProvider.html5Mode(true).hashPrefix('');
  $routeProvider.
      when('/', {controller:LoginCtrl, templateUrl:'login.html'}).
      when('/company', {controller:CompanyCtrl, templateUrl: 'company.html'}).
      when('/people', {controller:PeopleCtrl, templateUrl: 'people.html'}).
      otherwise({redirectTo:'/'});
});


function CompanyCtrl($scope, $location, SWBrijj){
    $scope.username = "";
    $scope.password = "";
    $scope.showError = false;
    $scope.doLogin = function() {
      SWBrijj.login($scope.username, $scope.password).then(function(x) { 
         if(x) {
			document.location.href = x;
			console.log("redirecting to: "+x);
		}
         else $scope.showError = true;
      });
    }
    
    // could also add that the password is not long enough?
    $scope.loginDisabled = function() {
        return $scope.username == null || $scope.username.length < 3 || $scope.password.length < 6;
    }
    $scope.loginClass = function() {
        return "button greenButton loginButton bodyText" + ($scope.loginDisabled() ? " adisabled" : "");
    }
};

function PeopleCtrl($scope, $location, $routeParams SWBrijj){
    $scope.username = "";
    $scope.password = "";
    $scope.showError = false;
    $scope.doLogin = function() {
      SWBrijj.login($scope.username, $scope.password).then(function(x) { 
         if(x) {
      document.location.href = x;
      console.log("redirecting to: "+x);
    }
         else $scope.showError = true;
      });
    }
    
    // could also add that the password is not long enough?
    $scope.loginDisabled = function() {
        return $scope.username == null || $scope.username.length < 3 || $scope.password.length < 6;
    }
    $scope.loginClass = function() {
        return "button greenButton loginButton bodyText" + ($scope.loginDisabled() ? " adisabled" : "");
    }
};

