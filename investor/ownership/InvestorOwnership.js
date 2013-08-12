'use strict';

/* App Module */

var owner = angular.module('companyownership', ['ui.bootstrap', 'ui.event', '$strap.directives', 'brijj']);

owner.config(function ($routeProvider, $locationProvider) {
    $locationProvider.html5Mode(true).hashPrefix('');

    $routeProvider.
        when('/', {templateUrl: 'companycaptable.html', controller: captableController}).
        when('/grant', {templateUrl: 'grant.html', controller: grantController}).
        otherwise({redirectTo: '/'});
});

// Captable functions for basic mathematics. Should be expanded by peeling some of the reusable pieces out of the controller.
owner.service('calculate', function () {

    // The remainder calculated for outstanding units rows.
    this.whatsleft = function (total, issue, rows) {
        var leftover = total;
        angular.forEach(rows, function (row) {
            if (issue.issue in row && row.nameeditable != 0 && !isNaN(parseFloat(row[issue.issue]['u']))) {
                leftover = leftover - row[issue.issue]['u'];
            }
        });
        return leftover
    };

    // Simple summation checking that the added value is a number.
    this.sum = function (current, additional) {
        if (isNaN(parseFloat(current)) && !isNaN(parseFloat(additional))) {
            current = 0;
        }
        if (!isNaN(parseFloat(additional))) {
            return (current + parseFloat(additional));
        }
        else {
            return current;
        }
    };

    // Calculates the debt for the captable based on transactions with paid but no shares. Must be called on each row.
    this.debt = function (rows, issue, row) {
        var mon = parseFloat(issue.premoney);
        if (isNaN(parseFloat(mon))) {
            return null
        }
        else {
            angular.forEach(rows, function (r) {
                if (r[issue.issue] != undefined) {
                    if ((isNaN(parseFloat(r[issue.issue]['u'])) || r[issue.issue]['u'] == 0 ) && !isNaN(parseFloat(r[issue.issue]['a']))) {
                        mon = mon + parseFloat(r[issue.issue]['a']);
                    }
                }
            });
        }
        return ((parseFloat(row[issue.issue]['a']) / parseFloat(mon)) * 100)
    };

    // Calculates the vested amounts for the grant table. This takes in the row array and returns the new row array. Buggy.
    this.vested = function (rows, trans) {
        var vesting = {};
        angular.forEach(trans, function (tran) {
            if (!isNaN(parseFloat(tran.vestcliff)) && !isNaN(parseFloat(tran.terms)) && tran.vestfreq != null && tran.date != null && tran.vestingbegins != null) {
                if (Date.compare(Date.today(), tran.vestingbegins) > -1) {
                    if (!isNaN(parseFloat(vesting[tran.investor]))) {
                        vesting[tran.investor] = vesting[tran.investor] + (tran.units * (tran.vestcliff / 100));
                    }
                    else {
                        vesting[tran.investor] = (tran.units * (tran.vestcliff / 100));
                    }
                    var cycleDate = angular.copy(tran.date);
                    var remainingterm = angular.copy(tran.terms);
                    while (Date.compare(tran.vestingbegins, cycleDate) > -1) {
                        remainingterm = remainingterm - 1;
                        cycleDate.addMonths(1);
                    }
                    remainingterm = remainingterm + 1;
                    var monthlyperc = (100 - tran.vestcliff) / (remainingterm);
                    var x = 1;
                    if (tran.vestfreq == "monthly") {
                        x = 1
                    }
                    else if (tran.vestfreq == "weekly") {
                        x = 0.25
                    }
                    else if (tran.vestfreq == "biweekly") {
                        x = 0.5
                    }
                    else if (tran.vestfreq == "quarterly") {
                        x = 3;
                    }
                    else if (tran.vestfreq == "yearly") {
                        x = 12;
                    }
                    if (x < 1) {
                        cycleDate.addWeeks(x * 4);
                    }
                    else {
                        cycleDate.addMonths(x);
                    }
                    while (Date.compare(Date.today(), cycleDate) > -1) {
                        vesting[tran.investor] = vesting[tran.investor] + (x * ((monthlyperc / 100) * tran.units));
                        if (x < 1) {
                            cycleDate.addWeeks(x * 4);
                        }
                        else {
                            cycleDate.addMonths(x);
                        }
                    }
                }
            }
        });
        angular.forEach(rows, function (row) {
            if (!isNaN(vesting[row.name])) {
                row.vested = vesting[row.name];
            }
        });
        console.log(rows);
        return rows
    };
});

owner.service('switchval', function () {
    this.tran = function (type) {
        if (type == "debt" || type == 0) {
            return 0;
        }
        else if (type == "options" || type == 1) {
            return 1;
        }
        else {
            return 2;
        }
    };

    this.typeswitch = function (tran) {
        if (tran.optundersec != null) {
            tran.atype = 1;
        }
        else if (!isNaN(parseFloat(tran.amount)) && isNaN(parseFloat(tran.units))) {
            tran.atype = 2;
        }
        else {
            tran.atype = 0;
        }
        return tran;
    };

    this.typereverse = function (tran) {
        if (tran == 1) {
            tran = "options";
        }
        else if (tran == 2) {
            tran = "debt";
        }
        else {
            tran = "shares";
        }
        return tran;
    };
});

owner.service('sorting', function () {

    this.issuekeys = function (keys, issues) {
        var sorted = [];
        angular.forEach(issues, function (issue) {
            angular.forEach(keys, function (key) {
                if (issue.issue == key) {
                    sorted.push(key);
                }
            });
        });
        return sorted;
    };

    this.issuedate = function (a, b) {
        if (a.date < b.date)
            return -1;
        if (a.date > b.date)
            return 1;
        if (a.date = b.date) {
            if (a.created < b.created)
                return -1;
            if (a.created > b.created)
                return 1;
        }
        return 0;
    };

    // Sorts the rows
    this.row = function (prop) {
        return function (a, b) {
            var i = 0;
            // Working for the earliest issue to the latest
            while (i < prop.length) {

                // Filters out the unissued shares lines
                if (a['nameeditable'] == 0) {
                    if (b['nameeditable'] == 0) {
                        if (Math.abs(a[prop[i]]['u']) < Math.abs(b[prop[i]]['u']))
                            return 1;
                        if (Math.abs(a[prop[i]]['u']) > Math.abs(b[prop[i]]['u']))
                            return -1;
                    }
                    return -1
                }
                if (b['nameeditable'] == 0) {
                    if (a['nameeditable'] == 0) {
                        if (Math.abs(a[prop[i]]['u']) < Math.abs(b[prop[i]]['u']))
                            return -1;
                        if (Math.abs(a[prop[i]]['u']) > Math.abs(b[prop[i]]['u']))
                            return 1;
                    }
                    return -1
                }
                // Ranks the adjacent rows and returns the order for the pair
                if (a[prop[i]]['u'] < b[prop[i]]['u'])
                    return 1;
                if (a[prop[i]]['u'] > b[prop[i]]['u'])
                    return -1;
                i++
            }
            return 0;
        }
    };

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

    /* Calculates the Total Shares owned by an investor across all rounds */
    $rootScope.shareSum = function (row) {
        var total = 0
        for (var key in row) {
            if (row.hasOwnProperty(key)) {
                if (key != "name") {
                    if (parseInt(row[key]['u']) % 1 === 0 && String(key) != "$$hashKey" && row['nameeditable'] != 0) {
                        total = total + parseInt(row[key]['u']);
                    }
                }
            }
        }
        return total;
    };
    /* Calculates total shares */
    $rootScope.totalShares = function (rows) {
        var total = 0;
        angular.forEach(rows, function (row) {
            for (var key in row) {
                if (row.hasOwnProperty(key)) {
                    if (key != "name") {
                        if (parseInt(row[key]['u']) % 1 == 0 && String(key) != "$$hashKey" && row['nameeditable'] != 0) {
                            total = total + parseInt(row[key]['u']);
                        }
                    }
                    ;
                }
                ;
            }
            ;
        });
        return total;
    };

    $rootScope.sharePercentage = function (row, rows, issuekeys) {
        var percentage = 0
        var totalpercentage = 0
        for (var i = 0, l = issuekeys.length; i < l; i++) {
            if (row[issuekeys[i]] != undefined) {
                if (row[issuekeys[i]]['x'] != undefined) {
                    percentage = percentage + row[issuekeys[i]]['x'];
                }
                ;
            }
        }
        ;
        for (var j = 0, a = rows.length; j < a; j++) {
            for (var i = 0, l = issuekeys.length; i < l; i++) {
                if (rows[j][issuekeys[i]] != undefined) {
                    if (rows[j][issuekeys[i]]['x'] != undefined) {
                        totalpercentage = totalpercentage + rows[j][issuekeys[i]]['x'];
                    }
                    ;
                }
            }
            ;
        }
        ;
        return (percentage + ($rootScope.shareSum(row) / $rootScope.totalShares(rows) * (100 - totalpercentage)));
    };

    $rootScope.myPercentage = function (everyone) {
        return (100 - everyone);
    };

    $rootScope.colTotal = function (header, rows, type) {
        var total = 0;
        angular.forEach(rows, function (row) {
            for (var key in row) {
                if (key == header) {
                    if (parseInt(row[key][type]) % 1 == 0 && String(key) != "$$hashKey") {
                        total = total + parseInt(row[key][type]);
                    }
                }
            }
            ;
        });
        return total;
    };

    $rootScope.postIssues = function (keys, issue) {
        console.log(keys);
        console.log(issue);
    };

});

var captableController = function ($scope, $parse, SWBrijj, calculate, switchval, sorting, $routeParams, $rootScope) {

    var company = $rootScope.selected.company;
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
            $scope.issues[i] = switchval.typeswitch($scope.issues[i]);
            $scope.issues[i].key = $scope.issues[i].issue;
            $scope.issuekeys.push($scope.issues[i].key);
        }
        ;

        // Pivot shenanigans
        SWBrijj.procm('ownership.get_my_transactions', company).then(function (trans) {
            console.log(trans);
            $scope.trans = trans

            SWBrijj.procm('ownership.get_my_options', company).then(function (grants) {
                console.log(grants.length)
                if (grants.length == 0) {
                    $scope.grantsview = 0;
                }
                else {
                    $scope.grantsview = 1;
                }
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
                        }
                        else {
                            row[tran.issue] = {}
                            row[tran.issue]["u"] = tran.units;
                            row[tran.issue]["a"] = tran.amount;
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

            angular.forEach($scope.issues, function (issue) {
                if (parseFloat(issue.totalauth) % 1 == 0) {
                    var leftovers = calculate.whatsleft(issue.totalauth, issue, $scope.rows);
                    if (leftovers != 0) {
                        var issuename = String(issue.issue)
                        var shares = {"u": leftovers, "a": null};
                        $scope.rows.push({"name": issuename + " (unissued)", "editable": 0, "nameeditable": 0});
                        $scope.rows[($scope.rows.length) - 1][issuename] = shares
                    }
                }
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
                    tran = switchval.typeswitch(tran);
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
                $scope.trans[i] = switchval.typeswitch($scope.trans[i]);
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
