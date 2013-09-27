var visualize = angular.module('vizServices', []);

visualize.service('capital', function () {

    //
    this.optionsgenerate = function(trans, grants) {
        angular.forEach(grants, function (grant) {
            angular.forEach(trans, function (tran) {
                if (grant.tran_id == tran.tran_id) {
                    if (grant.action == "forfeited") {
                        tran.forfeited = tran.forfeited ? tran.forfeited = tran.forfeited + grant.unit : tran.forfeited = grant.unit;
                    }
                    if (grant.action == "exercised") {
                        tran.exercised = tran.exercised ? tran.exercised = tran.exercised + grant.unit : tran.exercised = grant.unit;
                    }
                }
            });
        });
       return trans
    };

    this.tranvested = function (trans, closedate) {
        angular.forEach(trans, function (tran) {
            var vestbegin = angular.copy(tran.vestingbegins)
            if (!isNaN(parseFloat(tran.vestcliff)) && !isNaN(parseFloat(tran.terms)) && tran.vestfreq != null && tran.date != null && vestbegin != null) {
                if (Date.compare(closedate, vestbegin) > -1) {
                    if (!isNaN(parseFloat(tran.vested))) {
                        tran.vested = tran.vested + (tran.units * (tran.vestcliff / 100));
                    }
                    else {
                        tran.vested = (tran.units * (tran.vestcliff / 100));
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
                    while (Date.compare(closedate, cycleDate) > -1 && Date.compare(finalDate.addDays(1), cycleDate) > -1) {
                        tran.vested = tran.vested + (x * ((monthlyperc / 100) * tran.units));
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
        return trans
    };

    this.proceedrows = function(trans) {

        var uniquerows = [];
        var rowdictionary = {};

        angular.forEach(trans, function (tran) {
            if (uniquerows.indexOf(tran.investor) == -1) {
                uniquerows.push(tran.investor);
                rowdictionary[tran.investor] = {};
            }
        });
        angular.forEach(trans, function(tran) {
            rowdictionary[tran.investor][tran.issue] = 0;
        });
        return rowdictionary;
    };

    // Function generates the capitalization of the captable at point of modeled sale.
    // See the sharewave spreadsheets for the origin of these fields.
    this.start = function (issues, trans, accelerate, shareholderrows) {
        var capital = {};
        var total = 0;
        angular.forEach(issues, function (issue) {
            capital[issue.issue] = {};
            capital[issue.issue]['type'] = issue.type;
            capital[issue.issue]['name'] = issue.issue;
            capital[issue.issue]['shown'] = false;
            capital[issue.issue]['shareprice'] =  !isNaN(issue.ppshare) ? parseFloat(issue.ppshare) : 0;
            capital[issue.issue]['liquidpref'] = issue.liquidpref ? issue.liquidpref : 'None';
            capital[issue.issue]['partpref'] = issue.partpref == true ? 'Yes' : 'No';
        });
        angular.forEach(trans, function(tran) {
            var units;
            if (!accelerate && tran.type == 'Option') {
                units = !isNaN(parseFloat(tran.vested)) ? parseFloat(tran.vested) : 0;
                var maxunits = parseFloat(tran.units) - parseFloat(tran.forfeited);
                units = units > maxunits ? maxunits : units;
            }
            else {
                units = !isNaN(parseFloat(tran.units)) ? parseFloat(tran.units) : 0;
                units = !isNaN(parseFloat(tran.forfeited)) ? (units - parseFloat(tran.forfeited)) : units;
            }
            shareholderrows[tran.investor][tran.issue] += units;
            capital[tran.issue]['shares'] = capital[tran.issue]['shares'] ? capital[tran.issue]['shares'] + units : units;
            total += units;
            capital[tran.issue]['paid'] = capital[tran.issue]['shareprice'] * capital[tran.issue]['shares'];
        });
        angular.forEach(issues, function (issue) {
            capital[issue.issue]['percent'] = ((capital[issue.issue]['shares'] / total) * 100);
            capital[issue.issue]['liquidpref'] = capital[issue.issue]['liquidpref'] != 'None' ? (parseFloat(capital[issue.issue]['liquidpref'].charAt(0)) * capital[issue.issue]['paid']) : 0;
        });
        return [capital, shareholderrows, total]
    };

    // Function to generate the waterfall
    // At this point it just starts from scratch each time as any underlying change will change basically every entry.
    // This could be altered in future.
    this.generate = function (capital, total, exit, increment, shareholders) {
        var table = [];
        var issueblockkeys = [];
        var totalCopy;
        var exitCopy
        for (var i = -2; i <= 2; i++) {
            var exitpricecheck = exit+(i*increment) > 0 ? exit+(i*increment) : 0;
            table.push({'exitprice':(exitpricecheck)});
        }
        angular.forEach(table, function(column) {
            totalCopy = angular.copy(total);
            exitCopy = column['exitprice'];
            column['ppdilutedshare'] = exitCopy / totalCopy;
            column['securityproceeds'] = {};
            column['shareholderproceeds'] = {};
            var issueblocks = []
            angular.forEach(capital, function(issue) {
                if (issue.type == "Equity") {
                     var seriesblock = {};
                     seriesblock['name'] = issue.name;
                     seriesblock['seriesliquid'] = (column.ppdilutedshare * issue.shares) > issue.liquidpref ? 0 : issue.liquidpref;
                     seriesblock['residualleft'] = exitCopy - seriesblock['seriesliquid'];
                     if (seriesblock['residualleft'] < 0) {
                         seriesblock['seriesliquid'] = seriesblock['seriesliquid'] + seriesblock['residualleft'];
                         seriesblock['residualleft'] = 0;
                     }
                     exitCopy = seriesblock['residualleft'];
                     seriesblock['sharesleft'] = seriesblock['seriesliquid'] > 0 ? totalCopy - issue['shares'] : totalCopy;
                     totalCopy = seriesblock['sharesleft'];
                     seriesblock['shareresidual'] = seriesblock['residualleft'] / seriesblock['sharesleft'];
                     issueblocks.push(seriesblock);
                     if (issueblockkeys.indexOf(issue.name) == -1) {
                         issueblockkeys.push(issue.name);
                     }
                     if (seriesblock['seriesliquid'] > 0) {
                         column['securityproceeds'][issue.name] = seriesblock['seriesliquid'];
                     }
                }
            });
            angular.forEach(capital, function(issue) {
                if (!column['securityproceeds'][issue.name]) {
                    column['securityproceeds'][issue.name] = exitCopy * (issue.shares/totalCopy)
                }
            });
            angular.forEach(shareholders, function(person, name) {
                column['shareholderproceeds'][name] = 0;
                angular.forEach(person, function(value, key) {
                    column['shareholderproceeds'][name] += ((value/(capital[key]['shares'])) * column['securityproceeds'][key])
                });
            });
            column['options'] = exitCopy;
            totalCopy = angular.copy(total);
            exitCopy = column['exitprice'];
            column['roundliquidation'] = issueblocks;
        });
        return [table, issueblockkeys];
    };

    this.graph = function (waterfall) {
        var data = {}
        var xvalues = [];
        angular.forEach(waterfall, function(column) {
            angular.forEach(column.securityproceeds, function (security, key) {
                if (!data[key]) {
                    data[key] = [];
                }
                data[key].push(security);
            });
            xvalues.push(column.exitprice);
        });
        return [data, xvalues]
    }
});