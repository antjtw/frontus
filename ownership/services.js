var ownership = angular.module('ownerServices', []);

// Captable functions for basic mathematics. Should be expanded by peeling some of the reusable pieces out of the controller.
ownership.service('calculate', function () {

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

    // Calculate and update the unissued rows on the captable
    this.unissued = function (rows, issues, issuename) {
        var keepgoing = true;
        var deleterow = -1;
        var leftovers;
        angular.forEach(issues, function (issue) {
            if (issue.issue == issuename) {
                leftovers = issue.totalauth;
                angular.forEach(rows, function (row) {
                    if (issue.issue in row && row.nameeditable != 0 && !isNaN(parseFloat(row[issue.issue]['u']))) {
                        leftovers = leftovers - row[issue.issue]['u'];
                    }
                });
            }
        });

        angular.forEach(issues, function(issue) {
             if (issue.optundersec == issuename && !isNaN(parseFloat(issue.totalauth))) {
                   leftovers = leftovers - issue.totalauth;
             }
        });

        var shares = {"u": leftovers, "ukey": leftovers, "x": null};
        angular.forEach(rows, function (row) {
            if (keepgoing) {
                if (row.name == issuename + " (unissued)") {
                    keepgoing = false;
                    if (leftovers != 0) {
                        row[issuename] = shares;
                    }
                    else {
                        deleterow = rows.indexOf(row);
                    }
                }
            }
        });
        if (keepgoing != false) {
            if (!isNaN(parseFloat(leftovers)) && leftovers != 0) {
                rows.splice(-1, 0, {"name": issuename + " (unissued)", "editable": 0, "nameeditable": 0});
                rows[(rows.length) - 2][issuename] = shares;
            }
        }
        if (deleterow > -1) {
            rows.splice(deleterow, 1);
        }
        return rows
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

    // Calculates the vested amounts for the grant table. This takes in the row array and returns the new row array.
    this.vested = function (rows, trans) {
        var vesting = {};
        angular.forEach(trans, function (tran) {
            var vestbegin = angular.copy(tran.vestingbegins)
            if (!isNaN(parseFloat(tran.vestcliff)) && !isNaN(parseFloat(tran.terms)) && tran.vestfreq != null && tran.date != null && vestbegin != null) {
                if (Date.compare(Date.today(), vestbegin) > -1) {
                    if (!isNaN(parseFloat(vesting[tran.investor]))) {
                        vesting[tran.investor] = vesting[tran.investor] + (tran.units * (tran.vestcliff / 100));
                    }
                    else {
                        vesting[tran.investor] = (tran.units * (tran.vestcliff / 100));
                    }
                    var cycleDate = angular.copy(tran.date);
                    var remainingterm = angular.copy(tran.terms);
                    while (Date.compare(vestbegin, cycleDate) > -1) {
                        remainingterm = remainingterm - 1;
                        cycleDate.addMonths(1);
                    }
                    remainingterm = remainingterm;
                    var finalDate = vestbegin.addMonths(remainingterm);
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
                    while (Date.compare(Date.today(), cycleDate) > -1 && Date.compare(finalDate.addDays(1), cycleDate) > -1) {
                        console.log("The cycle data is " + String(cycleDate));
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
                var result =Math.round(vesting[row.name]*1000)/1000
                row.vested = result;
            }
        });
        console.log(rows);
        return rows
    };

    // Calculates the vested amounts for the
    this.detailedvested = function (rows, trans) {
        var vesting = {};
        angular.forEach(trans, function (tran) {
            var vestbegin = angular.copy(tran.vestingbegins)
            if (!isNaN(parseFloat(tran.vestcliff)) && !isNaN(parseFloat(tran.terms)) && tran.vestfreq != null && tran.date != null && vestbegin != null) {
                if (Date.compare(Date.today(), vestbegin) > -1) {
                    if (!vesting[tran.investor]) {
                        vesting[tran.investor] = {};
                    }
                    if (!isNaN(parseFloat(vesting[tran.investor][tran.issue]))) {
                        vesting[tran.investor][tran.issue] = vesting[tran.investor][tran.issue] + (tran.units * (tran.vestcliff / 100));
                    }
                    else {
                        vesting[tran.investor][tran.issue] = (tran.units * (tran.vestcliff / 100));
                    }
                    var cycleDate = angular.copy(tran.date);
                    var remainingterm = angular.copy(tran.terms);
                    while (Date.compare(vestbegin, cycleDate) > -1) {
                        remainingterm = remainingterm - 1;
                        cycleDate.addMonths(1);
                    }
                    remainingterm = remainingterm;
                    var finalDate = vestbegin.addMonths(remainingterm);
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
                    while (Date.compare(Date.today(), cycleDate) > -1 && Date.compare(finalDate.addDays(1), cycleDate) > -1) {
                        console.log("The cycle data is " + String(cycleDate));
                        vesting[tran.investor][tran.issue] = vesting[tran.investor][tran.issue] + (x * ((monthlyperc / 100) * tran.units));
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
            if (vesting[row.name]) {
                row.vested = {}
                for (var issue in vesting[row.name]) {
                    if (!isNaN(vesting[row.name][issue])) {
                        var result = Math.round(vesting[row.name][issue]*1000)/1000
                        row.vested[issue] = result;
                    }
                }
            }
        });
        return rows
    };




    // Returns the number of shareholders (rows -1 for the empty row)
    this.numShareholders = function (rows) {
        var number = 0
        angular.forEach(rows, function(row) {
            if (row.editable == "yes") {
                number += 1
            }
        });
        return number;
    };

    // Calculates the Total Shares owned by an investor across all rounds
    this.shareSum = function (row) {
        var total = 0;
        for (var key in row) {
            if (row.hasOwnProperty(key)) {
                if (row[key] != null) {
                    if (!isNaN(parseFloat(row[key]['u'])) && String(key) != "$$hashKey") {
                        total = total + parseFloat(row[key]['u']);
                    }
                }
            }
        }
        return total;
    };

    // Returns the percentage ownership for each shareholder
    this.sharePercentage = function (row, rows, issuekeys, sharesum, totalshares) {
        var percentage = 0;
        var totalpercentage = 0;
        for (var i = 0, l = issuekeys.length; i < l; i++) {
            if (row[issuekeys[i]] != undefined) {
                if (row[issuekeys[i]]['x'] != undefined) {
                    percentage = percentage + row[issuekeys[i]]['x'];
                }
            }
        }
        for (var j = 0, a = rows.length; j < a; j++) {
            for (var i = 0, l = issuekeys.length; i < l; i++) {
                if (rows[j][issuekeys[i]] != undefined) {
                    if (rows[j][issuekeys[i]]['x'] != undefined) {
                        totalpercentage = totalpercentage + rows[j][issuekeys[i]]['x'];
                    }
                }
            }
        }
        return (percentage + (sharesum / totalshares * (100 - totalpercentage)));
    };

    // Calculates total shares for the captable
    this.totalShares = function (rows) {
        var total = 0;
        angular.forEach(rows, function (row) {
            for (var key in row) {
                if (row.hasOwnProperty(key)) {
                    if (row[key] != null) {
                        if (!isNaN(parseFloat(row[key]['u'])) && String(key) != "$$hashKey") {
                            total = total + parseFloat(row[key]['u']);
                        }
                    }
                }
            }
        });
        return total;
    };

    //Calculates the total for a column, will do either shares or money depending
    this.colTotal = function (header, rows, type) {
        var total = 0;
        angular.forEach(rows, function (row) {
            for (var key in row) {
                if (key == header) {
                    if (!isNaN(parseFloat(row[key][type])) && String(key) != "$$hashKey") {
                        total = total + parseFloat(row[key][type]);
                    }
                }
            }
        });
        return total;
    };

    //Calculates the total for a column, without unissued shares
    this.colTotalIssued = function (header, rows, type) {
        var total = 0;
        angular.forEach(rows, function (row) {
            if (row.editable == "yes") {
                for (var key in row) {
                    if (key == header) {
                        if (!isNaN(parseFloat(row[key][type])) && String(key) != "$$hashKey") {
                            total = total + parseFloat(row[key][type]);
                        }
                    }
                }
            }
        });
        return total;
    };

    //Calculates the total money for all issues and transactions
    this.totalPaid = function (rows) {
        var total = 0;
        angular.forEach(rows, function (row) {
            for (var key in row) {
                if (row[key] != null && !isNaN(parseFloat(row[key]['a'])) && String(key) != "$$hashKey") {
                    total = total + parseFloat(row[key]['a']);
                }
            }
        });
        return total;
    };

    //Returns the price per share for the most recent issue assuming such a value is given
    this.pricePerShare = function (issues) {
        if (issues[issues.length-2]) {
            return issues[issues.length-2].ppshare;
        }
    };

    //Returns the price per share for the most recent issue assuming such a value is given
    this.lastIssue = function (issues) {
        if (issues[issues.length-2]) {
            return issues[issues.length-2].date;
        }
    };

    //Returns the post money valuation for the most recent issue assuming such a value is given
    this.lastPostMoney = function (issues) {
        if (issues[issues.length-2]) {
            return issues[issues.length-2].postmoney;
        }
    };
});

ownership.service('switchval', function () {

    // Toggles the sidebar based on the type of the issue
    this.trantype = function (type, activetype) {
        if (activetype == "Option" && type == "Option") {
            return true;
        }
        else if (activetype == "Debt" && type == "Debt") {
            return true;
        }
        else if (activetype == "Equity" && type == "Equity") {
            return true;
        }
        else {
            return false;
        }
    };

    this.typeswitch = function (tran) {
        if (tran.type = "Option") {
            tran.atype = 1;
        }
        else if (tran.type = "Debt") {
            tran.atype = 2;
        }
        else {
            tran.atype = 0;
        }
        return tran;
    };

    this.typereverse = function (tran) {
        if (tran == 1) {
            tran = "Option";
        }
        else if (tran == 2) {
            tran = "Debt";
        }
        else {
            tran = "Equity";
        }
        return tran;
    };
});

ownership.service('sorting', function () {

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

/*    // Sorts the rows by issue type from earliest to latest
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
    };*/

    // Sorts the rows by greatest ownership
    this.basicrow = function () {
        return function (a, b) {
            if (a.startpercent > b.startpercent) return -1
            else if (b.startpercent > a.startpercent) return 1
            else return 0;
        }
    };

});