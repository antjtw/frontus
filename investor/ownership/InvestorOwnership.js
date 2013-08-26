'use strict';

/* App Module */

var owner = angular.module('companyownership', ['ui.bootstrap', 'ui.event', '$strap.directives', 'brijj', 'ownerServices', 'ownerFilters']);

owner.config(function ($routeProvider, $locationProvider) {
    $locationProvider.html5Mode(true).hashPrefix('');

    $routeProvider.
        when('/', {templateUrl: 'companycaptable.html', controller: captableController}).
        when('/grant', {templateUrl: 'grant.html', controller: grantController}).
        otherwise({redirectTo: '/'});
});

owner.run(function ($rootScope) {

    $rootScope.rowOrdering = function (row) {
        var total = 0
        for (var key in row) {
            if (row.hasOwnProperty(key)) {
                if (key != "name") {
                    if (!isNaN(parseInt(row[key]['u'])) && String(key) != "$$hashKey") {
                        total = total + parseInt(row[key]['u']);
                    }
                }
            }
        }
        return -total;
    };

    $rootScope.trantype = function (type, activetype) {
        if (activetype == 2 && type == "options") {
            return false;
        }
        else if (activetype == 1 && type == "debt") {
            return false;
        }
        else {
            return true
        }
    };

//Calculates total grants in each issue
    $rootScope.totalGranted = function (issue, trans) {
        var granted = 0
        angular.forEach(trans, function (tran) {
            if (tran.issue == issue && tran.type == "options" && !isNaN(parseInt(tran.units))) {
                granted = granted + parseInt(tran.units);
            }
            ;
        });
        return granted;
    };

//Calculates total grant actions in grant table
    $rootScope.totalGrantAction = function (type, grants) {
        var total = 0
        angular.forEach(grants, function (grant) {
            if (grant.action == type && !isNaN(parseInt(grant.unit))) {
                total = total + parseInt(grant.unit);
            }
            ;
        });
        return total;
    };

//Calculates total granted to and forfeited in grant table
    $rootScope.totalTranAction = function (type, trans) {
        var total = 0
        angular.forEach(trans, function (tran) {
            if (type == "granted") {
                if (!isNaN(parseInt(tran.units)) && parseInt(tran.units) > 0) {
                    total = total + parseInt(tran.units);
                }
                ;
            }
            else if (type == "forfeited") {
                if (!isNaN(parseInt(tran.units)) && parseInt(tran.units) < 0) {
                    total = total + parseInt(tran.units);
                }
                ;
            }
            ;
        });
        return total;
    };

    $rootScope.myPercentage = function (everyone) {
        return (100 - everyone);
    };


    $rootScope.postIssues = function (keys, issue) {
        console.log(keys);
        console.log(issue);
    };

});

