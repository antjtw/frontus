
var app = angular.module('ReportsApp', ['ngResource']);

//this is used to assign the correct template and controller for each URL path
app.config(function($routeProvider, $locationProvider){
  $locationProvider.html5Mode(true).hashPrefix('');
  // $locationProvider.html5Mode(false).hashPrefix('!');

  $routeProvider.
    when('/signups', {controller:SignupsCtrl, templateUrl:'signups.html'}).
    when('/storage', {controller:StorageCtrl, templateUrl: 'storage.html'}).
    otherwise({redirectTo:'/signups'});
});

app.controller("ReportsCtrl", function($scope, $location) {
  $scope.toSignups = function() { $location.path('signups') };
  $scope.toStorage = function() { $location.path('storage') };
  $scope.tab = function(x) {
    var p = $location.path();  if (p == '/') p='signups';
    return p == x; };
} );


var app = angular.module("myApp",['infinite-scroll']);
app.directive("interested", function() {
  return {
    // scope: { item: '=' }
    template: "<div><span>{{item.company_name}} ( <a hg_ref='http://{{item.company_domain}}' > {{item.company_domain}}</a> )</span>"+
      "<p><span>{{item.name}} ( {{item.email}} )</span><small>created {{item.created}}</small></div>"
  }
});

var nli = function(x) { document.querySelector("#googleResult").innerHTML=x.message;
  if (x.message == "Not Logged In") {
    var sc = angular.element(document.querySelector("#login-dialog")).scope();
    sc.show = true;
    sc.$apply();
  }
}

jQuery("#toGoogle").click(function() {
  var gsn = document.querySelector("input[name=worksheet]").value;
  SWBrijj.proc("signUpsToGoogle", gsn)
    .then(function(x) { document.querySelector("#googleResult").innerHTML=x;})
    .except(nli);
});

function MainReportsController($scope) {
}

function SignupsCtrl($scope) {
  $scope.items = [];
  $scope.busy = false;
  $scope.before = new Date();

  $scope.nextPage = function() {
    if ($scope.busy) return;
    $scope.busy = true;

    SWBrijj.procm("signUps", 30, $scope.before).then(function(data) {
      var items = data;
      for (var i = 0; i < data.length; i++) {
        $scope.items.push(data[i]);
      }
      $scope.before = $scope.items[$scope.items.length - 1].created;
      $scope.busy = false;
      $scope.$apply();
    }).except(nli);
  };

  $scope.downloadExcel = function() {
    SWBrijj.getSignups().then( function(x) { document.location.href=x; });
  }
}

function StorageCtrl($scope, $location) {


  SWBrijj.proc('profile').then(function(x) { initPage($scope, x) }).except(initFail);
  SWBrijj.procm('oauth.dropbox_list','')
    .then(function(x)  { $scope.dropboxFiles=x; $scope.$apply(); })
    .except( function(x) {} );

}

