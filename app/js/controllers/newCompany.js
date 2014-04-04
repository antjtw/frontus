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
                $scope.createCompany();
            }
        };

        $scope.createCompany = function() {

        };
        /*
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
        */

    }
]);
