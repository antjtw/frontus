'use strict';

app.filter('messageFolderFilter', ['navState', function(navState) {
    return function(threads, page) {
        if (['sent', 'received'].indexOf(page) === -1) {
            return threads;
        }
        var filtThreads = [];
        threads.forEach(function(thread) {
            if (page === "sent" && thread.sender == navState.userid) {
                filtThreads.push(thread);
            } else if (page === "received" && thread.sender != navState.userid) {
                filtThreads.push(thread);
            }
        });
        return filtThreads;
    };
}]);
