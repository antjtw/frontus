'use strict';

/* App Module */

var owner = angular.module('companyownership', ['ui.bootstrap', 'ui.event', '$strap.directives', 'brijj', 'ownerServices', 'ownerFilters']);

owner.config(function ($routeProvider, $locationProvider) {
    $locationProvider.html5Mode(true).hashPrefix('');

    $routeProvider.
        when('/', {templateUrl: 'companycaptable.html', controller: captableController}).
        when('/:company', {templateUrl: 'companycaptable.html', controller: captableController}).
        when('/grant', {templateUrl: 'grant.html', controller: grantController}).
        otherwise({redirectTo: '/'});
});

owner.run(function ($rootScope) {

    $rootScope.rowOrdering = function (row) {
        var total = 0
        for (var key in row) {
            if (row.hasOwnProperty(key)) {
                if (key != "name") {
                    if (!isNaN(parseInt(row[key]['u'])) && String(key) != "$$hashKey") {
                        total = total + parseInt(row[key]['u']);
                    }
                }
            }
        }
        return -total;
    };

    $rootScope.trantype = function (type, activetype) {
        if (activetype == 2 && type == "options") {
            return false;
        }
        else if (activetype == 1 && type == "debt") {
            return false;
        }
        else {
            return true
        }
    };

//Calculates total grants in each issue
    $rootScope.totalGranted = function (issue, trans) {
        var granted = 0
        angular.forEach(trans, function (tran) {
            if (tran.issue == issue && tran.type == "options" && !isNaN(parseInt(tran.units))) {
                granted = granted + parseInt(tran.units);
            }
            ;
        });
        return granted;
    };

//Calculates total grant actions in grant table
    $rootScope.totalGrantAction = function (type, grants) {
        var total = 0
        angular.forEach(grants, function (grant) {
            if (grant.action == type && !isNaN(parseInt(grant.unit))) {
                total = total + parseInt(grant.unit);
            }
            ;
        });
        return total;
    };

//Calculates total granted to and forfeited in grant table
    $rootScope.totalTranAction = function (type, trans) {
        var total = 0
        angular.forEach(trans, function (tran) {
            if (type == "granted") {
                if (!isNaN(parseInt(tran.units)) && parseInt(tran.units) > 0) {
                    total = total + parseInt(tran.units);
                }
                ;
            }
            else if (type == "forfeited") {
                if (!isNaN(parseInt(tran.units)) && parseInt(tran.units) < 0) {
                    total = total + parseInt(tran.units);
                }
                ;
            }
            ;
        });
        return total;
    };

    $rootScope.myPercentage = function (everyone) {
        return (100 - everyone);
    };


    $rootScope.postIssues = function (keys, issue) {
        console.log(keys);
        console.log(issue);
    };

});

var captableController = function ($scope, $parse, SWBrijj, calculate, switchval, sorting, $routeParams, $rootScope, $location) {

    if ($routeParams.company) { // Select a company if there is one in the URL
        var company = $routeParams.company;
        $rootScope.select(company);
    } else {
        var company = $rootScope.selected.company;        
    }

    $scope.$on('adminIn', function() {
        if ($rootScope.selected.isAdmin) {
            if ($rootScope.path.indexOf('/investor/') > -1) {
                document.location.href=$rootScope.path.replace("/investor/", "/company/");
            }
        } else {
            if ($rootScope.path.indexOf('/company/') > -1) {
                document.location.href=$rootScope.path.replace("/company/", "/investor/");
            }
        }
    });

    $scope.currentCompany = company;
    console.log(company);

    $scope.issuetypes = [];
    $scope.freqtypes = [];
    $scope.issuekeys = [];
    $scope.tf = ["yes", "no"]
    $scope.issues = []
    $scope.issueSort = 'date';
    $scope.rowSort = '-name';
    $scope.rows = []
    $scope.uniquerows = []
    $scope.activeTran = []

    $scope.investorOrder = "name";

    SWBrijj.procm('ownership.mark_viewed', company).then(function (x) {
        $scope.fullview = Boolean(x[0].mark_viewed);
        console.log($scope.fullview);
    });

    SWBrijj.procm('ownership.get_my_issues', company).then(function (data) {
        console.log(data);
        $scope.issues = data;
        for (var i = 0, l = $scope.issues.length; i < l; i++) {
            $scope.issues[i].key = $scope.issues[i].issue;
            $scope.issuekeys.push($scope.issues[i].key);
        };

        // Pivot shenanigans
        SWBrijj.procm('ownership.get_my_transactions', company).then(function (trans) {
            console.log(trans);
            $scope.trans = trans

            SWBrijj.procm('ownership.get_my_options', company).then(function (x) {

                if (x.length == 0) {
                    $scope.grantsview = 0;
                }
                else {
                    $scope.grantsview = 1;
                }
                SWBrijj.procm('ownership.get_my_option_grants', company).then(function (grants) {

                $scope.grants = grants;
                angular.forEach($scope.grants, function (grant) {
                    angular.forEach($scope.trans, function (tran) {
                        if (grant.tran_id == tran.tran_id) {
                            grant.investor = tran.investor;
                            if (grant.action == "forfeited") {
                                if (tran.forfeited) {
                                    tran.forfeited = tran.forfeited + grant.unit;
                                }
                                else {
                                    tran.forfeited = grant.unit;
                                }
                            }
                        }
                    });
                });


                for (var i = 0, l = $scope.trans.length; i < l; i++) {
                    if ($scope.uniquerows.indexOf($scope.trans[i].investor) == -1) {
                        $scope.uniquerows.push($scope.trans[i].investor);
                        $scope.rows.push({"name": $scope.trans[i].investor, "namekey": $scope.trans[i].investor});
                    }
                    angular.forEach($scope.issues, function (issue) {
                        if ($scope.trans[i].issue == issue.issue) {
                            $scope.trans[i].totalauth = issue.totalauth;
                            $scope.trans[i].premoney = issue.premoney;
                            $scope.trans[i].postmoney = issue.postmoney;
                        }
                        ;
                    });
                }
                ;

                angular.forEach($scope.trans, function (tran) {
                    angular.forEach($scope.rows, function (row) {
                        if (row.name == tran.investor) {
                            if (tran.issue in row) {
                                row[tran.issue]["u"] = calculate.sum(row[tran.issue]["u"], tran.units);
                                row[tran.issue]["a"] = calculate.sum(row[tran.issue]["a"], tran.amount);
                                if (!isNaN(parseFloat(tran.forfeited))) {
                                    row[tran.issue]["u"] = calculate.sum(row[tran.issue]["u"], (-tran.forfeited));
                                }
                            }
                            else {
                                row[tran.issue] = {}
                                row[tran.issue]["u"] = tran.units;
                                row[tran.issue]["a"] = tran.amount;
                                if (!isNaN(parseFloat(tran.forfeited))) {
                                    row[tran.issue]["u"] = (-tran.forfeited);
                                }
                            }
                            ;
                        }
                        else {
                            if (tran.issue in row) {
                            }
                            else {
                                row[tran.issue] = {"u": null, "a": null};
                            }
                        }
                        ;
                    });
                });

                angular.forEach($scope.rows, function (row) {
                    angular.forEach($scope.issues, function (issue) {
                        if (row[issue.issue] != undefined) {
                            if (isNaN(parseInt(row[issue.issue]['u'])) && !isNaN(parseInt(row[issue.issue]['a']))) {
                                row[issue.issue]['x'] = calculate.debt($scope.rows, issue, row);
                            }
                            ;
                        }
                        ;
                    });
                });


                angular.forEach($scope.rows, function (row) {
                    angular.forEach($scope.issuekeys, function (issuekey) {
                        if (issuekey in row) {
                        }
                        else {
                            row[issuekey] = {"u": null, "a": null};
                        }
                        ;
                    });
                });


                $scope.issues.sort(sorting.issuedate);
                $scope.issuekeys = sorting.issuekeys($scope.issuekeys, $scope.issues);
                $scope.rows.sort(sorting.row($scope.issuekeys));

                SWBrijj.procm('ownership.get_everyone_else', company).then(function (x) {
                    $scope.everyone = {}
                    $scope.everyone.percentage = x[0].get_everyone_else;
                });

                var values = {"name": "Other Shareholders", "editable": "0"}
                });
            });
        });
    }).except(initFail);

    $scope.findValue = function (row, header) {
        angular.forEach($scope.rows, function (picked) {
            if (picked == row) {
                return $scope.rows[header];
            }
            ;
        });
    };

    $scope.getActiveTransaction = function (currenttran, currentcolumn) {
        $scope.sideBar = 2;
        $scope.activeTran = [];
        $scope.activeIssue = currentcolumn;
        $scope.activeInvestor = currenttran;

        // Get the all the issues that aren't the current issue for the drop downs
        var allowablekeys = angular.copy($scope.issuekeys);
        var index = allowablekeys.indexOf(currentcolumn);
        allowablekeys.splice(index, 1);
        $scope.allowKeys = allowablekeys;

        var first = 0
        angular.forEach($scope.trans, function (tran) {
            if (tran.investor == currenttran) {
                if (tran.issue == currentcolumn) {
                    if (first == 0) {
                        tran['active'] = true
                        first = first + 1
                    }
                    if (String(tran['partpref']) == "true") {
                        tran.partpref = $scope.tf[0];
                    }
                    else {
                        tran.partpref = $scope.tf[1];
                    }
                    if (String(tran['liquidpref']) == "true") {
                        tran.liquidpref = $scope.tf[0];
                    }
                    else {
                        tran.liquidpref = $scope.tf[1];
                    }
                    $scope.activeTran.push(tran);
                }
            }
        });
    };

    $scope.getActiveIssue = function (issue) {
        $scope.sideBar = 1;
        $scope.activeIssue = issue;

        // Get the all the issues that aren't the current issue for the drop downs
        var allowablekeys = angular.copy($scope.issuekeys);
        var index = allowablekeys.indexOf(issue.issue);
        allowablekeys.splice(index, 1);
        $scope.allowKeys = allowablekeys;

        // Set Boolean Values for the Angularjs Select
        if (String($scope.activeIssue.partpref) == "true") {
            $scope.activeIssue.partpref = $scope.tf[0];
        }
        else {
            $scope.activeIssue.partpref = $scope.tf[1];
        }
        if (String($scope.activeIssue.liquidpref) == "true") {
            $scope.activeIssue.liquidpref = $scope.tf[0];
        }
        else {
            $scope.activeIssue.liquidpref = $scope.tf[1];
        }
        if ($scope.activeIssue.name == "") {
            $scope.activeIssue.date = (Date.today()).toUTCString();
        }
        // Set Freq Value for Angularjs Select
        var index = $scope.freqtypes.indexOf(issue.vestfreq);
        $scope.activeIssue.vestfreq = $scope.freqtypes[index];
    };


    $scope.getActiveInvestor = function (investor) {
        $scope.sideBar = 3;
        if (investor.name == "") {
            var values = {"name": "", "editable": "0"}
            angular.forEach($scope.issuekeys, function (key) {
                values[key] = {"u": null, "a": null};
            });
            $scope.rows.push(values);
        }
        $scope.activeInvestorName = investor.name;
    };

    // Toggles sidebar back and forth
    $scope.toggleSide = function () {
        if ($scope.sideToggle) {
            $scope.sideToggleName = "Show"
            return true
        }
        else {
            $scope.sideToggleName = "Hide"
            return false
        }
        ;

    };

    $scope.formatAmount = function (amount) {
        if (amount) {
            while (/(\d+)(\d{3})/.test(amount.toString())){
                amount = amount.toString().replace(/(\d+)(\d{3})/, '$1'+','+'$2');
            }
        }
        return amount;
    };

    // Functions derived from services for use in the table

    //switches the sidebar based on the type of the issue
    $scope.trantype = function (type, activetype) {
        return switchval.trantype(type, activetype);
    };

    // Number of shareholders
    $scope.numShareholders = function() {
        return calculate.numShareholders($scope.rows);
    };

    // Total Shares in captable
    $scope.totalShares = function(rows) {
        return calculate.totalShares(rows);
    };

    // Total Shares | Paid for an issue column (type is either u or a)
    $scope.totalPaid = function(rows) {
        return calculate.totalPaid(rows);
    };

    // Total Shares for a shareholder row
    $scope.shareSum = function(row) {
        return calculate.shareSum(row);
    };

    // Total Shares | Paid for an issue column (type is either u or a)
    $scope.colTotal = function(header, rows, type) {
        return calculate.colTotal(header, rows, type);
    };

    // Total percentage ownership for each shareholder row
    $scope.sharePercentage = function(row, rows, issuekeys) {
        return calculate.sharePercentage(row, rows, issuekeys);
    };

    // Total percentage ownership for each shareholder row
    $scope.pricePerShare = function() {
        return calculate.pricePerShare($scope.issues);
    };

    // Last issue date for the sidebar In Brief section
    $scope.lastIssue = function() {
        return calculate.lastIssue($scope.issues);
    };


};


// Grants page controller
var grantController = function ($scope, $parse, SWBrijj, calculate, switchval, sorting, $rootScope) {

    var company = $rootScope.selected.company;
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

    // Initialisation. Get the transactions and the grants
    SWBrijj.procm('ownership.get_my_options', company).then(function (data) {

        // Pivot from transactions to the rows of the table
        $scope.trans = data;
        angular.forEach($scope.trans, function (tran) {
            tran.datekey = tran['date'].toUTCString();
            if ($scope.uniquerows.indexOf(tran.investor) == -1) {
                $scope.uniquerows.push(tran.investor);
                $scope.rows.push({"state": false, "name": tran.investor, "namekey": tran.investor, "editable": "yes", "granted": null, "forfeited": null, "issue": tran.issue});
            }
        });

        // Get the full set of company grants
        SWBrijj.procm('ownership.get_my_option_grants', company).then(function (data) {

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
        var first = 0
        for (var i = 0, l = $scope.trans.length; i < l; i++) {
            if ($scope.trans[i].investor == currenttran) {
                if (first == 0) {
                    $scope.trans[i].active = true
                    first = first + 1
                }
                $scope.activeTran.push($scope.trans[i]);
            }
        }
        ;

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
                ;
            }
            ;
            $scope.activeTran[i].activeAct = activeAct;
        }
        ;
    };
};

function initFail(x) {
    document.location.href='/login';
}
