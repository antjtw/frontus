//'use strict';

app.filter('fromNow', function() {
    return function(date, servertime) {
        return moment(date).from(servertime);
    };
});

app.filter('viewByPrinter', function() {
    return function(viewby) {
        if (viewby == "document") return "Document";
        else if (viewby == "name") return "Recipient";
        else return order;
    };
});

app.filter('fromNowSortandFilter', function() {
    return function(events) {
        if (events) {
            events.sort(function (a, b) {
                if (a[1] > b[1]) return -1;
                if (a[1] < b[1]) return 1;
                return 0;
            });
        }
        return events;
    };
});

app.filter('fileLength', function() {
    return function(word) {
        if (word) {
            if (word.length > 21) {
                return word.substring(0, 20) + "..";
            } else {
                return word;
            }
        }
        return '';
    };
});

app.filter('lengthLimiter', function() {
    return function(word) {
        return word && word.length > 58 ? word.substring(0, 57) + "..." : word;
    };
});

app.filter('nameoremail', function() {
    return function(person) {
        var word = person.name || person.investor;
        return word.length > 24 ? word.substring(0, 23) + "..." : word;
    };
});
app.filter('archived', function () {
    return function (versions, archive) {
        var returnrows = [];
        angular.forEach(versions, function (version) {
            if (archive || version.archived == false) {
                returnrows.push(version);
            }
        });
        return returnrows;
    };
});
