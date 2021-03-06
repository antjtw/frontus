'use strict';

var ownership = angular.module('ownerServices');

ownership.service('grants', ['captable', '$window', '$rootScope', 'SWBrijj', 'DocShareFactory', 'Documents',
function(captable, $window, $rootScope, SWBrijj, DocShareFactory, Documents) {
    var grantsref = this;
    var issue_name;
    var doc = {};
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

    var x, y, z;

    // if the issue object changes, set issue_name
    $rootScope.$watchCollection(function() {
        return grantsref.issue;
    }, function(new_issue) {
        if (new_issue && new_issue[0]) {
            issue_name = new_issue[0].name;
        }
    });

    $rootScope.$watch(function() {
        if (grantsref.issue[0] && grantsref.issue[0].getDocs().grant)
            return grantsref.issue[0].getDocs().grant.doc_id;
        return 0;
    }, function(new_doc) {
        if (new_doc)
        {
            doc = Documents.getOriginal(new_doc);
            doc.getPreparedFor(grantsref.docsshare.emails);
            if (y)
                y();
            if (z)
                z();
            y = $rootScope.$watchCollection(function() {
                return doc.preparedFor;
            }, function() {
                grantsref.updateUnitsFromDocs();
                y();
            });
            z = $rootScope.$watchCollection(function() {
                return doc.annotations.length;
            }, function(v) {
                if (v)
                {
                    grantsref.updateUnitsFromDocs();
                    z();
                }
            });
        }
        else
        {
            defaultUnits = 0;
            unitsOverrides = {};
            grantsref.unitsFromDocs = 0;
        }
    });

    var defaultUnits = 0;
    var unitsOverrides = {};

    this.getOptionsIssued = function(email) {
        if (unitsOverrides[email])
            return unitsOverrides[email];
        return defaultUnits;
    };

    this.unitsFromDocs = 0;

    this.updateUnitsFromDocs = function() {
        if (!doc.annotations || doc.annotations.length == 0)
        {
            defaultUnits = 0;
            unitsOverrides = {};
            grantsref.unitsFromDocs = 0;
            return;
        }

        var annot = doc.annotations.filter(function(annot) {
            return annot.whattype == "units";
        });

        if (annot.length != 1) {
            return; // document not properly prepared
        }

        var units = 0;

        if (annot[0].val)
        {
            defaultUnits = parseFloat(annot[0].val);
            units += defaultUnits * grantsref.docsshare.emails.length;
        }

        grantsref.docsshare.emails.forEach(function(investor) {
            if (doc.preparedFor[investor] && doc.preparedFor[investor].overrides[annot[0].id]) {
                units += parseFloat(doc.preparedFor[investor].overrides[annot[0].id]) - defaultUnits;
                unitsOverrides[investor] = parseFloat(doc.preparedFor[investor].overrides[annot[0].id]);
            } else {
                delete unitsOverrides[investor];
            }
        });

        grantsref.unitsFromDocs = units;
    };

    this.setIssue = function(issue) {
        this.issue.splice(0);
        if (issue)
            this.issue.push(issue);
    };


    this.isChooseReady = function() {
        if (!grantsref.issue[0] || !grantsref.issue[0].getDocs().grant || !grantsref.issue[0].getDocs().plan)
        {
            return false;
        }
        var doc = Documents.getOriginal(grantsref.issue[0].getDocs().grant.doc_id);
        if (doc) {
            return doc.validTransaction();
        } else {
            return false;
        }
    };


    this.isPeopleReady = function() {
        if (!grantsref.issue[0] || !grantsref.issue[0].getDocs().grant)
            return false;

        if (!grantsref.docsshare.emails || !grantsref.docsshare.emails.length)
            return false;

        return grantsref.docsshare.allPreparedCache();
    };
}]);
