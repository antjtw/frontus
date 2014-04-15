app.controller('NewCompanyCtrl', ['$scope', '$routeParams', 'SWBrijj',
    function($scope, $routeParams, SWBrijj) {
        
        $scope.selectedPlan = '002';
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
                     fs.cname &&
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
                          $scope.selectedPlan,
                          $scope.payment_token)
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
