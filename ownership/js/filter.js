'use strict';

var ownership = angular.module('ownerFilters', []);

ownership.filter('noUnissue', function () {
    return function (row) {
        return (row[0].editable !== 0 || row[0].name === "") ? row : [];
    };
});

// Returns the rows not including the selected investor
ownership.filter('otherinvestors', function () {
    return function (rows, investor) {
        var returnrows = [];
        angular.forEach(rows, function (row) {
            if (row.name !== "" && row.name != investor && row.editable == "yes") {
                returnrows.push(row);
            }
        });
        return returnrows;
    };
});

// Filters the active grant actions for exercised/forfeited
ownership.filter('grantSelect', function () {
    return function (acts, type) {
        var returnacts = [];
        angular.forEach(acts, function (act) {
            if (act.action === null || act.action == type) {
                returnacts.push(act);
            }
        });
        return returnacts;
    };
});


// Returns the list of rows that have not yet had shares
ownership.filter('shareList', function () {
    return function (rows) {
        var returnrows = [];
        console.log(rows);
        angular.forEach(rows, function (row) {
            if (row.email === null) {
                returnrows.push(row);
            }
        });
        return returnrows;
    };
});

// Returns the rows that have real values for the captable view
ownership.filter('rowviewList', function () {
    return function (rows) {
        var returnrows = [];
        angular.forEach(rows, function (row) {
            if (row.name !== "" && row.editable == "yes") {
                returnrows.push(row);
            }
        });
        return returnrows;
    };
});

// Returns the unissued rows for the captable view
ownership.filter('unissuedrowviewList', function () {
    return function (row) {
        return (row[0].name !== "" && row[0].editable === 0) ? row : [];
    };
});

// Returns the rows that have real values for the captable view
ownership.filter('issueviewList', function () {
    return function (issue) {
        var returnissues = [];
        angular.forEach(issue, function (iss) {
            if (iss.key) {
                returnissues.push(iss);
            }
        });
        return returnissues;
    };
});

// Caps the length of issue names for the righthand dropdown
ownership.filter('maxLength', function () {
    return function (word) {
        if (word) {
            if (word.length > 16) {
                return word.substring(0, 15);
            }
            else {
                return word;
            }
        }
    };
});

// Sorts the new activity feed with groups of from now
ownership.filter('fromNowSort', function () {
    return function (events) {
        if (events) {
            events.sort(function (a, b) {
                if(a[1] > b[1]) return -1;
                if(a[1] < b[1]) return 1;
                return 0;
            });
        }
        return events;
    };
});

ownership.filter('uneditIssue', function () {
    return function (word) {
        if (word) {
            if (word.length > 19) {
                return word.substring(0, 18) + "...";
            }
            else {
                return word;
            }
        }
    };
});

ownership.filter('falseCheck', function () {
    return function (word) {
        if (word === false) {
            return "No";
        }
        else return word;
    };
});

ownership.filter('nameoremail', function () {
    return function (event) {
        return (event.name) ? event.name : event.email;
    };
});

ownership.filter('icon', function() {
    return function(activity) {
        if (activity == "sent") return "icon-email";
        else if (activity == "received") return "icon-email";
        else if (activity == "viewed") return "icon-view";
        else if (activity == "reminder") return "icon-redo";
        else if (activity == "signed") return "icon-pen";
        else if (activity == "uploaded") return "icon-star";
        else if (activity == "rejected") return "icon-circle-delete";
        else if (activity == "countersigned") return "icon-countersign";
        else return "hunh?";
    };
});

ownership.filter('received', function () {
    return function (activity) {
        return (activity == "received") ? "was sent" : activity;
    };
});

ownership.filter('issueUnitLabel', function() {
    return function(iss) {
        if (iss == "Option") {
            return "options";
        } else if (iss == "Warrant") {
            return "warrants";
        } else {
            return "shares";
        }
    };
});
ownership.filter('securityUnitLabel', function() {
    return function(sec_type) {
        switch (sec_type) {
            case "Option":
                return "options";
            case "Warrant":
                return "warrants";
            default:
                return "shares";
        }
    };
});

ownership.filter('formatAmount', function($rootScope) {
    return function(amount, key) {
        var settings = $rootScope.settings;
        var nums = ["units", "forfeited", "totalauth"];
        var moneys = ["ppshare", "price", "effectivepps",
                      "valcap", "amount"];
        var currencydictionary = {'EUR': '€', 'GBP': '£', 'USD': '$'};
        var symbol = (settings &&
            currencydictionary[settings.currency]) ?
             currencydictionary[settings.currency] : '$';
        if (amount === undefined || amount === null || (typeof(amount)!="string" && isNaN(amount))) {
            amount = null;
        } else if ((key && nums.concat(moneys).indexOf(key) !== -1) || !key) {
            var n;
            if (moneys.indexOf(key) !== -1) {
                n = amount.toFixed(2).split(".");
            } else {
                n = amount.toFixed(3).split(".");
            }

            //Comma-fies the first part
            n[0] = n[0].replace(/\B(?=(\d{3})+(?!\d))/g, ",");
            // remove extraneous 0's if not money
            if (!key || moneys.indexOf(key) === -1) {
                while (n[1][n[1].length-1] === "0") { // if last character is "0"
                    n[1] = n[1].substr(0, n[1].length-1);
                }
                if (n[1] === "") {
                    n.pop(); // remove n[1]
                }
            }
            //Combines the two sections
            amount = n.join(".");

            if (settings && moneys.indexOf(key) !== -1) {
                amount = symbol + amount;
            }
        }
        return amount;
    };
});

ownership.filter('attrsForDisplay', function() {
    return function(attr) {
        var hide_attrs = ["kind", "physical",
                          "security", "security_type",
                          "transaction_from", "interestratefreq"];
        var res = {};
        angular.forEach(attr, function(val, key) {
            if (hide_attrs.indexOf(key) === -1 &&
                val != undefined &&
                val != null &&
                toString(val).length>0)
            {
                res[key] = val;
            }
        });
        return res;
    };
});

ownership.filter('attrsForEdit', function() {
    return function(attr) {
        var hide_attrs = ["kind", "physical", "investor",
                          "security", "security_type",
                          "transaction_from"];
        var res = {};
        angular.forEach(attr, function(val, key) {
            if (hide_attrs.indexOf(key) === -1)
            {
                res[key] = val;
            }
        });
        return res;
    };
});

ownership.filter('selectablesecurities', function() {
    return function(securities, key) {
        var filtered_secs = [];
        angular.forEach(securities, function(sec) {
            if (sec.name != key.attrs.security &&
                sec.attrs.security_type.indexOf('Equity') != -1)
            {
                filtered_secs.push(sec);
            }
        });
        return filtered_secs;
    };
});

ownership.filter('usedsecurities', function() {
    return function(securities, existing) {
        if (existing === undefined || existing === null || existing === []) {
            return securities;
        }
        var filtered_secs = [];
        angular.forEach(securities, function(sec) {
            if (existing.indexOf(sec.name) === -1) {
                filtered_secs.push(sec);
            }
        });
        return filtered_secs;
    };
});

ownership.filter('validActions', ['attributes', function(attributes) {
    return function(sec_type, action_type, kind) {
        //TODO (probably after deploy): get sec_type differently, get from to_security if convert, so transfer can be included
        var attrs = attributes.getAttrs();
        var nonActions = ['issue security', 'grant', 'purchase'];
        var actionsWithTransfers = ['transfer', 'exercise', 'convert'];
        var isAction = (kind) && (nonActions.indexOf(kind) == -1);
        var ret = [];
        if (isAction)
        {
            if (actionsWithTransfers.indexOf(kind) > -1)
            {
                ret.push('transfer');
            }
        }
        else
        {
            for (var a in attrs[sec_type])
            {
                if (nonActions.indexOf(a) == -1)
                {
                    if ((action_type == 'transaction') == //not xor
                            (attrs[sec_type][a].hasOwnProperty('investor') ||
                            attrs[sec_type][a].hasOwnProperty('investor_to') ||
                            attrs[sec_type][a].hasOwnProperty('investor_from')))
                        ret.push(a);
                }
            }
        }
        return ret;
    };
}]);

ownership.filter('isRequired', ['attributes', function(attributes) {
    return function(sec_type, action, key) {
        var attrs = attributes.getAttrs();
        return attrs[sec_type][action][key].required;
    };
}]);

ownership.filter('getInvestorAttributes', ['attributes', function(attributes) {
    return function() {
        return attributes.getSpecialAttrs().investor;
    };
}]);

ownership.filter('getSecurityAttributes', ['attributes', function(attributes) {
    return function() {
        return attributes.getSpecialAttrs().security;
    };
}]);

ownership.filter('attributeTypes', ['attributes', function(attributes) {
    return function(tp, sec_type) {
        var attrs = attributes.getAttrs();
        switch(tp) {
            case "security_type":
                return Object.keys(attrs);
            case "kind": // this is "transaction_type"
                return Object.keys(attrs[sec_type]);
        }
    };
}]);
ownership.filter('attributeDbTypes', function() {
    return function(tp, labels) {
        if (labels)
        {
            return "enum";
        }
        switch(tp) {
            case "varchar":
            case "text":
            case "email":
                return "string";
            case "float8":
            case "int4":
                return "number";
            case "bool":
                return "boolean";
            case "date":
                return "date";
            default:
                return tp;
        }
    };
});
ownership.filter('sortAttributeTypes', ['attributes', function(attributes) {
    var orderedAttributes = ["security",
                             "effective_date",
                             "security_type",
                             "units",
                             "amount",
                             "ppshare",
                             "optundersecurity",
                             "price",
                             "terms",
                             "vestingbegins",
                             "interestrate",
                             "interestratefreq",
                             "vestcliff",
                             "vestfreq",
                             "valcap",
                             "discount",
                             "term",
                             "valcapsafe",
                             "discount",
                             "term",
                            "liquidpref",
                            "partpref",
                            "dragalong",
                            "tagalong"];
    var attrs = attributes.getAttrs();
    return function(tp, sec_type, kind) {
        var res = orderedAttributes.indexOf(tp);
        var req = (attrs[sec_type][kind] && attrs[sec_type][kind][tp] && attrs[sec_type][kind][tp]['required']) ? 0 : 1;
        return res === -1 ? (req + 1)*orderedAttributes.length + 1 : res + req*orderedAttributes.length;
    };
}]);
ownership.filter('describeTran', function() {
    return function(tran) {
        var d = "";
        switch (tran.kind) {
            case "issue security":
                break;
            case "retire security":
                break;
            case "transfer":
                break;
            case "convert":
                break;
            case "split":
                break;
            case "grant":
                break;
            case "exercise":
                break;
            case "forfeit":
                break;
            default:
                break;
        }
        return d;
        /* TODO replace 'Transaction' accordion headers with something
         * that actually describes the transaction
         */
    };
});
// Returns only the real transactions (not the empty ones)
ownership.filter('noempty', function () {
    return function (trans) {
        var returntrans = [];
        angular.forEach(trans, function (tran) {
            if (tran.investor != null) {
                returntrans.push(tran);
            }
        });
        return returntrans;
    };
});
ownership.filter('abs', function() {
    return function(num) {
        return Math.abs(num);
    };
});
