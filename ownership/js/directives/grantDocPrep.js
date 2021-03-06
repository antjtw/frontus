'use strict';

function initDocInfo ($scope, grants) {
    // we can assume that grants contains an issue with grant docs that've been suitable marked up by now
    $scope.issue = grants.issue;
    var cancelIssueWatch = $scope.$watchCollection('issue', function(issue_arr) {
        if (issue_arr.length > 0) {
            cancelIssueWatch();
            // resync the docShare object
            var issue_docs = [];
            grants.issue[0].getDocs();
            var cancelDocsWatch = $scope.$watch(function() {
                return grants.issue[0].docs;
            }, function(tmp_issue_docs) {
                if (Object.keys(tmp_issue_docs).length > 0) {
                    cancelDocsWatch();
                    Object.keys(grants.issue[0].getDocs()).forEach(function(key) {
                        issue_docs.push(grants.issue[0].docs[key].doc_id);
                    });
                    // remove any existing doc to be shared that's no longer associated with the issue
                    grants.docsshare.documents.forEach(function(ds_doc) {
                        if (issue_docs.indexOf(ds_doc.doc_id) == -1) {
                            grants.docsshare.removeShareItem(ds_doc);
                        }
                    });
                    // add docs from the issue (or update, if they're already there)
                    Object.keys(grants.issue[0].docs).forEach(function(key) {
                        grants.docsshare.upsertShareItem(grants.issue[0].docs[key]);
                    });
                }
            }, true);
        }
    });

    $scope.docs = grants.docsshare.documents;
    $scope.emails = grants.docsshare.emails;
}

app.directive('grantDocPrep', [function() {
    return {
        restrict: "E",
        scope: {
        },
        templateUrl: '/ownership/partials/grantDocPrep.html',
        controller: ["$scope", "grants", "Documents", "Investor", "navState", "$rootScope", "calculate",
                     function($scope, grants, Documents, Investor, navState, $rootScope, calculate) {
            initDocInfo($scope, grants);
            $scope.doc_arr = [];
            $scope.$watchCollection('docs', function(docs) {
                docs.forEach(function(sharedoc) {
                    var doc = Documents.getOriginal(sharedoc.doc_id);
                    doc.getPreparedFor(grants.docsshare.emails); // fetch preparation information (if needed)
                    $scope.doc_arr.push(doc);
                });
                grants.updateUnitsFromDocs();
            });

            function filterInvestors(investorList, emails) {
                return investorList.filter(function(val, idx, arr) {
                    return ! emails.some(function(emval, eidx, earr) {
                        return val.id == emval;
                    });
                });
            }

            $scope.recipientSelectOptions = {
                data: function() {
                    return {
                        'results': filterInvestors(Investor.investors, grants.docsshare.emails)
                    };
                },
                placeholder: 'Add Recipient Emails',
                createSearchChoice: Investor.createSearchChoiceMultiple,
            };
            $scope.addShareEmail = function(email_input) {
                // this gets triggered multiple times with multiple types when the data changes
                if (typeof(email_input) === "string") {
                    email_input.split(/[\,, ]/).forEach(function(email) {
                        email = email.trim();
                        if (email.length < 3) {
                            // can't be an email, probably gibberish
                            return;
                        }
                        grants.docsshare.addRecipient(email).then(function(uid) {
                            // docsshare has resolved the email to a user_id for us
                            $scope.doc_arr.forEach(function(doc) {
                                // TODO: docsshare.addRecipient should probably do this, but it doesn't have actual Document objects
                                if (!doc.preparedFor[uid]) {
                                    doc.addPreparedFor(uid);
                                }
                            });
                            grants.updateUnitsFromDocs();
                        });
                    });
                }
            };
            $scope.getName = function(id) {
                return Investor.getName(id);
            };
            $scope.removeRecipient = function(id) {
                grants.docsshare.removeRecipient(id);
                grants.updateUnitsFromDocs();
            };

            $scope.bulkPrepable = function(annotation) {
                if (!annotation.forRole(navState.role) || annotation.whattype == "ImgSignature" || annotation.type == "highlight") {
                    return false;
                } else {
                    return true;
                }
            };

            $scope.updateUnitsFromDocs = function() {
                grants.updateUnitsFromDocs();
            };

            $scope.doPaste = function($event, doc, pastedEmail, annot) {
                $event.preventDefault();
                var pastedValues = $event.originalEvent.clipboardData.getData('text/plain');
                var splitValues = pastedValues.split(/[\n|\r]+/);
                for (var i = 0; i < splitValues.length; i ++) {
                    if (["int8", "int4", "float8"].indexOf(annot.type_info.typename) != -1) {
                        splitValues[i] = calculate.cleannumber(splitValues[i]);
                    } else if (["date"].indexOf(annot.type_info.typename) != -1) {
                        splitValues[i] = calculate.cleandatestr(splitValues[i]);
                    }
                }
                var found = false;
                $scope.emails.forEach(function(email) {
                    if (splitValues.length > 0 && (found || email === pastedEmail)) {
                        found = true;
                        doc.preparedFor[email].overrides[annot.id] = splitValues.shift();
                        doc.savePreparation(email);
                    }
                });
            };
        }]
    };
}]);

app.directive('grantDocReview', [function() {
    return {
        restrict: "E",
        scope: {
        },
        templateUrl: '/ownership/partials/grantDocReview.html',
        controller: ["$scope", "grants", "Investor", function($scope, grants, Investor) {
            initDocInfo($scope, grants);
            $scope.selectedEmail = "";

            $scope.showDocs = function(email) {
                if ($scope.selectedEmail == email)
                    $scope.selectedEmail = "";
                else
                    $scope.selectedEmail = email;
            };

            $scope.docsVisible = function(email) {
                return $scope.selectedEmail == email;
            };

            $scope.getName = function(id) {
                return Investor.getName(id);
            };

            $scope.getOptionsIssued = function(email) {
                return grants.getOptionsIssued(email);
            };

            $scope.encodeURIComponent = encodeURIComponent;
        }]
    };
}]);
