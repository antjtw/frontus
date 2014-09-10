var app = angular.module('RegisterApp',
        ['ngRoute', 'brijj', 'angularPayments', 'commonDirectives',
         'commonServices'],
function($routeProvider, $locationProvider){
    $locationProvider.html5Mode(true).hashPrefix('');

    $routeProvider.
        when('/register/company-onestep', {controller:'CompanyOneStep', templateUrl: 'company-onestep.html'}).
        when('/register/people', {controller:'PeopleCtrl', templateUrl: 'people.html'}).
        otherwise({redirectTo:'/register/company-onestep'});
});

app.controller('CompanyOneStep',
               ['$scope', 'payments', '$routeParams', 'SWBrijj', '$location', '$filter',
    function($scope, payments, $routeParams, SWBrijj, $location, $filter) {
        $scope.selectedPlan = '002';
        $scope.coupon_code = $routeParams.c;
        $scope.trial_period = $routeParams.t;
        if ($scope.coupon_code) {
            payments.get_coupon($scope.coupon_code).then(function(x) {
                var cpn = JSON.parse(x);
                if (cpn.percent_off) {
                    $scope.formatted_coupon = cpn.percent_off + "% off";
                } else {
                    $scope.formatted_coupon = $filter('currency')(cpn.amount_off/100, "$") + " off";
                }
                if (cpn.duration == 'repeating') {
                    $scope.formatted_coupon += " for "+cpn.duration_in_months+" months";
                } else if (cpn.duration == 'forever') {
                    $scope.formatted_coupon += " forever";
                } else {
                    $scope.formatted_coupon += " your first month";
                }
            });
        }

        $scope.fieldCheck = function() {
            var fs = angular.element('form[name="stripeForm"]').scope();
            return !($scope.selectedPlan &&
                     fs.pname &&
                     fs.cname &&
                     fs.email &&
                     fs.password &&
                     fs.cardname &&
                     fs.number &&
                     fs.expiry &&
                     fs.cvc);
        };

        $scope.register = function() {
            $scope.truePlan = $scope.selectedPlan;
            if ($scope.trial_period) {
                $scope.truePlan += "-" + $scope.trial_period + "daytrial";
            }

            SWBrijj.doCompanyOneStepRegister($scope.email.toLowerCase(), $scope.password,
                                             $scope.pname, $scope.cname,
                                             $scope.payment_token,
                                             $scope.truePlan,
                                             $scope.coupon_code
            ).then(function(registered) {
                if (registered) {
                    document.location.href = registered + "?msg=first";
                } else {
                    document.location.href = "/login";
                }
                $scope.processing = false;
            }).except(function(x) {
                $scope.handleError(x);
                $scope.processing = false;
                console.log(x);
            });
        };
        $scope.handleError = function(err) {
            if (err.message.indexOf("duplicate key value violates unique constraint") !== -1) {
                $scope.errorMessage = "This email address is already registered, try logging in.";
                $scope.errorLink = "/login";
            } else {
                $scope.errorMessage = "Something went wrong. Please check your information and try again.";
            }
        };
        $scope.gotoPage = function(url) {
            $location.url(url);
        };
        $scope.getPaymentToken = function(status, response) {
            if (response.error) {
                $scope.processing = false;
                $scope.$emit("notification:fail",
                             "Invalid credit card. Please try again.");
            } else {
                $scope.processing = true;
                $scope.payment_token = response.id;
                $scope.register();
            }
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
