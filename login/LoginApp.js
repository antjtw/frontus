//app for the program
var app = angular.module('LoginApp', ['ngResource', 'brijj']);

//this is used to assign the correct template and controller for each URL path
app.config(function($routeProvider, $locationProvider){
  $locationProvider.html5Mode(true).hashPrefix('');
  // $locationProvider.html5Mode(false).hashPrefix('!');

  $routeProvider.
      when('/', {controller:LoginCtrl, templateUrl:'login.html'}).
      when('/forgot', {controller:ForgotCtrl, templateUrl: 'forgot.html'}).
      when('/sent', {controller:SentCtrl, templateUrl: 'sent.html'}).
      when('/home', {controller:HomeCtrl, templateUrl:'home.html'}).
      when('/logout', {controller: LogoutCtrl, templateUrl: 'logout.html', redirectTo: function(parms, path, search) {
        SWBrijj.logout();
        return '/';
    }}).
     // when('/register', {controller:RegisterCtrl, templateUrl: 'u/register.html'}).
      otherwise({redirectTo:'/'});
});

//Controller for the Login Page
function LoginCtrl($scope, $location, SWBrijj){
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
}

function LogoutCtrl($scope) {
}

//Controller for the home page
function HomeCtrl($scope){
    $scope.user = function(){
      document.location.href = '/investor/profile';
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
       $location.path("sent");
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
