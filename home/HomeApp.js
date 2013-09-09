
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
});

function CompanyCtrl($scope, $rootScope, $route, $location, $routeParams, SWBrijj) {

    if ($rootScope.selected.role == 'investor') {
        $location.path('/');
        return;
    }

  if ($routeParams.msg) {
    if ($routeParams.msg == "resetPassword") {
      $rootScope.notification.show("success", "You have successfully changed your password.");
    }
  }

  $scope.company = $rootScope.selected.name;

  SWBrijj.tblm('account.onboarding').then(function(x) { 
    $scope.onboarding = x[0].show_onboarding;
  }).except(initFail);

  $scope.close = function() {
    $scope.onboarding = false;
    SWBrijj.procm('account.onboarding_update', false);
  }

 $scope.activity = [];
  SWBrijj.tblm('global.get_company_activity').then(function(data) {
      $scope.activity = data;
      if ($scope.activity.length == 0) {
          $scope.noActivity = true;
      }
  });

  $scope.activityOrder = function(card) {
        return -card.time;
  };
}

function InvestorCtrl($scope, $rootScope, $location, $route, $routeParams, SWBrijj) {

    if ($rootScope.selected.role == 'issuer') {
        $location.path('/company');
        return;
    }

  if ($routeParams.msg) {
    if ($routeParams.msg == "resetPassword") {
      $rootScope.notification.show("success", "You have successfully changed your password.");
    }
  }
  //$scope.company = $routeParams.company;
  $scope.company = $rootScope.selected.name;

  $scope.activity = [];
  SWBrijj.tblm('global.get_investor_activity').then(function(data) {
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

/************************************************************
 *  Filters
 *  *********************************************************/

/* Filter to format the activity time */
angular.module('HomeApp').filter('fromNow', function() {
    return function(date) {
        return moment(date).fromNow();
    }
});

/* Filter to select the activity icon for document status */
angular.module('HomeApp').filter('icon', function() {
    return function(activity) {
        if (activity == "sent") return "icon-email";
        else if (activity == "received") return "icon-email";
        else if (activity == "viewed") return "icon-view";
        else if (activity == "reminder") return "icon-redo";
        else if (activity == "signed") return "icon-pen";
        else if (activity == "uploaded") return "icon-star";
        else return "hunh?";
    }
});

/* Filter to format the activity description on document status */
angular.module('HomeApp').filter('description', function() {
    return function(ac) {
        var activity = ac.activity;
        var person
        if (ac.name) {
            person = ac.name;
        }
        else {
            person = ac.email;
        }
        var type = ac.type;
        if (type == "ownership") {
            if (activity == "received") return "Ownership Table sent to " + person;
            else if (activity == "viewed") return "Ownership Table viewed by "+person;
        }
        else {
            var document = ac.docname;
            if (activity == "sent") return document + " sent to "+person;
            else if (activity == "viewed") return document + " viewed by "+person;
            else if (activity == "reminder") return "Reminded "+person + " about " +document;
            else if (activity == "signed") return document + " signed by "+person;
            else if (activity == "uploaded") return document + " uploaded by "+person;
            else if (activity == "received") return "";
            else if (activity == "rejected") return "Signature on " +document + " rejected by "+person;
            else if (activity == "countersigned") return document + " countersigned by "+person;
            else return activity + " by "+person;
        }
    }
});

/* Filter to format the activity description on document status */
angular.module('HomeApp').filter('investordescription', function() {
    return function(ac) {
        var activity = ac.activity;
        var company = ac.company_name;
        if (company == null) {
            company = ac.company;
        }
        var person
        if (ac.name) {
            person = ac.name;
        }
        else {
            person = ac.email;
        }
        var type = ac.type;
        if (type == "ownership") {
            if (activity == "received") return "You received " + company + "'s captable";
            else if (activity == "viewed") return "You received " + company + "'s captable";
        }
        else if (type == "document") {
            var document = ac.docname;
            console.log(document);
            if (activity == "received") return "You received " + document + " from " + company;
            else if (activity == "viewed") return "You viewed " + document;
            else if (activity == "reminder") return "You were reminded about" +document;
            else if (activity == "signed") return "You signed "+document;
            else if (activity == "rejected") return company + "rejected your signature on" +document;
            else if (activity == "countersigned") return company + " countersigned "+document;
            else  {
                return activity + " by "+person;
            }
        }
        else {
            return "";
        }
    }
});
