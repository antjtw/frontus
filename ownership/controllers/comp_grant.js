// Grants page controller
var grantController = function ($scope, $rootScope, $parse, $location, SWBrijj, calculate, switchval, sorting, navState) {

    if (navState.role == 'investor') {
        $location.path('/investor-grants');
        return;
    }

    var company = navState.company;
    $scope.company = company;


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
                $scope.rows.push({"state": false, "name": tran.investor, "namekey": tran.investor, "emailkey": tran.email,  "editable": "yes", "granted": null, "forfeited": null, "issue": tran.issue});
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

    $scope.saveGrantDrop = function (grant, type) {
         grant.action = type;
         $scope.saveGrant(grant);
    };

    $scope.saveGrant = function (grant) {
        console.log(grant);
        if (isNaN(parseFloat(grant.unit)) || parseFloat(grant.unit) == 0) {
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
        SWBrijj.proc('ownership.update_transaction', String(transaction['tran_id']), transaction['email'], String(transaction['investor']), String(transaction['issue']), parseFloat(transaction['units']), d1, String(transaction['type']), parseFloat(transaction['amount']), parseFloat(transaction['premoney']), parseFloat(transaction['postmoney']), parseFloat(transaction['ppshare']), parseFloat(transaction['totalauth']), Boolean(transaction.partpref), transaction.liquidpref, transaction['optundersec'], parseFloat(transaction['price']), parseFloat(transaction['terms']), vestcliffdate, parseFloat(transaction['vestcliff']), transaction['vestfreq'], transaction['debtundersec'], parseFloat(transaction['interestrate']), parseFloat(transaction['valcap']), parseFloat(transaction['discount']), parseFloat(transaction['term'])).then(function (data) {
            $scope.rows = calculate.vested($scope.rows, $scope.trans);
        });
    };

    //switches the sidebar based on the type of the issue
    $scope.formatAmount = function (amount) {
        return calculate.funcformatAmount(amount);
    };

    $scope.formatDollarAmount = function(amount) {
        var output = $scope.formatAmount(amount);
        if (output) {
            output = "$" + output
        }
        return (output);
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