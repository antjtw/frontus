//app for the program
var app = angular.module('RegisterApp', ['ngRoute', 'brijj', 'angularPayments'], function($routeProvider, $locationProvider){
  $locationProvider.html5Mode(true).hashPrefix('');

  $routeProvider.
      when('/register/', {controller:'PeopleCtrl', templateUrl:'people.html'}).
      when('/register/company', {controller:'CompanyCtrl', templateUrl: 'company.html'}).
      when('/register/company-self', {controller:'CompanySelfCtrl', templateUrl: 'company-self.html'}).
      when('/register/company-onestep', {controller:'CompanyOneStep', templateUrl: 'company-onestep.html'}).
      when('/register/people', {controller:'PeopleCtrl', templateUrl: 'people.html'}).
      when('/register/signup', {controller:'SignupCtrl', templateUrl: 'signup.html'}).
      otherwise({redirectTo:'/register/'});
});

/** @name $scope#activated
 * @type {boolean} */
/** @name $scope#redirect
 * @type {string} */
/** @name $scope#email
 * @type {string} */

app.controller('CompanyCtrl', ['$scope', '$location', '$routeParams', 'SWBrijj',
    function($scope, $location, $routeParams, SWBrijj) {
        $scope.code = $routeParams.code;

        if (!$scope.code) {
            document.location.href = "/";
        }

        /** @name SWBrijj#getInvitation
         * @function
         * @param {string} code
         */
        SWBrijj.getInvitation($scope.code).then(function(x) {
            initPage($scope, x);
            if ($scope.activated) {
                document.location.href = "/login";
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
                if (x) {
                    document.location.href = x + "?msg=first";
                } else {
                    document.location.href = '/login';
                }
            });
        };

        $scope.fieldCheck = function() {
            return !$scope.password;
        };
    }
]);

app.controller('CompanySelfCtrl', ['$scope', '$location', '$routeParams', 'SWBrijj', 'payments',
    function($scope, $location, $routeParams, SWBrijj, payments) {
        $scope.code = $routeParams.code;

        if (!$scope.code) {
            document.location.href = "/";
        }

        /** @name SWBrijj#getInvitation
         * @function
         * @param {string} code
         */
        SWBrijj.getInvitation($scope.code).then(function(x) {
            initPage($scope, x);
            if ($scope.activated) {
                document.location.href = "/login";
            }
        });

        $scope.activate = function() {
            SWBrijj.doCompanySelfActivate($scope.email, $scope.code, $scope.password, $scope.pname, '', $scope.cname, false).then(function(activated) {
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
            return !($scope.pname && $scope.password && $scope.cname);
        };
    }
]);

app.controller('CompanyOneStep', ['$scope', '$routeParams', 'SWBrijj',
    function($scope, $routeParams, SWBrijj) {
        
        $scope.selectPlan = function(p) {
            if ($scope.selectedPlan == p) {
                $scope.selectedPlan = null;
            } else {
                $scope.selectedPlan = p;
            }
        };
        $scope.fieldCheck = function() {
            var fs = angular.element('form[name="stripeForm"]').scope();
            return !($scope.selectedPlan &&
                     fs.pname &&
                     fs.cname &&
                     fs.email &&
                     fs.password &&
                     fs.number &&
                     fs.expiry &&
                     fs.cvc);
        };
        $scope.getPaymentToken = function(status, response) {
            if (response.error) {
                console.log(response);
                $scope.$emit("notification:fail",
                             "Invalid credit card. Please try again.");
            } else {
                $scope.payment_token = response.id;
                $scope.register();
            }
        };

        $scope.register = function() {
            SWBrijj.doCompanyOneStepRegister($scope.email, $scope.password,
                                             $scope.pname, $scope.cname,
                                             $scope.payment_token,
                                             $scope.selectedPlan
            ).then(function(registered) {
                $scope.$emit("notification:success",
                             "Welcome to Sharewave!");
                if (registered) {
                    document.location.href = registered + "?msg=first";
                } else {
                    document.location.href = "/login";
                }
            }).except(function(x) {
                $scope.$emit("notification:fail",
                             "Oops, something went wrong.");
            });
        };

    }
]);
app.controller('PeopleCtrl', ['$scope', '$location', '$routeParams', 'SWBrijj',
    function($scope, $location, $routeParams, SWBrijj) {
        $scope.code = $routeParams.code;

        if (!$scope.code) {
            document.location.href = "/";
        }

        SWBrijj.getInvitation($scope.code).then(function(x) {
            initPage($scope, x);
            if ($scope.activated) {
                if ($scope.redirect) {
                    document.location.href = $scope.redirect;
                } else {
                    document.location.href = "/login";
                }
            }
        });

        $scope.doActivate = function() {
            SWBrijj.doActivate($scope.email.toLowerCase(), $scope.name, $scope.code, $scope.password, false).then(function(y) {
                if ($scope.redirect) {
                    if ($scope.redirect.indexOf("?") != -1) {
                        $scope.redirect = $scope.redirect + "&reg=first"
                    } else {
                        $scope.redirect = $scope.redirect + "?reg=first"
                    }
                    document.location.href = $scope.redirect;
                } else {
                    document.location.href = y + "?reg=first";
                }
            });
        };

        $scope.fieldCheck = function() {
            return !($scope.name && $scope.password && $scope.name.length > 1);
        };

    }
]);


app.controller('SignupCtrl', ['$scope', '$rootScope', '$route', '$location', '$routeParams', 'SWBrijj',
    function($scope, $rootScope, $route, $location, $routeParams, SWBrijj) {
        $scope.user = {};

        $scope.registertoggle = false;


        var re = /^(([^<>()[\]\\.,;:\s@\"]+(\.[^<>()[\]\\.,;:\s@\"]+)*)|(\".+\"))@((\[[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\])|(([a-zA-Z\-0-9]+\.)+[a-zA-Z]{2,}))$/;
        $scope.fieldCheck = function(email) {
            return email != undefined ? re.test(email) : false;
        };

        $scope.companySelfRegister = function() {
            if ($scope.fieldCheck($scope.registeremail)) {
                SWBrijj.companySelfRegister($scope.registeremail.toLowerCase(), 'issuer').then(function(requested) {
                    $scope.registeremail = "";
                    $scope.registertoggle = true;
                    dataLayer.push({
                        'event': 'signup_success'
                    }); // for analytics
                    void(requested);
                }).except(function(x) {
                    console.log(x);
                    if (x['message'].indexOf("ERROR: duplicate key value") !== -1) {
                        $scope.$emit("notification:fail", "This email address is already registered, try logging in.");
                    } else {
                        $scope.$emit("notification:fail", "Oops, something went wrong.");
                    }
                });
            } else {
                $scope.$emit("notification:fail", "Please enter a valid email");
            }
        };

        $scope.oldSafari = function() {
            return (!(navigator.sayswho[0] == "Safari" && $scope.version_compare("537.43.58", navigator.sayswho[1])));
        }

    }
]);


/**
 * @param $scope
 * @param {[string]} x
 * @param {int} [row]
 */

function initPage($scope, x, row) {
    if (typeof(row) === 'undefined') row = 1;
    var y = x[0]; // the fieldnames
    var z = x[row]; // the values

    for (var i = 0; i < y.length; i++) {
        if (z[i] !== null) {
            $scope[y[i]] = z[i];
        }
    }
}
