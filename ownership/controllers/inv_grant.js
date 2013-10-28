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

    SWBrijj.tblm('account.my_company_settings').then(function (x) {
        $scope.settings = x[0];
        $scope.settings.shortdate = $scope.settings.dateformat == 'MM/dd/yyyy' ? 'MM/dd/yy' : 'dd/MM/yy';
        $scope.settings.lowercasedate = $scope.settings.dateformat.toLowerCase();
    });

    // Initialisation. Get the transactions and the grants
    SWBrijj.tblm('ownership.this_company_options').then(function (data) {

        // Pivot from transactions to the rows of the table
        $scope.trans = data;
        angular.forEach($scope.trans, function (tran) {
            var offset = tran.date.getTimezoneOffset();
            tran.date = tran.date.addMinutes(offset);
            tran.datekey = tran['date'].toUTCString();
            if ($scope.uniquerows.indexOf(tran.investor) == -1) {
                $scope.uniquerows.push(tran.investor);
                $scope.rows.push({"state": false, "name": tran.investor, "namekey": tran.investor, "editable": "yes", "granted": null, "forfeited": null, "issue": tran.issue});
            }
        });

        // Get the full set of company grants
        SWBrijj.tblm('ownership.this_company_options_grants').then(function (data) {

            $scope.grants = data;

            angular.forEach($scope.grants, function (grant) {
                angular.forEach($scope.trans, function (tran) {
                    if (grant.tran_id == tran.tran_id) {
                        grant.investor = tran.investor;
                    }
                });
            });

            //Calculate the total granted and forfeited for each row
            angular.forEach($scope.trans, function (tran) {
                angular.forEach($scope.rows, function (row) {
                    if (row.name == tran.investor) {
                        if (parseFloat(tran.units) > 0) {
                            row["granted"] = calculate.sum(row["granted"], tran.units);
                        }
                    }
                });
            });

            //Calculate the total vested for each row
            $scope.rows = calculate.vested($scope.rows, $scope.trans);

            //Calculate the total exercised for each row
            angular.forEach($scope.grants, function (grant) {
                angular.forEach($scope.rows, function (row) {
                    if (row.name == grant.investor) {
                        if (parseFloat(grant.unit) > 0) {
                            if (row[grant.action] == undefined) {
                                row[grant.action] = 0;
                            }
                            row[grant.action] = calculate.sum(row[grant.action], grant.unit);
                        }
                    }
                });
            });

        });
    });


    //Get the active row for the sidebar
    $scope.getActiveTransaction = function (currenttran) {
        $scope.sideBar = 1;
        $scope.activeTran = [];
        $scope.activeInvestor = currenttran;
        var first = 0;
        for (var i = 0, l = $scope.trans.length; i < l; i++) {
            if ($scope.trans[i].investor == currenttran) {
                if (first == 0) {
                    $scope.trans[i].active = true
                    first = first + 1
                }
                $scope.activeTran.push($scope.trans[i]);
            }
        }

        angular.forEach($scope.rows, function (row) {
            if (row.name == currenttran) {
                row.state = true;
            }
            else {
                row.state = false;
            }
        });

        //Pair the correct grants with the selected rows transactions
        for (var i = 0, l = $scope.activeTran.length; i < l; i++) {
            var activeAct = []
            for (var j = 0, a = $scope.grants.length; j < a; j++) {
                if ($scope.activeTran[i].tran_id == $scope.grants[j].tran_id) {
                    activeAct.push($scope.grants[j]);
                }
            }
            $scope.activeTran[i].activeAct = activeAct;
        }
    };

    //switches the sidebar based on the type of the issue
    $scope.formatAmount = function (amount) {
        return calculate.funcformatAmount(amount);
    };

    $scope.formatDollarAmount = function(amount) {
        var output = calculate.formatMoneyAmount(memformatamount(amount), $scope.settings);
        return output;
    };
};