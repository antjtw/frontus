//app for the program
var app = angular.module('LoginApp', ['brijj'], function($routeProvider, $locationProvider){

//this is used to assign the correct template and controller for each URL path
  $locationProvider.html5Mode(true).hashPrefix('');
  // $locationProvider.html5Mode(false).hashPrefix('!');

  $routeProvider.
      when('/', {controller:'LoginCtrl', templateUrl:'login.html'}).
      when('/forgot', {controller:'ForgotCtrl', templateUrl: 'forgot.html'}).
      when('/sent', {controller:'SentCtrl', templateUrl: 'sent.html'}).
      when('/home', {controller:'HomeCtrl', templateUrl:'home.html'}).
      when('/logout', {controller: 'LogoutCtrl', templateUrl: 'logout.html'}).
      when('/reset', {controller: 'ResetCtrl', templateUrl: 'reset.html'}).
      when('/timeout', {controller: 'LoginCtrl', templateUrl: 'timeout.html'}).
      otherwise({redirectTo:'/'});
});


//Controller for the Login Page
app.controller('LoginCtrl', ['$scope','$routeParams','SWBrijj', function($scope, $routeParams, SWBrijj) {
    document.cookie = "selectedCompany=; expires=Fri, 18 Feb 1994 01:23:45 GMT; path=/";
    $scope.username = "";
    $scope.password = "";
    if ($routeParams.error) {
      $scope.showError = true;
    } else {
      $scope.showError = false;
    }
    $scope.doLogin = function() {
      /** @name SWBrijj#login
       * @function
       * @param {string} username
       * @param {string} password
       */
      SWBrijj.login($scope.username.toLowerCase(), $scope.password).then(function(x) { 
      if(x) {
			document.location.href = x;
			// console.log("redirecting to: "+x);
		  }
         else {
          $scope.showError = true;
          $scope.password = "";
        }
    });
    };

    $scope.fieldCheck = function() {
      return !($scope.username && $scope.password);
    };
    
    // could also add that the password is not long enough?
    $scope.loginDisabled = function() {
        return $scope.username == null || $scope.username.length < 3 || $scope.password.length < 6;
    };
    $scope.loginClass = function() {
        return "button greenButton loginButton bodyText" + ($scope.loginDisabled() ? " adisabled" : "");
    }
}]);

app.controller('LogoutCtrl', ['$scope','SWBrijj', function($scope, SWBrijj) {
  $scope.doLogout = function() {
    document.cookie = "selectedCompany=; expires=Fri, 18 Feb 1994 01:23:45 GMT; path=/";
    /** @name SWBrijj#logout
     *  @function
     */
    SWBrijj.logout().then(function(x) {
      void(x);
      document.location.href='/?logout';
    });
  }
}]);

//Controller for the home page
app.controller('HomeCtrl', ['$scope', function($scope) {
    $scope.user = function(){
      document.location.href = '/account/profile';
//      return $routeParams.userName;
    };
}]);

//Controller for the home page
app.controller('ForgotCtrl', ['$scope','$location','SWBrijj', function($scope, $location, SWBrijj) {
    $scope.username="";
    $scope.fed="";
    $scope.showReset = false;
    
    $scope.forgotDisabled = function() { 
        return $scope.username == null || $scope.username.length < 3; };
    $scope.forgotClass = function() {
         return "button greenButton loginButton bodyText" + ($scope.forgotDisabled() ? " adisabled" : ""); };
    $scope.doForgot = function() {
      $scope.forgotDisabled = function() { return true; };
      /** @name SWBrijj#forgot
       * @function
       * @param {string} username
       */
      SWBrijj.forgot($scope.username.toLowerCase()).then(function(x) {
        void(x);
        $location.path("/sent");
      }).except(function(x) { 
        // console.log(x);
        // $scope.fed = "There was an error. Please try again later."
        $location.path("/sent");
      });
    }
}]);

app.controller('ResetCtrl', ['$scope','$routeParams','SWBrijj', function($scope, $routeParams, SWBrijj) {
  $scope.resetDisabled = function() { return $scope.password == null || $scope.password.length < 1; };
  $scope.resetClass = function() { return "button greenButton loginButton bodyText" + ($scope.resetDisabled() ? " adisabled" : ""); };

  /** @name SWBrijj#resetFillout
   * @function
   * @param {string} code
   */
  SWBrijj.resetFillout($routeParams.code).then(function(x) {
    if (x[1][1]) { // Check if code is already used
      document.location.href="/login";
    }
    $scope.email = x[1][0];
  });

  $scope.doReset = function() {
    $scope.resetDisabled = function() { return true; };
    /** @name SWBrijj#resetPassword
     * @function
     * @param {string} password
     * @param {string} code
     */
    SWBrijj.resetPassword($scope.password, $routeParams.code).then(function(y) {
      void(y);
      SWBrijj.login($scope.email.toLowerCase(), $scope.password).then(function(x) {
        if(x) {
          document.location.href = x + "?msg=resetPassword";
        } else {
          document.location.href = '/login';
        } 
      });
    }).except(function(x) { 
      // console.log(x);
      $scope.fed = "There was an error. Please try again later."
    });
  }
}]);

app.controller('SentCtrl', [ function() {
}]);
