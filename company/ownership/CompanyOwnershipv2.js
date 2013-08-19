'use strict';

/* App Module */

var owner = angular
    .module('companyownership', ['ui.bootstrap', 'ui.event', '$strap.directives', 'brijj', 'ownerServices', 'ownerFilters'])

owner.config(function ($routeProvider, $locationProvider) {
    $locationProvider.html5Mode(true).hashPrefix('');

    $routeProvider.
        when('/', {templateUrl: 'captable.html', controller: captableController}).
        when('/grant', {templateUrl: 'grant.html', controller: grantController}).
        when('/status', {templateUrl: 'status.html', controller: statusController}).
        otherwise({redirectTo: '/'});
});

owner.factory('sharedData', function(SWBrijj, $q) {

    var getCompanies = function() {
       var deferred = $q.defer();
        SWBrijj.procm('account.nav_companies').then(function(x) {
            deferred.resolve(x);
        });
        return deferred.promise;
    }

    return { getCompanies:getCompanies };
});


/*
 * memoize.js
 * by @philogb and @addyosmani
 * with further optimizations by @mathias
 * and @DmitryBaranovsk
 * perf tests: http://bit.ly/q3zpG3
 * Released under an MIT license.
 */
function memoize( fn ) {
    return function () {
        var args = Array.prototype.slice.call(arguments),
            hash = "",
            i = args.length;
        var currentArg = null;
        while (i--) {
            currentArg = args[i];
            hash += (currentArg === Object(currentArg)) ?
                JSON.stringify(currentArg) : currentArg;
            fn.memoize || (fn.memoize = {});
        }
        return (hash in fn.memoize) ? fn.memoize[hash] :
            fn.memoize[hash] = fn.apply(this, args);
    };
}

// IE8 Shiv for checking for an array
function isArray(obj) {
    return Object.prototype.toString.call(obj) === '[object Array]';
}

owner.run(function ($rootScope) {

    $rootScope.rowOrdering = function (row) {
        var total = 0;
        for (var key in row) {
            if (row.hasOwnProperty(key)) {
                if (key != "name") {
                    if (!isNaN(parseFloat(row[key]['u'])) && String(key) != "$$hashKey") {
                        total = total + parseFloat(row[key]['u']);
                    }
                }
            }
        }
        return -total;
    };

//Calculates total grants in each issue
    $rootScope.totalGranted = function (issue, trans) {
        var granted = 0;
        angular.forEach(trans, function (tran) {
            if (tran.issue == issue && tran.type == "options" && !isNaN(parseFloat(tran.units))) {
                granted = granted + parseFloat(tran.units);
            }
        });
        return granted;
    };

//Calculates total grant actions in grant table
    $rootScope.totalGrantAction = function (type, grants) {
        var total = 0;
        angular.forEach(grants, function (grant) {
            if (grant.action == type && !isNaN(parseFloat(grant.unit))) {
                total = total + parseFloat(grant.unit);
            }
        });
        return total;
    };

//Calculates total granted to and forfeited in grant table
    $rootScope.totalTranAction = function (type, trans) {
        var total = 0;
        angular.forEach(trans, function (tran) {
            if (type == "granted") {
                if (!isNaN(parseFloat(tran.units)) && parseFloat(tran.units) > 0) {
                    total = total + parseFloat(tran.units);
                }
            }
            else if (type == "forfeited") {
                if (!isNaN(parseFloat(tran.units)) && parseFloat(tran.units) < 0) {
                    total = total + parseFloat(tran.units);
                }
            }
        });
        return total;
    };

    $rootScope.postIssues = function (keys, issue) {
        console.log(keys);
        console.log(issue);
    };

});

function hidePopover() {
    angular.element('.popover').hide();
}

var captableController = function ($scope, $rootScope, $parse, SWBrijj, calculate, switchval, sorting) {

    var company = $rootScope.selected.company;
    $scope.currentCompany = company;

/*    if ($rootScope.selected.isAdmin) {
        if ($rootScope.path.indexOf('/investor/') > -1) {
            document.location.href=$rootScope.path.replace("/investor/", "/company/");
        }
    } else {
        if ($rootScope.path.indexOf('/company/') > -1) {
            document.location.href=$rootScope.path.replace("/company/", "/investor/");
        }
    }*/

    // Set the view toggles to their defaults
    $scope.radioModel = "Edit";
    $scope.dilutionSwitch = true;
    $scope.captablestate = 0;

    // Variables for the select boxes to limit the selections to the available database types
    $scope.issuetypes = [];
    $scope.freqtypes = [];
    $scope.tf = ["yes", "no"];
    $scope.liquidpref = ['None','1X','2X', '3X'];

    $scope.extraPeople = [
        {"email": ""}
    ];

    // Database calls to get the available issuetypes and frequency types (i.e. monthly, weekly etc.)
    SWBrijj.procm('ownership.get_transaction_types').then(function (results) {
        angular.forEach(results, function (result) {
            $scope.issuetypes.push(result['get_transaction_types']);
        });
    });
    SWBrijj.procm('ownership.get_freqtypes').then(function (results) {
        angular.forEach(results, function (result) {
            $scope.freqtypes.push(result['get_freqtypes']);
        });
    });

    // Empty variables for issues
    $scope.issuekeys = [];
    $scope.issues = [];

    // Sorting variables
    $scope.issueSort = 'date';
    $scope.rowSort = '-name';

    // Empty variables for the rows and transactions
    $scope.rows = [];
    $scope.uniquerows = [];
    $scope.activeTran = [];

    // Initialize a few visible variables
    $scope.investorOrder = "name";
    $scope.sideToggleName = "Hide"

    // Get the company's Issues
    SWBrijj.tblm('ownership.company_issue').then(function (data) {
        $scope.issues = data;

        // Get the company's Transactions
        SWBrijj.tblm('ownership.company_transaction').then(function (trans) {
            $scope.trans = trans;

            // Get the company's Grants
            SWBrijj.tblm('ownership.company_grants').then(function (grants) {
                $scope.grants = grants;
                for (var i = 0, l = $scope.issues.length; i < l; i++) {
                    $scope.issues[i].key = $scope.issues[i].issue;
                    $scope.issuekeys.push($scope.issues[i].key);
                }



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

                // Various extra key fields given to the transactions to allow for reverting at a later point
                for (var i = 0, l = $scope.trans.length; i < l; i++) {
                    $scope.trans[i].key = $scope.trans[i].issue;
                    $scope.trans[i].unitskey = $scope.trans[i].units;
                    $scope.trans[i].paidkey = $scope.trans[i].amount;
                    var offset = $scope.trans[i].date.getTimezoneOffset();
                    $scope.trans[i].date = $scope.trans[i].date.addMinutes(offset);
                    $scope.trans[i].datekey = $scope.trans[i]['date'].toUTCString();
                    $scope.trans[i].investorkey = $scope.trans[i].investor;
                    if ($scope.uniquerows.indexOf($scope.trans[i].investor) == -1) {
                        $scope.uniquerows.push($scope.trans[i].investor);
                        $scope.rows.push({"name": $scope.trans[i].investor, "namekey": $scope.trans[i].investor, "email": $scope.trans[i].email, "emailkey": $scope.trans[i].email, "editable": "yes"});
                    }
                    // Transactions inherit the issue values that are uneditable for individual transactions
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
                                    row[tran.issue]["u"] = (-tran.forfeited);
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


                // Debt calculation for any rows with paid but no shares
                angular.forEach($scope.rows, function (row) {
                    angular.forEach($scope.issues, function (issue) {
                        if (row[issue.issue] != undefined) {
                            if (isNaN(parseFloat(row[issue.issue]['u'])) && !isNaN(parseFloat(row[issue.issue]['a']))) {
                                row[issue.issue]['x'] = calculate.debt($scope.rows, issue, row);
                            }
                        }
                    });
                });

                // Generate the unissued rows (the difference between total authorised and actually authorised)
                angular.forEach($scope.issues, function (issue) {
                    if (!isNaN(parseFloat(issue.totalauth))) {
                        console.log(issue.totalauth);
                        var leftovers = calculate.whatsleft(issue.totalauth, issue, $scope.rows);
                        if (leftovers != 0) {
                            var issuename = String(issue.issue);
                            var shares = {"u": leftovers, "a": null, "ukey": leftovers, "akey": null};
                            $scope.rows.push({"name": issuename + " (unissued)", "editable": 0, "nameeditable": 0});
                            $scope.rows[($scope.rows.length) - 1][issuename] = shares;
                        }
                    }
                });


                angular.forEach($scope.rows, function (row) {
                    angular.forEach($scope.issuekeys, function (issuekey) {
                        if (issuekey in row) {
                        }
                        else {
                            row[issuekey] = {"u": null, "a": null, "ukey": null, "akey": null};
                        }
                    });
                });


                // Sort the columns before finally showing them
                // Issues are sorted by date, rows by ownership within each issue
                $scope.issues.sort(sorting.issuedate);
                $scope.issuekeys = sorting.issuekeys($scope.issuekeys, $scope.issues);
                $scope.rows.sort(sorting.row($scope.issuekeys));

                var values = {"name": "", "editable": "0"};
                angular.forEach($scope.issuekeys, function (key) {
                    values[key] = {"u": null, "a": null, "ukey": null, "akey": null};
                });
                $scope.rows.push(values);

                // Add extra blank issue, which will create a new one when clicked. Silly future date so that
                // the issue always appears on the rightmost side of the table
                $scope.issues.push({"name": "", "date": Date(2100, 1, 1)});

            });
        });
    });

    $scope.findValue = function (row, header) {
        angular.forEach($scope.rows, function (picked) {
            if (picked == row) {
                return $scope.rows[header];
            }
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

        angular.forEach($scope.rows, function (row) {
            angular.forEach($scope.issuekeys, function (key) {
                if (row.name == currenttran && currentcolumn == key) {
                    row[currentcolumn].state = true;
                }
                else {
                    row[key].state = false;
                }
            });
        });

        var first = 0;
        angular.forEach($scope.trans, function (tran) {
            if (tran.investor == currenttran) {
                if (tran.issue == currentcolumn) {
                    if (first == 0) {
                        tran['active'] = true;
                        first = first + 1
                    }
                    if (String(tran['partpref']) == "true") {
                        tran.partpref = $scope.tf[0];
                    }
                    else {
                        tran.partpref = $scope.tf[1];
                    }
                    $scope.activeTran.push(tran);
                }
            }
        });
        if ($scope.activeTran.length < 1) {
            var anewTran = {};
            anewTran = {"active": true, "atype": 0, "new": "yes", "investor": $scope.activeInvestor, "investorkey": $scope.activeInvestor, "company": $scope.company, "date": (Date.today()), "datekey": (Date.today()), "issue": (currentcolumn), "units": null, "paid": null, "unitskey": null, "paidkey": null, "key": 'undefined'};
            angular.forEach($scope.issues, function (issue) {
                if (issue.issue == currentcolumn) {
                    anewTran = $scope.tranInherit(anewTran, issue);
                }
            });
            $scope.trans.push(anewTran);
            $scope.activeTran.push(anewTran);
        }
        $scope.activeTran[0].go = false;
    };

    $scope.getActiveIssue = function (issue) {

        $scope.sideBar = 1;
        $scope.activeIssue = issue;
        $scope.issueRevert = angular.copy(issue);

        angular.forEach($scope.rows, function (row) {
            angular.forEach($scope.issuekeys, function (key) {
                row[key].state = false;
            });
        });

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
        if ($scope.activeIssue.name == "") {
            $scope.activeIssue.date = (Date.today()).toUTCString();
        }
        // Set Freq Value for Angularjs Select
        var index = $scope.freqtypes.indexOf(issue.vestfreq);
        $scope.activeIssue.vestfreq = $scope.freqtypes[index];
    };

    $scope.saveIssueAssign = function (issue, field, i) {
        if (i) {
            issue[field] = i;
        }
        $scope.saveIssueCheck(issue, field)
    }

    $scope.saveIssueCheckDate = function (issue, field, evt) {
        //Fix the dates to take into account timezone differences
        if (evt) { // User is typing
            if (evt != 'blur')
                keyPressed = true;
            var dateString = angular.element('#' + issue.$$hashKey).val();
            var charCode = (evt.which) ? evt.which : event.keyCode; // Get key
            if (charCode == 13 || (evt == 'blur' && keyPressed)) { // Enter key pressed or blurred
                var date = Date.parse(dateString);
                if (date) {
                    issue.date = date;
                    var offset = issue.date.getTimezoneOffset();
                    issue.date = issue.date.addMinutes(offset);
                    $scope.saveIssueCheck(issue, field);
                    keyPressed = false;
                }
            }
        } else { // User is using calendar
            if (issue.date instanceof Date) {
                var offset = issue.date.getTimezoneOffset();
                issue.date = issue.date.addMinutes(offset);
                $scope.saveIssueCheck(issue, field);
                keyPressed = false;
            }
        }
    };

    $scope.saveIssueCheck = function (issue, field) {
        var x = false;
        angular.forEach($scope.trans, function(tran) {
            if (issue[field] != tran[field] && tran[field] != "" && issue['issue'] == tran['issue']) {
                $scope.imodalUp(issue, field);
                x = true;
            }
        });
        if (x == false) {
            $scope.saveIssue(issue, field);
        }
    };

    /* Save Issue Function. Takes the issue and the item being changed so that the sub transactions can also be updated in just that field */
    $scope.saveIssue = function (issue, item) {
        console.log("saving issue");
        if (issue['issue'] == null && issue['key'] == null) {
            return
        }

        else if (issue['issue'] == "" && issue['key'] != null) {
            $scope.dmodalUp(issue);
            return
        }

        else {

            if (issue['key'] != null) {
                var dateconvert = new Date(issue['date']);
                var d1 = dateconvert.toUTCString();
                if (issue['partpref'] != null) {
                    var partpref = $scope.strToBool(issue['partpref']);
                }
                ;
                if (issue['vestingbegins'] == undefined) {
                    var vestcliffdate = null
                }
                else {
                    var vestcliffdate = (issue['vestingbegins']).toUTCString();
                }
                SWBrijj.proc('ownership.update_issue', issue['key'], issue['type'], d1, issue['issue'], parseFloat(issue['premoney']), parseFloat(issue['postmoney']), parseFloat(issue['ppshare']), parseFloat(issue['totalauth']), partpref, issue.liquidpref, issue['optundersec'], parseFloat(issue['price']), parseFloat(issue['terms']), vestcliffdate, parseFloat(issue['vestcliff']), issue['vestfreq'], issue['debtundersec'], parseFloat(issue['interestrate']), parseFloat(issue['valcap']), parseFloat(issue['discount']), parseFloat(issue['term'])).then(function (data) {
                    var oldissue = issue['key'];
                    if (issue['issue'] != issue.key) {
                        angular.forEach($scope.rows, function (row) {
                            row[issue['issue']] = row[issue.key];
                            delete row[issue.key];
                        });
                    }
                    var keepgoing = true;
                    var deleterow = -1;
                    var issuename = String(issue.issue);
                    var leftovers = calculate.whatsleft(issue.totalauth, issue, $scope.rows);
                    var shares = {"u": leftovers, "ukey": leftovers, "x": null};
                    angular.forEach($scope.rows, function (row) {
                        if (keepgoing) {
                            if (row.name == oldissue + " (unissued)") {
                                keepgoing = false;
                                if (!isNaN(parseFloat(issue.totalauth)) && leftovers != 0) {
                                    row[issuename] = shares;
                                    row['name'] = issue.issue + " (unissued)";
                                }
                                else {
                                    deleterow = $scope.rows.indexOf(row);
                                }
                            }
                        }
                    });
                    if (keepgoing != false) {
                        if (!isNaN(parseFloat(issue.totalauth)) && !isNaN(parseFloat(leftovers)) && leftovers != 0) {
                            $scope.rows.push({"name": issuename + " (unissued)", "editable": 0, "nameeditable": 0});
                            $scope.rows[($scope.rows.length) - 1][issuename] = shares;
                        }
                    }
                    if (deleterow > -1) {
                        $scope.rows.splice(deleterow, 1);
                    }
                    angular.forEach($scope.trans, function (tran) {
                        if (tran.issue == issue.key) {
                            tran[item] = issue[item];
                            console.log(tran[item]);
                            if (tran.tran_id != undefined) {
                                $scope.saveTran(tran);
                            }
                        }
                    });

                    angular.forEach($scope.rows, function (row) {
                        if (row[issue.issue] != undefined) {
                            if (isNaN(parseFloat(row[issue.issue]['u'])) && !isNaN(parseFloat(row[issue.issue]['a']))) {
                                row[issue.issue]['x'] = calculate.debt($scope.rows, issue, row);
                            }
                        }
                    });

                    var index = $scope.issuekeys.indexOf(issue.key);
                    $scope.issuekeys[index] = issue.issue;
                    issue.key = issue.issue;
                });
            }

            else {
                var d1 = (Date.today()).toUTCString();
                var expire = null;
                SWBrijj.proc('ownership.create_issue', d1, expire, issue['issue'], parseFloat(issue['price'])).then(function (data) {
                    issue.key = issue['issue'];
                    $scope.issues.push({name: ""});
                    $scope.issuekeys.push(issue.key);
                    angular.forEach($scope.rows, function (row) {
                        row[issue.key] = {"u": null, "a": null};
                    });

                    var allowablekeys = angular.copy($scope.issuekeys);
                    var index = allowablekeys.indexOf(issue.issue);
                    allowablekeys.splice(index, 1);
                    $scope.allowKeys = allowablekeys;
                });
            }
        }
    };

    $scope.deleteIssueButton = function (activeIssue) {
        $scope.dmodalUp(activeIssue);
    };

    $scope.deleteIssue = function (issue) {
        console.log(issue);
        SWBrijj.proc('ownership.delete_issue', issue['key']).then(function (data) {
            angular.forEach($scope.issues, function (oneissue) {
                if (oneissue['key'] == issue['key']) {
                    var index = $scope.issues.indexOf(oneissue);
                    $scope.issues.splice(index, 1);
                    var indexed = $scope.issuekeys.indexOf(oneissue.key);
                    $scope.issuekeys.splice(indexed, 1);
                }
            });
            angular.forEach($scope.rows, function (row) {
                if (issue.key in row) {
                    delete row[issue.key];
                }
                if (row["name"] == issue.key + " (unissued)") {
                    var index = $scope.rows.indexOf(row);
                    $scope.rows.splice(index, 1);
                }
            });
            $scope.sideBar = "x";
        });
    };

    $scope.revertIssue = function (issue) {
        angular.forEach($scope.issues, function (x) {
            if (x.key == issue.key) {
                x.issue = issue.key;
            }
        });
    };

    $scope.tranChangeU = function (value) {
        if ($scope.activeTran.length < 2) {
            $scope.activeTran[0]['units'] = value;
        }
    };

    $scope.tranChangeA = function (value) {
        if ($scope.activeTran.length < 2) {
            $scope.activeTran[0]['amount'] = value;
        }
    };

    $scope.getActiveInvestor = function (investor) {
        $scope.sideBar = 3;

        angular.forEach($scope.rows, function (row) {
            angular.forEach($scope.issuekeys, function (key) {
                row[key].state = false;
            });
        });

        if (investor.name == "") {
            var values = {"name": "", "editable": "0"};
            angular.forEach($scope.issuekeys, function (key) {
                values[key] = {"u": null, "a": null, "ukey": null, "akey": null};
            });
            $scope.rows.push(values);
        }
        $scope.activeInvestorName = investor.name;
        $scope.activeInvestorEmail = investor.email;
        $scope.activeInvestorNameKey = investor.name;
        $scope.$apply();
    };

    $scope.nameChangeLR = function (investor) {
        $scope.activeInvestorName = investor.name;
        if ((investor.name).length > 0) {
            angular.forEach($scope.rows, function (row) {
                if (row.name == investor.name) {
                    row.editable = "yes";
                }
            });
        }
        else {
            angular.forEach($scope.rows, function (row) {
                if (row.name == investor.name) {
                    row.editable = "0";
                }
            });
        }
    };

    $scope.nameChangeRL = function (investor) {
        $scope.activeInvestorName = investor.name;
    };

    $scope.deletePersonButton = function (name) {
        angular.forEach($scope.rows, function (row) {
            if (row.name == name) {
                $scope.rmodalUp(row);
            }
        })
    };

    // Creates a new blank transaction with today's date
    $scope.createTrantab = function () {
        console.log("creating tab");
        if ($scope.activeTran[0].go) {
            var inIssue = $scope.activeTran[0].issue
            var newTran = {};
            newTran = {"new": "yes", "atype": 0, "investor": $scope.activeInvestor, "investorkey": $scope.activeInvestor, "company": $scope.company, "date": (Date.today()), "datekey": (Date.today()), "issue": (inIssue), "units": null, "paid": null, "unitskey": null, "paidkey": null, "key": "undefined"};
            angular.forEach($scope.issues, function (issue) {
                if (issue.issue == inIssue) {
                    newTran = $scope.tranInherit(newTran, issue);
                }
            });
            $scope.trans.push(newTran);
            $scope.activeTran.push(newTran);
            for (var i = 0; i < $scope.activeTran.length; i++) {
                if (i + 1 == $scope.activeTran.length) {
                    $scope.activeTran[i].active = true;
                }
                else {
                    $scope.activeTran[i].active = false;
                }
            }
        }
        $scope.activeTran[0].go = true;
    };

    $scope.deleteTran = function (tran) {
        var d1 = tran['date'].toUTCString();
        SWBrijj.proc('ownership.delete_transaction', tran['tran_id']).then(function (data) {
            var index = $scope.trans.indexOf(tran);
            $scope.trans.splice(index, 1);
            angular.forEach($scope.rows, function (row) {
                if (row.name === tran['investor']) {
                    if (!isNaN(tran.units)) {
                        row[tran.issue]['u'] = row[tran.issue]['u'] - tran.units;
                        row[tran.issue]['ukey'] = row[tran.issue]['u']
                        if (row[tran.issue]['u'] == 0) {
                            row[tran.issue]['u'] = null
                            row[tran.issue]['ukey'] = null
                        }
                    }
                    if (!isNaN(tran.amount)) {
                        row[tran.issue]['a'] = row[tran.issue]['a'] - tran.amount;
                        row[tran.issue]['akey'] = row[tran.issue]['a']
                        if (row[tran.issue]['a'] == 0) {
                            row[tran.issue]['a'] = null
                            row[tran.issue]['akey'] = null
                        }
                    }
                }
            });

        });
    };

    $scope.revertTran = function (transaction) {
        angular.forEach($scope.trans, function(tran) {
            if (tran.tran_id == transaction.tran_id) {
                console.log("here");
                tran.units = tran.unitskey;
                tran.amount = tran.paidkey;
                $scope.saveTran(tran);
            }
        });
    };

    // Function for when the delete transaction button is pressed in the right sidebar
    $scope.manualdeleteTran = function (tran) {
        var d1 = tran['date'].toUTCString();
        SWBrijj.proc('ownership.delete_transaction', tran['tran_id']).then(function (data) {
            var index = $scope.trans.indexOf(tran);
            $scope.trans.splice(index, 1);
            var index = $scope.activeTran.indexOf(tran);
            $scope.activeTran.splice(index, 1);
            angular.forEach($scope.rows, function (row) {
                if (row.name === tran['investor']) {
                    if (!isNaN(tran.units)) {
                        row[tran.issue]['u'] = row[tran.issue]['u'] - tran.units;
                        row[tran.issue]['ukey'] = row[tran.issue]['u']
                        if (row[tran.issue]['u'] == 0) {
                            row[tran.issue]['u'] = null;
                            row[tran.issue]['ukey'] = null;
                        }
                    }
                    if (!isNaN(tran.amount)) {
                        row[tran.issue]['a'] = row[tran.issue]['a'] - tran.amount;
                        row[tran.issue]['akey'] = row[tran.issue]['a']
                        if (row[tran.issue]['a'] == 0) {
                            row[tran.issue]['a'] = null;
                            row[tran.issue]['akey'] = null;
                        }
                    }
                }
            });
        });
    };

    $scope.updateRow = function (investor) {
        if (investor.name == "" && investor.namekey != undefined) {
            $scope.rmodalUp(investor);
            return
        }
        if (investor.name == "") {
            var index = $scope.rows.indexOf(investor);
            $scope.rows.splice(index, 1);
            return
        }
        angular.forEach($scope.rows, function (row) {
            if (investor.name == row.name && investor['$$hashKey'] != row['$$hashKey']) {
                investor.name = investor.name + " (1)";
            }
        });
        if (investor.name != investor.namekey) {
            var index = $scope.rows.indexOf(investor);
            angular.forEach($scope.trans, function (tran) {
                if (tran.investor == investor.namekey) {
                    tran.investor = investor.name;
                    $scope.saveTran(tran);
                }
            });
            if (investor.name) {
                $scope.rows[index].namekey = investor.name
            }
        }
        $scope.$apply();
    };

    $scope.revertPerson = function (investor) {
        angular.forEach($scope.rows, function (row) {
            if (row.namekey == investor) {
                row.name = row.namekey;
                $scope.nameChangeLR(row)
            }
        });
    };

    $scope.deletePerson = function (investor) {
        $scope.sideBar = "x";
        angular.forEach($scope.trans, function (tran) {
            if (tran.investor == investor) {
                $scope.deleteTran(tran);
            }
        });
        angular.forEach($scope.rows, function (row) {
            if (row.namekey == investor) {
                var index = $scope.rows.indexOf(row);
                $scope.rows.splice(index, 1);
            }
        });
    };

    $scope.saveTranAssign = function (transaction, field, value) {
        if (value) {
            transaction[field] = value;
        }
        $scope.saveTran(transaction);
    };

    // Preformatting on the date to factor in the local timezone offset
    var keyPressed = false; // Needed because selecting a date in the calendar is considered a blur, so only save on blur if user has typed a key
    $scope.saveTranDate = function (transaction, evt) {
        if (evt) { // User is typing
            if (evt != 'blur')
                keyPressed = true;
            var dateString = angular.element('#' + transaction.$$hashKey).val();
            var charCode = (evt.which) ? evt.which : event.keyCode; // Get key
            if (charCode == 13 || (evt == 'blur' && keyPressed)) { // Enter key pressed or blurred
                var date = Date.parse(dateString);
                if (date) {
                    transaction.date = date;
                    var offset = transaction.date.getTimezoneOffset();
                    transaction.date = transaction.date.addMinutes(offset);
                    keyPressed = false;
                    $scope.saveTran(transaction);
                }
            }
        } else { // User is using calendar
            //Fix the dates to take into account timezone differences.
            if (transaction.date instanceof Date) {
                var offset = transaction.date.getTimezoneOffset();
                transaction.date = transaction.date.addMinutes(offset);
                keyPressed = false;
                $scope.saveTran(transaction);
            }
        }
    };

    // Save transaction function
    $scope.saveTran = function (transaction) {
        console.log(transaction);
        //Triggers the multi modal if more than one transaction exists
        if (transaction.length > 1) {
            angular.forEach($scope.rows, function (row) {
                if (row.name == transaction[0].investor) {
                    // Deals with Changes in Units
                    if (!isNaN(parseFloat(row[transaction[0].issue]['u']))) {
                        if (parseFloat(row[transaction[0].issue]['u']) != parseFloat(row[transaction[0].issue]['ukey'])) {
                            var changed = (parseFloat(row[transaction[0].issue]['u']) - parseFloat(row[transaction[0].issue]['ukey']));
                            $scope.mmodalUp(changed, "u", transaction);
                            return
                        }
                    }
                    // Deals with changes in Price
                    if (!isNaN(parseFloat(row[transaction[0].issue]['a']))) {
                        if (parseFloat(row[transaction[0].issue]['a']) != parseFloat(row[transaction[0].issue]['akey'])) {
                            var changed = (parseFloat(row[transaction[0].issue]['a']) - parseFloat(row[transaction[0].issue]['akey']));
                            $scope.mmodalUp(changed, "a", transaction);
                            return
                        }
                    }
                }
            });
            // Reverts in the case where multitransaction rows are set to blank
            angular.forEach($scope.rows, function(row) {
                 if (row.name == transaction[0].investor) {
                     row[transaction[0].issue]['u'] = row[transaction[0].issue]['ukey']
                     row[transaction[0].issue]['a'] = row[transaction[0].issue]['akey']
                 }
            });
            return
        }
        // Moves on to the main saving process
        else {
            if (isArray(transaction)) {
                transaction = transaction[0];
            }
        }
        if (!(/^\d+$/.test(transaction.units)) && transaction.units != null && transaction.units != "") {
          console.log("there are letters")
          transaction.units = transaction.unitskey;
        };
        if (!(/^\d+$/.test(transaction.amount)) && transaction.amount != null && transaction.amount != "") {
            console.log("there are letters")
            transaction.amount = transaction.paidkey;
        };
        // Bail out if insufficient data has been added for the transaction
        if (transaction == undefined || isNaN(parseFloat(transaction.units)) && isNaN(parseFloat(transaction.amount)) && isNaN(parseInt(transaction.tran_id))) {
            console.log("transaction is undefined");
            return
        }
        // Delete the transaction if an existing transaction has had all its information removed
        if (isNaN(parseFloat(transaction.units)) && isNaN(parseFloat(transaction.amount)) && !isNaN(parseInt(transaction.tran_id))) {
            $scope.tranDeleteUp(transaction);
            return
        }
        // Not quite enough information to save
        else if (transaction['issue'] == undefined || (isNaN(parseFloat(transaction['units'])) && isNaN(parseFloat(transaction['amount'])))) {
            console.log("incomplete transaction");
            return
        }
        // We have enough info to begin the saving process
        else {
            if (transaction.type == "Option" && transaction.units < 0) {
                transaction.units = transaction.unitskey;
                $rootScope.notification.show("fail", "Cannot have a negative number of shares");
                return
            }
            else if (transaction.amount < 0) {
                transaction.amount = transaction.amountkey;
                $rootScope.notification.show("fail", "Cannot have a negative amount for options");
                return
            }
            else {
                var d1 = transaction['date'].toUTCString();
                if (transaction['tran_id'] == undefined) {
                    transaction['tran_id'] = '';
                }
                if (transaction['partpref'] != null) {
                    var partpref = $scope.strToBool(transaction['partpref']);
                }
                if (transaction['vestingbegins'] == undefined) {
                    var vestcliffdate = null
                }

                else {
                    var vestcliffdate = (transaction['vestingbegins']).toUTCString();
                }

                // Convert amount to a float but remove the NaNs if amount is undefined
                transaction['amount'] = parseFloat(transaction['amount']);
                if (isNaN(transaction['amount'])) {
                    transaction['amount'] = null;
                }
                transaction['units'] = parseFloat(transaction['units']);
                if (isNaN(transaction['units'])) {
                    transaction['units'] = null;
                }
                console.log(transaction);
                console.log(transaction.tran_id);
                SWBrijj.proc('ownership.update_transaction', String(transaction['tran_id']), transaction['investor'], transaction['issue'], transaction['units'], d1, transaction['type'], transaction['amount'], parseFloat(transaction['premoney']), parseFloat(transaction['postmoney']), parseFloat(transaction['ppshare']), parseFloat(transaction['totalauth']), partpref, transaction.liquidpref, transaction['optundersec'], parseFloat(transaction['price']), parseFloat(transaction['terms']), vestcliffdate, parseFloat(transaction['vestcliff']), transaction['vestfreq'], transaction['debtundersec'], parseFloat(transaction['interestrate']), parseFloat(transaction['valcap']), parseFloat(transaction['discount']), parseFloat(transaction['term'])).then(function (data) {
                    var tempunits = 0;
                    var tempamount = 0;
                    angular.forEach($scope.rows, function (row) {
                        angular.forEach($scope.trans, function (tran) {
                            if (row.name == tran.investor) {
                                if (transaction.tran_id == '' && !tran.tran_id && (!isNaN(parseFloat(tran.units)) || !isNaN(parseFloat(tran.amount)))) {
                                    console.log("here");
                                    tran.tran_id = data[1][0];
                                }
                                if (tran.investor == transaction.investor && tran.issue == transaction.issue) {
                                    tran.date = tran.date;
                                    tran.key = tran.issue;
                                    tran.unitskey = tran.units;
                                    tran.paidkey = tran.amount;
                                    transaction.datekey = d1;
                                    tempunits = calculate.sum(tempunits, tran.units);
                                    tempamount = calculate.sum(tempamount, tran.amount);
                                    row[tran.issue]['u'] = tempunits;
                                    row[tran.issue]['ukey'] = tempunits;
                                    row[tran.issue]['a'] = tempamount;
                                    row[tran.issue]['akey'] = tempamount;

                                    if (row[tran.issue]['u'] == 0) {
                                        row[tran.issue]['u'] = null;
                                        row[tran.issue]['akey'] = null;
                                    }
                                    if (row[tran.issue]['a'] == 0) {
                                        row[tran.issue]['a'] = null;
                                        row[tran.issue]['akey'] = null;
                                    }
                                    if (!isNaN(parseFloat(tran.forfeited))) {
                                        row[tran.issue]["u"] = calculate.sum(row[tran.issue]["u"], (-tran.forfeited));
                                        row[tran.issue]["ukey"] = row[tran.issue]["u"];
                                    }
                                    row[tran.issue]['x'] = 0;
                                }
                            }
                        });
                    });

                    angular.forEach($scope.rows, function(row) {
                        if (row.name == transaction.issue + " (unissued)") {
                            angular.forEach($scope.issues, function (issue) {
                                if (issue.issue == transaction.issue) {
                                    var leftovers = calculate.whatsleft(issue.totalauth, issue, $scope.rows);
                                    if (leftovers != 0) {
                                        var shares = {"u": leftovers, "ukey": leftovers};
                                        row[issue.issue] = shares;
                                    }
                                }
                            });
                        }
                    });

                    if (transaction.type == "Option" && !isNaN(parseFloat(transaction.amount))) {
                        console.log("creating a grant");
                        var modGrant = {"unit": null, "tran_id": transaction.tran_id, "date": (Date.today()), "action": "exercised", "investor": transaction.investor, "issue": transaction.issue};
                        modGrant.amount = transaction.amount;
                        modGrant.unit = (transaction.amount / transaction.price);
                        angular.forEach($scope.grants, function (grant) {
                            if (transaction.tran_id == grant.tran_id && grant.action == "exercised") {
                                if (grant.date.toUTCString() == Date.today().toUTCString()) {
                                    console.log("should be updating")
                                    modGrant.grant_id = grant.grant_id;
                                }
                                else {
                                    modGrant.amount = modGrant.amount - grant.amount;
                                    modGrant.unit = modGrant.unit - grant.unit;
                                }
                            }
                        });
                        console.log(modGrant);
                        $scope.saveGrant(modGrant);
                    }

                    angular.forEach($scope.rows, function (row) {
                        angular.forEach($scope.issues, function (issue) {
                            if (row[issue.issue] != undefined) {
                                if ((isNaN(parseFloat(row[issue.issue]['u'])) || row[issue.issue]['u'] == 0) && !isNaN(parseFloat(row[issue.issue]['a']))) {
                                    row[issue.issue]['x'] = calculate.debt($scope.rows, issue, row);
                                }
                            }
                        });
                    });
                });
            };
        }
        console.log("done saving");
    };

    // Function for saving grant. Used on the captable when paid is updated from the captable on an option
    $scope.saveGrant = function (grant) {
        if (grant.action == "" && isNaN(parseFloat(grant.unit))) {
            if (grant.grant_id != null) {
                SWBrijj.proc('ownership.delete_grant', parseInt(grant.grant_id)).then(function (data) {
                    var index = $scope.grants.indexOf(grant);
                    $scope.grants.splice(index, 1);
                });
            }
            else {
                console.log(grant);
                return;
            }
        }
        if (grant.action == "" || grant.action == undefined || isNaN(parseFloat(grant.unit))) {
            return;
        }
        if (grant.grant_id == undefined) {
            grant.grant_id = "";
        }
        var d1 = grant['date'].toUTCString();
        SWBrijj.proc('ownership.update_grant', String(grant.grant_id), String(grant.tran_id), grant.action, d1, parseFloat(grant.unit)).then(function (data) {
            if (grant.grant_id == "") {
                grant.grant_id = data[1][0];
            }
            $scope.grants.push(grant);
        });
    };

    $scope.strToBool = function (string) {
        switch (String(string).toLowerCase()) {
            case "true":
            case "yes":
            case "1":
                return true;
            case "false":
            case "no":
            case "0":
            case null:
                return false;
            default:
                return Boolean(string);
        }
    };


    // Function to inherit all the values from the issue to new and updating transactions
    $scope.tranInherit = function (tran, issue) {
        tran.issue = issue.issue;
        tran.type = issue.type;
        tran.totalauth = issue.totalauth;
        tran.premoney = issue.premoney;
        tran.postmoney = issue.postmoney;
        tran.ppshare = issue.ppshare;
        tran.totalauth = issue.totalauth;
        tran.liquidpref = issue.liquidpref;
        tran.partpref = issue.partpref;
        tran.optundersec = issue.optundersec;
        tran.price = issue.price;
        tran.terms = issue.terms;
        tran.vestingbegins = issue.vestingbegins;
        tran.vestcliff = issue.vestcliff;
        tran.vestfreq = issue.vestfreq;
        tran.debtundersec = issue.debtundersec;
        tran.interestrate = issue.interestrate;
        tran.valcap = issue.valcap;
        tran.discount = issue.discount;
        tran.term = issue.term;
        return tran
    };

    // Toggles editable to view
    $scope.toggleView = function () {
        if ($scope.radioModel == "View") {
            $scope.captablestate = 1;
            return true;
        }
        else {
            $scope.dilutionSwitch = true;
            $scope.captablestate = 0;
            return false;
        }
    };

    // Toggles editable to view
    $scope.toggleDilution = function () {
        return $scope.dilutionSwitch;
    };

    // Toggles sidebar back and forth
    $scope.toggleSide = function () {
        if (!$scope.sideToggle) {
            $scope.sideToggleName = "Hide"
            return false
        } else {
            $scope.sideToggleName = "Show"
            return true
        }
    };


    // Generates the diluted rows
    $scope.dilution = function () {
        $scope.dilutedRows = [];
        angular.forEach($scope.rows, function (row) {
            if (row.name != undefined) {
                var something = null;
                var temprow = {"name": row.name, "email": row.email};
                angular.forEach($scope.issuekeys, function (issue) {
                    if (row[issue].a > 0) {
                        temprow[issue] = row[issue];
                        something = true;
                    }
                });
                if (something) {
                    $scope.dilutedRows.push(temprow);
                }
            }
        });
        console.log($scope.dilutedRows)
    };


    //Captable Delete Issue Modal

    $scope.dmodalUp = function (issue) {
        $scope.capDelete = true;
        $scope.missue = issue;
        console.log($scope.missue);
    };

    $scope.dclose = function () {
        $scope.closeMsg = 'I was closed at: ' + new Date();
        $scope.capDelete = false;
    };

    //Captable row delete modal

    $scope.rmodalUp = function (investor) {
        console.log(investor);
        $scope.rowDelete = true;
        $scope.minvestor = investor.namekey;
    };

    $scope.rclose = function () {
        $scope.closeMsg = 'I was closed at: ' + new Date();
        $scope.rowDelete = false;
    };

    // Captable transaction delete modal
    $scope.tranDeleteUp = function (transaction) {
        $scope.deleteTran = transaction;
        $scope.tranDelete = true;
    };

    $scope.deleteclose = function () {
        $scope.closeMsg = 'I was closed at: ' + new Date();
        $scope.tranDelete = false;
    };

    //modal for updating issue fields that have different underlying values

    $scope.imodalUp = function (issue, field) {
        $scope.issueModal = true;
        $scope.changedIssue = issue;
        $scope.changedIssueField = field
    };

    $scope.iclose = function () {
        $scope.closeMsg = 'I was closed at: ' + new Date();
        $scope.issueModal = false;
    };

    $scope.irevert = function (issue) {
        for (var i = 0, l = $scope.issues.length; i < l; i++) {
           if ($scope.issues[i].issue == issue.issue) {
               $scope.issues[i] = $scope.issueRevert;
               $scope.activeIssue = $scope.issueRevert;
           }
        };
    };


    //Adding to a row with more than one transaction modal

    $scope.mmodalUp = function (number, type, transaction) {
        $scope.changedNum = number;
        $scope.changedType = type;
        $scope.changedTransactions = transaction;
        console.log($scope.changedTransactions);
        $scope.capMulti = true;
    };

    $scope.mclose = function () {
        $scope.closeMsg = 'I was closed at: ' + new Date();
        $scope.capMulti = false;
    };

    $scope.dateoptions = function (trans) {
        console.log(trans);
        var options = [];
        angular.forEach(trans, function (row) {
            options.push(row);
        });

        return options;
    }

    $scope.pickmOption = function(value) {
        $scope.pickTran = value;
        $scope.newtransaction = null;
    }

    $scope.pickOddOption = function(value) {
        $scope.newtransaction = value;
        $scope.pickTran = null;
    }

    $scope.mComplete = function (transactions, picked, number, type) {
        var inIssue = transactions[0].issue;
        if (!picked) {
            if (type == "u") {
                var newTran = {"active": true, "atype": 0, "new": "yes", "investor": $scope.activeTran[0].investor, "investorkey": $scope.activeTran[0].investor, "company": $scope.currentCompany, "date": (Date.today()), "datekey": (Date.today()), "issue": (inIssue), "units": number, "paid": null, "unitskey": number, "paidkey": null, "key": undefined};
            }
            else {
                var newTran = {"active": true, "atype": 0, "new": "yes", "investor": $scope.activeTran[0].investor, "investorkey": $scope.activeTran[0].investor, "company": $scope.currentCompany, "date": (Date.today()), "datekey": (Date.today()), "issue": (inIssue), "units": null, "paid": number, "unitskey": null, "paidkey": number, "key": undefined};
            }
            angular.forEach($scope.issues, function (issue) {
                if (issue.issue == inIssue) {
                    newTran = $scope.tranInherit(newTran, issue);
                }
            });
            if (number < 0 && newTran.type == "Option") {
                $rootScope.notification.show("fail", "Cannot have a negative amount for options");
                return;
            }
            $scope.trans.push(newTran);
            $scope.activeTran.push(newTran);
            for (var i = 0; i < $scope.activeTran.length; i++) {
                console.log($scope.activeTran[i]);
                if (i + 1 == $scope.activeTran.length) {
                    $scope.activeTran[i].active = true;
                }
                else {
                    $scope.activeTran[i].active = false;
                }
            }
        }
        else {
            if (type == "u") {
                picked.units = picked.units + number;
            }
            else {
                picked.amount = picked.amount + number;
            }
            var newTran = picked;
        }
        $scope.saveTran(newTran);
    };

    $scope.mReset = function () {
        angular.forEach($scope.rows, function (row) {
            if (row.name == $scope.activeTran[0].investor) {
                row[$scope.activeTran[0].issue]['u'] = row[$scope.activeTran[0].issue]['ukey'];
                row[$scope.activeTran[0].issue]['a'] = row[$scope.activeTran[0].issue]['akey'];
            }
        });
    };


    // Captable Sharing Modal
    $scope.modalUp = function () {
        $scope.capShare = true;
    };

    $scope.close = function () {
        $scope.closeMsg = 'I was closed at: ' + new Date();
        $scope.capShare = false;
    };

    $scope.shareopts = {
        backdropFade: true,
        dialogFade: true,
        dialogClass: 'capshareModal modal'
    };

    $scope.opts = {
        backdropFade: true,
        dialogFade: true
    };

    // Adds new rows to the non-shareholder sharing
    $scope.addRemove = function () {
        var add = 0;
        angular.forEach($scope.extraPeople, function (people) {
            if (people.email) {
                add = add + 1
            }
        });
        if (add == $scope.extraPeople.length) {
            $scope.extraPeople.push({"email": ""});
        }
    };


    // Controls the orange border around the send boxes if an email is not given
    $scope.emailCheck = function (bool, person) {
        if (bool) {
            return !person;
        }
        else {
            return false;
        }
    };

    $scope.autoCheck = function(person) {
        return person != null && person.length > 0;
    }

    $scope.turnOnShares = function () {
        angular.forEach($scope.rows, function (row) {
            row.send = $scope.selectAll;
        });
    };


    // Send the share invites from the share modal
    $scope.sendInvites = function () {
        angular.forEach($scope.rows, function (row) {
            if (row.send == true) {
                SWBrijj.procm("ownership.share_captable", row.email.toLowerCase(), row.name).then(function (data) {
                    $rootScope.notification.show("success", "Ownership Table share request sent");
                    row.send = false;
                    row.emailkey = row.email;
                });
            }
        });

        // Handles the non-shareholder shares
        if ($scope.extraPeople.length > 0) {
            angular.forEach($scope.extraPeople, function (people) {
                if (people.email) {
                    SWBrijj.procm("ownership.share_captable", people.email.toLowerCase(), "").then(function (data) {
                        SWBrijj.proc('ownership.update_investor_captable', people.email, true).then(function (data) {
                            console.log("success");
                        });
                    });
                }
            });
            $scope.extraPeople = [];
            $scope.extraPeople.push({'email': ""});
        }
    };


    // Prevents the share button from being clickable until a send button has been clicked and an address filled out
    $scope.checkInvites = function () {
        var checkcontent = false;
        var checksome = false;
        angular.forEach($scope.rows, function(row) {
           if (row.send == true && (row.email != null && row.email != "")) {
               checkcontent = true;
           }
           if (row.send == true) {
              checksome = true;
           }
        });
        if ($scope.extraPeople.length > 0 && $scope.extraPeople[0].email) {
            return false;
        }
        else {
            return !(checkcontent && checksome);
        }
    }

    $scope.funcformatAmount = function (amount) {
        if (amount) {
            while (/(\d+)(\d{3})/.test(amount.toString())){
                amount = amount.toString().replace(/(\d+)(\d{3})/, '$1'+','+'$2');
            }
        }
        return amount;
    };

    var memformatamount = memoize($scope.funcformatAmount);
    $scope.formatAmount = function(amount) {
        return memformatamount(amount);
    };

    $scope.formatDollarAmount = function(amount) {
        var output = memformatamount(amount);
        if (output) {
            output = "$" + output
        }
        return (output);
    };

    $scope.typeLocked = function(issue) {
        if (issue.liquidpref || issue.interestrate || issue.valcap || issue.discount || issue.optundersec || issue.vestcliff || issue.vestingbegins || issue.vestfreq) {
            return false
        }
        else {
            return true
        }
    }

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
        return totalShares(rows);
    };

    // Total Shares | Paid for an issue column (type is either u or a)
    var totalPaid = memoize(calculate.totalPaid);
    $scope.totalPaid = function(rows) {
        return totalPaid(rows);
    };

    // Total Shares for a shareholder row
    var shareSum = memoize(calculate.shareSum);
    $scope.shareSum = function(row) {
        return shareSum(row);
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
        return calculate.pricePerShare($scope.issues);
    };

    // Last issue date for the sidebar In Brief section
    $scope.lastIssue = function() {
        return calculate.lastIssue($scope.issues);
    };

    // Last issue date for the sidebar In Brief section
    $scope.lastPostMoney = function() {
        return calculate.lastPostMoney($scope.issues);
    };
};


// Grants page controller
var grantController = function ($scope, $rootScope, $parse, SWBrijj, calculate, switchval, sorting) {

    SWBrijj.tblm('account.companies').then(function (comp) {
        $scope.company = comp[0]['company'];
    });


    $scope.rows = [];
    $scope.uniquerows = [];
    $scope.freqtypes = [];
    $scope.issuekeys = [];
    $scope.possibleActions = ['exercised', 'forfeited'];

    //Get the available range of frequency types
    SWBrijj.procm('ownership.get_freqtypes').then(function (results) {
        angular.forEach(results, function (result) {
            $scope.freqtypes.push(result['get_freqtypes']);
        });
    });

    //Get the company issues
    SWBrijj.tblm('ownership.company_issue').then(function (data) {
        $scope.issues = data;
        for (var i = 0, l = $scope.issues.length; i < l; i++) {
            $scope.issuekeys.push($scope.issues[i].issue);
        }
    });

    // Initialisation. Get the transactions and the grants
    SWBrijj.tblm('ownership.company_options').then(function (data) {

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
        SWBrijj.tblm('ownership.company_grants').then(function (data) {

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
                    $scope.trans[i].active = true;
                    first = first + 1
                }

                var allowablekeys = angular.copy($scope.issuekeys);
                var index = allowablekeys.indexOf($scope.trans[i].issue);
                allowablekeys.splice(index, 1);
                $scope.trans[i].allowKeys = allowablekeys;

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
            var activeAct = [];
            for (var j = 0, a = $scope.grants.length; j < a; j++) {
                if ($scope.activeTran[i].tran_id == $scope.grants[j].tran_id) {
                    activeAct.push($scope.grants[j]);
                }
            }
            activeAct.push({"unit": null, "tran_id": $scope.activeTran[i].tran_id, "date": (Date.today()), "action": null, "investor": $scope.activeTran[i].investor, "issue": $scope.activeTran[i].issue});
            $scope.activeTran[i].activeAct = activeAct;
        }
    };

    $scope.saveGrant = function (grant) {
        console.log(grant);
        if (isNaN(parseFloat(grant.unit))) {
            if (grant.grant_id != null) {
                SWBrijj.proc('ownership.delete_grant', parseInt(grant.grant_id)).then(function (data) {
                    console.log("deleted");
                    var index = $scope.grants.indexOf(grant);
                    $scope.grants.splice(index, 1);
                    angular.forEach($scope.activeTran, function (tran) {
                        var activeAct = [];
                        angular.forEach($scope.grants, function (grant) {
                            if (tran.tran_id == grant.tran_id) {
                                activeAct.push(grant);
                            }
                        });
                        activeAct.push({"unit": null, "tran_id": tran.tran_id, "date": (Date.today()), "action": null, "investor": tran.investor, "issue": tran.issue});
                        tran.activeAct = activeAct;
                    });

                    angular.forEach($scope.rows, function (row) {
                        row['exercised'] = null;
                        angular.forEach($scope.grants, function (grant) {
                            if (row.name == grant.investor) {
                                row[grant.action] = calculate.sum(row[grant.action], grant.unit)
                            }
                        });
                    });
                });
            }
            else {
                console.log(grant);
                return;
            }
        }
        if (grant.action == "" || grant.action == undefined || isNaN(parseFloat(grant.unit))) {
            return;
        }
        if (grant.grant_id == undefined) {
            grant.grant_id = "";
        }
        var d1 = grant['date'].toUTCString();
        SWBrijj.proc('ownership.update_grant', String(grant.grant_id), String(grant.tran_id), grant.action, d1, parseFloat(grant.unit)).then(function (data) {
            angular.forEach($scope.activeTran, function (tran) {
                if (tran.tran_id == grant.tran_id) {
                    angular.forEach(tran.activeAct, function (act) {
                        if (act.grant_id == "") {
                            act.grant_id = data[1][0];
                            grant.grant_id = data[1][0];
                            $scope.grants.push(grant);
                        }
                    });
                }
            });

            // Calculate the total exercised for each transaction from the grant list
            var exercises = {};
            angular.forEach($scope.grants, function (grant) {
                if (grant.action == "exercised") {
                    if (exercises[grant.tran_id] == undefined) {
                        exercises[grant.tran_id] = parseFloat(grant.unit);
                    }
                    else {
                        exercises[grant.tran_id] = parseFloat(exercises[grant.tran_id]) + parseFloat(grant.unit);
                    }
                }
            });

            // Get the correct transaction and save the new amount value
            angular.forEach(exercises, function (value, key) {
                angular.forEach($scope.trans, function (tran) {
                    if (tran.tran_id == key) {
                        // Check that a price has been given
                        if (tran.price) {
                            tran.amount = value * tran.price;
                            $scope.saveTran(tran);
                        }
                    }
                });
            });

            // Update the activeTran list and push a new blank grant
            angular.forEach($scope.activeTran, function (tran) {
                var activeAct = [];
                angular.forEach($scope.grants, function (grant) {
                    if (tran.tran_id == grant.tran_id) {
                        activeAct.push(grant);
                    }
                });
                activeAct.push({"unit": null, "tran_id": tran.tran_id, "date": (Date.today()), "action": null, "investor": tran.investor, "issue": tran.issue});
                tran.activeAct = activeAct;
            });

            // Recalculate the grant rows
            angular.forEach($scope.rows, function (row) {
                row['vested'] = null;
                row['exercised'] = null;
                row['forfeited'] = null;
                angular.forEach($scope.grants, function (grant) {
                    if (row.name == grant.investor) {
                        row[grant.action] = calculate.sum(row[grant.action], grant.unit)
                    }
                });
            });
        });
    };

    $scope.saveTran = function (transaction) {
        if (transaction['vestingbegins'] == undefined) {
            var vestcliffdate = null
        }

        else {
            var vestcliffdate = (transaction['vestingbegins']).toUTCString();
        }
        var d1 = transaction['date'].toUTCString();
        SWBrijj.proc('ownership.update_transaction', String(transaction['tran_id']), String(transaction['investor']), String(transaction['issue']), parseFloat(transaction['units']), d1, String(transaction['type']), parseFloat(transaction['amount']), parseFloat(transaction['premoney']), parseFloat(transaction['postmoney']), parseFloat(transaction['ppshare']), parseFloat(transaction['totalauth']), Boolean(transaction.partpref), transaction.liquidpref, transaction['optundersec'], parseFloat(transaction['price']), parseFloat(transaction['terms']), vestcliffdate, parseFloat(transaction['vestcliff']), transaction['vestfreq'], transaction['debtundersec'], parseFloat(transaction['interestrate']), parseFloat(transaction['valcap']), parseFloat(transaction['discount']), parseFloat(transaction['term'])).then(function (data) {

        });
    };


};

var statusController = function ($scope, $rootScope, SWBrijj) {

    SWBrijj.tblm('account.my_company').then(function (x) {
        $scope.cinfo = x
    });

    SWBrijj.tblm('ownership.lastupdated').then(function (time) {
        $scope.lastupdated = time[0].last_edited
    });

    SWBrijj.tblm("ownership.company_audit").then(function (data) {
        $scope.userStatus = data;
        for (var i = 0; i < $scope.userStatus.length; i++) {
            $scope.userStatus[i].shown = false;
            $scope.userStatus[i].viewed = "unviewed";
            $scope.userStatus[i].viewflag = 0;
            $scope.userStatus[i].lastlogin = 0;
            if ($scope.userStatus[i].fullview == false) {
                $scope.userStatus[i].fullview = "Personal View";
            }
            else {
                $scope.userStatus[i].fullview = "Full View";
            }
        }
        ;
        SWBrijj.procm("ownership.get_company_views").then(function (views) {
            angular.forEach($scope.userStatus, function (person) {
                angular.forEach(views, function (view) {
                    if (view.email == person.email) {
                        person.viewed = "viewed";
                        person.whenviewed = view.whendone;
                        person.viewflag = 1;
                    }
                });
            });
        });
        SWBrijj.tblm("ownership.user_tracker").then(function (logins) {
            angular.forEach($scope.userStatus, function (person) {
                angular.forEach(logins, function (login) {
                    if (login.email == person.email) {
                        person.lastlogin = login.logintime;
                    }
                });
            });
        })
    });

    // SWBrijj.procm("ownership.get_company_activity_cluster").then(function(data) {
    SWBrijj.tblm("ownership.company_activity_feed", ["name", "email", "activity", "whendone"]).then(function(data) {
        $scope.activity = data;
        $scope.shared_dates = [];
        for (var i = 0; i < $scope.activity.length; i++) {
            $scope.activity[i].timeAgo = moment($scope.activity[i].whendone).fromNow();
            if ($scope.activity[i].name == null || $scope.activity[i].name.length < 2)
                $scope.activity[i].name = $scope.activity[i].email;
            $scope.activity[i].link = "/company/profile/view?id=" + $scope.activity[i].email;
            if ($scope.activity[i].activity == "shared") {
                $scope.activity[i].activity = "Shared with ";
                $scope.activity[i].icon = 'icon-redo';
                $scope.shared_dates.push(new Date($scope.activity[i].whendone));
            } else if ($scope.activity[i].activity == "viewed") {
                $scope.activity[i].activity = "Viewed by ";
                $scope.activity[i].icon = 'icon-view';
            }
        }
    });

    $scope.activityOrder = function(card) {
        return -card.whendone;
    };

    $scope.opendetails = function(selected) {
        $scope.userStatus.forEach(function(name) {
            if (selected == name.email)
                if (name.shown == true) {
                    name.shown = false;
                }
                else {
                    name.shown = true;
                }
        });
    };

    $scope.selectVisibility = function (value, person) {
        $scope.selectedI.fullview = value
    }

    $scope.changeVisibility = function (person) {
        var visibility = false;
        if (person.fullview == 'Full View') {
          visibility = true;
        }
        SWBrijj.proc('ownership.update_investor_captable', person.email, visibility).then(function (data) {
            angular.forEach($scope.userStatus, function(peep) {
                if (peep.email == person.email) {
                    peep.fullview = person.fullview
                }
            })
            $rootScope.notification.show("success", "Changed ownership table access level");
        }).except(function(x) {
            $rootScope.notification.show("fail", "Something went wrong, please try again later.");
        });
    };

    // Modal for changing access type
    $scope.modalUp = function (person) {
        $scope.capAccess = true;
        $scope.selectedI = angular.copy(person);
    };

    $scope.close = function () {
        $scope.closeMsg = 'I was closed at: ' + new Date();
        $scope.capAccess = false;
    };

    $scope.shareopts = {
        backdropFade: true,
        dialogFade: true,
        dialogClass: 'modal'
    };

};