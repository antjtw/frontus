'use strict';

/* App Module */

/*function calculateRedirect($scope) {
    var z = readCookie('role');
    console.log("calculating redirect: "+z);
    return z == 'issuer' ? '/company-captable' : '/investor-captable';
}*/

var owner = angular
    .module('companyownership', ['ui.bootstrap', 'ui.event', '$strap.directives', 'nav', 'brijj', 'ownerServices', 'ownerFilters'])

owner.config(function ($routeProvider, $locationProvider) {
    $locationProvider.html5Mode(true).hashPrefix('');

    $routeProvider.
        when('/company-captable', {templateUrl: 'pages/comp-captable.html', controller: captableController}).
        when('/company-grants', {templateUrl: 'pages/comp-grant.html', controller: grantController}).
        when('/company-status', {templateUrl: 'pages/comp-status.html', controller: statusController}).
        when('/investor-captable', {templateUrl: 'pages/inv-captable.html', controller: invCaptableController}).
        when('/investor-grants', {templateUrl: 'pages/inv-grant.html', controller: invGrantController}).
        otherwise({redirectTo: '/company-captable' /*'/' */});
});
/*
owner.factory('sharedData', function(SWBrijj, $q) {

    var getCompanies = function() {
       var deferred = $q.defer();
        SWBrijj.procm('account.nav_companies').then(function(x) {
            deferred.resolve(x);
        });
        return deferred.promise;
    }

    return { getCompanies:getCompanies };
});*/


/*
 * memoize.js
 * by @philogb and @addyosmani
 * with further optimizations by @mathias
 * and @DmitryBaranovsk
 * perf tests: http://bit.ly/q3zpG3
 * Released under an MIT license.
 */
function memoize( fn ) {
    return function () {
        var args = Array.prototype.slice.call(arguments),
            hash = "",
            i = args.length;
        var currentArg = null;
        while (i--) {
            currentArg = args[i];
            hash += (currentArg === Object(currentArg)) ?
                JSON.stringify(currentArg) : currentArg;
            fn.memoize || (fn.memoize = {});
        }
        return (hash in fn.memoize) ? fn.memoize[hash] :
            fn.memoize[hash] = fn.apply(this, args);
    };
}

// IE8 Shiv for checking for an array
function isArray(obj) {
    return Object.prototype.toString.call(obj) === '[object Array]';
}

owner.run(function ($rootScope) {

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