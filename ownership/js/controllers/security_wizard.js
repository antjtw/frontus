'use strict';

app.controller('createSecurity',
    ["$scope", "Documents", "captable", "$location", function($scope, Documents, captable, $location){
        $scope.step = 1;
        $scope.rawissue = {};
        $scope.issue = [];

        $scope.setType = function(type) {
            $scope.rawissue.type = type;
        };

        $scope.changeStep = function(newstep) {
            if (newstep == 2) {
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

