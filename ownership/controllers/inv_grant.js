// Grants page controller
var invGrantController = function ($scope, $parse, SWBrijj, calculate, switchval, sorting, $rootScope, navState) {

    if (navState.role == 'issuer') {
        $location.path('/company-grants');
        return;
    }

    var company = navState.company;
    $scope.currentCompany = company;

    $scope.rows = []
    $scope.uniquerows = []
    $scope.freqtypes = [];

    //Get the available range of frequency types
    SWBrijj.procm('ownership.get_freqtypes').then(function (results) {
        angular.forEach(results, function (result) {
            $scope.freqtypes.push(result['get_freqtypes']);
        });
    });

    SWBrijj.tblm('ownership.this_company_issue').then(function (issues) {
        // Initialisation. Get the transactions and the grants
        SWBrijj.tblm('ownership.this_company_options').then(function (trans) {
            // Get the full set of company grants
            SWBrijj.tblm('ownership.this_company_options_grants').then(function (grants) {

                $scope.allissues = issues;
                $scope.trans = trans;
                $scope.grants = grants;

                for (var i = 0, l = $scope.allissues.length; i < l; i++) {
                    if ($scope.allissues[i].type == "Option") {
                        $scope.allissues[i]['trans'] = [];
                        $scope.issues.push($scope.allissues[i]);
                    }
                    $scope.issuekeys.push($scope.allissues[i].issue);
                }

                // Assign the grants to the respective transactions
                angular.forEach($scope.grants, function (grant) {
                    angular.forEach($scope.trans, function (tran) {
                        if (grant.tran_id == tran.tran_id) {
                            grant.investor = tran.investor;
                            grant.issue = tran.issue;
                            if (tran[grant.action]) {
                                tran[grant.action] = tran[grant.action]+ grant.unit;
                            }
                            else {
                                tran[grant.action] = grant.unit;
                            }
                        }
                    });
                });

                // Group the transactions under the issues and calculate the values for the grouped issue.
                angular.forEach($scope.issues, function (issue) {
                    issue.shown = false;
                    angular.forEach($scope.trans, function(tran) {
                        if (tran.issue == issue.issue) {
                            var offset = tran.date.getTimezoneOffset();
                            tran.date = tran.date.addMinutes(offset);
                            tran.datekey = tran['date'].toUTCString();
                            tran.state = false;
                            tran.investorkey = angular.copy(tran.investor);
                            tran.vested = calculate.tranvested(tran);
                            issue.trans.push(tran);
                        }
                    });
                    var newTran = $scope.tranInherit({"investor": null, "investorkey": null, "company": $scope.currentCompany, "date": (Date.today()), "datekey": (Date.today()), "issue": issue.issue, "units": null, "paid": null, "unitskey": null, "paidkey": null, "key": undefined}, issue);
                    issue.trans.push(newTran);
                });

                $scope.done = true;
            });
        });
    });


    //Get the active row for the sidebar
    //Get the active row for the sidebar
    $scope.getActiveTransaction = function (currenttran, mode, view) {
        if (view == "view") {
            $scope.sideBar = 3;
        }
        else {
            $scope.sideBar = 1;
        }
        $scope.mode = 1;
        if (mode == "forfeited") {
            $scope.mode = 2;
        }
        else if (mode == "exercised") {
            $scope.mode = 3;
        }
        else if (mode == "vested") {
            $scope.mode = 4;
        }
        var activeAct = [];

        // Only the issues that are not the active transactions (for underlying issue)
        var allowablekeys = angular.copy($scope.issuekeys);
        var index = allowablekeys.indexOf(currenttran.issue);
        allowablekeys.splice(index, 1);
        currenttran.allowKeys = allowablekeys;

        $scope.activeTran = currenttran;
        $scope.activeInvestor = currenttran.investor;

        //Pair the correct grants with the selected transactions
        for (var j = 0, a = $scope.grants.length; j < a; j++) {
            if ($scope.activeTran.tran_id == $scope.grants[j].tran_id) {
                activeAct.push($scope.grants[j]);
            }
        }
        activeAct.push({"unit": null, "tran_id": $scope.activeTran.tran_id, "date": (Date.today()), "action": null, "investor": $scope.activeTran.investor, "issue": $scope.activeTran.issue});
        $scope.activeTran.activeAct = activeAct;

        if (currenttran.investor == null) {
            angular.forEach($scope.issues, function(issue) {
                if (issue.issue == currenttran.issue) {
                    var newTran = $scope.tranInherit({"investor": null, "investorkey": null, "company": $scope.currentCompany, "date": (Date.today()), "datekey": (Date.today()), "issue": issue.issue, "units": null, "paid": null, "unitskey": null, "paidkey": null, "key": undefined}, issue);
                    issue.trans.push(newTran);
                }
            });
        }
    };

    $scope.opendetails = function(name, type) {
        if (type == "issue") {
            $scope.issues.forEach(function(issue) {
                if (name == issue.issue) {
                    issue.shown = issue.shown !== true;
                } else {
                    issue.shown = false;
                }
            });
        }
        else if (type == "investor") {
            $scope.investorLed.forEach(function(investor) {
                if (name == investor.name) {
                    investor.shown = investor.shown !== true;
                } else {
                    investor.shown = false;
                }
            });
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
            angular.forEach(tran.vested, function (value, key) {
                units += value;
            });
        });
        return units != 0 ? units : null;
    };

    //switches the sidebar based on the type of the issue
    $scope.formatAmount = function (amount) {
        return calculate.funcformatAmount(amount);
    };

    $scope.formatDollarAmount = function(amount) {
        var output = calculate.formatMoneyAmount($scope.formatAmount(amount), $scope.settings);
        return output;
    };
};