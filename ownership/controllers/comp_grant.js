// Grants page controller
var grantController = function ($scope, $rootScope, $parse, $location, SWBrijj, calculate, switchval, sorting, navState) {

    if (navState.role == 'investor') {
        $location.path('/investor-grants');
        return;
    }

    var company = navState.company;
    $scope.company = company;


    $scope.rows = [];
    $scope.freqtypes = [];
    $scope.issues = [];
    $scope.issuekeys = [];
    $scope.possibleActions = ['exercised', 'forfeited'];

    //Get the available range of frequency types
    SWBrijj.procm('ownership.get_freqtypes').then(function (results) {
        angular.forEach(results, function (result) {
            $scope.freqtypes.push(result['get_freqtypes']);
        });
    });

    //Get the company issues
    SWBrijj.tblm('ownership.company_issue').then(function (issues) {
        // Initialisation. Get the transactions and the grants
        SWBrijj.tblm('ownership.company_options').then(function (trans) {
            // Get the full set of company grants
            SWBrijj.tblm('ownership.company_grants').then(function (grants) {

                var allissues = issues;
                $scope.trans = trans;
                $scope.grants = grants;

                for (var i = 0, l = allissues.length; i < l; i++) {
                    if (allissues[i].type == "Option") {
                        allissues[i]['trans'] = [];
                        $scope.issues.push(allissues[i]);
                        $scope.issuekeys.push(allissues[i].issue);
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
                    issue.shown = false;
                    angular.forEach($scope.trans, function(tran) {
                        if (tran.issue == issue.issue) {
                            var offset = tran.date.getTimezoneOffset();
                            tran.date = tran.date.addMinutes(offset);
                            tran.datekey = tran['date'].toUTCString();
                            tran.state = false;
                            tran.investorkey = angular.copy(tran.investor);
                            issue.trans.push(tran);
                        }
                    });
                    angular.forEach($scope.grants, function(grant) {
                        if (grant.issue == issue.issue) {
                            if (parseFloat(grant.unit) > 0) {
                                if (issue[grant.action] == undefined) {
                                    issue[grant.action] = 0;
                                }
                                issue[grant.action] = calculate.sum(issue[grant.action], grant.unit);
                            }
                        }
                    })
                });

                //Calculate the total vested for each row
                $scope.rows = calculate.vested($scope.rows, $scope.trans);

            });
        });
    });


    //Get the active row for the sidebar
    $scope.getActiveTransaction = function (currenttran, mode) {
        $scope.sideBar = 1;
        $scope.mode = 1;
        if (mode == "forfeited") {
            $scope.mode = 2;
        }
        else if (mode == "exercised") {
            $scope.mode = 3;
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
                    tran['exercised'] = tran['excercised'] != 0 ? tran['exercised'] : null;
                    tran['forfeited'] = tran['forfeited'] != 0 ? tran['forfeited'] : null;
                });
            }
        });
    };

    $scope.grantUpdateLR = function(tran, type) {
        var currentgrants = 0;
        var grantlist = [];
        angular.forEach($scope.grants, function(grant) {
            if (grant.tran_id == tran.tran_id && grant.action == type) {
                currentgrants += grant.unit;
                grantlist.push(grant);
            }
        });
        tran[type] = parseFloat(tran[type]);
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
                    $scope.saveGrant(grantlist[i]);
                }
                else {
                    difference = 0;
                }
            }
        }
    };

    // Grant saving
    //!!! USING $scope.activeTran IN HERE RESULTS IN BUGS IF THE USER CLICKS ONTO A DIFFERENT CELL FIX!!!
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
                });
            }
            else {
                return;
            }
        }
        if (grant.grant_id == undefined) {
            grant.grant_id = "";
        }
        var d1 = grant['date'].toUTCString();
        grant.action = type;
        SWBrijj.proc('ownership.update_grant', String(grant.grant_id), String(grant.tran_id), String(grant.action), d1, parseFloat(grant.unit)).then(function (data) {
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

            $scope.rows = calculate.vested($scope.rows, $scope.trans);
        });
    };

    var keyPressed = false; // Needed because selecting a date in the calendar is considered a blur, so only save on blur if user has typed a key
    $scope.saveTranDate = function (transaction, field, evt) {
        if (evt) { // User is typing
            if (evt != 'blur')
                keyPressed = true;
            var dateString = angular.element('#' + transaction.$$hashKey).val();
            var charCode = (evt.which) ? evt.which : event.keyCode; // Get key
            if (charCode == 13 || (evt == 'blur' && keyPressed)) { // Enter key pressed or blurred
                var date = Date.parse(dateString);
                if (date) {
                    transaction[field] = date;
                    var offset = transaction[field].getTimezoneOffset();
                    transaction[field] = transaction[field].addMinutes(offset);
                    keyPressed = false;
                    $scope.saveTran(transaction);
                }
            }
        } else { // User is using calendar
            //Fix the dates to take into account timezone differences.
            if (transaction[field] instanceof Date) {
                var offset = transaction[field].getTimezoneOffset();
                transaction[field] = transaction[field].addMinutes(offset);
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
        var d1 = transaction['date'].toUTCString();
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
        SWBrijj.proc('ownership.update_transaction', String(transaction['tran_id']), transaction['email'], String(transaction['investor']), String(transaction['issue']), parseFloat(transaction['units']), d1, String(transaction['type']), parseFloat(transaction['amount']), parseFloat(transaction['premoney']), parseFloat(transaction['postmoney']), parseFloat(transaction['ppshare']), parseFloat(transaction['totalauth']), Boolean(transaction.partpref), transaction.liquidpref, transaction['optundersec'], parseFloat(transaction['price']), parseFloat(transaction['terms']), vestcliffdate, parseFloat(transaction['vestcliff']), transaction['vestfreq'], transaction['debtundersec'], parseFloat(transaction['interestrate']), transaction['interestratefreq'], parseFloat(transaction['valcap']), parseFloat(transaction['discount']), parseFloat(transaction['term']), Boolean(transaction['dragalong']), Boolean(transaction['tagalong'])).then(function (data) {
            $scope.rows = calculate.vested($scope.rows, $scope.trans);
        });
    };

    $scope.fauxupdating = function(person) {
        angular.forEach($scope.issues, function (issue) {
            angular.forEach(issue.trans, function(tran) {
                if (tran.investorkey == person.investorkey) {
                    tran.investor = person.investor;
                }
            })
        });
        $scope.activeInvestor = person.investor;
    };

    $scope.updateName = function (changetran) {

        //!!!DELETING ROW NEEDS TO BE IMPLEMENTED PROPERLY WITH A MODAL CHECK!!!

        if (changetran.investor != "" && changetran.investor != changetran.investorkey) {
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

    $scope.opendetails = function(name) {
        $scope.issues.forEach(function(issue) {
            if (name == issue.issue) {
                issue.shown = issue.shown !== true;
            } else {
                issue.shown = false;
            }
        });
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

    //switches the sidebar based on the type of the issue
    $scope.formatAmount = function (amount) {
        return calculate.funcformatAmount(amount);
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
                    $scope.$emit("notification:success", "Your table has been shared!");
                    row.send = false;
                    row.emailkey = row.email;
                }).except(function(err) {
                        $scope.$emit("notification:fail", "Email : " + row.email + " failed to send");
                    });
            }
        });
    };


};