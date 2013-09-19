var invCaptableController = function ($scope, $parse, SWBrijj, calculate, switchval, sorting, $routeParams, $rootScope, $location,
    navState) {

    if (navState.role == 'issuer') {
        $location.path('/company-captable');
        return;
    }

    var company = navState.company;
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
    SWBrijj.procm('ownership.return_status').then(function (x) {
        $scope.level = x[0].return_status;
        if ($scope.level != 'Full View' && $scope.level != 'Personal View') {
            document.location.href="/home/";
        }
        if ($scope.level == 'Full View') {
            $scope.fullview = true;
        }
    });

    SWBrijj.tblm('ownership.this_company_issues').then(function (data) {
        console.log(data);
        $scope.issues = data;
        for (var i = 0, l = $scope.issues.length; i < l; i++) {
            $scope.issues[i].key = $scope.issues[i].issue;
            $scope.issuekeys.push($scope.issues[i].key);
        };

        // Pivot shenanigans
        SWBrijj.tblm('ownership.this_company_transactions').then(function (trans) {
            console.log(trans);
            $scope.trans = trans

            SWBrijj.tblm('ownership.this_company_options').then(function (x) {

                if (x.length == 0) {
                    $scope.grantsview = 0;
                }
                else {
                    $scope.grantsview = 1;
                }
                SWBrijj.tblm('ownership.this_company_options_grants').then(function (grants) {
                    $scope.grants = grants;
                    // Uses the grants to update the transactions with forfeited values
                    // Eliminates the need for further reference to forfeit grants
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

                    angular.forEach($scope.issues, function(issue) {
                        var offset = issue.date.getTimezoneOffset();
                        issue.date = issue.date.addMinutes(offset);
                        if (issue.vestingbegins) {
                            issue.vestingbegins = issue.vestingbegins.addMinutes(offset);
                        }
                    });


                    for (var i = 0, l = $scope.trans.length; i < l; i++) {
                        var offset = $scope.trans[i].date.getTimezoneOffset();
                        $scope.trans[i].date = $scope.trans[i].date.addMinutes(offset);
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

                    // Generate the rows from the transactions
                    // u represents units throughout, a price
                    angular.forEach($scope.trans, function (tran) {
                        angular.forEach($scope.rows, function (row) {
                            if (row.name == tran.investor) {
                                if (tran.issue in row) {
                                    row[tran.issue]["u"] = calculate.sum(row[tran.issue]["u"], tran.units);
                                    row[tran.issue]["a"] = calculate.sum(row[tran.issue]["a"], tran.amount);
                                    row[tran.issue]["ukey"] = row[tran.issue]["u"];
                                    row[tran.issue]["akey"] = row[tran.issue]["a"];
                                    if (!isNaN(parseFloat(tran.forfeited))) {
                                        row[tran.issue]["u"] = calculate.sum(row[tran.issue]["u"], (-tran.forfeited));
                                        row[tran.issue]["ukey"] = row[tran.issue]["u"];
                                    }
                                }
                                else {
                                    row[tran.issue] = {};
                                    row[tran.issue]["u"] = tran.units;
                                    row[tran.issue]["a"] = tran.amount;
                                    row[tran.issue]["ukey"] = tran.units;
                                    row[tran.issue]["akey"] = tran.amount;
                                    row[tran.issue]["state"] = false;
                                    if (!isNaN(parseFloat(tran.forfeited))) {
                                        row[tran.issue]["u"] = calculate.sum(row[tran.issue]["u"], (-tran.forfeited));
                                        row[tran.issue]["ukey"] = row[tran.issue]["u"];
                                    }
                                }
                            }
                            else {
                                if (tran.issue in row) {
                                }
                                else {
                                    row[tran.issue] = {"u": null, "a": null, "ukey": null, "akey": null};
                                }
                            }
                        });
                    });

                    angular.forEach($scope.rows, function (row) {
                        angular.forEach($scope.issues, function (issue) {
                            if (row[issue.issue] != undefined) {
                                if (issue.type == "Debt" && isNaN(parseInt(row[issue.issue]['u'])) && !isNaN(parseInt(row[issue.issue]['a']))) {
                                    row[issue.issue]['x'] = calculate.debt($scope.rows, issue, row);
                                }
                                ;
                            }
                            ;
                        });
                    });

                    // Generate the unissued rows (the difference between total authorised and actually authorised)
                    angular.forEach($scope.issues, function (issue) {
                        $scope.rows = calculate.unissued($scope.rows, $scope.issues, String(issue.issue));
                    });


                    angular.forEach($scope.rows, function (row) {
                        angular.forEach($scope.issuekeys, function (issuekey) {
                            if (issuekey in row) {
                            }
                            else {
                                row[issuekey] = {"u": null, "a": null};
                            }
                        });
                    });

                    // Calculate the start percentage for sorting purposes
                    angular.forEach($scope.rows, function(row) {
                        row.startpercent = calculate.sharePercentage(row, $scope.rows, $scope.issuekeys, shareSum(row), totalShares($scope.rows))
                    });


                    $scope.issues.sort(sorting.issuedate);
                    $scope.issuekeys = sorting.issuekeys($scope.issuekeys, $scope.issues);
                    $scope.rows.sort(sorting.basicrow());

                    SWBrijj.procm('ownership.get_everyone_else').then(function (x) {
                        $scope.everyone = {}
                        $scope.everyone.percentage = x[0].get_everyone_else;
                    });

                    var values = {"name": "Other Shareholders", "editable": "0"}
                });
            });
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


        // Sets the states for the grey selection box
        angular.forEach($scope.rows, function (row) {
            row.state = false;
            angular.forEach($scope.issues, function (issue) {
                if (issue.issue) {
                    if (row.name == currenttran && currentcolumn == issue.issue) {
                        row[currentcolumn].state = true;
                    }
                    else {
                        row[issue.issue].state = false;
                        issue.state = false;
                    }
                }
            });
        });

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

        // Set the states for the grey selected box
        angular.forEach($scope.rows, function (row) {
            row.state = false;
            angular.forEach($scope.issues, function (issue) {
                if (issue.issue) {
                    row[issue.issue].state = false;
                    issue.state = false;
                }
            });
        });

        issue.state = true;

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

        // Set the states for the selected boxes
        angular.forEach($scope.rows, function (row) {
            row.state = false;
            angular.forEach($scope.issues, function (issue) {
                if (issue.issue) {
                    row[issue.issue].state = false;
                    issue.state = false;
                }
            });
        });

        investor.state = true;

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
            var n = amount.toString().split(".");
            //Comma-fies the first part
            n[0] = n[0].replace(/\B(?=(\d{3})+(?!\d))/g, ",");
            // Caps decimals to 3 places
            if (n[1] && n[1].length > 4) {
                n[1] = n[1].substring(0,3);
            }
            //Combines the two sections
            amount = n.join(".");
        }
        return amount;
    };

    $scope.formatDollarAmount = function(amount) {
        var output = $scope.formatAmount(amount);
        if (output) {
            output = "$" + output
        }
        return (output);
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
    var totalShares = memoize(calculate.totalShares)
    $scope.totalShares = function(rows) {
        return $scope.formatAmount(totalShares(rows));
    };

    // Total Shares | Paid for an issue column (type is either u or a)
    var totalPaid = memoize(calculate.totalPaid);
    $scope.totalPaid = function(rows) {
        return $scope.formatDollarAmount(totalPaid(rows));
    };

    // Total Shares for a shareholder row
    var shareSum = memoize(calculate.shareSum);
    $scope.shareSum = function(row) {
        return $scope.formatAmount(shareSum(row));
    };

    // Total Shares | Paid for an issue column (type is either u or a)
    var colTotal = memoize(calculate.colTotal);
    $scope.colTotal = function(header, rows, type) {
        return colTotal(header, rows, type);
    };

    // Total percentage ownership for each shareholder row
    var sharePercentage = memoize(calculate.sharePercentage);
    $scope.sharePercentage = function(row, rows, issuekeys) {
        return sharePercentage(row, rows, issuekeys, shareSum(row), totalShares(rows));
    };

    // Total percentage ownership for each shareholder row
    $scope.pricePerShare = function() {
        return $scope.formatDollarAmount(calculate.pricePerShare($scope.issues));
    };

    // Last issue date for the sidebar In Brief section
    $scope.lastIssue = function() {
        return calculate.lastIssue($scope.issues);
    };

    // Last issue date for the sidebar In Brief section
    $scope.lastPostMoney = function() {
        return $scope.formatDollarAmount(calculate.lastPostMoney($scope.issues));
    };


};