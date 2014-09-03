app.controller('invGrantController',
    ['$scope', 'SWBrijj', '$location', 'navState', 'captable', '$filter',
function($scope, SWBrijj, $location, navState, captable, $filter) {

    if (navState.role == 'issuer') {
        $location.path('/company-grants');
        return;
    }

    var company = navState.company;
    $scope.currentCompany = company;
    
    $scope.ct = captable.getCapTable();
    $scope.captable = captable;

    $scope.optionView = "Security";

    $scope.shown = null;
    $scope.opendetails = function(obj) {
        if ($scope.shown == obj) {
            $scope.shown = null;
        } else {
            $scope.shown = obj;
        }
    };
    
    $scope.setView = function(field) {
        $scope.optionView = field;
    };
    $scope.selectedCell = null;
    $scope.selectedInvestor = null;
    $scope.selectedSecurity = null;

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
    $scope.selectInvestor = function(inv) {
    };
}]);
