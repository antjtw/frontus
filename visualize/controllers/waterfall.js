viz.controller('waterfallController',['$scope','$location','$route','$rootScope','$routeParams','$timeout','SWBrijj',
    'navState', 'capital', 'calculate',
    function($scope, $location, $route, $rootScope, $routeParams, $timeout, SWBrijj, navState, capital, calculate) {

    // Initialize the key variables. For now creating defaults but these may be removed down the road
    $scope.capitalization = {};
    $scope.waterfall = [];
    $scope.exitvalue = 50000;
    $scope.priceincrement = 10000;
    // Get the company's Issues
    SWBrijj.tblm('ownership.company_issue').then(function (issues) {
        $scope.issues = issues;
        // Get the company's Transactions
        SWBrijj.tblm('ownership.company_transaction').then(function (trans) {
            $scope.trans = trans;
            // Get the company's Grants
            SWBrijj.tblm('ownership.company_grants').then(function (grants) {
                $scope.grants = grants;

                // Calculate the capitalization
                var corevalues = capital.start($scope.issues, $scope.trans);
                $scope.capitalization = corevalues[0];
                $scope.total = corevalues[1];
                var waterfallvalues = capital.generate($scope.capitalization, $scope.total, $scope.exitvalue, $scope.priceincrement);
                $scope.waterfall = waterfallvalues[0];
                $scope.issueblocks = waterfallvalues[1];
            });
        });
    });

    $scope.formatAmount = function (amount) {
        return calculate.funcformatAmount(amount);
    };

    $scope.formatDollarAmount = function(amount) {
        var output = calculate.funcformatAmount(amount);
        if (output) {
            output = "$" + output
        }
        return (output);
    };

}]);