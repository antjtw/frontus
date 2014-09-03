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

    $scope.sideToggle = true;

    $scope.rows = [];
    $scope.freqtypes = [];
    $scope.tf = ["yes", "no"];
    $scope.issues = [];
    $scope.security_names = [];
    $scope.equityissues = [];
    $scope.possibleActions = ['exercised', 'forfeited'];

    // False is edit mode, true is view mode
    $scope.viewMode = true;
    $scope.optionView = "Security";

    $scope.selectedCell = null;
    $scope.selectedInvestor = null;
    $scope.selectedSecurity = null;

    var keyPressed = false; // Needed because selecting a date in the calendar is considered a blur, so only save on blur if user has typed a key

    $scope.selectSecurity = function(sec) {
        $scope.selectedInvestor = $scope.selectedCell = null;
        $scope.selectedSecurity = sec;
        // TODO more

    };
    $scope.selectInvestor = function(inv) {
        $scope.selectedSecurity = $scope.selectedCell = null;
        $scope.selectedInvestor = inv;
        // TODO more
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
