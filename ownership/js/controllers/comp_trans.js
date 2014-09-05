app.controller('tranController',
    ['$scope', '$location', 'SWBrijj', 'navState', 'captable', 'displayCopy', 'calculate',
        function($scope, $location, SWBrijj, navState, captable, displayCopy, calculate) {

            var company = navState.company;
            $scope.company = company;

            captable.forceRefresh();
            $scope.ct = captable.getCapTable();
            $scope.captable = captable;
            $scope.calculate = calculate;

            $scope.captabletips = displayCopy.captabletips;

            $scope.sideToggle = false;
            $scope.viewMode = true;


            $scope.makeActive = function(tran) {
                if ($scope.activeTran == tran) {
                    $scope.activeTran = null;
                } else {
                    $scope.activeTran = tran;
                }
            };

            $scope.shown = null;
            $scope.opendetails = function(obj) {
                if ($scope.shown == obj) {
                    $scope.shown = null;
                } else {
                    $scope.shown = obj;
                }
            };

        }]);
