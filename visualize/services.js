var visualize = angular.module('vizServices', []);

visualize.service('capital', function () {
    this.start = function (issues, trans) {
        var capital = {};
        var total = 0;
        angular.forEach(issues, function (issue) {
            capital[issue.issue] = {};
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
            capital[issue.issue]['percent'] = ((capital[issue.issue]['shares'] / total) * 100)
        });
        return [capital, total]
    };
});