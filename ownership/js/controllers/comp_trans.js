app.controller('tranController',
    ['$scope', '$location', 'SWBrijj', 'navState', 'captable', 'displayCopy', 'calculate', '$filter',
        function($scope, $location, SWBrijj, navState, captable, displayCopy, calculate, $filter) {

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
                    (tran.kind.indexOf(text) != -1) ||
                    ($filter('date')(tran.effective_date, $scope.settings.shortdate).indexOf(text) != -1);
            };
            
            $scope.limitLength = function(str, len) {
                if (!str)
                    return "";
                if (str.length > len)
                    return str.substring(0, len - 3) + "...";
                return str;
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
