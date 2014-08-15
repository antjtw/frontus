var ownership = angular.module('ownerServices', ['decipher.history']);

ownership.service('switchval', function () {

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

ownership.service('attributes',
function(SWBrijj, $q, $filter, displayCopy) {
    // Answers the question:
    //   How do I display a fact about a transaction attribute?
    var tips = displayCopy.captabletips;
    var attrs = {};
    init();
    this.getAttrs = function() { return attrs; };
    function init() { loadAttributes().then(handleAttrs); }
    function handleAttrs(data) {
        angular.forEach(data, function(el) {
            if (!attrs[el.type])
            {
                attrs[el.type] = {};
            }
            if (!attrs[el.type][el.action])
            {
                attrs[el.type][el.action] = {};
            }
            if (!attrs[el.type][el.action][el.name])
            {
                attrs[el.type][el.action][el.name] =
                    {required: el.required,
                     display_name: el.display_name,
                     description: el.name in tips ? tips[el.name] : null,
                     type: 
                        $filter('attributeDbTypes')(el.typname, el.labels),
                     labels: el.labels,
                     input_type:
                        $filter('attributeInputTypes')(el.name)};
            }
        });
        console.log(attrs);
    }
    function loadAttributes() {
        var promise = $q.defer();
        SWBrijj.tblm('_ownership.transaction_attributes_types')
        .then(function(attrs) {
            promise.resolve(attrs);
        });
        return promise.promise;
    }
});

app.run(function ($rootScope) {

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
    $rootScope.totalVestedAction = function (investors) {
        var total = 0;
        angular.forEach(investors, function (row) {
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
        premoney:
            "The valuation before taking money in this round",
        postmoney:
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
            "The rate that interest accrues on this debt",
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
