'use strict';

app.directive('grantIssue', [function() {
    return {
        restrict: "E",
        scope: {
            choose: "@"
        },
        templateUrl: '/ownership/partials/grantIssue.html',
        controller: ["$scope", "captable", "grants", function($scope, captable, grants) {
            // Get the company's Issues
            $scope.issues = captable.getCapTable().securities;
            $scope.selected = { // need an object to bind through ng-if
                issue: ""
            };

            $scope.issueSelectOptions = {
                data: [],
                placeholder: "Pick or create an option security",
                createSearchChoice: function(new_name) {
                    var sec = captable.nullSecurity();
                    sec.name = new_name;
                    return {
                        id: new_name,
                        text: "Create new security: " + new_name,
                        issue: sec
                    };
                }
            };

            $scope.unitsFromDocs = function() {
                return grants.unitsFromDocs;
            };

            $scope.$watchCollection('issues', function(issues) {
                // set up the select box
                if (issues) {
                    $scope.issueSelectOptions.data.splice(0);
                    captable.grantSecurities().forEach(function(issue) {
                        if (issue.attrs.security_type) {
                            $scope.issueSelectOptions.data.push({
                                id: issue.name,
                                text: issue.name,
                                issue: issue
                            });
                        }
                    });
                    if ($scope.issueSelectOptions.data.length == 1)
                    {
                        $scope.selected.issue = $scope.issueSelectOptions.data[0];
                    }
                    $scope.issueSelectOptions.data.push({id: "",
                                                    text: "Type to create a new security"});
                }
            });

            $scope.issue = grants.issue;

            $scope.$watch('selected.issue', function(new_issue, old_issue) {
                if (new_issue === null && typeof(old_issue) === "string" && old_issue !== "") {
                    // not sure why, but select2 is returning null values for new securities
                    // regardless, we can get the name out of old_issue and build a security with that
                    var new_sec = captable.newSecurity();
                    new_sec.transactions[0].attrs.security = old_issue;
                    new_sec.transactions[0].attrs.security_type = "Option";
                    captable.addSecurity(new_sec);
                    $scope.selected.issue = {
                        id: old_issue,
                        text: old_issue,
                        issue: new_sec
                    };
                    new_issue = $scope.selected.issue;
                }
                if (new_issue && typeof(new_issue) !== "string" && (!grants.issue[0] || new_issue.text !== grants.issue[0].name)) {
                    grants.setIssue(new_issue.issue);
                }
            });

            $scope.$watchCollection('issue', function(new_issue) {
                if (new_issue && new_issue[0]) {
                    $scope.selected.issue = {
                        id: new_issue[0].name,
                        text: new_issue[0].name,
                        issue: new_issue[0]
                    };
                }
            });
        }]
    };
}]);
