var ownership = angular.module('ownerFilters', []);


// Returns the rows not including unissued shares
ownership.filter('noUnissue', function () {
    return function (rows) {
        var returnrows = [];
        angular.forEach(rows, function (row) {
            if (row.editable == "yes" || row.name == "") {
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
            if (row.name != "" && row.editable != "yes") {
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

ownership.filter('maxLength', function () {
    return function (word) {
        if (word.length > 11) {
            return word.substring(0, 10);
        }
        else {
            return word;
        }
    };
});