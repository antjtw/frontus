'use strict';

var ownership = angular.module('ownerServices');

ownership.service('grants', ['captable', '$window', '$rootScope', 'SWBrijj', 'DocShareFactory', 'Documents',
function(captable, $window, $rootScope, SWBrijj, DocShareFactory, Documents) {
    var grantsref = this;
    var issue_name;
    this.docsshare = new DocShareFactory();
    $window.addEventListener('beforeunload', function(event) {
        sessionStorage.setItem('grants-issueName', issue_name);
        grantsref.docsshare.save('grantsDocs');
    });
    issue_name = sessionStorage.getItem('grants-issueName');
    this.docsshare.restore('grantsDocs');
    this.docsshare.checkAllPrepared();
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
    
    this.unitsFromDocs = 0;
    
    this.updateUnitsFromDocs = function() {
        var tmp = grantsref.issue[0].getDocs()['grant'];
        if (!tmp)
            return;
        var doc = Documents.getOriginal(tmp.doc_id);
        doc.getPreparedFor(grantsref.docsshare.emails);
        
        var annot = doc.annotations.filter(function(annot) {
            return annot.whattype == "units";
        });
        
        if (annot.length != 1)
            return; //?!?!?!?
        
        var units = 0;
        
        var common = 0;
        
        if (annot[0].val)
        {
            common = parseFloat(annot[0].val);
            units += common * grantsref.docsshare.emails.length;
        }
        
        angular.forEach(doc.preparedFor, function(investor) {
            if (investor.overrides[annot[0].id])
            {
                units += parseFloat(investor.overrides[annot[0].id]) - common;
            }
        });
        
        grantsref.unitsFromDocs = units;
    };

    this.setIssue = function(issue) {
        this.issue.splice(0);
        this.issue.push(issue);
    };
}]);
