var ownership = angular.module('ownerServices', []);

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

ownership.value('displayCopy', {
    tourmessages: {
        intro:
            "Hover over these icons to reveal helpful info " +
            "about your table",
        share:
            "When you’re finished, share your cap table with " +
            "others",
        view:
            "When you’re not editing, click here for the best "+
            "view of your data",
        sidebar:
            "Additional details for securities and " +
            "transactions are tucked away here",
        issuecog:
            "Additional details for securities and " +
            "transactions are tucked away here",
        success:
            "Great! Just repeat for all securities, and share when "
            + "you're ready."
    },
    captabletips: {
        premoneyval:
            "The valuation before taking money in this round",
        postmoneyval:
            "The sum of the pre-money valuation and the "+
            "total money paid into this round",
        ppshare:
            "The price at which each share was purchased",
        totalauth:
            "The sum total of shares authorized " +
            "to be issued",
        liquidpref:
            "The minimum return multiple each investor " +
            "is guaranteed on a liquidity event",
        partpref:
            "Allows an investor to collect their liquidation "
            + "preference AND stock on a liquidity event",
        dragalong:
            "When a majority shareholder enters a sale, " +
            "minority shareholders are also forced to sell "+
            "their shares",
        tagalong:
            "When a majority shareholder enters a sale, " +
            "minority shareholders have the right to join " +
            "the deal and sell their shares",
        optundersec:
            "The security each granted share will convert "
            + "to upon exercise",
        totalgranted:
            "The sum total of shares granted",
        price:
            "The price at which each granted share can be "
            + "purchased at when vested",
        pricewarrant:
            "The price each granted share can be purchased at",
        terms:
            "The total number of months until fully vested",
        vestingbegins:
            "Months until the vesting cliff % is vested",
        vestcliff:
            "The percentage of granted shares that are considered "
            + "vested on the cliff date",
        vestfreq:
            "The frequency that granted shares vest after the "
            + "cliff date, distributed evenly by frequency until "
            + "the vesting term ends",
        valcap:
            "The maximum pre-money valuation at which the debt "
            + "notes convert to equity",
        valcapsafe:
            "The maximum pre-money valuation at which the safe "
            + "converts to equity",
        interestrate:
            "The rate that interest accrus on this debt",
        discount:
            "The percentage discount applied upon conversion",
        term:
            "The term of the note before expiration",
        termwarrant:
            "The term of the warrant before expiration",
        common:
            "Indicates that a security is common stock",
        paripassu:
            "Liquidation proceeds are distributed in proportion "
            + "to each series’ share of preference, instead of "
            + "by seniority",
        evidence:
            "Tie documents to items in your captable",
        permissions:
            "Share just personal holdings, or the full cap table"
    }
});
