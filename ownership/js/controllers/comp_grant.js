// Grants page controller
app.controller('grantController',
    ['$scope', '$rootScope', '$parse', '$location', 'SWBrijj',
     'calculate', 'navState', 'captable', 'displayCopy',
function($scope, $rootScope, $parse, $location, SWBrijj,
         calculate, navState, captable, displayCopy) {
    $scope.done = false;
    if (navState.role == 'investor') {
        $location.path('/investor-grants');
        return;
    }

    var company = navState.company;
    $scope.company = company;

    $scope.ct = captable.getCapTable();
    $scope.captable = captable;

    $scope.captabletips = displayCopy.captabletips;

    $scope.sideToggle = true;

    $scope.rows = [];
    $scope.freqtypes = [];
    $scope.tf = ["yes", "no"];
    $scope.issues = [];
    $scope.security_names = [];
    $scope.equityissues = [];
    $scope.possibleActions = ['exercised', 'forfeited'];

    // False is edit mode, true is view mode
    $scope.viewMode = true;
    $scope.optionView = "Security";

    //$scope.newSchedule = false;

    /*
    //Get the available range of frequency types
    SWBrijj.procm('ownership.get_freqtypes').then(function (results) {
        angular.forEach(results, function (result) {
            $scope.freqtypes.push(result['get_freqtypes']);
        });
    });

    SWBrijj.tblm('ownership.company_schedules').then(function (schedules) {
        $scope.schedules = schedules;
        angular.forEach($scope.schedules, function(schedule) {
            schedule.shown = false;
        });
    });

    SWBrijj.tblm('ownership.company_row_names').then(function (names) {
        $scope.rownames = [];
        angular.forEach(names, function(name) {
            $scope.rownames.push(name.name);
        });
    });

    SWBrijj.tblm('ownership.company_transaction', ['investor', 'email']).then(function (trans) {
        $scope.rowemails = {};
        angular.forEach(trans, function(tran) {
            if (tran.email && !(tran.investor in $scope.rowemails)) {
                $scope.rowemails[tran.investor] = tran.email;
            }
        });
    });
    */

    /*
    //Get the company issues
    SWBrijj.tblm('ownership.company_issue').then(function (issues) {
        // Initialisation. Get the transactions and the grants
        SWBrijj.tblm('ownership.company_options').then(function (trans) {
            // Get the full set of company grants
            SWBrijj.tblm('ownership.company_grants').then(function (grants) {

                $scope.allissues = issues;
                $scope.trans = trans;
                $scope.grants = grants;

                for (var i = 0, l = $scope.allissues.length; i < l; i++) {
                    if ($scope.allissues[i].type == "Option") {
                        $scope.allissues[i]['trans'] = [];
                        $scope.issues.push($scope.allissues[i]);
                    }
                    $scope.security_names.push($scope.allissues[i].issue);
                    if ($scope.allissues[i].type == "Equity") {
                        $scope.equityissues.push($scope.allissues[i].issue);
                    }
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
                    issue.key = issue.issue;
                    issue.shown = false;
                    issue.date = calculate.timezoneOffset(issue.date);
                    if (issue.vestingbegins) {
                        issue.vestingbegins = calculate.timezoneOffset(issue.vestingbegins);
                        issue.vestingbeginsdisplay = calculate.monthDiff(issue.vestingbegins,issue.date);
                    }
                    angular.forEach($scope.trans, function(tran) {
                        if (tran.issue == issue.issue) {
                            tran.date = calculate.timezoneOffset(tran.date);
                            tran.datekey = tran['date'].toUTCString();
                            if (tran.vestingbegins) {
                                tran.vestingbegins = calculate.timezoneOffset(tran.vestingbegins);
                                tran.vestingbeginsdisplay = calculate.monthDiff(tran.vestingbegins,tran.date);
                            }
                            tran.state = false;
                            tran.investorkey = angular.copy(tran.investor);
                            tran.vested = calculate.tranvested(tran);
                            tran.unitskey = tran.units;
                            tran.paidkey = tran.amount;
                            tran.fields = [false, false, false, false];
                            issue.trans.push(tran);
                        }
                    });
                    var newTran = $scope.tranInherit({"investor": null, "investorkey": null, "company": $scope.currentCompany, "date": (Date.today()), "datekey": (Date.today()), "issue": issue.issue, "units": null, "paid": null, "unitskey": null, "paidkey": null, "key": undefined}, issue);
                    newTran.vestcliff = null;
                    newTran.terms = null;
                    newTran.vestfreq = null;
                    newTran.vestingbegins = null;
                    issue.trans.push(newTran);
                });

                // Add extra blank issue, which will create a new one when clicked. Silly future date so that
                // the issue always appears on the rightmost side of the table
                $scope.issues.sort(sorting.issuedate);
                $scope.issues.push({"name": "", "date": new Date(2100, 1, 1), "type" : "Option"});

                if ($scope.issues.length == 1) {
                    $rootScope.$on('billingLoaded', function(x) {
                        if (!$rootScope.companyIsZombie()) {
                            $scope.viewMode = false;
                        }
                    });
                    if ($rootScope.selectedPlan) {
                        if (!$rootScope.companyIsZombie()) {
                            $scope.viewMode = false;
                        }
                    }
                }

                $scope.done = true;
            });
        });
    });
    */

    /*
    //Get the active row for the sidebar
    $scope.getActiveTransaction = function (currenttran, mode, view) {
        if (currenttran == $scope.activeTran && view == "view" && mode == $scope.stringmode) {
            $scope.activeTran = undefined;
            angular.forEach($scope.issues, function(issue) {
                angular.forEach(issue.trans, function(tran) {
                    tran.fields = [false,false,false,false];
                })
            });
            $scope.sideBar = "x";
        }
        else {
            if (view == "view") {
                $scope.sideBar = 3;
                $scope.mode = 1;
                angular.forEach($scope.issues, function(issue) {
                    angular.forEach(issue.trans, function(tran) {
                        tran.fields = [false,false,false,false];
                    })
                });
                if (mode == "forfeited") {
                    if (currenttran.forfeited) {
                        currenttran.fields[2] = true;
                        $scope.mode = 2;
                        $scope.stringmode = "forfeited"
                    }
                    else {
                        $scope.sideBar = "x";
                        return
                    }
                }
                else if (mode == "exercised") {
                    if (currenttran.exercised) {
                        currenttran.fields[3] = true;
                        $scope.mode = 3;
                        $scope.stringmode = "exercised"
                    }
                    else {
                        $scope.sideBar = "x";
                        return
                    }
                }
                else if (mode == "vested") {
                    if (currenttran.vested.length > 0) {
                        $scope.mode = 4;
                        $scope.stringmode = "vested"
                        currenttran.fields[1] = true;
                    }
                    else {
                        $scope.sideBar = "x";
                        return
                    }
                }
                else {
                    currenttran.fields[0] = true;
                }
            }
            else {
                $scope.sideBar = 1;
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
                else if (mode == "vested") {
                    $scope.mode = 4;
                    currenttran.fields[1] = true;
                }
            }
            var activeAct = [];

            // Only the issues that are not the active transactions (for underlying issue)
            var allowablekeys = angular.copy($scope.security_names);
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
                        newTran.vestcliff = null;
                        newTran.terms = null;
                        newTran.vestfreq = null;
                        newTran.vestingbegins = null;
                        issue.trans.push(newTran);
                    }
                });
            }
        }
    };

    $scope.getActiveIssue = function (issue, mode, view) {

        if (view == "view") {
            $scope.sideBar = 5;
        }
        else {
            $scope.sideBar = 4;
        }

        // Clean up the transaction states.
        angular.forEach($scope.issues, function(issue) {
            angular.forEach(issue.trans, function(tran) {
                tran.fields = [false,false,false,false];
            })
        });
        $scope.activeTran = undefined;

        $scope.mode = 1;
        $scope.activeIssue = issue;
        $scope.issueRevert = angular.copy(issue);

        issue.state = true;

        // Get the all the issues that aren't the current issue for the drop downs
        var allowablekeys = angular.copy($scope.security_names);
        var index = allowablekeys.indexOf(issue.issue);
        allowablekeys.splice(index, 1);
        $scope.allowKeys = allowablekeys;

        // Set Boolean Values for the Angularjs Select
        if (String($scope.activeIssue.partpref) == "true") {
            $scope.activeIssue.partpref = $scope.tf[0];
        }
        else if (String($scope.activeIssue.partpref) == "false") {
            $scope.activeIssue.partpref = $scope.tf[1];
        }
        if (String($scope.activeIssue.dragalong) == "true") {
            $scope.activeIssue.dragalong = $scope.tf[0];
        }
        else if (String($scope.activeIssue.dragalong) == "false") {
            $scope.activeIssue.dragalong = $scope.tf[1];
        }
        if (String($scope.activeIssue.tagalong) == "true") {
            $scope.activeIssue.tagalong = $scope.tf[0];
        }
        else if (String($scope.activeIssue.tagalong) == "false") {
            $scope.activeIssue.tagalong = $scope.tf[1];
        }
        if (String($scope.activeIssue.date).indexOf("Mon Feb 01 2100") !== -1) {
            $scope.activeIssue.date = (Date.today());
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
            var dateString = angular.element(field + '#' + issue.$$hashKey).val();
            var charCode = (evt.which) ? evt.which : event.keyCode; // Get key
            if (charCode == 13 || (evt == 'blur' && keyPressed)) { // Enter key pressed or blurred
                var date = Date.parse(dateString);
                if (date) {
                    issue[field] = calculate.timezoneOffset(date);
                    $scope.saveIssueCheck(issue, field);
                    keyPressed = false;
                }
            }
        } else { // User is using calendar
            if (issue[field] instanceof Date) {
                issue[field] = calculate.timezoneOffset(issue[field]);
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
                $scope.saveIssue(issue, field);
            }
            else {
                return;
            }
        }
    };
    */

    /*
    $scope.saveIssue = function (issue, item) {
        if ((issue['issue'] == null || issue['issue'] == "") && issue['key'] == null) {
            return
        }

        else if (issue['issue'] == "" && issue['key'] != null) {
            $scope.dmodalUp(issue);
            return
        }

        else {

            if (issue['key'] != null) {
                var dateconvert = issue['date'];
                var d1 = dateconvert.toUTCString();
                var partpref = $scope.strToBool(issue['partpref']);
                var dragalong = $scope.strToBool(issue['dragalong']);
                var tagalong = $scope.strToBool(issue['tagalong']);
                var common = $scope.strToBool(issue['common']);

                if (item == 'vestingbegins' || (item == 'date' && !isNaN(parseInt(issue.vestingbeginsdisplay)))) {
                    var vestcliffdate = angular.copy(issue.date).addMonths(parseInt(issue.vestingbeginsdisplay));
                    issue.vestingbegins = vestcliffdate;
                }

                if (issue['vestingbegins'] == undefined) {
                    var vestcliffdate = null
                }

                if ($scope.allowKeys.indexOf(issue.issue) != -1) {
                    issue.issue = issue.issue + " (1)";
                }
                SWBrijj.proc('ownership.update_issue', issue['key'], issue['type'], d1, issue['issue'], calculate.toFloat(issue['premoney']), calculate.toFloat(issue['postmoney']), calculate.toFloat(issue['ppshare']), calculate.toFloat(issue['totalauth']), partpref, issue.liquidpref, issue['optundersec'], calculate.toFloat(issue['price']), calculate.toFloat(issue['terms']), vestcliffdate, calculate.toFloat(issue['vestcliff']), issue['vestfreq'], issue['debtundersec'], calculate.toFloat(issue['interestrate']), issue['interestratefreq'], calculate.toFloat(issue['valcap']), calculate.toFloat(issue['discount']), calculate.toFloat(issue['term']), dragalong, tagalong, common).then(function (data) {
                    $scope.lastsaved = Date.now();
                    var oldissue = issue['key'];

                    // In the case where the issue is changed and there are other issues that use it as the underlying
                    if (item == "issue") {
                        angular.forEach($scope.issues, function (keyissue) {
                            if (item == "issue" && keyissue["optundersec"] && keyissue["optundersec"] == issue.key) {
                                keyissue.optundersec = issue[item];
                                $scope.saveIssue(keyissue, 'optundersec');
                            }
                            else if (item == "issue" && keyissue["debtundersec"] && keyissue["debtundersec"] == issue.key) {
                                keyissue.debtundersec = issue[item];
                                $scope.saveIssue(keyissue, 'debtundersec');
                            }
                        });
                    }

                    $scope.issueRevert = angular.copy(issue);

                    var index = $scope.security_names.indexOf(issue.key);
                    $scope.security_names[index] = issue.issue;
                    issue.key = issue.issue;
                });
            }

            else {
                var d1 = (Date.today()).toUTCString();
                var expire = null;
                SWBrijj.proc('ownership.create_issue', d1, expire, issue['issue'], calculate.toFloat(issue['price'])).then(function (data) {
                    $scope.lastsaved = Date.now();
                    issue.key = issue['issue'];
                    $scope.security_names.push(issue.key);
                    $scope.issues.push({"name": "", "date": new Date(2100, 1, 1), "type" : "Option"});

                    // Create the first empty underlying transaction
                    var newTran = $scope.tranInherit({"investor": null, "investorkey": null, "company": $scope.currentCompany, "date": (Date.today()), "datekey": (Date.today()), "issue": issue.issue, "units": null, "paid": null, "unitskey": null, "paidkey": null, "key": undefined}, issue);
                    newTran.vestcliff = null;
                    newTran.terms = null;
                    newTran.vestfreq = null;
                    newTran.vestingbegins = null;
                    issue.trans =[newTran];

                    var allowablekeys = angular.copy($scope.security_names);
                    var index = allowablekeys.indexOf(issue.issue);
                    allowablekeys.splice(index, 1);
                    $scope.allowKeys = allowablekeys;
                    $scope.saveIssue(issue, "type");
                });
            }
        }
    };

    $scope.deleteIssueButton = function (activeIssue) {
        $scope.dmodalUp(activeIssue);
    };

    $scope.deleteIssue = function (issue) {
        SWBrijj.proc('ownership.delete_issue', issue['key']).then(function (data) {
            $scope.lastsaved = Date.now();
            angular.forEach($scope.issues, function (oneissue) {
                if (oneissue['key'] == issue['key']) {
                    var index = $scope.issues.indexOf(oneissue);
                    $scope.issues.splice(index, 1);
                    var indexed = $scope.security_names.indexOf(oneissue.key);
                    $scope.security_names.splice(indexed, 1);
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

    $scope.saveGrantDrop = function (grant, type) {
         grant.action = type;
         $scope.saveGrant(grant);
    };

    //Recalculate transaction rows
    $scope.grantTranUpdate = function (issues, trans, grants, active) {
        angular.forEach(issues, function(issue) {
            if (issue.issue == active.issue) {
                angular.forEach(trans, function(tran) {
                    tran['exercised'] = 0;
                    tran['forfeited'] = 0;
                    angular.forEach(grants, function (grant) {
                        if (grant.tran_id == tran.tran_id) {
                            tran[grant.action] = tran[grant.action] + parseFloat(grant.unit);
                        }
                    });
                    tran['exercised'] = tran['exercised'] != 0 ? tran['exercised'] : null;
                    tran['forfeited'] = tran['forfeited'] != 0 ? tran['forfeited'] : null;
                });
            }
        });
    };

    $scope.grantUpdateLR = function(tran, type) {
        var currentgrants = 0;
        var grantlist = [];
        if (tran[type]) {
            tran[type] = String(tran[type]).replace(/\,/g,'');
        }
        angular.forEach($scope.grants, function(grant) {
            if (grant.tran_id == tran.tran_id && grant.action == type && grant.unit != null) {
                currentgrants += grant.unit;
                grantlist.push(grant);
            }
        });
        tran[type] = !isNaN(parseFloat(tran[type])) ? parseFloat(tran[type]) : 0;
        if (tran[type] > currentgrants) {
            var newgrant = {'unit': tran[type] - currentgrants, "tran_id": tran.tran_id, "date": (Date.today()), "action": type, "investor": tran.investor, "issue": tran.issue};
            $scope.saveGrant(newgrant, type);
        }
        else if (tran[type] < currentgrants) {
            grantlist.sort(function(a,b){
                a = new Date(a.date);
                b = new Date(b.date);
                return a>b?-1:a<b?1:0;
            });
            var difference = currentgrants - parseFloat(tran[type]);
            var i = 0;
            while (difference > 0) {
                if (grantlist[i].unit >= difference) {
                    grantlist[i].unit -= difference;
                    difference -= difference;
                    $scope.saveGrant(grantlist[i], type);
                }
                else {
                    difference -= grantlist[i].unit;
                    grantlist[i].unit = 0;
                    $scope.saveGrant(grantlist[i], type);
                }
                i += 1;
            }
        }
        if (tran[type] == 0) {
            tran[type] = null;
        }
    };

    // Grant saving
    $scope.saveGrant = function (grant, type) {
        if (isNaN(parseFloat(grant.unit)) || parseFloat(grant.unit) == 0) {
            if (grant.grant_id != null) {
                SWBrijj.proc('ownership.delete_grant', parseInt(grant.grant_id)).then(function (data) {
                    var index = $scope.grants.indexOf(grant);
                    $scope.grants.splice(index, 1);
                    var activeAct = [];
                    angular.forEach($scope.grants, function (grant) {
                        if ($scope.activeTran.tran_id == grant.tran_id) {
                            activeAct.push(grant);
                        }
                    });
                    activeAct.push({"unit": null, "tran_id": $scope.activeTran.tran_id, "date": (Date.today()), "action": null, "investor": $scope.activeTran.investor, "issue": $scope.activeTran.issue});
                    $scope.activeTran.activeAct = activeAct;

                    $scope.grantTranUpdate($scope.issues, $scope.trans, $scope.grants, $scope.activeTran);
                    $scope.lastsaved = Date.now();
                });
            }
            else {
                return;
            }
        }
        else {
            if (grant.grant_id == undefined) {
                grant.grant_id = "";
            }
            var d1 = grant['date'].toUTCString();
            grant.action = type;
            if (grant.unit) {
                grant.unit = String(grant.unit).replace(/\,/g,'');
            }
            grant.unit = parseFloat(grant.unit);
            SWBrijj.proc('ownership.update_grant', String(grant.grant_id), String(grant.tran_id), String(grant.action), d1, grant.unit).then(function (data) {
                $scope.lastsaved = Date.now();
                if (grant.grant_id == "") {
                    grant.grant_id = data[1][0];
                    $scope.grants.push(grant);
                }

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

                $scope.grantTranUpdate($scope.issues, $scope.trans, $scope.grants, $scope.activeTran);

                // Update the activeTran list and push a new blank grant
                var activeAct = [];
                angular.forEach($scope.grants, function (grant) {
                    if ($scope.activeTran.tran_id == grant.tran_id) {
                        activeAct.push(grant);
                    }
                });
                activeAct.push({"unit": null, "tran_id": $scope.activeTran.tran_id, "date": (Date.today()), "action": null, "investor": $scope.activeTran.investor, "issue": $scope.activeTran.issue});
                $scope.activeTran.activeAct = activeAct;
            });
        }
    };
    */

    var keyPressed = false; // Needed because selecting a date in the calendar is considered a blur, so only save on blur if user has typed a key
    /*
    $scope.saveTranDate = function (transaction, field, evt) {
        if (evt) { // User is typing
            if (evt != 'blur')
                keyPressed = true;
            var dateString = angular.element('#' + transaction.$$hashKey).val();
            var charCode = (evt.which) ? evt.which : event.keyCode; // Get key
            if (charCode == 13 || (evt == 'blur' && keyPressed)) { // Enter key pressed or blurred
                var date = Date.parse(dateString);
                if (date) {
                    transaction[field] = calculate.timezoneOffset(date);
                    keyPressed = false;
                    $scope.saveTran(transaction);
                }
            }
        } else { // User is using calendar
            //Fix the dates to take into account timezone differences.
            if (transaction[field] instanceof Date) {
                transaction[field] = calculate.timezoneOffset(transaction[field]);
                keyPressed = false;
                $scope.saveTran(transaction);
            }
        }
    };

    $scope.saveTranAssign = function (transaction, field, value) {
        if (value) {
            transaction[field] = value;
        }
        $scope.saveTran(transaction);
    };

    $scope.saveTran = function (transaction) {
        if (transaction.investor != null) {
            if (isNaN(parseFloat(transaction.units)) && !isNaN(parseInt(transaction.tran_id))) {
                $scope.tranDeleteUp(transaction);
            }
            else {
                var d1 = transaction['date'].toUTCString();

                var vestcliffdate = null;
                if (!isNaN(parseInt(transaction.vestingbeginsdisplay))) {
                    vestcliffdate = angular.copy(transaction.date).addMonths(parseInt(transaction.vestingbeginsdisplay));
                    transaction.vestingbegins = vestcliffdate;
                }

                if (transaction['tran_id'] == undefined) {
                    transaction['tran_id'] = '';
                }

                if (transaction.units) {
                    transaction.units = calculate.cleannumber(transaction.units);
                }
                if (transaction.amount) {
                    transaction.amount = calculate.cleannumber(transaction.amount);
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
                if (!transaction['email']) {
                    if (transaction['investor'] in $scope.rowemails) {
                        transaction['email'] = $scope.rowemails[transaction['investor']];
                    }
                }
                SWBrijj.proc('ownership.update_transaction', String(transaction['tran_id']), transaction['email'], String(transaction['investor']), String(transaction['issue']), calculate.toFloat(transaction['units']), d1, String(transaction['type']), calculate.toFloat(transaction['amount']), calculate.toFloat(transaction['premoney']), calculate.toFloat(transaction['postmoney']), calculate.toFloat(transaction['ppshare']), calculate.toFloat(transaction['totalauth']), Boolean(transaction.partpref), transaction.liquidpref, transaction['optundersec'], calculate.toFloat(transaction['price']), calculate.toFloat(transaction['terms']), vestcliffdate, calculate.toFloat(transaction['vestcliff']), transaction['vestfreq'], transaction['debtundersec'], calculate.toFloat(transaction['interestrate']), transaction['interestratefreq'], calculate.toFloat(transaction['valcap']), calculate.toFloat(transaction['discount']), calculate.toFloat(transaction['term']), Boolean(transaction['dragalong']), Boolean(transaction['tagalong'])).then(function (data) {
                    var returneddata = data[1][0].split("!!!");
                    $scope.lastsaved = Date.now();
                    if (transaction.tran_id == '') {
                        transaction.tran_id = returneddata[0];
                        $scope.trans.push(transaction);
                    }
                    transaction.unitskey = transaction.units;
                    transaction.paidkey = transaction.amount;
                    transaction.vested = calculate.tranvested(transaction);
                });
            }
        }
    };

    $scope.fauxupdating = function(person) {
        angular.forEach($scope.issues, function (issue) {
            angular.forEach(issue.trans, function(tran) {
                if (tran.investorkey == person.investorkey && tran.investorkey != null) {
                    tran.investor = person.investor;
                }
            })
        });
        $scope.activeInvestor = person.investor;
    };

    $scope.updateName = function (changetran) {
        if (changetran.investor == "" && changetran.investorkey != undefined) {
            changetran.investor = changetran.investorkey;
            angular.forEach($scope.issues, function (issue) {
                angular.forEach(issue.trans, function(tran) {
                    if (tran.investorkey == changetran.investorkey && tran.investorkey != null) {
                        tran.investor = changetran.investor;
                    }
                })
            });
            $scope.activeInvestor = changetran.investor;
        }

        // Just removes the row because nothing was added and nothing removed
        else if (changetran.investor == "" || changetran.investor == null) {
            angular.forEach($scope.issues, function(issue) {
                if (issue.issue == changetran.issue) {
                    var index = issue.trans.indexOf(changetran);
                    issue.trans.splice(index, 1);
                }
            });
        }

        // Save the new name
        else if (changetran.investor != "" && changetran.investor != changetran.investorkey) {
            changetran.investorkey = changetran.investorkey ? changetran.investorkey : "!!";
            SWBrijj.proc('ownership.update_row', changetran.investorkey, changetran.investor).then(function (data) {
                $scope.lastsaved = Date.now();
                var oldkey = angular.copy(changetran.investorkey);
                angular.forEach($scope.issues, function (issue) {
                    angular.forEach(issue.trans, function(tran) {
                        if (tran.investorkey == oldkey) {
                            tran.investor = changetran.investor;
                            tran.investorkey = changetran.investor;
                        }
                    })
                });
                $scope.getActiveTransaction(changetran);
            });
        }
    };
    */

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
            angular.forEach(tran.vested, function (grant) {
                units += grant.units;
            });
        });
        return units != 0 ? units : null;
    };

    //switches the sidebar based on the type of the issue
    $scope.formatAmount = function (amount, allowzero) {
        var unit = calculate.funcformatAmount(amount);
        return (allowzero == "zero" && unit == null) ? 0 : unit;
    };

    $scope.formatDollarAmount = function(amount) {
        var output = calculate.formatMoneyAmount($scope.formatAmount(amount), $scope.settings);
        return output;
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
        dialogClass: 'capshareModal mini modal'
    };

    // Send the share invites from the share modal
    $scope.sendInvites = function () {
        angular.forEach($scope.rows, function (row) {
            if (row.send == true) {
                SWBrijj.procm("ownership.share_captable", row.email.toLowerCase(), row.name).then(function (data) {
                    $scope.lastsaved = Date.now();
                    $scope.$emit("notification:success", "Your table has been shared!");
                    row.send = false;
                    row.emailkey = row.email;
                }).except(function(err) {
                        $scope.$emit("notification:fail", "Email : " + row.email + " failed to send");
                    });
            }
        });
    };

    /*
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

    //Captable Delete Issue Modal

    $scope.dmodalUp = function (issue) {
        $scope.capDelete = true;
        $scope.missue = issue;
    };

    $scope.dclose = function () {
        $scope.closeMsg = 'I was closed at: ' + new Date();
        $scope.capDelete = false;
    };

    // Transaction delete modal
    $scope.tranDeleteUp = function (transaction) {
        $scope.deleteTran = transaction;
        $scope.tranDelete = true;
    };

    $scope.deleteclose = function () {
        $scope.closeMsg = 'I was closed at: ' + new Date();
        $scope.tranDelete = false;
    };

    $scope.revertTran = function (transaction) {
        angular.forEach($scope.trans, function(tran) {
            if (tran.tran_id == transaction.tran_id) {
                tran.units = tran.unitskey;
                tran.amount = tran.paidkey;
            }
        });
    };

    $scope.manualdeleteTran = function (tran) {
        SWBrijj.proc('ownership.delete_transaction', parseInt(tran['tran_id'])).then(function (data) {
            angular.forEach($scope.issues, function(issue) {
                var index = -1;
                angular.forEach(issue.trans, function(transaction) {
                    if (tran.tran_id == transaction.tran_id) {
                        index = issue.trans.indexOf(tran);
                    }
                });
                if (index != -1) {
                    issue.trans.splice(index, 1);
                }
            });
            var index = -1;
            angular.forEach($scope.trans, function(transaction) {
                if (tran.tran_id == transaction.tran_id) {
                    index = $scope.trans.indexOf(tran);
                }
            });
            if (index != -1) {
                $scope.trans.splice(index, 1);
                $scope.sideBar = "word";
            }
        });
    };
    */
    //
    $scope.editViewToggle = function() {
        $scope.viewMode = !$scope.viewMode;
        if (!$scope.viewMode) {
            $scope.optionView = "Security";
        }
    };

    $scope.togglename = function() {
        return $scope.viewMode ? "Edit" : "View";
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

    /*
    $scope.assignFreq = function(value, schedule) {
        schedule.vestfreq = value;
    };

    $scope.showSchedule = function (sked) {
        angular.forEach($scope.schedules, function(schedule) {
            if (schedule == sked) {
                schedule.shown = schedule.shown ? false : true;
            }
            else {
                schedule.shown = false;
            }
        })
    };

    $scope.addSchedule = function() {
        $scope.newschedule = {};
        $scope.newSchedule = true;
    };

    $scope.createSchedule = function(schedule) {
        SWBrijj.proc('ownership.create_schedule', schedule['name'], schedule['terms'], schedule['vestingbegins'], schedule['vestcliff'], schedule['vestfreq']).then(function (data) {
        schedule["shown"] = false;
        $scope.schedules.push(schedule);
        $scope.newSchedule = false;
        });
    };

    $scope.deleteSchedule = function(schedule) {
        SWBrijj.proc('ownership.delete_schedule', schedule['name']).then(function (data) {
            var index = $scope.schedules.indexOf(schedule);
            $scope.schedules.splice(index, 1);
            $scope.$emit("notification:success", "Vesting schedule template removed");
        });
    };

    $scope.pickSchedule = function(schedule, activeTran) {
        if (schedule != "!!") {
            activeTran.vestcliff = schedule.vestcliff;
            activeTran.terms = schedule.terms;
            activeTran.vestfreq = schedule.vestfreq;
            activeTran.vestingbeginsdisplay = schedule.vestingbegins;
            $scope.saveTran(activeTran);
        }
        else {
            activeTran.vestfreq = "monthly";
        }
    };
    */

    $scope.strToBool = function (string) {
        return calculate.strToBool(string);
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

    /*
    $scope.resetSideBar = function() {
        $scope.sideBar = 'x';
        angular.forEach($scope.issues, function(issue) {
            angular.forEach(issue.trans, function(tran) {
                tran.fields = [false,false,false,false];
            });
        });
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
        tran.interestratefreq = issue.interestratefreq;
        tran.valcap = issue.valcap;
        tran.discount = issue.discount;
        tran.term = issue.term;
        tran.dragalong = issue.dragalong;
        tran.tagalong = issue.tagalong;
        return tran
    };

    // add tooltip info to fix issue
    // */


}]);
