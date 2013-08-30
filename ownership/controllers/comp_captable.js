var captableController = function ($scope, $rootScope, $location, $parse, SWBrijj, calculate, switchval, sorting) {

    if ($rootScope.selected.role == 'investor') {
        $location.path('/investor-captable');
        return;
    }

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
    $scope.radioModel = "View";
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
        console.log(data);
        if (Object.keys(data).length == 0) {$scope.radioModel = "Edit"};
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
        $scope.sidebarstart = angular.copy($scope.sideBar);
        $scope.oldActive = angular.copy($scope.activeTran);
        if ($scope.toggleView()) {
            $scope.sideBar = 4;
        }
        else {
            $scope.sideBar = 2;
        }
        $scope.activeTran = [];
        $scope.activeIssue = currentcolumn;
        $scope.activeInvestor = currenttran;
        // Get the all the issues that aren't the current issue for the drop downs
        var allowablekeys = angular.copy($scope.issuekeys);
        var index = allowablekeys.indexOf(currentcolumn);
        allowablekeys.splice(index, 1);
        $scope.allowKeys = allowablekeys;

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
        if ($scope.oldActive[0] != $scope.activeTran[0]) {
            $scope.activeTran[0].go = false;
        }
    };

    $scope.getActiveIssue = function (issue) {

        $scope.sideBar = 1;
        $scope.activeIssue = issue;
        $scope.issueRevert = angular.copy(issue);

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
        var testcopy = angular.copy(issue);
        if ($scope.issueModal == true) {
            return;
        }
        else {
            if (!angular.equals(testcopy, $scope.issueRevert)) {
                angular.forEach($scope.trans, function(tran) {
                    if (issue[field] != tran[field] && tran[field] != "" && issue['issue'] == tran['issue']) {
                        $scope.imodalUp(issue, field);
                        x = true;
                    }
                });
                if (x == false) {
                    $scope.saveIssue(issue, field);
                }
            }
            else {
                return;
            }
        }
    };

    /* Save Issue Function. Takes the issue and the item being changed so that the sub transactions can also be updated in just that field */
    $scope.saveIssue = function (issue, item) {
        console.log("saving issue");
        if ((issue['issue'] == null || issue['issue'] == "") && issue['key'] == null) {
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
                    $scope.issueRevert = angular.copy(issue);
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
                            $scope.rows.splice(-1, 0, {"name": issuename + " (unissued)", "editable": 0, "nameeditable": 0});
                            $scope.rows[($scope.rows.length) - 2][issuename] = shares;
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

                    // Make sure we have a clean slate for everyone (including any new unissued rows
                    angular.forEach($scope.rows, function (row) {
                        angular.forEach($scope.issuekeys, function (issuekey) {
                            if (issuekey in row) {
                            }
                            else {
                                row[issuekey] = {"u": null, "a": null, "ukey": null, "akey": null};
                            }
                        });
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
            var values = {"name": "", "editable": "0"};
            angular.forEach($scope.issuekeys, function (key) {
                values[key] = {"u": null, "a": null, "ukey": null, "akey": null};
            });
            $scope.rows.push(values);
        }
        $scope.activeInvestorName = investor.name;
        $scope.activeInvestorEmail = investor.email;
        $scope.activeInvestorNameKey = investor.name;
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

            var keepgoing = true;
            var deleterow = -1;
            var issuename = String(tran.issue);
            var leftovers
            angular.forEach($scope.issues, function (issue) {
                if (issue.issue == tran.issue) {
                    leftovers = calculate.whatsleft(issue.totalauth, issue, $scope.rows);
                }
            });
            var shares = {"u": leftovers, "ukey": leftovers, "x": null};
            angular.forEach($scope.rows, function (row) {
                if (keepgoing) {
                    if (row.name == issuename + " (unissued)") {
                        keepgoing = false;
                        if (leftovers != 0) {
                            row[issuename] = shares;
                        }
                        else {
                            deleterow = $scope.rows.indexOf(row);
                        }
                    }
                }
            });
            if (keepgoing != false) {
                if (!isNaN(parseFloat(leftovers)) && leftovers != 0) {
                    $scope.rows.splice(-1, 0, {"name": issuename + " (unissued)", "editable": 0, "nameeditable": 0});
                    $scope.rows[($scope.rows.length) - 2][issuename] = shares;
                }
            }
            if (deleterow > -1) {
                $scope.rows.splice(deleterow, 1);
            }

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

            var keepgoing = true;
            var deleterow = -1;
            var issuename = String(tran.issue);
            var leftovers
            angular.forEach($scope.issues, function (issue) {
                if (issue.issue == tran.issue) {
                    leftovers = calculate.whatsleft(issue.totalauth, issue, $scope.rows);
                }
            });
            var shares = {"u": leftovers, "ukey": leftovers, "x": null};
            angular.forEach($scope.rows, function (row) {
                if (keepgoing) {
                    if (row.name == issuename + " (unissued)") {
                        keepgoing = false;
                        if (leftovers != 0) {
                            row[issuename] = shares;
                        }
                        else {
                            deleterow = $scope.rows.indexOf(row);
                        }
                    }
                }
            });
            if (keepgoing != false) {
                if (!isNaN(parseFloat(leftovers)) && leftovers != 0) {
                    $scope.rows.splice(-1, 0, {"name": issuename + " (unissued)", "editable": 0, "nameeditable": 0});
                    $scope.rows[($scope.rows.length) - 2][issuename] = shares;
                }
            }
            if (deleterow > -1) {
                $scope.rows.splice(deleterow, 1);
            }
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
        // Remove any commas added to the numbers
        if (transaction.units) {
            transaction.units = String(transaction.units).replace(/\,/g,'');
        }
        if (transaction.amount) {
            transaction.amount = String(transaction.amount).replace(/\,/g,'');
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
                angular.forEach($scope.rows, function (row) {
                    if ((row.name == transaction.investor) && row.email) {
                        transaction.email = row.email;
                    }
                })
                if (!transaction.email) {
                    transaction.email = null
                }
                SWBrijj.proc('ownership.update_transaction', String(transaction['tran_id']), transaction['email'], transaction['investor'], transaction['issue'], transaction['units'], d1, transaction['type'], transaction['amount'], parseFloat(transaction['premoney']), parseFloat(transaction['postmoney']), parseFloat(transaction['ppshare']), parseFloat(transaction['totalauth']), partpref, transaction.liquidpref, transaction['optundersec'], parseFloat(transaction['price']), parseFloat(transaction['terms']), vestcliffdate, parseFloat(transaction['vestcliff']), transaction['vestfreq'], transaction['debtundersec'], parseFloat(transaction['interestrate']), parseFloat(transaction['valcap']), parseFloat(transaction['discount']), parseFloat(transaction['term'])).then(function (data) {
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
                                    if (!isNaN(parseFloat(tran.forfeited))) {
                                        tempunits = calculate.sum(tempunits, (-tran.forfeited));
                                    }
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
                                    row[tran.issue]['x'] = 0;
                                }
                            }
                        });
                    });

                    var keepgoing = true;
                    var deleterow = -1;
                    var issuename = String(transaction.issue);
                    var leftovers
                    angular.forEach($scope.issues, function (issue) {
                        if (issue.issue == transaction.issue) {
                            leftovers = calculate.whatsleft(issue.totalauth, issue, $scope.rows);
                        }
                    });
                    var shares = {"u": leftovers, "ukey": leftovers, "x": null};
                    angular.forEach($scope.rows, function (row) {
                        if (keepgoing) {
                            if (row.name == issuename + " (unissued)") {
                                keepgoing = false;
                                if (leftovers != 0) {
                                    row[issuename] = shares;
                                }
                                else {
                                    deleterow = $scope.rows.indexOf(row);
                                }
                            }
                        }
                    });
                    if (keepgoing != false) {
                        if (!isNaN(parseFloat(leftovers)) && leftovers != 0) {
                            $scope.rows.splice(-1, 0, {"name": issuename + " (unissued)", "editable": 0, "nameeditable": 0});
                            $scope.rows[($scope.rows.length) - 2][issuename] = shares;
                        }
                    }
                    if (deleterow > -1) {
                        $scope.rows.splice(deleterow, 1);
                    }



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

                    // Make sure we have a clean slate for everyone (including any new unissued rows
                    angular.forEach($scope.rows, function (row) {
                        angular.forEach($scope.issuekeys, function (issuekey) {
                            if (issuekey in row) {
                            }
                            else {
                                row[issuekey] = {"u": null, "a": null, "ukey": null, "akey": null};
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
        $scope.changedIssueField = field;
    };

    $scope.iclose = function () {
        $scope.closeMsg = 'I was closed at: ' + new Date();
        $scope.issueModal = false;
    };

    $scope.irevert = function (issue) {
        for (var i = 0, l = $scope.issues.length; i < l; i++) {
            if ($scope.issues[i].issue == issue.issue) {
                $scope.issues[i] = angular.copy($scope.issueRevert);
                $scope.activeIssue = angular.copy($scope.issueRevert);
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

    // Alter already shared row's email address
    $scope.alterEmailModalUp = function (email) {
        $scope.capEditEmail = true;
        $scope.oldEmail = email;
        $scope.newEmail = angular.copy(email);
    };

    $scope.alterEmailModalClose = function () {
        $scope.closeMsg = 'I was closed at: ' + new Date();
        $scope.capEditEmail = false;
    };

    $scope.alterEmail = function() {
        if ($scope.newEmail != "") {
            SWBrijj.proc('ownership.update_row_share', $scope.newEmail, $scope.oldEmail, $scope.activeInvestorName).then(function (data) {
                angular.forEach($scope.rows, function (row) {
                    if (row.name == $scope.activeInvestorName) {
                        $rootScope.notification.show("success", "Email address updated");
                        row.email = $scope.newEmail;
                        row.emailkey = row.email;
                        $scope.activeInvestorEmail = $scope.newEmail;
                    }
                });
            });
        }
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
                }).except(function(err) {
                        $rootScope.notification.show("fail", "Email : " + row.email + " failed to send");
                    });
            }
        });

        // Handles the non-shareholder shares
        if ($scope.extraPeople.length > 0) {
            angular.forEach($scope.extraPeople, function (people) {
                if (people.email) {
                    SWBrijj.procm("ownership.share_captable", people.email.toLowerCase(), "").then(function (data) {
                        SWBrijj.proc('ownership.update_investor_captable', people.email, 'Full View').then(function (data) {
                            $rootScope.notification.show("success", "Ownership Table share request sent");
                        });
                    }).except(function(err) {
                            $rootScope.notification.show("fail", "Email : " + people.email + " failed to send");
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
    var colTotalIssued = memoize(calculate.colTotalIssued);
    $scope.colTotalIssued = function(header, rows, type) {
        return colTotalIssued(header, rows, type);
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