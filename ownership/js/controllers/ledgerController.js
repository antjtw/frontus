var ledgerController = function($scope, SWBrijj) {
    var now = new Date();
    $scope.asof = {year: now.getFullYear(),
                   month: now.getMonth(),
                   day: now.getDate()};
    //$scope.$watch('asof', $scope.refilter);
    SWBrijj.tblm('_ownership.my_company_ledger').then(function(data) {
        $scope.raw_data = data;
        $scope.refilter($scope.asof);
    }).except(function(e) {
        console.log(e);
    });
    $scope.getSecurities = function(d, date) {
        var t;
        if (date && date.year && date.month && date.day) {
            t = new Date(date.year, date.month, date.day);
        } else {
            t = now;
        }
        var res = [];
        angular.forEach(d, function(i) {
            if (res.indexOf(i.security) === -1 && t > i.effective_date) {
                res.push(i.security);
            }
        });
        return res;
    };
    $scope.getInvestors = function(d, date) {
        var t;
        if (date && date.year && date.month && date.day) {
            t = new Date(date.year, date.month, date.day);
        } else {
            t = now;
        }
        var res = [];
        angular.forEach(d, function(i) {
            if (res.indexOf(i.investor) === -1 && t > i.effective_date) {
                res.push(i.investor);
            }
        });
        return res;
    };
    $scope.refilter = function(d) {
        // FIXME processing raw_data twice w/r/t asof data
        // if there's an intermediate array, could use it in getSum
        $scope.asof_data = $scope.raw_data.filter(
            function(date) {
                if (date && date.year && date.month && date.day) {
                    return new Date(date.year, date.month, date.day);
                } else {
                    return now;
                }
            }
        );
                     
        $scope.securities = $scope.getSecurities($scope.asof_data, d);
        $scope.investors = $scope.getInvestors($scope.asof_data, d);
    };
    $scope.getSum = function(security, investor, date) {
        var t;
        if (date && date.year && date.month && date.day) {
            t = new Date(date.year, date.month, date.day);
        } else {
            t = now;
        }
        var res = 0;
        angular.forEach($scope.asof_data, function(entry) {
            if (entry.security == security && entry.investor == investor
                && t > entry.effective_date) {
                res += entry.credit;
                res -= entry.debit;
            }
        });
        return res;
    };
};
