app.controller('grantController',
    ['$scope', '$location', 'SWBrijj', 'navState', 'captable', 'displayCopy', 'calculate',
function($scope, $location, SWBrijj, navState, captable, displayCopy, calculate) {
    if (navState.role == 'investor') {
        $location.path('/investor-grants');
        return;
    }

    var company = navState.company;
    $scope.company = company;

    captable.forceRefresh();
    $scope.ct = captable.getCapTable();
    $scope.captable = captable;
    $scope.calculate = calculate;

    $scope.captabletips = displayCopy.captabletips;

    $scope.sideToggle = false;
    $scope.viewMode = true;
    $scope.optionView = "Security";

    $scope.selectedCell = null;
    $scope.selectedInvestor = null;
    $scope.selectedSecurity = null;
    $scope.currentTab = 'details';
    $scope.selectedThing = function() {
        if ($scope.selectedCell) return 'selectedCell';
        if ($scope.selectedInvestor) return 'selectedInvestor';
        if ($scope.selectedSecurity) return 'selectedSecurity';
        return null;
    };

    $scope.limitLength = function(str, len) {
        if (str.length > len)
            return str.substring(0, len - 3) + "...";
        return str;
    };

    $scope.selectCell = function(grant, kind) {
        $scope.currentTab = 'details';
        $scope.selectedInvestor = $scope.selectedSecurity = null;
        if ($scope.selectedCell &&
                $scope.selectedCell.roots[0].transaction == grant &&
                $scope.selectedCell.kind == kind)
        {
            $scope.selectedCell = null;
        } else {
            $scope.selectedCell = captable.grantCellFor(grant, kind);
        }
    };
    $scope.selectSecurity = function(sec) {
        $scope.selectedCell = $scope.selectedInvestor = null;
        if ($scope.selectedSecurity &&
                $scope.selectedSecurity.security == sec)
        {
            $scope.selectedSecurity = null;
        } else {
            $scope.selectedSecurity = $scope.ct.securities
                .filter(function(el) {
                    return el.name == sec;
                })[0];
        }
    };
    $scope.selectInvestor = function(inv) {
        $scope.selectedCell = $scope.selectedSecurity = null;
        if ($scope.selectedInvestor &&
                $scope.selectedInvestor.investor == inv)
        {
            $scope.selectedInvestor = null;
        } else {
            $scope.selectedInvestor = $scope.ct.investors
                .filter(function(el) {
                    return el.name == inv;
                })[0];
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

    $scope.editViewToggle = function() {
        $scope.viewMode = !$scope.viewMode;
        if (!$scope.viewMode) {
            $scope.optionView = "Security";
        }
    };

    $scope.togglename = function() {
        return $scope.viewMode ? "Edit" : "View";
    };

    $scope.setView = function(field) {
        $scope.optionView = field;
    };

}]);
