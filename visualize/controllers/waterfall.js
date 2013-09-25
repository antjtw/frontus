viz.controller('waterfallController',['$scope','$location','$route','$rootScope','$routeParams','$timeout','SWBrijj',
    'navState', 'capital', 'calculate', 'sorting',
    function($scope, $location, $route, $rootScope, $routeParams, $timeout, SWBrijj, navState, capital, calculate, sorting) {

    // Initialize the key variables. For now creating defaults but these may be removed down the road
    $scope.capitalization = {};
    $scope.waterfall = [];
    $scope.exitvalue = 50000;
    $scope.priceincrement = 10000;
    $scope.closedate = Date.today();
    $scope.acceleratevesting = false;
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

                // Calculate the capitalization
                $scope.issues.sort(sorting.issuedate);
                var corevalues = capital.start($scope.issues, $scope.trans, $scope.acceleratevesting);
                $scope.capitalization = corevalues[0];
                $scope.total = corevalues[1];
                // Calculate the waterfall values
                var waterfallvalues = capital.generate($scope.capitalization, $scope.total, $scope.exitvalue, $scope.priceincrement);
                $scope.waterfall = waterfallvalues[0];
                $scope.issueblocks = waterfallvalues[1];

                // Set heights for the lists
                $scope.gridheight = {height: String($scope.waterfall[0].roundliquidation.length*200 + 150) + "px"}
                $scope.loopheight = {height: String($scope.waterfall[0].roundliquidation.length*200) + "px"}
                $scope.proceedheight = {height: String(Object.keys($scope.waterfall[0].proceeds).length*50) + "px"}
            });
        });
    });

    $scope.recalculate = function(exitvalue, priceincrement, acceleratevesting) {
        console.log(acceleratevesting);
        var exitvalue = !isNaN(parseFloat(exitvalue)) ? parseFloat(exitvalue) : 0;
        var priceincrement = !isNaN(parseFloat(priceincrement)) ? parseFloat(priceincrement) : 0;
        var corevalues = capital.start($scope.issues, $scope.trans, acceleratevesting);
        $scope.capitalization = corevalues[0];
        $scope.total = corevalues[1];
        var waterfallvalues = capital.generate($scope.capitalization, $scope.total, exitvalue, priceincrement);
        $scope.waterfall = waterfallvalues[0];
        $scope.issueblocks = waterfallvalues[1];
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

    $scope.formatAmount = function (amount) {
        return calculate.funcformatAmount(amount);
    };

    $scope.formatDollarAmount = function(amount) {
        var output = calculate.funcformatAmount(amount);
        return ("$" + output);
    };

}]);