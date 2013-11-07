
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
            } while (cssRule);                                // end While loop
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
        name: document.sessionState.name,
        role: document.sessionState.role,
        userid: document.sessionState.userid,
        userhash: document.sessionState.userhash,
        tester: document.sessionState.userid && document.sessionState.userid.match(/r0ml/|/r0bert/),
        path: undefined
    };
}]);

/** @unused NavCtrl */
/* Not really, but referenced in angular attribute in .inc file */
navm.directive('navbar', function () {
    return {
        restrict: 'E',
        templateUrl: '/cmn/nav.html',
        controller: 'NavCtrl'
    };
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
        var singleBarPages = ["/", "/team/", "/careers/", "/press/", "/privacy/", "/terms/"];
        $scope.navState = navState;
        navState.path = document.location.pathname;
        $scope.noNav = singleBarPages.indexOf(navState.path) > -1;
        $scope.isCollapsed = true;

        $scope.switch = function (nc) {
            console.log("navState switch");
            /** @name SWBrijj#switch_company
             * @function
             * @param {string} company
             * @param {string} role
             */
            SWBrijj.switch_company(nc.company, nc.role).then(function (data) {
                document.location.href = nc.role=='issuer' ? '/home/company' : '/home/investor';
            });
        };
        $scope.toggleLogin = function() {
            $scope.isCollapsed = !$scope.isCollapsed;
        };

        // Take the string from the database and parse it into a useable dictionary
        $scope.initReasons = function(reasons) {
            var dictionary = {};
            var temp = reasons.substring(1, reasons.length-1).split(",");
            angular.forEach(temp, function(reason) {
                dictionary[reason] = true;
            });
            return dictionary;
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
            if (thiscmp.current || thiscmp.role=='sheriff') {
                navState.company = thiscmp.company;
                navState.role = thiscmp.role;
                navState.name = thiscmp.name;
                navState.reasons = $scope.initReasons(thiscmp.reasons);
                Intercom('boot', {email:$rootScope.navState.userid, user_hash: $rootScope.navState.userhash,  app_id: "e89819d5ace278b2b2a340887135fa7bb33c4aaa", name:$rootScope.person.name, company:{id: $rootScope.navState.company, name: $rootScope.navState.name}});
                // We should take this out I think but need to double check this
                //$route.reload();
            } else {
                SWBrijj.switch_company(thiscmp.company, thiscmp.role).then(function (data) {
                    angular.forEach(data, function (comp) {
                        if (thiscmp.company == comp.company && comp.current === true) {
                            thiscmp.current = true;
                            navState.company = thiscmp.company;
                            navState.role = thiscmp.role;
                            navState.name = thiscmp.name;
                            navState.reasons = $scope.initReasons(thiscmp.reasons);
                            console.log("initCompany switch");
                            document.location.href = navState.role=='issuer' ? '/home/company' : '/home/investor';
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

        SWBrijj.tblm('account.my_company_settings').then(function (x) {
            $rootScope.settings = x[0];
            $rootScope.settings.shortdate = $scope.settings.dateformat == 'MM/dd/yyyy' ? 'MM/dd/yy' : 'dd/MM/yy';
            $rootScope.settings.longdate = $scope.settings.dateformat == 'MM/dd/yyyy' ? 'MMMM  dd' : 'dd MMMM';
            $rootScope.settings.lowercasedate = $scope.settings.dateformat.toLowerCase();
        });

        SWBrijj.tblm('account.profile').then(function(x) {
            $rootScope.person = x[0];
            $rootScope.userURL = '/photo/user?id=' + x[0].email;
        });

        // Notification code
        $scope.notification = {visible: false};

        $rootScope.$on('notification:success', function (event, message, callback) {
            $scope.notiFn('success',message,callback);
        });

        $rootScope.$on('notification:fail', function (event, message, callback) {
            $scope.notiFn('fail',message,callback);
        });

        $scope.notiFn = function(color, message, callback) {
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
        };

        $scope.gotohome = function() {
            location.href = navState.role=='issuer' ? '/home/company' : '/home/investor';
        };
    }]);
