app.controller('invCaptableController',
    ['$scope', '$parse', 'SWBrijj', 'calculate', 'switchval', '$filter',
     '$routeParams', '$rootScope', '$location', 'navState', 'captable',
function($scope, $parse, SWBrijj, calculate, switchval, $filter,
         $routeParams, $rootScope, $location, navState, captable)
{
    if (navState.role == 'issuer') {
        $location.path('/company-captable');
        return;
    }

    var company = navState.company;
    $scope.currentCompany = company;
    
    $scope.ct = captable.getCapTable();
    $scope.captable = captable;

    /*
    $scope.issuetypes = [];
    $scope.freqtypes = [];
    $scope.security_names = [];
    $scope.tf = ["yes", "no"];
    $scope.issues = [];
    $scope.issueSort = 'date';
    $scope.rowSort = '-name';
    */
    /*
    $scope.rows = [];
    $scope.uniquerows = [];
    $scope.activeTran = [];

    $scope.investorOrder = "name";
    */
    $scope.securityUnitLabel = function(security) {
        var type = $filter('issueUnitLabel')(security.attrs.security_type);
        return type;
    };
    SWBrijj.procm('_ownership.my_visible_investors').then(function(x) {
        console.log(x);
    }).except(function(x) {
        console.log(x);
    });
    SWBrijj.procm('ownership.return_status').then(function (x) {
        $scope.level = x[0].return_status;
        if ($scope.level != 'Full View' && $scope.level != 'Personal View') {
            $location.url("/app/home/");
        }
        if ($scope.level == 'Full View') {
            $scope.fullview = true;
        }
        console.log($scope.level);
    });

    /*
    SWBrijj.tblm('ownership.this_company_issues').then(function (data) {
        $scope.issues = data;
        for (var i = 0, l = $scope.issues.length; i < l; i++) {
            $scope.issues[i].key = $scope.issues[i].issue;
            $scope.security_names.push($scope.issues[i].key);
        };

        // Pivot shenanigans
        SWBrijj.tblm('ownership.this_company_transactions').then(function (trans) {
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
                        issue.date = calculate.timezoneOffset(issue.date);
                        if (issue.vestingbegins) {
                            issue.vestingbegins = calculate.timezoneOffset(issue.vestingbegins);
                            issue.vestingbeginsdisplay = calculate.monthDiff(issue.vestingbegins,issue.date);
                        }
                    });


                    for (var i = 0, l = $scope.trans.length; i < l; i++) {
                        $scope.trans[i].date = calculate.timezoneOffset($scope.trans[i].date);
                        if ($scope.trans[i].vestingbegins) {
                            $scope.trans[i].vestingbegins = calculate.timezoneOffset($scope.trans[i].vestingbegins);
                            $scope.trans[i].vestingbeginsdisplay = calculate.monthDiff($scope.trans[i].vestingbegins,$scope.trans[i].date);
                        }

                        if ($scope.uniquerows.indexOf($scope.trans[i].investor) == -1) {
                            $scope.uniquerows.push($scope.trans[i].investor);
                            $scope.rows.push({"name": $scope.trans[i].investor, "namekey": $scope.trans[i].investor, "editable": "yes"});
                        }
                        angular.forEach($scope.issues, function (issue) {
                            if ($scope.trans[i].issue == issue.issue) {
                                $scope.trans[i].totalauth = issue.totalauth;
                                $scope.trans[i].premoney = issue.premoney;
                                $scope.trans[i].postmoney = issue.postmoney;
                            }
                        });
                    }

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

                    // Get the company's Paripassu's on issues
                    SWBrijj.tblm('ownership.this_company_paripassu').then(function (links) {
                        var links = links;
                        angular.forEach($scope.issues, function(issue) {
                            issue.paripassu = [];
                            angular.forEach(links, function(pari) {
                                if (pari.issue == issue.issue) {
                                    issue.paripassu.push(pari);
                                }
                            });
                            if (issue.paripassu.length == 0) {
                                issue.paripassu.push({"company":issue.company, "issue": issue.issue, "pariwith": null});
                            }
                        })
                    });

                    SWBrijj.tblm('ownership.this_company_conversion').then(function (convert) {
                        SWBrijj.tblm('ownership.this_company_transfer').then(function (transfer) {
                            angular.forEach($scope.trans, function (tran) {
                                tran.convert = [];
                                angular.forEach(convert, function(con) {
                                    if (con.tranto == tran.tran_id) {
                                        con.date = calculate.timezoneOffset(con.date);
                                        if (con.method == "Split") {
                                            con.split = new Fraction(con.split);
                                        }
                                        tran.convert.push(con);
                                    }
                                });

                                angular.forEach(transfer, function(transf) {
                                    transf.date = calculate.timezoneOffset(transf.date);
                                    if (transf.tranto == tran.tran_id) {
                                        var final = angular.copy(transf);
                                        final.direction = "To";
                                        tran.convert.push(final);
                                    }
                                    else if (transf.tranfrom == tran.tran_id) {
                                        var final = angular.copy(transf);
                                        final.direction = "From";
                                        tran.convert.push(final);
                                    }
                                });
                            });
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
                        angular.forEach($scope.security_names, function (issuekey) {
                            if (issuekey in row) {
                            }
                            else {
                                row[issuekey] = {"u": null, "a": null};
                            }
                        });
                    });

                    // Calculate the start percentage for sorting purposes
                    angular.forEach($scope.rows, function(row) {
                        row.startpercent = calculate.sharePercentage(row, $scope.rows, $scope.security_names, shareSum(row), totalShares($scope.rows))
                    });


                    $scope.issues.sort(sorting.issuedate);
                    $scope.security_names = sorting.security_names($scope.security_names, $scope.issues);
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
        var allowablekeys = angular.copy($scope.security_names);
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
                    tran.partpref = calculate.booltoYN(tran, 'partpref', $scope.tf);
                    tran.dragalong = calculate.booltoYN(tran, 'dragalong', $scope.tf);
                    tran.tagalong = calculate.booltoYN(tran, 'tagalong', $scope.tf);
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
        var allowablekeys = angular.copy($scope.security_names);
        var index = allowablekeys.indexOf(issue.issue);
        allowablekeys.splice(index, 1);
        $scope.allowKeys = allowablekeys;

        $scope.activeIssue.partpref = calculate.booltoYN($scope.activeIssue, 'partpref', $scope.tf);
        $scope.activeIssue.dragalong = calculate.booltoYN($scope.activeIssue, 'dragalong', $scope.tf);
        $scope.activeIssue.tagalong = calculate.booltoYN($scope.activeIssue, 'tagalong', $scope.tf);
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
            angular.forEach($scope.security_names, function (key) {
                values[key] = {"u": null, "a": null};
            });
            $scope.rows.push(values);
        }
        $scope.activeInvestorName = investor.name;
    };
    */

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

    /*
    $scope.canHover = function (row) {
        if (row['u'] || row['a']) {
            return true
        }
        else {
            return false
        }
    };
    */

    //switches the sidebar based on the type of the issue
    $scope.formatAmount = function (amount) {
        return calculate.funcformatAmount(amount);
    };

    $scope.formatDollarAmount = function(amount) {
        var output = calculate.formatMoneyAmount($scope.formatAmount(amount), $scope.settings);
        return output;
    };

    // Functions derived from services for use in the table

    /*
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
    $scope.sharePercentage = function(row, rows, security_names) {
        return sharePercentage(row, rows, security_names, shareSum(row), totalShares(rows));
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

    $scope.grantbyIssue = function (key) {
        var type = "";
        angular.forEach($scope.issues, function(issue) {
            if (issue.issue == key) {
                if (issue.type == "Option") {
                    type = "options";
                }
                else if (issue.type == "Warrant") {
                    type = "warrants";
                }
                else {
                    type = "shares";
                }

            }
        });
        return type
    };
*/

    $scope.tabvisible = function(tab) {
        if (tab.title == "Activity") {
            if (tab.active == true && !($scope.toggleView() && $scope.fieldActive())) {
                tab.active = false;
                $scope.tabs[0].active = true;
            }
            return $scope.toggleView() && $scope.fieldActive()
        } else {
            return true;
        }
    };

    $scope.tabnumber = function() {
        var total = 0;
        angular.forEach($scope.tabs, function(tab) {
            if ($scope.tabvisible(tab)) {
                total += 1;
            }
        });
        return total;
    };

    $scope.singleTransaction = function(trans) {
        return (trans.length == 1);
    };

    // This should really be in a directive (or more properly get some clever css set-up to do it for me...
    $scope.$watch(function() {
        return $(".leftBlock").height();
    }, function(newValue, oldValue) {
        $scope.stretchheight = {height: String(newValue + 59) + "px"};
    });
}]);
