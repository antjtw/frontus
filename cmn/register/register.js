var reg = angular.module('registerDirective', ['brijj']);

reg.directive('registerForm', function() {
    return {
        restrict: 'A',
        scope: {
        },
        templateUrl: '/cmn/register/register.html',
        controller: ['$scope','SWBrijj', function($scope, SWBrijj) {

            $scope.user = {};
            $scope.$parent.toggle = false;

            var re = /^(([^<>()[\]\\.,;:\s@\"]+(\.[^<>()[\]\\.,;:\s@\"]+)*)|(\".+\"))@((\[[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\])|(([a-zA-Z\-0-9]+\.)+[a-zA-Z]{2,}))$/;
            $scope.fieldCheck = function(email) {
                return re.test(email);
            };

            $scope.companySelfRegister = function () {
                if ($scope.fieldCheck($scope.user.email)) {
                    SWBrijj.companySelfRegister($scope.user.email.toLowerCase(), 'issuer').then(function(requested) {
                        $scope.$parent.toggle = !$scope.$parent.toggle;
                        dataLayer.push({'event': 'signup_success'}); // for analytics
                        void(requested);
                    }).except(function (x) {
                            if (x['message'].indexOf("ERROR: duplicate key value") !== -1) {
                                $scope.$emit("notification:fail", "This email address is already registered, try logging in.");
                            }
                            else {
                                $scope.$emit("notification:fail", "Oops, something went wrong.");
                            }
                        });
                }
                else { $scope.$emit("notification:fail", "Please enter a valid email"); }
            };

        }]
    }
});