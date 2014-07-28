var ownership = angular.module('ownerServices', []);

// Captable functions for basic mathematics. Should be expanded by peeling some of the reusable pieces out of the controller.
ownership.service('calculate', function () {

    this.toFloat = function(value) {
        value = isNaN(parseFloat(value)) ? null : parseFloat(value);
        return value;
    };

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
                if (!isNaN(parseFloat(issue.totalauth))) {
                    leftovers = issue.totalauth;
                    angular.forEach(rows, function (row) {
                        if (issue.issue in row && row.nameeditable != 0 && !isNaN(parseFloat(row[issue.issue]['u']))) {
                            leftovers = leftovers - row[issue.issue]['u'];
                        }
                    });
                }
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
        return null;
/*        var mon = parseFloat(issue.premoney);
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
        return ((parseFloat(row[issue.issue]['a']) / parseFloat(mon)) * 100)*/
    };

    // Calculates the vested amounts for the grant table. This takes in the row array and returns the new row array.
    this.vested = function (rows, trans) {
        var vesting = {};
        angular.forEach(trans, function (tran) {
            var vestbegin = angular.copy(tran.vestingbegins);
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
                    else if (tran.vestfreq == "bi-weekly") {
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
                if (parseFloat(row.vested) > (parseFloat(row.granted)-parseFloat(row.forfeited))) {
                    row.vested = (parseFloat(row.granted)-parseFloat(row.forfeited));
                }
            }
        });
        return rows
    };

    // Calculates vested on each transaction returning dictionary of date:amount vested
    this.tranvested = function (tran) {
        var tranvested = [];
        var vestbegin = angular.copy(tran.vestingbegins);
        var maxunits = parseFloat(tran.units);
        if (!isNaN(parseFloat(tran.forfeited))) {
            maxunits -= parseFloat(tran.forfeited);
        }

        var vestedunits = 0;
        if (!isNaN(parseFloat(tran.vestcliff)) && !isNaN(parseFloat(tran.terms)) && tran.vestfreq != null && tran.date != null && vestbegin != null) {
            var cycleDate = angular.copy(tran.date).add(1).days();
            if (Date.compare(Date.today(), vestbegin) > -1) {
                tranvested.push({"date" : angular.copy(vestbegin), "units" : (tran.units * (tran.vestcliff / 100))});
                vestedunits += (tran.units * (tran.vestcliff / 100));
            }
            if (vestedunits > maxunits) {
                var diff = vestedunits - maxunits;
                tranvested[tranvested.length-1].units -= diff;
            }
            var remainingterm = angular.copy(tran.terms);
            while (Date.compare(vestbegin, cycleDate) > -1) {
                remainingterm = remainingterm - 1;
                cycleDate.addMonths(1);
            }
            cycleDate.add(-1).days();
            var finalDate = vestbegin.addMonths(remainingterm);
            var monthlyperc = (100 - tran.vestcliff) / (remainingterm);
            var x = 1;
            if (tran.vestfreq == "monthly") {
                x = 1
            }
            else if (tran.vestfreq == "weekly") {
                x = 0.25
            }
            else if (tran.vestfreq == "bi-weekly") {
                x = 0.5
            }
            else if (tran.vestfreq == "quarterly") {
                x = 3;
            }
            else if (tran.vestfreq == "yearly") {
                x = 12;
            }
            finalDate.add(-1).days();
            if (vestedunits < maxunits) {
                while (Date.compare(finalDate, cycleDate) > -1) {
                    if (x < 1) {
                        cycleDate.addWeeks(x * 4);
                    }
                    else {
                        cycleDate.addMonths(x);
                    }
                    if (Date.compare(Date.today(), cycleDate) > -1) {
                        tranvested.push({"date" : angular.copy(cycleDate), "units" : (x * ((monthlyperc / 100) * tran.units))});
                        vestedunits += (x * ((monthlyperc / 100) * tran.units));
                        if (vestedunits > maxunits) {
                            var diff = vestedunits - maxunits;
                            tranvested[tranvested.length-1].units -= diff;
                            return tranvested;
                        }
                    }
                }
            }
        }
        return tranvested;
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
                    else if (tran.vestfreq == "bi-weekly") {
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

    this.myvested = function (trans) {
        var myvested = {};
        var tranvested = {};
        var firstcolumn = new Date(5000000000000);
        var lastcolumn = new Date(01-12-1000);
        angular.forEach(trans, function(tran) {
            tranvested[tran.date] = 0;
            var vestbegin = angular.copy(tran.vestingbegins);
            if (!isNaN(parseFloat(tran.vestcliff)) && !isNaN(parseFloat(tran.terms)) && tran.vestfreq != null && tran.date != null && vestbegin != null) {
                firstcolumn = Date.compare(vestbegin, firstcolumn) > -1 ? firstcolumn : vestbegin;
            }
            var remainingterm = angular.copy(tran.terms);
            var startdate = angular.copy(tran.date);
            while (remainingterm > 0) {
                startdate.addMonths(1);
                remainingterm -= 1
            }
            lastcolumn = Date.compare(startdate, lastcolumn) > -1 ? startdate : lastcolumn;
        });
        while (Date.compare(lastcolumn, firstcolumn) > -1) {
            myvested[firstcolumn.toString("MMM yyyy")] = [0,0];
            firstcolumn.addMonths(1);
        }
        angular.forEach(trans, function (tran) {
            var vestbegin = angular.copy(tran.vestingbegins);
            if (!isNaN(parseFloat(tran.vestcliff)) && !isNaN(parseFloat(tran.terms)) && tran.vestfreq != null && tran.date != null && vestbegin != null) {
                var cycleDate = angular.copy(tran.date).add(1).days();
                // Create dictionary of all vesting events, [number vested by today's date, number that will be vested in total]
                if (myvested[vestbegin.toString("MMM yyyy")]) {
                    myvested[vestbegin.toString("MMM yyyy")][1] += (tran.units * (tran.vestcliff / 100));
                }
                else {
                    myvested[vestbegin.toString("MMM yyyy")] = [0,(tran.units * (tran.vestcliff / 100))];
                }
                if (Date.compare(Date.today(), vestbegin) > -1) {
                    myvested[vestbegin.toString("MMM yyyy")][0] += (tran.units * (tran.vestcliff / 100));
                    tranvested[tran.date] += (tran.units * (tran.vestcliff / 100));
                }
                var remainingterm = angular.copy(tran.terms);
                while (Date.compare(vestbegin, cycleDate) > -1) {
                    remainingterm = remainingterm - 1;
                    cycleDate.addMonths(1);
                }
                cycleDate.add(-1).days();
                var finalDate = vestbegin.addMonths(remainingterm);
                var monthlyperc = (100 - tran.vestcliff) / (remainingterm);
                var x = 1;
                if (tran.vestfreq == "monthly") {
                    x = 1
                }
                else if (tran.vestfreq == "weekly") {
                    x = 0.25
                }
                else if (tran.vestfreq == "bi-weekly") {
                    x = 0.5
                }
                else if (tran.vestfreq == "quarterly") {
                    x = 3;
                }
                else if (tran.vestfreq == "yearly") {
                    x = 12;
                }
                finalDate.add(-1).days();
                while (Date.compare(finalDate, cycleDate) > -1) {
                    if (x < 1) {
                        cycleDate.addWeeks(x * 4);
                    }
                    else {
                        cycleDate.addMonths(x);
                    }
                    if (myvested[cycleDate.toString("MMM yyyy")]) {
                        myvested[cycleDate.toString("MMM yyyy")][1] += (x * ((monthlyperc / 100) * tran.units));
                    }
                    else {
                        myvested[cycleDate.toString("MMM yyyy")] = [0,(x * ((monthlyperc / 100) * tran.units))];
                    }
                    if (Date.compare(Date.today(), cycleDate) > -1) {
                        myvested[cycleDate.toString("MMM yyyy")][0] += (x * ((monthlyperc / 100) * tran.units));
                        tranvested[tran.date] += (x * ((monthlyperc / 100) * tran.units));
                    }
                }
            }
        });
        return [myvested,tranvested];
    };

    // Generates the diluted rows
    this.dilution = function (rows, issues) {
        var dilutedRows = [];
        angular.forEach(rows, function (row) {
            if (row.name != undefined) {
                var something = null;
                var temprow = {"name": row.name, "email": row.email};
                angular.forEach(issues, function (issue) {
                    if (issue.issue) {
                        temprow[issue.issue] = {};
                        if (row.editable == "yes" && (issue.type == "Equity" || issue.type == null) && row[issue.issue]['u'] > 0) {
                            temprow[issue.issue] = row[issue.issue];
                            something = true;
                        }
                        if (row[issue.issue]['exercised'] && row.vested && row[issue.issue]['exercised'] > row.vested[issue.issue]) {
                            if (row[issue.issue]['u'] < row[issue.issue]['exercised']) {
                                temprow[issue.issue]['u'] = row[issue.issue]['u'];
                            }
                            else {
                                temprow[issue.issue]['u'] = row[issue.issue]['exercised'];
                            }
                            temprow[issue.issue]['a'] = row[issue.issue]['a'];
                            something = true;
                        }
                        else if (row[issue.issue]['exercised'] && !row.vested) {
                            if (row[issue.issue]['u'] < row[issue.issue]['exercised']) {
                                temprow[issue.issue]['u'] = row[issue.issue]['u'];
                            }
                            else {
                                temprow[issue.issue]['u'] = row[issue.issue]['exercised'];
                            }
                            temprow[issue.issue]['a'] = row[issue.issue]['a'];
                            something = true;
                        }
                        else if (row.vested && issue.type == "Option" && row.vested[issue.issue] > 0) {
                            if (row[issue.issue]['u'] < row.vested[issue.issue]) {
                                temprow[issue.issue]['u'] = row[issue.issue]['u'];
                            }
                            else {
                                temprow[issue.issue]['u'] = row.vested[issue.issue];
                            }
                            temprow[issue.issue]['a'] = row[issue.issue]['a'];
                            something = true;
                        }
                    }
                });
                if (something) {
                    dilutedRows.push(temprow);
                }
            }
        });
        return dilutedRows;
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
        for (var i = 0, a = rows.length; i < a; i++) {
            if (rows[i][header]) {
                var possfloat = parseFloat(rows[i][header][type]);
                if (!isNaN(possfloat) && String(header) != "$$hashKey") {
                    total += possfloat;
                }
            }
        }
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
    this.pricePerShare = function (issues, finishedsorting) {
        if (finishedsorting && issues[issues.length-2]) {
            return issues[issues.length-2].ppshare;
        }
    };

    //Returns the price per share for the most recent issue assuming such a value is given
    this.lastIssue = function (issues, finishedsorting) {
        if (finishedsorting && issues[issues.length-2]) {
            return issues[issues.length-2].date;
        }
    };

    //Returns the post money valuation for the most recent issue assuming such a value is given
    this.lastPostMoney = function (issues, finishedsorting) {
        if (finishedsorting && issues[issues.length-2]) {
            return issues[issues.length-2].postmoney;
        }
    };

    this.funcformatAmount = function (amount) {
        if (amount && !isNaN(amount)) {
            var n = amount.toString().split(".");
            //Comma-fies the first part
            n[0] = n[0].replace(/\B(?=(\d{3})+(?!\d))/g, ",");
            // Caps decimals to 3 places
            if (n[1] && n[1].length > 4) {
                n[1] = n[1].substring(0,3);
            }
            // Takes a .x and makes it .x0
            else if (n[1] && n[1].length == 1) {
                n[1] = n[1] + "0"
            }
            //Combines the two sections
            amount = n.join(".");
        }
        else {
            amount = null;
        }
        return amount;
    };

    var sizes = {0:'', 1:'K', 2:'M', 3:'B'};
    this.abrAmount = function(amount) {
        if (amount) {
            var n = amount.toString().split(".");
            var sizefactor = Math.floor((n[0].length-1)/3);
            if (sizefactor == 0) {
                amount = n[0];
            }
            else {
                var big = String(n[0]).substring(0, n[0].length - (sizefactor*3));
                var small = String(n[0]).substring(n[0].length - (sizefactor*3), n[0].length - (sizefactor*3) + 2);
                if (parseInt(small) % 10 == 0) {
                    small = small.substring(0, 1);
                    if (parseInt(small) == 0) {
                        small = ""
                    }
                }
                small = small != "" ? "." + small : "";
                amount = big + small + sizes[sizefactor];
            }
        }
        else {
            amount = 0;
        }
        return amount
    };

    this.cleanZeros = function(amount) {
        if (amount) {
            var n = amount.toString().split(".");
            if (n[1]) {
                var small = n[1].substring(0,2);
                if (parseInt(small) % 10 == 0) {
                    small = small.substring(0, 1);
                    if (parseInt(small) == 0) {
                        small = ""
                    }
                }
                small = small != "" ? "." + small : "";
                amount = n[0] + small;
            }
        }
        return amount;
    };

    var currencydictionary = {'EUR': '€', 'GBP': '£', 'USD': '$'};

    this.currencysymbol = function(settings) {
        return settings && currencydictionary[settings.currency] ? currencydictionary[settings.currency] : '$'
    };

    this.formatMoneyAmount = function (amount, settings) {
        var symbol = settings && currencydictionary[settings.currency] ? currencydictionary[settings.currency] : '$'
        if (amount) {
            return symbol + amount;
        }
    };

    this.debtinterest = function(convertTran) {
        if (convertTran.date && convertTran.tran.date && convertTran.tran.interestrate && convertTran.tran.interestratefreq && convertTran.tran.amount) {
            var x =1;
            switch (convertTran.tran.interestratefreq)
            {
                case 'monthly':
                    x=1;
                    break;
                case 'weekly':
                    x=0.25;
                    break;
                case 'bi-weekly':
                    x=0.5;
                    break;
                case 'quarterly':
                    x=3;
                    break;
                case 'yearly':
                    x=12;
                    break;
                default:
                    x=1;
            }
            var cycleDate = angular.copy(convertTran.tran.date);
            var length = 500;
            if (convertTran.tran.term) {
               length = parseInt(convertTran.tran.term)
            }
            if (x < 1) {
                cycleDate.addWeeks(x * 4);
            }
            else {
                cycleDate.addMonths(x);
            }
            var finalDate = angular.copy(convertTran.tran.date).addMonths(length);
            while (Date.compare(convertTran.date, cycleDate) > -1 && Date.compare(finalDate.addDays(1), cycleDate) > -1) {
                convertTran.newtran.amount = parseFloat(convertTran.newtran.amount) + ((parseFloat(convertTran.tran.interestrate)/100) * parseFloat(convertTran.newtran.amount));
                if (x < 1) {
                    cycleDate.addWeeks(x * 4);
                }
                else {
                    cycleDate.addMonths(x);
                }
            }
        }
        return convertTran.newtran.amount;
    };



    this.conversion = function(convertTran) {
        if (convertTran.method == "Valuation") {
            var discount = !isNaN(parseFloat(convertTran.tran.discount)) ? (parseFloat(convertTran.tran.discount)/100) : 0;
            var regularppshare = parseFloat(convertTran.toissue.ppshare) * (1-discount);
            if (!isNaN(parseFloat(convertTran.toissue.premoney)) && !isNaN(parseFloat(convertTran.tran.valcap))) {
                var premoneypercent = (1-(parseFloat(convertTran.tran.valcap) / parseFloat(convertTran.toissue.premoney)));
                convertTran.newtran.prevalcappercentage = String(premoneypercent*100);
                if (premoneypercent > (discount)) {
                    regularppshare = parseFloat(convertTran.toissue.ppshare) * (1-premoneypercent);
                    convertTran.newtran.caphit = true;
                }
            }
            if (!isNaN(parseFloat(convertTran.toissue.ppshare))) {
                convertTran.newtran.ppshare = regularppshare;
                convertTran.newtran.units = parseFloat(convertTran.newtran.amount) / convertTran.newtran.ppshare;
            }
            return convertTran.newtran;
        }
        else if (convertTran.method == "Price Per Share") {
            convertTran.newtran.ppshare = convertTran.ppshare;
            convertTran.newtran.units = parseFloat(convertTran.newtran.amount) / convertTran.ppshare;
        }
        return convertTran.newtran;
    };

    this.cleannumber = function(potentialnumber) {
        var finalnumber = String(potentialnumber).replace(/\,/g,'');
        finalnumber = String(finalnumber).replace(/\$/g , '');
        return finalnumber
    };

    // Converts strings to boolean
    this.strToBool = function (string) {
        switch (String(string).toLowerCase()) {
            case "true":
            case "yes":
            case "1":
                return true;
            case "false":
            case "no":
            case "0":
                return false;
            case null:
            case undefined:
            case "undefined":
                return null;
            default:
                return Boolean(string);
        }
    };

    this.booltoYN = function (object, field, options) {
        if (String(object[field]) == "true") {
            object[field] = options[0];
        }
        else if (String(object[field]) == "false") {
            object[field] = options[1];
        }
        return object[field]
    };

    this.timezoneOffset = function (date) {
        return date.addMinutes(date.getTimezoneOffset());
    };

    this.monthDiff = function(d1, d2) {
        var diffYears = d1.getFullYear()-d2.getFullYear();
        var diffMonths = d1.getMonth()-d2.getMonth();

        return (diffYears*12 + diffMonths);
    }

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
        else if (activetype == "Safe" && type == "Safe") {
            return true;
        }
        else if (activetype == "Warrant" && type == "Warrant") {
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

app.run(function ($rootScope) {

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
            if (tran.issue == issue && tran.type == "Option" && !isNaN(parseFloat(tran.units))) {
                granted = granted + parseFloat(tran.units);
                if (tran.forfeited) {
                    granted = granted - tran.forfeited;
                }
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

//Calculates total vested in column
    $rootScope.totalVestedAction = function (rows) {
        var total = 0;
        angular.forEach(rows, function (row) {
            if (!isNaN(parseFloat(row.vested))) {
                total = total + parseFloat(row.vested);
            }
        });
        return total;
    };

    $rootScope.postIssues = function (keys, issue) {
        console.log(keys);
        console.log(issue);
    };

    $rootScope.myPercentage = function (everyone) {
        return (100 - everyone);
    };

});

function hidePopover() {
    angular.element('.popover').hide();
}
