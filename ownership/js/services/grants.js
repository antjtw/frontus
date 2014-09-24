'use strict';

var ownership = angular.module('ownerServices');

ownership.service('grants', ['captable', '$window', '$rootScope', 'SWBirjj',
function(captable, $window, $rootScope, SWBrijj) {
    var grantsref = this;
    var issue_name;
    $window.addEventListener('beforeunload', function(event) {
        sessionStorage.setItem('grants-issueName', issue_name);
    });
    issue_name = sessionStorage.getItem('grants-issueName');
    this.issue = []; // an array of 1 object to make the binding work ...
    // if the captable securities change (it loads or is refreshed), sync our security object
    $rootScope.$watchCollection(function() {
        return captable.getCapTable().securities;
    }, function(securities) {
        securities.some(function(sec) {
            if (sec.name == issue_name) {
                grantsref.setIssue(sec);
            }
        });
    });

    // if the issue object changes, set issue_name
    $rootScope.$watchCollection(function() {
        return grantsref.issue;
    }, function(new_issue) {
        if (new_issue && new_issue[0]) {
            issue_name = new_issue[0].name;
        }
    });

    this.setIssue = function(issue) {
        this.issue.splice(0);
        this.issue.push(issue);
    };
    
    this.addDocument = function(doc_id, type, label) {
        if (grantsref.issue.length != 1)
            return null;
        if (!grantsref.issue[0].transactions || !grantsref.issue[0].transactions[0].transaction)
            return null;
        return SWBrijj.procm('ownership.add_issue_document', [grantsref.issue[0].transactions[0].transaction,
            doc_id, type, label]);
    };
}]);
