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

    // Calculates the vested amounts for the grant table. This takes in the row array and returns the new row array. Buggy.
    this.vested = function (rows, trans) {
        var vesting = {};
        angular.forEach(trans, function (tran) {
            if (!isNaN(parseFloat(tran.vestcliff)) && !isNaN(parseFloat(tran.terms)) && tran.vestfreq != null && tran.date != null && tran.vestingbegins != null) {
                if (Date.compare(Date.today(), tran.vestingbegins) > -1) {
                    if (!isNaN(parseFloat(vesting[tran.investor]))) {
                        vesting[tran.investor] = vesting[tran.investor] + (tran.units * (tran.vestcliff / 100));
                    }
                    else {
                        vesting[tran.investor] = (tran.units * (tran.vestcliff / 100));
                    }
                    var cycleDate = angular.copy(tran.date);
                    var remainingterm = angular.copy(tran.terms);
                    while (Date.compare(tran.vestingbegins, cycleDate) > -1) {
                        remainingterm = remainingterm - 1;
                        cycleDate.addMonths(1);
                    }
                    remainingterm = remainingterm + 1;
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
                    while (Date.compare(Date.today(), cycleDate) > -1) {
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
                row.vested = vesting[row.name];
            }
        });
        console.log(rows);
        return rows
    };


    // Returns the number of shareholders (rows -1 for the empty row)
    this.numShareholders = function (rows) {
        return (rows.length - 1);
    };

    // Calculates the Total Shares owned by an investor across all rounds
    this.shareSum = function (row) {
        var total = 0;
        for (var key in row) {
            if (row.hasOwnProperty(key)) {
                if (row[key] != null) {
                    if (!isNaN(parseFloat(row[key]['u'])) && String(key) != "$$hashKey" && row['nameeditable'] != 0) {
                        total = total + parseFloat(row[key]['u']);
                    }
                }
            }
        }
        return total;
    };

    // Returns the percentage ownership for each shareholder
    this.sharePercentage = function (row, rows, issuekeys) {
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
        return (percentage + (this.shareSum(row) / this.totalShares(rows) * (100 - totalpercentage)));
    };

    // Calculates total shares for the captable
    this.totalShares = function (rows) {
        var total = 0;
        angular.forEach(rows, function (row) {
            for (var key in row) {
                if (row.hasOwnProperty(key)) {
                    if (row[key] != null) {
                        if (!isNaN(parseFloat(row[key]['u'])) && String(key) != "$$hashKey" && row['nameeditable'] != 0) {
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
});

ownership.service('switchval', function () {
    this.tran = function (type) {
        if (type == "debt" || type == 0) {
            return 0;
        }
        else if (type == "options" || type == 1) {
            return 1;
        }
        else {
            return 2;
        }
    };

    this.typeswitch = function (tran) {
        if (tran.optundersec != null) {
            tran.atype = 1;
        }
        else if (!isNaN(parseFloat(tran.amount)) && isNaN(parseFloat(tran.units))) {
            tran.atype = 2;
        }
        else {
            tran.atype = 0;
        }
        return tran;
    };

    this.typereverse = function (tran) {
        if (tran == 1) {
            tran = "options";
        }
        else if (tran == 2) {
            tran = "debt";
        }
        else {
            tran = "shares";
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

    // Sorts the rows
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
    };

});