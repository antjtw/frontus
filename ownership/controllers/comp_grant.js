// Grants page controller
var grantController = function ($scope, $rootScope, $parse, $location, SWBrijj, calculate, switchval, sorting, navState) {
    $scope.done = false;
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

    // False is edit mode, true is view mode
    $scope.maintoggle = true;
    $scope.optionView = "Security";

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
            console.log("start");
            while (difference > 0) {
                console.log(difference);
                if (grantlist[i].unit >= difference) {
                    grantlist[i].unit -= difference;
                    difference -= difference;
                    console.log("last one");
                    $scope.saveGrant(grantlist[i], type);
                }
                else {
                    difference -= grantlist[i].unit;
                    grantlist[i].unit = 0;
                    console.log("saving");
                    $scope.saveGrant(grantlist[i], type);
                }
                i += 1;
            }
        }
    };

    // Grant saving
    //!!! USING $scope.activeTran IN HERE RESULTS IN BUGS IF THE USER CLICKS ONTO A DIFFERENT CELL FIX!!!
    $scope.saveGrant = function (grant, type) {
        console.log(isNaN(parseFloat(grant.unit)));
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
        else {
            if (grant.grant_id == undefined) {
                grant.grant_id = "";
            }
            var d1 = grant['date'].toUTCString();
            grant.action = type;
            grant.unit = parseFloat(grant.unit);
            SWBrijj.proc('ownership.update_grant', String(grant.grant_id), String(grant.tran_id), String(grant.action), d1, grant.unit).then(function (data) {
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
        }
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
        if (transaction.investor != null) {
            if (isNaN(parseFloat(transaction.units)) && !isNaN(parseInt(transaction.tran_id))) {
                $scope.tranDeleteUp(transaction);
            }
            else {
                var d1 = transaction['date'].toUTCString();
                if (transaction['vestingbegins'] == undefined) {
                    var vestcliffdate = null
                }

                else {
                    var vestcliffdate = (transaction['vestingbegins']).toUTCString();
                }
                if (transaction['tran_id'] == undefined) {
                    transaction['tran_id'] = '';
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
                SWBrijj.proc('ownership.update_transaction', String(transaction['tran_id']), transaction['email'], String(transaction['investor']), String(transaction['issue']), parseFloat(transaction['units']), d1, String(transaction['type']), parseFloat(transaction['amount']), parseFloat(transaction['premoney']), parseFloat(transaction['postmoney']), parseFloat(transaction['ppshare']), parseFloat(transaction['totalauth']), Boolean(transaction.partpref), transaction.liquidpref, transaction['optundersec'], parseFloat(transaction['price']), parseFloat(transaction['terms']), vestcliffdate, parseFloat(transaction['vestcliff']), transaction['vestfreq'], transaction['debtundersec'], parseFloat(transaction['interestrate']), transaction['interestratefreq'], parseFloat(transaction['valcap']), parseFloat(transaction['discount']), parseFloat(transaction['term']), Boolean(transaction['dragalong']), Boolean(transaction['tagalong'])).then(function (data) {
                    if (transaction.tran_id == '') {
                        transaction.tran_id = data[1][0];
                        $scope.trans.push(transaction);
                    }
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
        // Deleting a transaction pulls up a check modal
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
                console.log(issue);
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
            angular.forEach(tran.vested, function (value, key) {
                units += value;
            });
        });
        return units != 0 ? units : null;
    };

    $scope.transactionVested = function(vested) {
        var units = 0;
        angular.forEach(vested, function (value, key) {
            units += value;
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

    // Captable transaction delete modal
    $scope.tranDeleteUp = function (transaction) {
        $scope.deleteTran = transaction;
        $scope.tranDelete = true;
    };

    $scope.deleteclose = function () {
        $scope.closeMsg = 'I was closed at: ' + new Date();
        $scope.tranDelete = false;
    };

    $scope.manualdeleteTran = function (tran) {
        SWBrijj.proc('ownership.delete_transaction', tran['tran_id']).then(function (data) {
            angular.forEach($scope.issues, function(issue) {
                var index = -1;
                angular.forEach(issue.trans, function(transaction) {
                    if (tran.tran_id == transaction.tran_id) {
                        index = issue.trans.indexOf(tran);
                    }
                });
                if (index != -1) {
                    issue.trans.splice(index, 1);
                    $scope.sideBar = "word";
                }
            });
        });
    };

    //
    $scope.editViewToggle = function() {
        $scope.maintoggle = !$scope.maintoggle;
        if (!$scope.maintoggle) {
            $scope.optionView = "Security";
        }
    };

    $scope.togglename = function() {
        return $scope.maintoggle ? "Edit" : "View";
    };

    $scope.setView = function(field) {
        $scope.optionView = field;
        var uniquenames = [];
        if (field == "Investor") {
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


};

// Returns only the real transactions (not the empty ones)
owner.filter('noempty', function () {
    return function (trans) {
        var returntrans = [];
        angular.forEach(trans, function (tran) {
            if (tran.investor != null) {
                returntrans.push(tran);
            }
        });
        return returntrans;
    };
});