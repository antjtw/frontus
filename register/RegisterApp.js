//app for the program
var app = angular.module('RegisterApp', ['brijj'], function($routeProvider, $locationProvider){
  $locationProvider.html5Mode(true).hashPrefix('');

  $routeProvider.
      when('/', {controller:'PeopleCtrl', templateUrl:'people.html'}).
      when('/company', {controller:'CompanyCtrl', templateUrl: 'company.html'}).
      when('/company-self', {controller:'CompanySelfCtrl', templateUrl: 'company-self.html'}).
      when('/people', {controller:'PeopleCtrl', templateUrl: 'people.html'}).
      otherwise({redirectTo:'/'});
});

/** @name $scope#activated
 * @type {boolean} */
/** @name $scope#redirect
 * @type {string} */
/** @name $scope#email
 * @type {string} */

app.controller('CompanyCtrl', ['$scope','$location','$routeParams','SWBrijj',
  function($scope, $location, $routeParams, SWBrijj){
    $scope.code = $routeParams.code;

    if (!$scope.code) {
        document.location.href="/";
    }

    /** @name SWBrijj#getInvitation
     * @function
     * @param {string} code
     */
    SWBrijj.getInvitation($scope.code).then(function(x) {
      // console.log(x);
      initPage($scope, x);
      if ($scope.activated) {
        document.location.href="/login";
      }
    });

    $scope.doActivate = function() {
      /** @name SWBrijj#doCompanyActivate
       * @function
       * @param {string} email
       * @param {string} code
       * @param {string} password
       * @param {boolean} dontknow
       */
      SWBrijj.doCompanyActivate($scope.email.toLowerCase(), $scope.code, $scope.password, false).then(function(x) {
          if(x) {
            document.location.href = x + "?msg=first";
          } else {
            document.location.href = '/login';
          }
        });
    };

    $scope.fieldCheck = function() {
      return !$scope.password;
    };    
}]);
   
app.controller('CompanySelfCtrl', ['$scope','$location','$routeParams','SWBrijj',
  function($scope, $location, $routeParams, SWBrijj){
    $scope.code = $routeParams.code;

    if (!$scope.code) {
        document.location.href="/";
    }

    /** @name SWBrijj#getInvitation
     * @function
     * @param {string} code
     */
    SWBrijj.getInvitation($scope.code).then(function(x) {
      initPage($scope, x);
      if ($scope.activated) { document.location.href="/login"; }
    });

    $scope.activate = function() {
        console.log("activate@!");
      SWBrijj.doCompanySelfActivate($scope.email, $scope.code, $scope.password, $scope.pname, $scope.company, $scope.cname, false).then(function(activated) {
          if (activated) {
            document.location.href = activated + "?msg=first";
          } else {
            document.location.href = '/login';
          }
        }).except(function(x) {
            $scope.$emit("notification:fail", "Oops, something went wrong.");
        });
    };

    $scope.fieldCheck = function() {
        return !($scope.pname && $scope.password && $scope.company && $scope.cname); 
    };    
}]);

app.controller('PeopleCtrl', ['$scope','$location','$routeParams','SWBrijj',
  function($scope, $location, $routeParams, SWBrijj){
    $scope.code = $routeParams.code;
    
    if (!$scope.code) {
      document.location.href="/";
    }
    
    SWBrijj.getInvitation($scope.code).then(function(x) {
      initPage($scope, x);
      // console.log(x);
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
          if ($scope.redirect) {
            document.location.href = $scope.redirect;
          } else {
            document.location.href = y + "?msg=first";
          }
        });
    };

    $scope.fieldCheck = function() {
      return !($scope.name && $scope.password && $scope.name.length > 1);
    };
}]);
/**
 * @param $scope
 * @param {[string]} x
 * @param {int} [row]
 */
function initPage($scope, x, row) {
  if(typeof(row)==='undefined') row = 1;
  var y = x[0]; // the fieldnames
  var z = x[row]; // the values
  
  for(var i=0;i<y.length;i++) { if (z[i] !== null) { $scope[y[i]]=z[i]; } }
}
