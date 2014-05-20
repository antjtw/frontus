app.controller('NewCompanyCtrl',
               ['$scope', '$rootScope', '$routeParams', 'SWBrijj',
    function($scope, $rootScope, $routeParams, SWBrijj) {
        
        $scope.toggleCoupon = function() {
            $scope.enter_coupon = !$scope.enter_coupon;
        };
        
        if ($routeParams.coupon) {
            $scope.coupon_code = $routeParams.coupon;
            $scope.toggleCoupon();
        }
        $rootScope.selectedPlan = '002';
        $rootScope.selectPlan = function(p) {
            if ($rootScope.selectedPlan == p) {
                $rootScope.selectedPlan = null;
            } else {
                $rootScope.selectedPlan = p;
            }
        };
        $scope.fieldCheck = function() {
            var fs = angular.element('form[name="stripeForm"]').scope();
            return !($rootScope.selectedPlan &&
                     fs.cname &&
                     fs.cardname &&
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
                $scope.createCompany();
            }
        };

        $scope.createCompany = function() {
            SWBrijj.procm('account.new_company',
                          $scope.cname,
                          $rootScope.selectedPlan,
                          $scope.payment_token,
                          $scope.coupon_code)
            .then(function(new_comp_id) {
                $scope.$emit("notification:success",
                             "New company created!");
                var company = {company: new_comp_id[0].new_company,
                               role: "issuer"};
                $scope.switchCandP(company,
                                   "/app/home/company?cc");
            })
            .except(function(err) {
                console.log(err);
            });

        };
    }
]);
