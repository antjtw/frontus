'use strict';

app.directive('library', function() {
    return {
        restrict: 'A',
        link: function(scope, elm, attrs) {
            void(attrs);
            scope.listScrolls = function() {
                return elm[0].scrollHeight > elm[0].height;
            };
        }
    };
});

app.directive('myLoadingSpinner', function() {
    return {
        restrict: 'A',
        replace: true,
        transclude: true,
        scope: {processing: '=myLoadingSpinner'},
        template: '<div>' +
                      '<div ng-show="processing" class="my-loading-spinner-container"></div>' +
                      '<div ng-hide="processing" ng-transclude></div>' +
                  '</div>',
        link: function(scope, element, attrs) {
            var spinner = new Spinner().spin();
            var loadingContainer = element.find('.my-loading-spinner-container')[0];
            loadingContainer.appendChild(spinner.el);
        }
    };
});

app.directive('restrictContentEditable', function() {
    return {
        require: 'ngModel',
        link: function(scope, elm, attrs, ctrl) {
            // view -> model
            var ff = function() {
                scope.$apply(function() {
                    ctrl.$setViewValue(elm.text());
                });
                scope.$emit('updated:name');
            };

            elm.on('blur', ff);
            elm.bind("keydown keypress", function(event) {
                var allowedKeys = [8, 46, 37, 38, 39, 40, 27];
                // backspace, delete, up, down, left, right, esc
                if (event.which === 13) {
                    // key = enter
                    event.preventDefault();
                    event.currentTarget.blur();
                } else if (elm.html().length >= 58 && allowedKeys.indexOf(event.which) === -1 && !event.ctrlKey && !event.metaKey) {
                    // reached maxlength AND entered key is not allowed AND not key combination
                    event.preventDefault();
                } else if (event.which === 86 && (event.ctrlKey || event.metaKey)) {
                    // disallow paste
                    event.preventDefault();
                }
            });

            // model -> view
            ctrl.$render = function() {
                elm.text(ctrl.$viewValue);
            };

            // load init value from DOM
            ctrl.$setViewValue(elm.text());
        }
    };
});

app.directive('contenteditable', function() {
    return {
        require: 'ngModel',
        link: function(scope, elm, attrs, ctrl) {
            // view -> model
            var ff = function() {
                scope.$apply(function() {
                    ctrl.$setViewValue(elm.text());
                });
                scope.$emit('updated:name');
            };

            elm.on('blur', ff);
            elm.bind("keydown keypress", function(event) {
                if (event.which === 13) {
                    // key = enter
                    event.preventDefault();
                    event.currentTarget.blur();
                }
            });

            // model -> view
            ctrl.$render = function() {
                elm.text(ctrl.$viewValue);
            };

            // load init value from DOM
            ctrl.$setViewValue(elm.text());
        }
    };
});

app.directive('documentSummaryRow', function() {
    // must be used in a tbody for valid html
    return {
        restrict: "A",
        scope: {
            doc: '=',
            viewState: '=',
            modals: '=',
            docShareState: '='
        },
        templateUrl: '/documents/partials/documentSummaryRow.html',
        controller: DocumentSummaryRowController
    };
});

app.directive('documentVersionRow', function() {
    // must be used in a tr for valid html
    return {
        restrict: "A",
        scope: {
            version: '=',
            viewState: '=',
            type: '=',
            modals: '='
        },
        templateUrl: '/documents/partials/documentVersionRow.html',
        controller: DocumentVersionRowController
    };
});

app.directive('annotationList', ["User", function(User) {
    return {
        restrict: "E",
        scope: {
            doc: "=",
            active: "=",
        },
        templateUrl: "/documents/partials/annotationList.html",
        controller: ["$scope", "$element", "$rootScope", "Annotations", "Documents", "User",
            function($scope, $element, $rootScope, Annotations, Documents, User) {
                $scope.$watch("doc", function(doc) {
                    // we want a new page_visible array for every doc
                    $scope.page_visible = [];
                });

                $scope.annotated = function(page) {
                    var ret = $scope.doc.pageAnnotated(page.page);
                    return ret;
                };

                $scope.attributeLabel = Annotations.attributeLabel;

                $scope.user = User;
            }
        ],
    };
}]);

app.directive('helpTab', function() {
    return {
        restrict: "E",
        scope: {
            doc: "="
        },
        templateUrl: "/documents/partials/helpTab.html",
        controller: ["$scope", "$element", "$rootScope", "Annotations", "Documents", "navState",
            function($scope, $element, $rootScope, Annotations, Documents, navState) {
                $scope.invq = navState.role == "investor";
            }
        ]
    };
});

app.directive('annotation', function() {
    return {
        restrict: "E",
        scope: {
            annot: "=",
            isAnnotable: "=",
            signatureprocessing: "=",
            doc: "=",
            removeannot: "&",
            sigModalUp: "&",
            active: "=",
        },
        replace: true,
        templateUrl: "/documents/partials/annotation.html",
        controller: annotationController
    };
});

app.directive('pageControls', function() {
    return {
        restrict: "E",
        scope: {
            docId: "=",
            currentPage: "=",
        },
        templateUrl: "/documents/partials/page-controls.html",
        controller: ["$scope", "Documents", function($scope, Documents) {
            $scope.doc = Documents.getDoc($scope.docId);
            $scope.doc.currentPage = $scope.currentPage;
            $scope.$watch('docId', function(new_doc_id) {
                $scope.doc = Documents.getDoc(new_doc_id);
                $scope.doc.currentPage = $scope.currentPage;
            });
            $scope.template_original = false;
            $scope.$watch('doc.currentPage', function(page, old_page) {
                var orig = page;
                var output = page;
                // ensure it's a valid page set
                if ((page != void(page)) && $scope.doc.pages) {
                    // ensure it's within bounds
                    if (page < 1) {
                        output = 1;
                    } else if (page > $scope.doc.pages.length) {
                        output = $scope.doc.pages.length;
                    }

                    // change it only if needed
                    if (orig !== output) {
                        $scope.doc.currentPage = output;
                    }
                }
            });

        }],
    };
});

app.directive('docAction', function() {
    return {
        restrict: "E",
        scope: {
            approveAction: "&",
            approveVerb: "@",
            rejectable: "@",
            rejectAction: "&",
            upgradeWarning: "@",
            disabled: "&",
        },
        transclude: true,
        templateUrl: "/documents/partials/doc-action.html",
        controller: ["$scope", function($scope) {
            $scope.processing = false;
            $scope.rejectVerb = "Reject";

            $scope.approve = function(){
                $scope.processing = true;
                $scope.approveAction().catch(function(data) {
                    $scope.processing = false;
                });
            };

            $scope.reject = function(){
                $scope.processing = true;
                $scope.rejectAction({message: $scope.rejectMessage}).catch(function(data) {
                    $scope.processing = false;
                });
            };
        }],
    };
});

app.directive('integer', function() {
    // add number formatting to an input
    // useful when <input type="number"> can't be styled correctly
    return {
        restrict: 'A',
        require: 'ngModel',
        link: function(scope, elem, attr, ctrl) {
            // ctrl is ngModel controller
            ctrl.$parsers.unshift(function(val) {
                var ret = parseInt(val);
                if (isNaN(ret)) {
                    ret = 1;
                }
                return ret;
            });
        }
    };
});

app.directive('docTransactionDetails', function() {
    return {
        restrict: 'E',
        scope: {
            doc: "=",
        },
        templateUrl: "/documents/partials/doc-transaction-details.html",
        controller: ["$scope", 'SWBrijj', function($scope, SWBrijj) {
            var defaultSelectObj = {id: 0, text: "Prepare for signature only"};
            $scope.selectedIssue = defaultSelectObj;
            $scope.select2Options = {
                data: [defaultSelectObj],
            };

            function mungeIssue(issue) {
                // set the type of the issue appropriately (currently it's ambiguous based on type alone)
                // TODO: remove once the ownership conversion is complete
                if (issue.type == "Equity") {
                    if (issue.common) {
                        issue.type = "Equity Common";
                    } else {
                        issue.type = "Equity Preferred";
                    }
                } else if (issue.type == "Debt") {
                    issue.type = "Convertible Debt";
                }

                delete issue.common;
                return issue;
            }

            // Get the company's Issues
            // TODO: issue / cap table service
            SWBrijj.tblm('ownership.company_issue').then(function (data) {
                // convert the data in to the future format (if needed)
                data.forEach(function(issue) {
                    issue = mungeIssue(issue);
                });
                $scope.issues = data;
            });

            $scope.$watch('issues', function(issues) {
                // set up the select box
                if (issues) {
                    $scope.select2Options.data.splice(0);
                    $scope.select2Options.data.push(defaultSelectObj);
                    issues.forEach(function(issue) {
                        // TODO: filter to usable issue types
                        $scope.select2Options.data.push({
                            id: issue.issue,
                            text: 'Add to "' + issue.issue + '"',
                            issue: issue
                        });
                    });
                    $scope.selectedIssue = defaultSelectObj;
                }
            });
        }],
    };
});
