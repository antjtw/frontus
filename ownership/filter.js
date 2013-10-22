var ownership = angular.module('ownerFilters', []);


// Returns the rows not including unissued shares
ownership.filter('noUnissue', function () {
    return function (rows) {
        var returnrows = [];
        angular.forEach(rows, function (row) {
            if (row.editable != 0 || row.name == "") {
                returnrows.push(row);
            }
        });
        return returnrows;
    };
});

// Returns the rows not including the selected investor
ownership.filter('otherinvestors', function () {
    return function (rows, investor) {
        var returnrows = [];
        angular.forEach(rows, function (row) {
            if (row.name != "" && row.name != investor) {
                returnrows.push(row);
            }
        });
        return returnrows;
    };
});


// Returns the list of rows that have not yet had shares
ownership.filter('shareList', function () {
    return function (rows) {
        var returnrows = [];
        angular.forEach(rows, function (row) {
            if (row.emailkey == null && row.name != "" && row.editable == "yes") {
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
            if (row.name != "" && row.editable == "yes") {
                returnrows.push(row);
            }
        });
        return returnrows;
    };
});

// Returns the unissued rows for the captable view
ownership.filter('unissuedrowviewList', function () {
    return function (rows) {
        var returnrows = [];
        angular.forEach(rows, function (row) {
            if (row.name != "" && row.editable == 0) {
                returnrows.push(row);
            }
        });
        return returnrows;
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
            if (word.length > 8) {
                return word.substring(0, 7);
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

        return events
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
        if (word == false) {
            return "No"
        }
        else return word;
    };
});

ownership.filter('nameoremail', function () {
    return function (event) {
        return (event.name) ? event.name : event.email;
    }
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
    }
});