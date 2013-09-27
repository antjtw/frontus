viz.controller('waterfallController',['$scope','$location','$route','$rootScope','$routeParams','$timeout','SWBrijj',
    'navState', 'capital', 'calculate', 'sorting',
    function($scope, $location, $route, $rootScope, $routeParams, $timeout, SWBrijj, navState, capital, calculate, sorting) {

    // Initialize the key variables. For now creating defaults but these may be removed down the road
    $scope.capitalization = {};
    $scope.waterfall = [];
    $scope.exitvalue = 50000;
    $scope.priceincrement = 10000;
    $scope.closedate = Date.today();
    $scope.viewtype = 'Security';
    $scope.proceedsRadio = 'table';
    $scope.acceleratevesting = false;
    $scope.fakedata = [4,5,6,7,4];

    // Get the company's Issues
    SWBrijj.tblm('ownership.company_issue').then(function (issues) {
        $scope.issues = issues;
        // Get the company's Transactions
        SWBrijj.tblm('ownership.company_transaction').then(function (trans) {
            $scope.trans = trans;
            // Get the company's Grants
            SWBrijj.tblm('ownership.company_grants').then(function (grants) {
                $scope.grants = grants;

                $scope.trans = capital.optionsgenerate($scope.trans, $scope.grants);
                $scope.trans = capital.tranvested($scope.trans, $scope.closedate);

                var shareholderrows = capital.proceedrows($scope.trans);

                // Calculate the capitalization
                $scope.issues.sort(sorting.issuedate);

                $scope.recalculate($scope.exitvalue, $scope.priceincrement, $scope.acceleratevesting);

                // Set heights for the lists
                $scope.gridheight = {height: String($scope.waterfall[0].roundliquidation.length*200 + 150) + "px"}
                $scope.loopheight = {height: String($scope.waterfall[0].roundliquidation.length*215) + "px"}
                $scope.proceedheight = {height: String(Object.keys($scope.waterfall[0].securityproceeds).length*50) + "px"}
            });
        });
    });

    $scope.recalculate = function(exitvalue, priceincrement, acceleratevesting) {
        var exitvalue = !isNaN(parseFloat(exitvalue)) ? parseFloat(exitvalue) : 0;
        var priceincrement = !isNaN(parseFloat(priceincrement)) ? parseFloat(priceincrement) : 0;
        var shareholderrows = capital.proceedrows($scope.trans);
        var corevalues = capital.start($scope.issues, $scope.trans, acceleratevesting, shareholderrows);
        $scope.capitalization = corevalues[0];
        $scope.shareholderrows = corevalues[1];
        $scope.total = corevalues[2];
        var waterfallvalues = capital.generate($scope.capitalization, $scope.total, exitvalue, priceincrement, $scope.shareholderrows);
        $scope.waterfall = waterfallvalues[0];
        $scope.issueblocks = waterfallvalues[1];
        $scope.graphdata = capital.graph($scope.waterfall);
    };

    // Opens the capitalization details
    $scope.opendetails = function(selected) {
        angular.forEach($scope.capitalization, function(name) {
            if (selected == name.name) {
                name.shown = name.shown != true;
            } else {
                name.shown = false;
            }
        });
    };

    $scope.changeView = function (value) {
        // console.log(value);
        $scope.viewtype = value;
    };

    $scope.formatAmount = function (amount) {
        return calculate.funcformatAmount(amount);
    };

    $scope.formatDollarAmount = function(amount) {
        var output = calculate.funcformatAmount(amount);
        return ("$" + output);
    };

}]);