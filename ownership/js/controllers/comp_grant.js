app.controller('grantController',
    ['$scope', '$location', 'SWBrijj', 'navState', 'captable', 'displayCopy',
function($scope, $location, SWBrijj, navState, captable, displayCopy) {
    if (navState.role == 'investor') {
        $location.path('/investor-grants');
        return;
    }

    var company = navState.company;
    $scope.company = company;

    $scope.ct = captable.getCapTable();
    $scope.captable = captable;

    $scope.captabletips = displayCopy.captabletips;

    $scope.sideToggle = false;
    $scope.viewMode = true;
    $scope.optionView = "Security";

    $scope.selectedCell = null;
    $scope.selectedInvestor = null;
    $scope.selectedSecurity = null;
    $scope.selectedThing = function() {
        if ($scope.selectedCell) return 'selectedCell';
        if ($scope.selectedInvestor) return 'selectedInvestor';
        if ($scope.selectedSecurity) return 'selectedSecurity';
        return null;
    };

    $scope.selectCell = function(inv, sec, kind) {
        $scope.selectedInvestor = $scope.selectedSecurity = null;
        if ($scope.selectedCell &&
                $scope.selectedCell.investor == inv &&
                $scope.selectedCell.security == sec &&
                $scope.selectedCell.kind == kind)
        {
            $scope.selectedCell = null;
        } else {
            $scope.selectedCell = captable.grantCellFor(inv, sec, kind);
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

    // Captable Sharing Modal
    $scope.modalUp = function () {
        $scope.capShare = true;
    };

    $scope.close = function () {
        $scope.closeMsg = 'I was closed at: ' + new Date();
        $scope.capShare = false;
    };

    $scope.shareopts = {
        backdropFade: true,
        dialogFade: true,
        dialogClass: 'capshareModal mini modal'
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
