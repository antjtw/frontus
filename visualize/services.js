var visualize = angular.module('vizServices', []);

visualize.service('capital', function () {

    // Function generates the capitalization of the captable at point of sale.
    // See the sharewave spreadsheets for the origin of these fields.
    this.start = function (issues, trans) {
        var capital = {};
        var total = 0;
        angular.forEach(issues, function (issue) {
            capital[issue.issue] = {};
            capital[issue.issue]['type'] = issue.type;
            capital[issue.issue]['name'] = issue.issue;
            capital[issue.issue]['shareprice'] =  !isNaN(issue.ppshare) ? parseFloat(issue.ppshare) : 0;
            capital[issue.issue]['liquidpref'] = issue.liquidpref ? issue.liquidpref : 'None';
        });
        angular.forEach(trans, function(tran) {
            var units = !isNaN(parseFloat(tran.units)) ? parseFloat(tran.units) : 0;
            capital[tran.issue]['shares'] = capital[tran.issue]['shares'] ? capital[tran.issue]['shares'] + units : units;
            total += units;
            capital[tran.issue]['paid'] = capital[tran.issue]['shareprice'] * capital[tran.issue]['shares'];
        });
        angular.forEach(issues, function (issue) {
            capital[issue.issue]['percent'] = ((capital[issue.issue]['shares'] / total) * 100);
            capital[issue.issue]['liquidpref'] = capital[issue.issue]['liquidpref'] != 'None' ? (parseFloat(capital[issue.issue]['liquidpref'].charAt(0)) * capital[issue.issue]['paid']) : 0;
        });
        return [capital, total]
    };

    // Function to generate the waterfall
    // At this point it just starts from scratch each time as any underlying change will change basically every entry.
    // This could be altered in future.
    this.generate = function (capital, total, exit, increment) {
        var table = [];
        var issueblockkeys = [];
        var totalCopy;
        var exitCopy
        for (var i = -2; i <= 2; i++) {
            table.push({'exitprice':(exit+(i*increment))});
        }
        angular.forEach(table, function(column) {
            totalCopy = angular.copy(total);
            exitCopy = column['exitprice'];
            column['ppdilutedshare'] = exitCopy / totalCopy;
            var issueblocks = []
            angular.forEach(capital, function(issue) {
                if (issue.type == "Equity") {
                     var seriesblock = {};
                     seriesblock['name'] = issue.name;
                     seriesblock['seriesliquid'] = (column.ppdilutedshare * issue.shares) > issue.liquidpref ? 0 : issue.liquidpref;
                     seriesblock['residualleft'] = exitCopy - seriesblock['seriesliquid'];
                     exitCopy = seriesblock['residualleft'];
                     seriesblock['sharesleft'] = seriesblock['seriesliquid'] > 0 ? totalCopy - issue['shares'] : totalCopy;
                     totalCopy = seriesblock['sharesleft'];
                     seriesblock['shareresidual'] = seriesblock['residualleft'] / seriesblock['sharesleft'];
                     issueblocks.push(seriesblock);
                     if (issueblockkeys.indexOf(issue.name) == -1) {
                         issueblockkeys.push(issue.name);
                     }
                }
            });
            column['options'] = exitCopy;
            totalCopy = angular.copy(total);
            exitCopy = column['exitprice'];
            column['roundliquidation'] = issueblocks;
        });
        return [table, issueblockkeys];
    };
});