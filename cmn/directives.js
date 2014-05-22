var m = angular.module('commonDirectives', ['ui.select2', 'brijj']);

m.directive('composeMessage', function() {
    return {
        scope: false,
        replace: true,
        restrict: 'E',
        templateUrl: '/cmn/partials/composeMessage.html',
        controller: ['$scope', '$rootScope', 'SWBrijj', 
        function($scope, $rootScope, SWBrijj) {
            $scope.getInvestors = function() {
                $scope.investors = [];
                angular.forEach($scope.people, function(p) {
                    $scope.investors.push(p.selector);
                });
            };

            $scope.getInvestors();
            $scope.resetMessage = function() {
                $scope.message = {recipients:[],
                                  text:"",
                                  subject:""};
                $scope.recipients = []
            };
            $scope.resetMessage();
            $scope.composeopts = {
                backdropFade: true,
                dialogFade: true,
            };
            $scope.select2Options = {
                'multiple': true,
                'simple_tags': true,
                'tags': function(){return $scope.investors;},
                'tokenSeparators': [",", " "],
                'placeholder': 'Enter email address & press enter'
            };

            

            $scope.sendMessage = function(msg) {
                var category = 'company-message';
                var template = 'company-message.html';
                var newtext = msg.text.replace(/\n/g, "<br />");
                var recipients = $scope.recipients;
                $scope.clicked = true;
                console.log(recipients)
                 // assume that recipients are valid
                // var regExp = /\(([^)]+)\)/;
                // var recipients = [];
    
                // angular.forEach(msg.recipients, function(person) {
                //     var matches = regExp.exec(person);
                //     if (matches == null) {
                //         matches = ["", person];
                //     }
                //     recipients.push(matches[1]);
                // });
                SWBrijj.procm('mail.send_message',
                              JSON.stringify(recipients),
                              category,
                              template,
                              msg.subject,
                              newtext
                ).then(function(x) {
                    void(x);
                    $rootScope.billing.usage.direct_messages_monthly += recipients.length;
                    $scope.$emit("notification:success",
                        "Message sent!");
                    $scope.toggleSide();
                    $scope.resetMessage();
                    $scope.recipients = [];
                    $scope.clicked = false;

                }).except(function(err) {
                    void(err);
                    $scope.$emit("notification:fail",
                        "Oops, something went wrong.");
                    $scope.clicked = false;
                });
            };
            $scope.readyToSend = function(msg) {
                // $scope.getInvestors();
                // var anybad = false;
                if ($scope.recipients.length===0
                    || msg.subject===""
                    || msg.text==="") {
                    return false;
                }
                else {
                    return true;
                }
                // angular.forEach(msg.recipients, function(e) {
                //     if ($scope.investors.indexOf(e) === -1) {
                //         anybad = true;
                //     }
                // });
                // return !anybad;
            };

        }]
    };
});

m.directive('paymentPlanSelector', function() {
    return {
        scope: false,
        replace: true,
        restrict: 'E',
        templateUrl: '/cmn/partials/paymentPlanSelector.html',
        controller: ['$scope', '$rootScope', '$routeParams',
        function($scope, $rootScope, $routeParams) {

            if ($routeParams.plan) {
                $rootScope.selectedPlan = $routeParams.plan;
            }
            $rootScope.$watch('selectedPlan', function(){
                $scope.selectedPlan = $rootScope.selectedPlan;
            });

            $scope.selectPlan = function(p) {
                if ($rootScope.selectedPlan == p) {
                    $rootScope.selectedPlan = null;
                } else {
                    if ($rootScope.billing) {
                        if ($rootScope.billing.plans.indexOf(p)!==-1) {
                            $rootScope.selectedPlan = p;
                        } else {
                            console.log(p);
                        }
                    } else {
                        $rootScope.selectedPlan = p;
                    }
                }
            };
        }]
    };
});

m.directive('meter', function() {
    return {
        scope: {cur: '=',
                tot: '='},
        replace: true,
        restrict: 'E',
        templateUrl: '/cmn/partials/meter.html',
        controller: ['$scope', function($scope) {
            $scope.meterStyle = {};
            $scope.updateMeter = function() {
                $scope.meterStyle = {"width":
                                     ($scope.cur/$scope.tot)*100 + "%"};
                if ($scope.cur/$scope.tot > 1) {
                    console.log("here");
                    $scope.meterStyle["background-color"] = "#E74C3C";
                }
            };
            $scope.$watch('cur', $scope.updateMeter);
            $scope.$watch('tot', $scope.updateMeter);
        }]
    };
});
