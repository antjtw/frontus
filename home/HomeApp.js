
var app = angular.module('HomeApp', ['ngResource', 'ui.bootstrap', 'ui.event', 'brijj']);

//this is used to assign the correct template and controller for each URL path
app.config(function($routeProvider, $locationProvider){
  $locationProvider.html5Mode(true).hashPrefix('');

  $routeProvider.
      when('/', {controller:InvestorCtrl, templateUrl:'investor.html'}).
      when('/company', {controller:CompanyCtrl, templateUrl:'company.html'}).
      otherwise({redirectTo:'/'});
});

app.controller("MainController", function($scope, $location) {

} );

function CompanyCtrl($scope, $rootScope, $route, SWBrijj) {

  SWBrijj.tblm('account.my_company', ['name']).then(function(x) { 
     $scope.name = x[0]['name'];
  }).except(initFail);

  $scope.activity = [];
  SWBrijj.procm('global.get_company_home').then(function(data) {
    var i = 0;
    angular.forEach(data, function(x) {
      if (x.type == 'account') {
        x.link = "/company/profile/people";
        if (x.activity == "addadmin") {
          x.activity = " added ";
          x.target = (x.count > 1) ? x.count + "administrators": "an administrator";
          x.icon = "icon-circle-plus";
        } else if (x.activity == "removeadmin") {
          x.activity = " removed ";
          x.target = (x.count > 1) ? x.count + "administrators": "an administrator";
          x.icon = "icon-circle-minus";
        } else if (x.activity == "addinvestor") {
          x.activity = " added ";
          x.target = (x.count > 1) ? x.count + "investors": "an investor";
          x.icon = "icon-circle-plus";
        } else if (x.activity == "removeinvestor") {
          x.activity = " removed ";
          x.target = (x.count > 1) ? x.count + "investors": "an investor";
          x.icon = "icon-circle-minus";
        }
      } else if (x.type == 'document') {
        x.link = "/company/documents/status?doc=" + x.doc_id;
        SWBrijj.tblm('document.my_company_library', ['docname'], 'doc_id', x.doc_id).then(function(res){
          x.target = res["docname"];
        }); 
        if (x.activity == "uploaded") {
          x.activity = " uploaded ";
          x.icon = "icon-star";
        } else if (x.activity == "sent") {
          x.activity = " shared ";
          x.icon = "icon-redo";
        }
      } else if (x.type == 'ownership') {
        x.link = "/company/ownership/";
        x.target = "Ownership table";
        if (x.activity == "shared") {
          x.activity = " shared ";
          x.icon = "icon-redo";
        }
      }
    });
    $scope.activity = data;
    angular.forEach($scope.activity, function(x) { //Replace emails with names
        if (x.email != null) {
          SWBrijj.proc('account.get_investor_name', x.email, true).then(function(name) {
            x.name = name[1][0];
          });
        }
    });
    if ($scope.activity.length == 0) {
      $scope.noActivity = true;
    }
  });

  $scope.activityOrder = function(card) {
        return -card.time;
  };
}

function InvestorCtrl($scope, $rootScope, $route, $routeParams, SWBrijj) {
  //$scope.company = $routeParams.company;
  $scope.company = $rootScope.selected.name;

  $scope.activity = [];
  SWBrijj.procm('global.get_investor_home').then(function(data) {
    var i = 0;
    angular.forEach(data, function(x) {
      x.name = "You ";
      if (x.type == 'account') {
        x.link = "/company/profile/people";
        if (x.activity == "addadmin") {
          x.activity = " added an ";
          x.target = "administrator";
          x.icon = "icon-circle-plus";
        } else if (x.activity == "removeadmin") {
          x.activity = " removed an ";
          x.target = "administrator";
          x.icon = "icon-circle-minus";
        } else if (x.activity == "addinvestor") {
          x.activity = " added an ";
          x.target = "an investor";
          x.icon = "icon-circle-plus";
        } else if (x.activity == "removeinvestor") {
          x.activity = " removed an ";
          x.target = "an investor";
          x.icon = "icon-circle-minus";
        }
      } else
      if (x.type == 'document') {
        x.link = "/investor/documents/" + x.doc_id;
        SWBrijj.tblm('document.my_investor_library', ['docname'], 'doc_id', x.doc_id).then(function(res){
          x.target = res["docname"];
        }); 
        if (x.activity == "uploaded") {
          x.activity = " uploaded ";
          x.icon = "icon-star";
        } else if (x.activity == "received") {
          x.activity = " received ";
          x.icon = "icon-redo";
        }
      } else if (x.type == 'ownership') {
        x.link = "/investor/ownership/";
        x.target = "Ownership table";
        if (x.activity == "shared") {
          x.activity = " received ";
          x.icon = "icon-redo";
        }
      }
    });
    $scope.activity = data;
    if ($scope.activity.length == 0) {
      $scope.noActivity = true;
    }
  });

  $scope.activityOrder = function(card) {
        return -card.time;
  };
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
