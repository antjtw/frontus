app.controller('tranController',
    ['$scope', '$location', 'SWBrijj', 'navState', 'captable', 'displayCopy', 'calculate',
        function($scope, $location, SWBrijj, navState, captable, displayCopy, calculate) {

            var company = navState.company;
            $scope.company = company;

            captable.forceRefresh();
            $scope.ct = captable.getCapTable();
            $scope.captable = captable;
            $scope.calculate = calculate;
            $scope.search = {};
            $scope.search.text = "";

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
            
            $scope.contains = function(searchText, tran) {
                var text = searchText.toLowerCase();
                return (text == "") ||
                    (tran.attrs.security && (tran.attrs.security.toLowerCase()).indexOf(text) != -1) ||
                    (tran.attrs.investor && (tran.attrs.investor.toLowerCase()).indexOf(text) != -1) ||
                    (tran.kind.indexOf(text) != -1);
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
