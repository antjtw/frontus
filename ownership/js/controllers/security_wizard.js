'use strict';

app.controller('createSecurity',
    ["$scope", "Documents", "captable", "$location", "$routeParams", "$rootScope", function($scope, Documents, captable, $location, $routeParams, $rootScope){
        $scope.step = 1;
        $scope.rawissue = {};
        $scope.issue = [];

        $scope.setType = function(type) {
            $scope.rawissue.type = type;
        };

        $rootScope.$watchCollection(function() {
            return captable.getCapTable().securities;
        }, function(securities) {
            securities.some(function(sec) {
                if (sec.name == $routeParams.issue) {
                    $scope.issue = [sec];
                    $scope.rawissue.name = $scope.issue[0].transactions[0].attrs.security;
                    $scope.rawissue.type = $scope.issue[0].transactions[0].attrs.security_type;
                    $scope.step = 2;
                }
            });
        });

        $scope.changeStep = function(newstep) {
            if (newstep == 2) {
                $location.search('issue', $scope.rawissue.name).replace();
                $scope.issue.push(captable.newSecurity());
                $scope.issue[0].transactions[0].attrs.security = $scope.rawissue.name;
                $scope.issue[0].transactions[0].attrs.security_type = $scope.rawissue.type;
                $scope.issue[0].transactions[0].effective_date = new Date.today();
                captable.addSecurity($scope.issue[0]);
            }
            $scope.step = newstep
        };

        $scope.cancel = function() {
            if ($scope.step > 1) {
                captable.deleteSecurity($scope.issue[0], true);
            }
            $location.url('/app/ownership/company-captable');
        };
    }]);

