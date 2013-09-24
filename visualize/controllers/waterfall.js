viz.controller('waterfallController',['$scope','$location','$route','$rootScope','$routeParams','$timeout','SWBrijj',
    'navState', 'capital',
    function($scope, $location, $route, $rootScope, $routeParams, $timeout, SWBrijj, navState, capital) {

    $scope.capitalization = {};
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
                $scope.totalshares = corevalues[1];
                console.log($scope.capitalization);
            });
        });
    });

}]);