'use strict';

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
