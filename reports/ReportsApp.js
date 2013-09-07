
var app = angular.module('ReportsApp', ['ui.bootstrap', 'brijj']);

//this is used to assign the correct template and controller for each URL path
app.config(function($routeProvider, $locationProvider){
  $locationProvider.html5Mode(true).hashPrefix('');
  $routeProvider.
      when('/admin', {templateUrl: '/reports/admin.html',   controller: 'ContactCtrl'}).
      when('/signups', {templateUrl: '/reports/signups.html', controller: 'ReportsCtrl'}).
      otherwise({redirectTo: '/' });
});

app.controller('ReportsCtrl',['$scope', 'SWBrijj', function($scope, SWBrijj) {
  $scope.authorize = function() {
  SWBrijj.proc("get_google_access").then(function(x) {
    var ru = x[1][0];
    document.cookie="rux="+encodeURIComponent(ru)+";path=/";
    document.location.href=ru;
  });
  }

  $scope.download = function() {
  SWBrijj.getSignups().then(function(x) {
    document.location.href=x;
  });
  }
}]);



app.controller('ContactCtrl',['$scope', 'SWBrijj', function($scope, SWBrijj) {
    SWBrijj.procm('profile').then(function(x) {
      console.log(x);
      $scope.items = x;
      $scope.$apply();
    });
}]);

app.controller('SignupCntCtl',['$scope', 'SWBrijj', function($scope, SWBrijj) {
  SWBrijj.proc('get_signupcnt_all').then(function(x) {
    $scope.signupcnt_all = x[1][0]; 
    $scope.$apply();
  });

  SWBrijj.proc('get_signupcnt_today').then(function(x) { 
    $scope.signupcnt_today = x[1][0]; 
    $scope.$apply();
  });

  SWBrijj.proc('get_signupcnt_yesterday').then(function(x) { 
    $scope.signupcnt_yesterday = x[1][0]; 
    $scope.$apply();
  });  



  

  $scope.downloadExcel = function() {
    
    // GET CURRENT DATE
    var date = new Date();

    // GET YYYY, MM AND DD FROM THE DATE OBJECT
    var yyyy = date.getFullYear().toString();
    var mm = (date.getMonth()+1).toString();
    var dd  = date.getDate().toString();

    // CONVERT mm AND dd INTO chars
    var mmChars = mm.split('');
    var ddChars = dd.split('');

    // CONCAT THE STRINGS IN YYYY-MM-DD FORMAT
    var datestring = yyyy + '-' + (mmChars[1]?mm:"0"+mmChars[0]) + '-' + (ddChars[1]?dd:"0"+ddChars[0]);
    var downloadname = "signup-report-" + datestring + ".xlsx";

    SWBrijj.procd(downloadname, "get_signups", "application/ms-excel", new Date()).then( function(x) { document.location.href=x; });
  };
}]);


/*
 <!-- has to go here because it needs to come after jQuery - - which is in foot.inc -->
 <script src="js/angular.js"></script>
 <script src="js/ng-infinite-scroll.js"></script>


 <script>
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


 var LoginController = function($scope) {
 $scope.connect = function() {
 SWBrijj.login($scope.username, $scope.password).then(function(data) {
 if (data) { $scope.show = false; $scope.result=""; } else $scope.result = "Login failed";
 $scope.$apply();
 var os = angular.element(document.querySelector("#demoDiv")).scope();
 os.busy = false;
 os.nextPage();
 os.$apply();
 });
 };
 };

 var app = angular.module("myApp",['infinite-scroll']);
 app.directive("interested", function() {
 return {
 // scope: { item: '=' }
 template: "<div><span>{{item.company_name}} ( <a hg_ref='https://{{item.company_domain}}' > {{item.company_domain}}</a> )</span>"+
 "<p><span>{{item.name}} ( {{item.email}} )</span><small>created {{item.created}}</small></div>"
 }
 });
  */
/*
 app.controller('DemoController', function($scope) {
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
 });

    */
