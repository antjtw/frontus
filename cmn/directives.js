var m = angular.module('commonDirectives', ['ui.select2', 'brijj']);

m.directive('composeMessage', function() {
    return {
        scope: false,
        replace: true,
        restrict: 'E',
        templateUrl: '/cmn/partials/composeMessage.html',
        controller: ['$scope', 'SWBrijj',
        function($scope, SWBrijj) {
            $scope.getInvestors = function() {
                $scope.investors = [];
                angular.forEach($scope.people, function(p) {
                    $scope.investors.push(p.email);
                });
            };
            $scope.getInvestors();
            $scope.resetMessage = function() {
                $scope.message = {recipients:[],
                                  text:"",
                                  subject:""};
            };
            $scope.resetMessage();
            $scope.composeopts = {
                backdropFade: true,
                dialogFade: true,
                dialogClass: 'compose-modal wideModal modal'
            };
            $scope.select2Options = {
                'multiple': true,
                'simple_tags': true,
                'tags': function(){return $scope.investors;},
                'tokenSeparators': [",", " "],
                'placeholder': 'Enter email address & press enter'
            };
            $scope.composeModalOpen = function() {
                $scope.composeModal = true;
            };
            $scope.sendMessage = function(msg) {
                var category = 'company-message';
                var template = 'company-message.html';
                SWBrijj.procm('mail.send_message',
                              JSON.stringify(msg.recipients),
                              category,
                              template,
                              msg.subject,
                              msg.text
                ).then(function(x) {
                    void(x);
                    $scope.$emit("notification:success",
                        "Message sent!");
                    $scope.composeModalClose();
                }).except(function(err) {
                    void(err);
                    $scope.$emit("notification:fail",
                        "Oops, something went wrong.");
                });
            };
            $scope.readyToSend = function(msg) {
                $scope.getInvestors();
                var anybad = false;
                if (msg.recipients.length===0
                    || msg.subject===""
                    || msg.text==="") {
                    return false;
                }
                angular.forEach(msg.recipients, function(e) {
                    if ($scope.investors.indexOf(e) === -1) {
                        anybad = true;
                    }
                });
                return !anybad;
            };
            $scope.composeModalClose = function() {
                $scope.resetMessage();
                $scope.composeModal = false;
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
        controller: ['$scope', function($scope) {
            $scope.selectedPlan = '002';
            $scope.selectPlan = function(p) {
                if ($scope.selectedPlan == p) {
                    $scope.selectedPlan = null;
                } else {
                    $scope.selectedPlan = p;
                }
            };
        }]
    };
});

m.directive('meter', function() {
    return {
        scope: {curProgress: '='},
        replace: true,
        restrict: 'E',
        templateUrl: '/cmn/partials/meter.html',
        controller: ['$scope', function($scope) {
            $scope.meterStyle = {"width": $scope.curProgress*100 + "%"};
        }]
    };
});
