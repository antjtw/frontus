'use strict';

var ownership = angular.module('ownerServices');

// Captable functions for basic mathematics.
// FIXME make into library of pure functions
ownership.service('calculate', function () {

    this.primaryMeasure = function(sec_type) {
        switch (sec_type) {
            case "Equity Common":
            case "Equity":
            case "Option":
            case "Warrant":
                return "units";
            case "Debt":
            case "Convertible Debt":
            case "Safe":
                return "amount";
        }
        return null;
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
    this.debt = function (investors, issue, row) {
        return null;
        /*
        var mon = parseFloat(issue.attrs.premoney);
        if (isNaN(parseFloat(mon))) {
            return null
        } else {
            angular.forEach(investors, function (r) {
                if (r.cells[issue.attrs.security] != undefined) {
                    if ((isNaN(parseFloat(r.cells[issue.attrs.security]['u'])) || r.cells[issue.attrs.security]['u'] == 0 ) && !isNaN(parseFloat(r.cells[issue.attrs.security]['a']))) {
                        mon = mon + parseFloat(r.cells[issue.attrs.security]['a']);
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
    this.vested = function (investors, trans) {
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
        angular.forEach(investors, function (row) {
            if (!isNaN(vesting[row.name])) {
                row.vested = Math.round(vesting[row.name]*1000)/1000;
                if (parseFloat(row.vested) > (parseFloat(row.granted)-parseFloat(row.forfeited))) {
                    row.vested = (parseFloat(row.granted)-parseFloat(row.forfeited));
                }
            }
        });
        return investors;
    };

    // Returns the number of shareholders (investors -1 for the empty row)
    this.numShareholders = function (investors) {
        var number = 0;
        angular.forEach(investors, function(row) {
            if (row.editable == "yes") {
                number += 1;
            }
        });
        return number;
    };

    // TODO must refactor this for sharePercentage to work
    this.shareSum = function(row) {
        var total = 0;
        for (var key in row.cells) {
            if (row.cells.hasOwnProperty(key)) {
                if (row.cells[key] != null) {
                    if (!isNaN(parseFloat(row.cells[key].u)) && String(key) != "$$hashKey") {
                        total = total + parseFloat(row.cells[key].u);
                    }
                }
            }
        }
        return total;
    };

    /*
    this.sharePercentage = function (sharesum, totalshares) {
        return (sharesum / totalshares * 100);
    };
    */

    function totalShares(cells) {
        return cells.reduce(function(prev, cur, idx, arr) {
            return prev + isNumber(cur.u) ? cur.u : 0;
        }, 0);
    }
    this.totalShares = totalShares;

    //Calculates the total money for all securities and transactions
    this.totalPaid = function (investors) {
        var total = 0;
        angular.forEach(investors, function (row) {
            for (var key in row.cells) {
                if (row.cells[key] != null && !isNaN(parseFloat(row.cells[key].a)) && String(key) != "$$hashKey") {
                    total = total + parseFloat(row.cells[key].a);
                }
            }
        });
        return total;
    };

    //Returns the price per share for the most recent issue assuming such a value is given
    this.pricePerShare = function (securities, finishedsorting) {
        if (finishedsorting && securities[securities.length-2]) {
            return securities[securities.length-2].ppshare;
        }
    };

    //Returns the price per share for the most recent issue assuming such a value is given
    this.lastIssue = function (securities, finishedsorting) {
        if (finishedsorting && securities[securities.length-2]) {
            return securities[securities.length-2].date;
        }
    };

    //Returns the post money valuation for the most recent issue assuming such a value is given
    this.lastPostMoney = function (securities, finishedsorting) {
        if (finishedsorting && securities[securities.length-2]) {
            return securities[securities.length-2].postmoney;
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
                n[1] = n[1] + "0";
            }
            //Combines the two sections
            amount = n.join(".");
        }
        else {
            amount = null;
        }
        return amount;
    };

    var memformatamount = memoize(this.funcformatAmount);
    this.formatAmount = function(amount) {
        return memformatamount(amount);
    };
    this.formatDollarAmount = function(amount, settings) {
        return this.formatMoneyAmount(memformatamount(amount), settings);
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
                        small = "";
                    }
                }
                small = (small != "") ? "." + small : "";
                amount = big + small + sizes[sizefactor];
            }
        }
        else {
            amount = 0;
        }
        return amount;
    };

    this.cleanZeros = function(amount) {
        if (amount) {
            var n = amount.toString().split(".");
            if (n[1]) {
                var small = n[1].substring(0,2);
                if (parseInt(small) % 10 == 0) {
                    small = small.substring(0, 1);
                    if (parseInt(small) == 0) {
                        small = "";
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
        return settings && currencydictionary[settings.currency] ? currencydictionary[settings.currency] : '$';
    };

    this.formatMoneyAmount = function (amount, settings) {
        var symbol = settings && currencydictionary[settings.currency] ? currencydictionary[settings.currency] : '$';
        if (amount) {
            return symbol + amount;
        }
    };

    this.debtinterest = function(tran) {
        var amount = tran.attrs.amount * 100;
        if (tran.effective_date && tran.attrs.interestrate && tran.attrs.interestratefreq && tran.attrs.amount) {
            // TODO move to filter
            var x =1;
            switch (tran.attrs.interestratefreq)
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
            var cycleDate = angular.copy(tran.effective_date);
            var length = 500;
            if (tran.attrs.term) {
               length = parseInt(tran.attrs.term);
            }
            if (x < 1) {
                cycleDate.addWeeks(x * 4);
            }
            else {
                cycleDate.addMonths(x);
            }
            var finalDate = angular.copy(tran.effective_date).addMonths(length);
            var convertDate = tran.convert_date ? tran.convert_date : new Date.today();
            while (Date.compare(convertDate, cycleDate) > -1 && Date.compare(finalDate.addDays(1), cycleDate) > -1) {
                amount = parseFloat(amount) + ((parseFloat(tran.attrs.interestrate)/100) * parseFloat(amount));
                if (x < 1) {
                    cycleDate.addWeeks(x * 4);
                }
                else {
                    cycleDate.addMonths(x);
                }
            }
        }
        return (Math.round(amount)/100);
    };


    this.conversion = function(convertTran) {
        convertTran.newtran.attrs.method = convertTran.method;
        if (convertTran.method == "Valuation") {
            var discount = !isNaN(parseFloat(convertTran.tran.attrs.discount)) ? (parseFloat(convertTran.tran.attrs.discount)/100) : 0;
            var regularppshare = parseFloat(convertTran.toissue.ppshare) * (1-discount);
            console.log("conversion", discount, regularppshare);
            if (!isNaN(parseFloat(convertTran.toissue.premoney)) && !isNaN(parseFloat(convertTran.tran.attrs.valcap))) {
                var premoneypercent = (1-(parseFloat(convertTran.tran.attrs.valcap) / parseFloat(convertTran.toissue.premoney)));
                convertTran.newtran.prevalcappercentage = String(premoneypercent*100);
                if (premoneypercent > (discount)) {
                    regularppshare = parseFloat(convertTran.toissue.ppshare) * (1-premoneypercent);
                    convertTran.newtran.caphit = true;
                }
            }
            if (!isNaN(parseFloat(convertTran.toissue.ppshare))) {
                convertTran.newtran.attrs.effectivepps = regularppshare;
            }
            return convertTran.newtran;
        }
        else if (convertTran.method == "Price Per Share") {
            convertTran.newtran.attrs.effectivepps = parseFloat(convertTran.ppshare);
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
            return finalnumber.trim();
        }
    };
    this.cleandatestr = function(potentialdate) {
        // mostly concerned with turning "9/1/14" into "09/01/2014" (zero padding)
        if (potentialdate) {
            var splitdate = potentialdate.trim().split("/");
            if (splitdate[0].length < 2) {
                splitdate[0] = "0" + splitdate[0];
            }
            if (splitdate[1].length < 2) {
                splitdate[1] = "0" + splitdate[1];
            }
            if (splitdate[2].length == 2) {
                splitdate[2] = "20" + splitdate[2];
            }
            return splitdate.join("/");
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
        return object[field];
    };

    this.timezoneOffset = function (date) {
        return date.addMinutes(date.getTimezoneOffset());
    };

    this.monthDiff = function(d1, d2) {
        var diffYears = d1.getFullYear()-d2.getFullYear();
        var diffMonths = d1.getMonth()-d2.getMonth();
        return (diffYears*12 + diffMonths);
    };

    this.makeDateString = function(dateformat) {
        var today = new Date();
        var dd = today.getDate();
        var mm = today.getMonth()+1; //January is 0!
        var yyyy = today.getFullYear();

        if(dd<10) {
            dd='0'+dd
        }

        if(mm<10) {
            mm='0'+mm
        }

        if (dateformat[0] == "M") {
            today = mm+'/'+dd+'/'+yyyy;
        } else {
            today = dd+'/'+mm+'/'+yyyy;
        }

        return today
    };

    this.castDateString = function(date, dateformat) {
        var dd = date.getUTCDate();
        var mm = date.getUTCMonth()+1; //January is 0!
        var yyyy = date.getUTCFullYear();

        if(dd<10) {
            dd='0'+dd
        }

        if(mm<10) {
            mm='0'+mm
        }

        var today;
        if (dateformat[0] == "M") {
            today = mm+'/'+dd+'/'+yyyy;
        } else {
            today = dd+'/'+mm+'/'+yyyy;
        }

        return today
    };

    this.isDate = function(date) {
        return ((new Date(date) !== "Invalid Date" && !isNaN(new Date(date)) ));
    };

});
