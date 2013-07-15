
var app = angular.module('HomeApp', ['ngResource', 'ui.bootstrap', 'ui.event', 'brijj']);

//this is used to assign the correct template and controller for each URL path
app.config(function($routeProvider, $locationProvider){
  $locationProvider.html5Mode(true).hashPrefix('');
  // $locationProvider.html5Mode(false).hashPrefix('!');

  $routeProvider.
      when('/', {controller:InvestorCtrl, templateUrl:'investor.html'}).
      when('/company', {controller:CompanyCtrl, templateUrl:'company.html'}).
      otherwise({redirectTo:'/'});
});

app.controller("MainController", function($scope, $location) {

} );

app.run(function($rootScope) {
  $rootScope.notification = {};
  $rootScope.notification.color = "success";
  $rootScope.notification.visible = false;
  $rootScope.notification.message = "Notification Message";

  $rootScope.notification.show = function (color, message) {
    $rootScope.notification.visible = true;
    $rootScope.notification.color = color;
    $rootScope.notification.message = message;
    setTimeout(function() { $rootScope.notification.visible = false; $rootScope.$apply(); }, 5000);
  };
});

function CompanyCtrl($scope, $rootScope, $route, SWBrijj) {
  
  SWBrijj.tblm('account.my_company').then(function(x) {
    $scope.company = x[0]["name"];
  });

  SWBrijj.tblm('account.my_company', ['name']).then(function(x) { 
     $scope.name = x[0]['name'];
  }).except(initFail);

  //TODO grab name from company_investors
  $scope.activity = [];
  SWBrijj.procm('document.get_company_activity').then(function(data) {
    var i = 0;
    console.log(data);
    angular.forEach(data, function(x) {
      if (x['doc_id'] > 0) { //Activity is a document activity
        SWBrijj.procm('document.get_docdetail', x['doc_id']).then(function(y) {
          $scope.activity.push({activity: x['activity'], icon: null, when_sent: x['when_sent'], name: y[0]['docname'], link: '/company/documents/view?doc=' + x['doc_id']});
          if ($scope.activity[i].activity == "shared") {
            $scope.activity[i].activity = x['sender'] + " shared ";
            $scope.activity[i].icon = "icon-edit";
          }
          else if ($scope.activity[i].activity == "viewed") {
            $scope.activity[i].activity = x['sent_to'] + " viewed ";
            $scope.activity[i].icon = "icon-eye-open";
          }
          else if ($scope.activity[i].activity == "reminder") {
            $scope.activity[i].activity = x['sender'] + " reminded " ;
            $scope.activity[i].icon = "icon-bullhorn";
          }
          else if ($scope.activity[i].activity == "signed") {
            $scope.activity[i].activity = x['sent_to'] + " signed ";
            $scope.activity[i].icon = "icon-ok-circle";
          }
        });
      } else { //Activity is a profile activity
        $scope.activity.push({activity: x['activity'], icon: null, when_sent: x['when_sent'], name: x['sender'], link: '/company/profile'});
        if ($scope.activity[i].activity == "addinvestor") {
          $scope.activity[i].activity = x['sent_to'] + " was added as a shareholder ";
          $scope.activity[i].icon = "icon-plus-sign";
        }
        else if ($scope.activity[i].activity == "removeinvestor") {
          $scope.activity[i].activity = x['sent_to'] + " was removed as a shareholder ";
          $scope.activity[i].icon = "icon-minus-sign";
        }
        else if ($scope.activity[i].activity == "addadmin") {
          $scope.activity[i].activity = x['sent_to'] + " was added as an admin " ;
          $scope.activity[i].icon = "icon-plus-sign";
        }
        else if ($scope.activity[i].activity == "removeadmin") {
          $scope.activity[i].activity = x['sent_to'] + " was removed as an admin ";
          $scope.activity[i].icon = "icon-minus-sign";
        }
      }
      i++;
    });
  });

  $scope.activityOrder = function(card) {
     if (card.activity == "created") {
       return 0;
     } else {
        return -card.when_sent;
     }
  };

}

function InvestorCtrl($scope, $rootScope, $route, $routeParams, SWBrijj) {
  $scope.company = $routeParams.company;
}

function HomeCtrl($scope, $route) {
  SWBrijj.tbl('account.companies').then(function(x) {
    console.log(x);
    if (x.length > 0) { //User is a CEO of a company
      document.location.href="company";
    } else {
      SWBrijj.tblm('account.invested_companies').then(function(x) {
        document.location.href=x[0]['company'];
      })
    }
  });  
}

function initPage($scope, x, row) {
  if(typeof(row)==='undefined') row = 1;
  var y = x[0]; // the fieldnames
  var z = x[row]; // the values
  
  for(var i=0;i<y.length;i++) { if (z[i] !== null) { $scope[y[i]]=z[i]; } }
  $scope.$apply();
}

function initFail(x) {
  document.location.href='/login';
}
