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
    
    $scope.issueGranted = function(issue) {
        var units = 0;
        angular.forEach(issue.trans, function (tran) {
            if (parseFloat(tran.units) > 0) {
                units += parseFloat(tran.units);
            }
        });
        return units
    };

    $scope.issueActions = function(issue, type) {
        var units = 0;
        angular.forEach(issue.trans, function (tran) {
            if (parseFloat(tran[type]) > 0) {
                units += parseFloat(tran[type]);
            }
        });
        return units
    };

    $scope.issueVested = function(issue) {
        var units = 0;
        angular.forEach(issue.trans, function (tran) {
            angular.forEach(tran.vested, function (grant) {
                units += grant.units;
            });
        });
        return units != 0 ? units : null;
    };

    $scope.transactionVested = function(vested) {
        var units = 0;
        angular.forEach(vested, function (grant) {
            units += grant.units;
        });
        return units != 0 ? units : null;
    };

    $scope.totalVestedAction = function(trans) {
        var units = 0;
        angular.forEach(trans, function(tran) {
            angular.forEach(tran.vested, function (grant) {
                units += grant.units;
            });
        });
        return units != 0 ? units : null;
    };

    //Calculates total granted to and forfeited in grant table
    $scope.footerAction = function (type, issues) {
        var total = 0;
        angular.forEach(issues, function (issue) {
            angular.forEach(issue.trans, function(tran) {
                if (type == "vested") {
                    angular.forEach(tran.vested, function(vested) {
                        total = total + parseFloat(vested.units);
                    })
                }
                else {
                    if (!isNaN(parseFloat(tran[type])) && parseFloat(tran[type]) > 0) {
                        total = total + parseFloat(tran[type]);
                    }
                }
            });
        });
        return total;
    };

    $scope.setView = function(field) {
        $scope.optionView = field;
        var uniquenames = [];
        if (field == "Person") {
            // Create the investor led row
            $scope.investorLed = [];
            angular.forEach($scope.issues, function(issue) {
                angular.forEach(issue.trans, function(tran) {
                    if (tran.investor != null) {
                        if (uniquenames.indexOf(tran.investor) == -1) {
                            uniquenames.push(tran.investor);
                            $scope.investorLed.push({'name':tran.investor, 'shown': false, 'trans':[]})
                        }
                        angular.forEach($scope.investorLed, function(investor) {
                            if (investor.name == tran.investor) {
                                investor.trans.push(tran);
                            }
                        });
                    }
                });
            });
        }
    };
}]);
