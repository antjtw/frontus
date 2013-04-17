//app for the program
var app = angular.module('LoginApp', ['ngResource']);

//this is used to assign the correct template and controller for each URL path
app.config(function($routeProvider){
  $routeProvider.
      when('/', {controller:LoginCtrl, templateUrl:'u/login.html'}).
      when('/forgot', {controller:ForgotCtrl, templateUrl: 'u/forgot.html'}).
      when('/sent', {controller:SentCtrl, templateUrl: 'u/sent.html'}).
      when('/home', {controller:HomeCtrl, templateUrl:'u/home.html'}).
     // when('/register', {controller:RegisterCtrl, templateUrl: 'u/register.html'}).
      otherwise({redirectTo:'/'});
});

//Controller for the Login Page
function LoginCtrl($scope, $location){
    $scope.username = "";
    $scope.password = "";
    $scope.showError = false;
    $scope.doLogin = function() {
      SWBrijj.login($scope.username, $scope.password).then(function(x) { 
         if(x) $location.path("/home");
         else $scope.showError = true;
         $scope.$apply();
      });
    }
    
    // could also add that the password is not long enough?
    $scope.loginDisabled = function() {
        return $scope.username == null || $scope.username.length < 3 || $scope.password.length < 6;
    }
    $scope.loginClass = function() {
        return "button greenButton loginButton bodyText" + ($scope.loginDisabled() ? " adisabled" : "");
    }
}

//Controller for the home page
function HomeCtrl($scope){
    $scope.user = function(){
      document.location.href = 'v/index.html';
//      return $routeParams.userName;
    };
}

//Controller for the home page
function ForgotCtrl($scope, $location) {
    $scope.username="";
    $scope.fed="";
    $scope.showReset = false;
    
    $scope.forgotDisabled = function() { 
        return $scope.username == null || $scope.username.length < 3; }
    $scope.forgotClass = function() {
         return "button greenButton loginButton bodyText" + ($scope.forgotDisabled() ? " adisabled" : ""); }
    $scope.doForgot = function() {
       $location.path("/sent");
       SWBrijj.forgot($scope.username).then(didForget).except(errorForget);
    }
}

function SentCtrl() {
}

function didForget(x) {
}
 
function errorForget(x) {
  alert(x);
}
