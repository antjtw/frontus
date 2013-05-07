var app = angular.module('ReportsApp', ['ui.bootstrap']);

//this is used to assign the correct template and controller for each URL path
app.config(function($routeProvider, $locationProvider){
  $locationProvider.html5Mode(true).hashPrefix('');
});

function ContactCtrl($scope) {
  SWBrijj.procm('profile').then(function(x) { 
    console.log(x);
    $scope.items = x;
    $scope.$apply();
  });
};

function SignupCntCtl($scope) {
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
};  
