// Grants page controller
app.controller('grantController',
    ['$scope', '$location', 'SWBrijj',
     'calculate', 'navState', 'captable', 'displayCopy',
function($scope, $location, SWBrijj,
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

    $scope.selectedCell = null;
    $scope.selectedInvestor = null;
    $scope.selectedSecurity = null;

    var keyPressed = false; // Needed because selecting a date in the calendar is considered a blur, so only save on blur if user has typed a key

    $scope.selectSecurity = function(sec) {
        $scope.selectedInvestor = $scope.selectedCell = null;
        $scope.selectedSecurity = sec;
        // TODO more

    };
    $scope.selectInvestor = function(inv) {
        $scope.selectedSecurity = $scope.selectedCell = null;
        $scope.selectedInvestor = inv;
        // TODO more
    };

    $scope.opendetails = function(name, type) {
        if (type == "security") {
            $scope.ct.securities.forEach(function(sec) {
                if (name == sec.name) {
                    sec.shown = sec.shown !== true;
                } else {
                    sec.shown = false;
                }
            });
        }
        else if (type == "investor") {
            $scope.ct.investors.forEach(function(investor) {
                if (name == investor.name) {
                    investor.shown = investor.shown !== true;
                } else {
                    investor.shown = false;
                }
            });
        }
    };

    // TODO refactor to use captable service
    $scope.issueGranted = function(sec) {
        return captable.securityUnitsFrom(sec, 'grant');
        /*
        var units = 0;
        angular.forEach(issue.trans, function (tran) {
            if (parseFloat(tran.units) > 0) {
                units += parseFloat(tran.units);
            }
        });
        return units;
        */
    };

    // TODO refactor to use captable service
    $scope.issueActions = function(issue, type) {
        var units = 0;
        angular.forEach(issue.trans, function (tran) {
            if (parseFloat(tran[type]) > 0) {
                units += parseFloat(tran[type]);
            }
        });
        return units;
    };

    // TODO refactor to use captable service
    $scope.issueVested = function(issue) {
        var units = 0;
        angular.forEach(issue.trans, function (tran) {
            angular.forEach(tran.vested, function (grant) {
                units += grant.units;
            });
        });
        return units !== 0 ? units : null;
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
    // */


}]);
