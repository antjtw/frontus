var visualize = angular.module('vizServices', []);

visualize.service('capital', function () {
    this.start = function (issues, trans) {
        var capital = {};
        angular.forEach(issues, function (issue) {
            capital[issue.issue] = {};
            capital[issue.issue]['shareprice'] =  !isNaN(issue.ppshare) ? issue.ppshare: 0;
        });
        return capital
    };
});