app.controller('tranController',
    ['$scope', '$location', 'SWBrijj', 'navState', 'captable', 'displayCopy', 'calculate', '$filter', '$window',
        function($scope, $location, SWBrijj, navState, captable, displayCopy, calculate, $filter, $window) {

            var company = navState.company;
            $scope.company = company;

            captable.forceRefresh();
            $scope.ct = captable.getCapTable();
            $scope.captable = captable;
            $scope.calculate = calculate;
            $scope.search = {};
            $scope.search.text = "";

            $scope.captabletips = displayCopy.captabletips;

            $scope.sideToggle = true;
            $scope.viewMode = true;

            $scope.viewheight = {'height': String($window.innerHeight - 100) + "px", 'overflow-y': 'hidden'};

            $scope.makeActive = function(tran) {
                if ($scope.activeTran == tran) {
                    $scope.activeTran = null;
                    $scope.sideToggle = true;
                } else {
                    $scope.activeTran = tran;
                    $scope.sideToggle = false;
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

            $scope.selectedThing = function() {
                if ($scope.selectedCell) return 'selectedCell';
                if ($scope.selectedInvestor) return 'selectedInvestor';
                if ($scope.selectedSecurity) return 'selectedSecurity';
                return null;
            };
        }]);
