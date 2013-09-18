
function getCSSRule(ruleName, deleteFlag) {               // Return requested style obejct
  ruleName=ruleName.toLowerCase();                       // Convert test string to lower case.
  if (document.styleSheets) {                            // If browser can play with stylesheets
    for (var i=0; i<document.styleSheets.length; i++) { // For each stylesheet
      var styleSheet=document.styleSheets[i];          // Get the current Stylesheet
      var ii=0;                                        // Initialize subCounter.
      var cssRule=false;                               // Initialize cssRule.
      do {                                             // For each rule in stylesheet
        if (styleSheet.cssRules) {                    // Browser uses cssRules?
          cssRule = styleSheet.cssRules[ii];         // Yes --Mozilla Style
        } else {                                      // Browser usses rules?
          cssRule = styleSheet.rules[ii];            // Yes IE style.
        }                                             // End IE check.
        if (cssRule)  {                               // If we found a rule...
          if (cssRule.selectorText && cssRule.selectorText.toLowerCase()==ruleName) { //  match ruleName?
            if (deleteFlag=='delete') {             // Yes.  Are we deleteing?
              if (styleSheet.cssRules) {           // Yes, deleting...
                styleSheet.deleteRule(ii);        // Delete rule, Moz Style
              } else {                             // Still deleting.
                styleSheet.removeRule(ii);        // Delete rule IE style.
              }                                    // End IE check.
              return true;                         // return true, class deleted.
            } else {                                // found and not deleting.
              return cssRule;                      // return the style object.
            }                                       // End delete Check
          }                                          // End found rule name
        }                                             // end found cssRule
        ii++;                                         // Increment sub-counter
      } while (cssRule)                                // end While loop
    }                                                   // end For loop
  }                                                      // end styleSheet ability check
  return false;                                          // we found NOTHING!
}                                                         // end getCSSRule



var navm = angular.module('nav', ['ui.bootstrap'], function () {
});

navm.factory('navState', [function () {
  if (!document.sessionState) document.sessionState = {};
  return {
    company: document.sessionState.company,
    name: document.sessionState.name || document.sessionState.company,
    role: document.sessionState.role,
    userid: document.sessionState.userid,
    tester: document.sessionState.userid && document.sessionState.userid.match(/sharewave.com/),
    path: undefined
  }
}]);

/** @unused NavCtrl */
/* Not really, but referenced in angular attribute in .inc file */
navm.directive('navbar', function () {
  return {
    restrict: 'E',
    templateUrl: '/cmn/nav.html',
    controller: 'NavCtrl'
  }
});

navm.controller('NavCtrl', ['$scope', '$route', '$rootScope', 'SWBrijj', '$q', 'navState',
  function ($scope, $route, $rootScope, SWBrijj, $q, navState) {
    $scope.companies = [];

    if (location.host=='share.wave' || navState.tester) {
      var rr = getCSSRule('.for-r0ml');
      if (rr) {
        rr.style.display="inline";
      }
    }
    var singleBarPages = ["/", "/team/", "/careers/", "/press/", "/privacy/"];
    $scope.navState = navState;
    navState.path = document.location.pathname;
    $scope.noNav = singleBarPages.indexOf(navState.path) > -1;
    $scope.isCollapsed = true;

    $scope.people = {visible: false, adminlink: '/company/profile/people', investorlink: '/investor/profile', link: ''};

    $scope.switch = function (nc) {
      /** @name SWBrijj#switch_company
       * @function
       * @param {string} company
       * @param {string} role
       */
      SWBrijj.switch_company(nc.company, nc.role).then(function (data) {
        $scope.initCompany(data);
      });
    };
    $scope.toggleLogin = function() {
      $scope.isCollapsed = !$scope.isCollapsed;
    }
    $scope.patchThingsUp = function() {
      // FIXME:  all this stuff should be run after switch_company return above.
      if (navState.role == 'issuer') {
        $scope.people.link = $scope.people.adminlink;
        $scope.people.visible = true;
      } else {
        $scope.people.link = $scope.people.investorlink;
        $scope.people.visible = false;
      }
    }

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
      if (thiscmp.current || thiscmp.role=='sheriff') {
        navState.company = thiscmp.company;
        navState.role = thiscmp.role;
        navState.name = thiscmp.name;
        $scope.patchThingsUp();
        $route.reload();
      } else {
          SWBrijj.switch_company(thiscmp.company, thiscmp.role).then(function (data) {
              angular.forEach(data, function (comp) {
                  if (thiscmp.company == comp.company && comp.current == true) {
                    thiscmp.current = true;
                    navState.company = thiscmp.company;
                    navState.role = thiscmp.role;
                    navState.name = thiscmp.name;
                    $scope.patchThingsUp();
                    $route.reload();
                    return;
                  }
              });
          });
      }

    };

    SWBrijj.tblm('global.my_companies').then(function (x) {
      $scope.initCompany(x);
    }).except(function (ignore) {
          void(ignore);
          $scope.navState={}; // ?
        });

    // Notification code
    $scope.notification = {visible: false};

    $rootScope.$on('notification', function (event, color, message, callback) {
      $scope.notification.color = color;
      $scope.notification.message = message;
      $scope.notification.style = "notification " + color;
      $scope.notification.visible = true;
      setTimeout(function () {
        $scope.notification.visible = false;
        $scope.$apply();
        if (callback) {
          callback();
        }
      }, 3000);
    });

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
