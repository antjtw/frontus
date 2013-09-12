
var navm = angular.module('nav', ['ui.bootstrap'], function () {
});

/** @unused NavCtrl */
/* Not really, but referenced in angular attribute in .inc file */
navm.directive('navbar', function () {
  return {
    restrict: 'E',
    templateUrl: '/cmn/nav.html',
    controller: 'NavCtrl'
  }
});

navm.controller('NavCtrl', ['$scope', '$route', '$rootScope', 'SWBrijj',
  function ($scope, $route, $rootScope, SWBrijj) {
    $scope.companies = [];
    $rootScope.selected = {};

    $scope.nav = 'navBarLoggedOut';
    var singleBarPages = ["/", "/team/", "/careers/", "/press/", "/privacy/", "/?logout=1"];
    $scope.showBothBars = false;
    $rootScope.isLoggedIn = false;
    $rootScope.path = document.location.href.substring(document.location.href.indexOf(document.location.host)).replace(document.location.host, "");

    $scope.isCollapsed = true;
    $rootScope.loaded = true; // ngShow on loaded to prevent login box from flashing on page load

    $scope.people = {visible: false, adminlink: '/company/profile/people', investorlink: '/investor/profile', link: ''};

    $scope.switch = function (nc) {
      $rootScope.path = document.location.href.substring(document.location.href.indexOf(document.location.host)).replace(document.location.host, "");
      /** @name SWBrijj#switch_company
       * @function
       * @param {string} company
       * @param {string} role
       */
      SWBrijj.switch_company(nc.company, nc.role).then(function (data) {
        $scope.initCompany(data);
        $route.reload();
      });
    };

    $scope.initCompany = function(cmps) {
      $scope.companies = cmps;
      if ( ! (cmps && cmps.length > 0) ) return; // no companies
      var thiscmp = cmps[0]; // pick the first one in case none are marked selected
      for (var i = 0; i < cmps.length; i++) {
        if (cmps[i].current) {
          thiscmp = cmps[i];
          break;
        }
      }
      $rootScope.selected = thiscmp;
      if (!thiscmp.current) {
          SWBrijj.switch_company(thiscmp.company, thiscmp.role).then(function (data) {
              angular.forEach(data, function (comp) {
                  if (thiscmp.company == comp.company && comp.current == true) {
                      thiscmp.current = true;
                  }
              });
            $route.reload();
          });
      }


      if (thiscmp.role == 'issuer') {
        $scope.people.link = $scope.people.adminlink;
        $scope.people.visible = true;
      } else {
        $scope.people.link = $scope.people.investorlink;
        $scope.people.visible = false;
      }

      if (singleBarPages.indexOf($rootScope.path) > -1) {
        $scope.nav = 'navBarLoggedOut';
        $scope.showBothBars = false;
      } else {
        $scope.nav = 'navBar';
        $scope.showBothBars = true;
      }
      if ($rootScope.isLoggedIn) {
        if (thiscmp.role == 'issuer') { // If user does not belong in a company, the link will be the default homepage URL
          $scope.logoLink = '/home/company';
          if ($rootScope.path == "/") {
            document.location.href = '/home/company';
            return;
          }
        } else {
          $scope.logoLink = '/home';
          if ($rootScope.path == "/") {
            document.location.href = '/home';
            return;
          }
        }
      }
    };

    $rootScope.isLoggedIn = true;

    SWBrijj.tblm('global.my_companies').then(function (x) {
      $scope.initCompany(x);
    }).except(function (ignore) {
          void(ignore);
          $scope.nav = 'navBarLoggedOut';
          $rootScope.showLogin = true;
          $rootScope.isLoggedIn = false;
        });

    // Notification code
    $rootScope.notification = {visible: false};

    $rootScope.notification.show = function (color, message, callback) {
      $rootScope.notification.color = color;
      $rootScope.notification.message = message;
      $rootScope.notification.style = "notification " + color;
      $rootScope.notification.visible = true;
      setTimeout(function () {
        $rootScope.notification.visible = false;
        $rootScope.$apply();
        if (callback) {
          callback();
        }
      }, 3000);
    };

    // Returns true (disabling the login button) until the fields are filled out
    $scope.fieldCheck = function () {
      return !($scope.username && $scope.password);
    };

    // Login Function
    $scope.doLogin = function () {
      SWBrijj.login($scope.username.toLowerCase(), $scope.password).then(function (x) {
        if (x) {
          document.location.href = x;
        } else {
          document.location.href = "/login/?error=" + $scope.username;
        }
      }).except(function (x) {
            void(x);
            document.location.href = "/login/?error=" + x.message;
          });
    }
  }]);
