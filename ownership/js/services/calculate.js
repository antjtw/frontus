var ownership = angular.module('ownerServices');

// Captable functions for basic mathematics.
// FIXME make into library of pure functions
ownership.service('calculate', function () {

    this.whenVestingBegins = function(obj) {
        if (isNumber(obj.vestingbeginsdisplay, 10)) {
            return angular.copy(obj.date).addMonths(
                parseInt(obj.vestingbeginsdisplay, 10));
        } else {
            return obj.vestingbegins;
        }
    };
    this.complement = function(a, b) {
        return a.filter(function(el) {return b.indexOf(el)==-1;});
    };
    this.toFloat = function(value) {
        return isNaN(parseFloat(value)) ? null : parseFloat(value);
    };

    // The remainder calculated for outstanding units rows.
    this.whatsleft = function (total, issue, rows) {
        var leftover = total;
        angular.forEach(rows, function (row) {
            if (issue.issue in row.cells &&
                    row.nameeditable !== 0 &&
                    isNumber(row.cells[issue.issue].u)) {
                leftover -= row.cells[issue.issue].u;
            }
        });
        return leftover;
    };

    // Simple summation checking that the added value is a number.
    this.sum = function (current, additional) {
        if ((!current || !isNumber(current)) &&
                isNumber(additional)) {
            current = 0;
        }
        if (isNumber(additional)) {
            return current + parseFloat(additional);
        } else {
            return current;
        }
    };

    // Calculates the debt for the captable based on transactions
    // with paid but no shares. Must be called on each row.
    this.debt = function (rows, issue, row) {
        return null;
        /*
        var mon = parseFloat(issue.premoney);
        if (isNaN(parseFloat(mon))) {
            return null
        } else {
            angular.forEach(rows, function (r) {
                if (r.cells[issue.issue] != undefined) {
                    if ((isNaN(parseFloat(r.cells[issue.issue]['u'])) || r.cells[issue.issue]['u'] == 0 ) && !isNaN(parseFloat(r.cells[issue.issue]['a']))) {
                        mon = mon + parseFloat(r.cells[issue.issue]['a']);
                    }
                }
            });
        }
        return ((parseFloat(row.cells[issue.issue]['a']) / parseFloat(mon)) * 100)
        */
    };

    // Calculates the vested amounts for the grant table.
    // This takes in the row array and returns the new row array.
    // TODO break up and move to captable service
    this.vested = function (rows, trans) {
        var vesting = {};
        angular.forEach(trans, function (tran) {
            var vestbegin = angular.copy(tran.vestingbegins);
            if (isNumber(tran.vestcliff) &&
                    isNumber(tran.terms) &&
                    tran.vestfreq !== null &&
                    tran.date !== null &&
                    vestbegin !== null)
            {
                if (Date.compare(Date.today(), vestbegin) > -1) {
                    if (isNumber(vesting[tran.investor])) {
                        vesting[tran.investor] +=
                            tran.units * (tran.vestcliff / 100);
                    } else {
                        vesting[tran.investor] = 
                            tran.units * (tran.vestcliff / 100);
                    }
                    var cycleDate = angular.copy(tran.date);
                    var remainingterm = angular.copy(tran.terms);
                    while (Date.compare(vestbegin, cycleDate) > -1) {
                        remainingterm = remainingterm - 1;
                        cycleDate.addMonths(1);
                    }
                    remainingterm = remainingterm;
                    var finalDate = vestbegin.addMonths(remainingterm);
                    var monthlyperc = (100 - tran.vestcliff) /
                                                    remainingterm;
                    // TODO make into filter
                    var x = 1;
                    if (tran.vestfreq == "monthly") {
                        x = 1;
                    } else if (tran.vestfreq == "weekly") {
                        x = 0.25;
                    } else if (tran.vestfreq == "bi-weekly") {
                        x = 0.5;
                    } else if (tran.vestfreq == "quarterly") {
                        x = 3;
                    } else if (tran.vestfreq == "yearly") {
                        x = 12;
                    }
                    if (x < 1) {
                        cycleDate.addWeeks(x * 4);
                    } else {
                        cycleDate.addMonths(x);
                    }
                    while (Date.compare(Date.today(), cycleDate) > -1 &&
                               Date.compare(finalDate.addDays(1),
                                            cycleDate) > -1)
                    {
                        vesting[tran.investor] +=
                            (x * ((monthlyperc / 100) * tran.units));
                        if (x < 1) {
                            cycleDate.addWeeks(x * 4);
                        } else {
                            cycleDate.addMonths(x);
                        }
                    }
                }
            }
        });
        angular.forEach(rows, function (row) {
            if (!isNaN(vesting[row.name])) {
                row.vested = Math.round(vesting[row.name]*1000)/1000;
                if (parseFloat(row.vested) > (parseFloat(row.granted)-parseFloat(row.forfeited))) {
                    row.vested = (parseFloat(row.granted)-parseFloat(row.forfeited));
                }
            }
        });
        return rows;
    };

    // Calculates vested on each transaction returning dictionary of date:amount vested
    // TODO move to captable service
    this.tranvested = function (tran) {
        var tranvested = [];
        var vestbegin = angular.copy(tran.vestingbegins);
        var maxunits = parseFloat(tran.units) -
                           parseFloat(tran.forfeited);
        var vestedunits = 0;
        if (isNumber(tran.vestcliff) &&
                isNumber(tran.terms) &&
                tran.vestfreq !== null &&
                tran.date !== null &&
                vestbegin !== null)
        {
            var cycleDate = angular.copy(tran.date).add(1).days();
            if (Date.compare(Date.today(), vestbegin) > -1) {
                tranvested.push({"date" : angular.copy(vestbegin),
                                 "units" : tran.units *
                                           (tran.vestcliff / 100)});
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
            var monthlyperc = (100 - tran.vestcliff) / remainingterm;
            var x = 1;
            if (tran.vestfreq == "monthly") {
                x = 1;
            } else if (tran.vestfreq == "weekly") {
                x = 0.25;
            } else if (tran.vestfreq == "bi-weekly") {
                x = 0.5;
            } else if (tran.vestfreq == "quarterly") {
                x = 3;
            } else if (tran.vestfreq == "yearly") {
                x = 12;
            }
            finalDate.add(-1).days();
            while (Date.compare(finalDate, cycleDate) > -1) {
                if (x < 1) {
                    cycleDate.addWeeks(x * 4);
                } else {
                    cycleDate.addMonths(x);
                }
                if (Date.compare(Date.today(), cycleDate) > -1) {
                    tranvested.push({"date" : angular.copy(cycleDate),
                                     "units" : (x * ((monthlyperc / 100) * tran.units))});
                    vestedunits += (x * ((monthlyperc / 100) * tran.units));
                    if (vestedunits > maxunits) {
                        var diff = vestedunits - maxunits;
                        tranvested[tranvested.length-1].units -= diff;
                        return tranvested;
                    }
                }
            }
        }
        return tranvested;
    };

    // Calculates the vested amounts for the
    // TODO move to captable service
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
                remainingterm -= 1;
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
        return [myvested, tranvested];
    };

    // Generates the diluted rows
    this.dilution = function (rows, issues) {
        var dilutedRows = [];
        angular.forEach(rows, function (row) {
            if (row.name !== undefined) {
                var something = null;
                var temprow = {"name": row.name, "email": row.email, cells: []};
                angular.forEach(issues, function (issue) {
                    if (issue.issue) {
                        temprow.cells[issue.issue] = {};
                        if (row.editable == "yes" && (issue.type == "Equity" || issue.type == null) && row.cells[issue.issue]['u'] > 0) {
                            temprow.cells[issue.issue] = row.cells[issue.issue];
                            something = true;
                        }
                        if (row.cells[issue.issue]['exercised'] && row.vested && row.cells[issue.issue]['exercised'] > row.vested[issue.issue]) {
                            if (row.cells[issue.issue]['u'] < row.cells[issue.issue]['exercised']) {
                                temprow.cells[issue.issue]['u'] = row.cells[issue.issue]['u'];
                            }
                            else {
                                temprow.cells[issue.issue]['u'] = row.cells[issue.issue]['exercised'];
                            }
                            temprow.cells[issue.issue]['a'] = row.cells[issue.issue]['a'];
                            something = true;
                        }
                        else if (row.cells[issue.issue]['exercised'] && !row.vested) {
                            if (row.cells[issue.issue]['u'] < row.cells[issue.issue]['exercised']) {
                                temprow.cells[issue.issue]['u'] = row.cells[issue.issue]['u'];
                            }
                            else {
                                temprow.cells[issue.issue]['u'] = row.cells[issue.issue]['exercised'];
                            }
                            temprow.cells[issue.issue]['a'] = row.cells[issue.issue]['a'];
                            something = true;
                        }
                        else if (row.vested && issue.type == "Option" && row.vested[issue.issue] > 0) {
                            if (row.cells[issue.issue]['u'] < row.vested[issue.issue]) {
                                temprow.cells[issue.issue]['u'] = row.cells[issue.issue]['u'];
                            }
                            else {
                                temprow.cells[issue.issue]['u'] = row.vested[issue.issue];
                            }
                            temprow.cells[issue.issue]['a'] = row.cells[issue.issue]['a'];
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
        for (var key in row.cells) {
            if (row.cells.hasOwnProperty(key)) {
                if (row.cells[key] != null) {
                    if (!isNaN(parseFloat(row.cells[key]['u'])) && String(key) != "$$hashKey") {
                        total = total + parseFloat(row.cells[key]['u']);
                    }
                }
            }
        }
        return total;
    };

    // Returns the percentage ownership for each shareholder
    // TODO refactor
    this.sharePercentage = function (row, rows, issuekeys, sharesum, totalshares) {
        var percentage = 0;
        var totalpercentage = 0;
        for (var i = 0, l = issuekeys.length; i < l; i++) {
            if (row.cells[issuekeys[i]] != undefined) {
                if (row.cells[issuekeys[i]].x != undefined) {
                    percentage = percentage + row.cells[issuekeys[i]].x;
                }
            }
        }
        for (var j = 0, a = rows.length; j < a; j++) {
            for (var i = 0, l = issuekeys.length; i < l; i++) {
                if (rows[j].cells[issuekeys[i]] != undefined) {
                    if (rows[j].cells[issuekeys[i]]['x'] != undefined) {
                        totalpercentage = totalpercentage + rows[j].cells[issuekeys[i]]['x'];
                    }
                }
            }
        }
        return (percentage + (sharesum / totalshares * (100 - totalpercentage)));
    };

    // // TODO refactor
    // Calculates total shares for the captable
    this.totalShares = function (rows) {
        var total = 0;
        angular.forEach(rows, function (row) {
            for (var key in row.cells) {
                if (row.cells.hasOwnProperty(key)) {
                    if (row.cells[key] != null) {
                        if (!isNaN(parseFloat(row.cells[key]['u'])) && String(key) != "$$hashKey") {
                            total = total + parseFloat(row.cells[key]['u']);
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
            if (rows[i].cells[header]) {
                var possfloat = parseFloat(rows[i].cells[header][type]);
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
                for (var key in row.cells) {
                    if (key == header) {
                        if (!isNaN(parseFloat(row.cells[key][type])) && String(key) != "$$hashKey") {
                            total = total + parseFloat(row.cells[key][type]);
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
            for (var key in row.cells) {
                if (row.cells[key] != null && !isNaN(parseFloat(row.cells[key]['a'])) && String(key) != "$$hashKey") {
                    total = total + parseFloat(row.cells[key]['a']);
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
            // TODO move to filter
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



    // TODO fix this
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

    this.undoIf = function(fn, cur, prev) {
        return fn(cur) ? prev : cur;
    };
    this.numberIsInvalid = function(num) {
        return !(/^(\d+)*(\.\d+)*$/.test(num)) && num != null && num != "";
    };
    this.cleannumber = function(potentialnumber) {
        if (potentialnumber) {
            var finalnumber = String(potentialnumber).replace(/\,/g,'');
            finalnumber = String(finalnumber).replace(/\$/g , '');
            return finalnumber
        }
    };
    function isNumber(val) {
        return !isNaN(parseFloat(val));
    }
    this.isNumber = isNumber;

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
