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



app.directive('documentSummaryRow', function() {
    // must be used in a tbody for valid html
    return {
        restrict: "A",
        scope: {
            doc: '=',
            viewState: '=',
            modals: '='
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
            modals: '=',
            docShareState: '='
        },
        templateUrl: '/documents/partials/documentVersionRow.html',
        controller: DocumentVersionRowController
    };
});

app.directive('annotationList', [function() {
    return {
        restrict: "E",
        scope: {
            doc: "=",
            active: "=",
            prepareFor: "=",
        },
        templateUrl: "/documents/partials/annotationList.html",
        controller: ["$scope", "$element", "navState", "Annotations", "Documents",
            function($scope, $element, navState, Annotations, Documents) {
                $scope.$watch("doc", function(doc) {
                    // we want a new page_visible array for every doc
                    $scope.page_visible = [];
                });

                $scope.annotated = function(page) {
                    var ret = $scope.doc.pageAnnotated(page.page);
                    return ret;
                };

                $scope.navState = navState;
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
            prepareFor: "=",
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
                if ($scope.doc.pages) {
                    if (page != void(page)) {
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
                    } else {
                        $scope.doc.currentPage = 1;
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
                $scope.approveAction().finally(function() {
                    $scope.processing = false;
                });
            };

            $scope.reject = function(){
                $scope.processing = true;
                $scope.rejectAction({message: $scope.rejectMessage}).finally(function() {
                    $scope.processing = false;
                });
            };
        }],
    };
});

app.directive('docTransactionDetails', function() {
    return {
        restrict: 'E',
        scope: {
            doc: "=",
        },
        templateUrl: "/documents/partials/doc-transaction-details.html",
        controller: ["$scope", 'captable', function($scope, captable) {
            var defaultSelectObj = {id: 0, text: "Prepare"};
            $scope.selectedIssue = defaultSelectObj;
            $scope.select2Options = {
                data: [defaultSelectObj],
            };

            // Get the company's Issues
            $scope.issues = captable.getCapTable().securities;

            $scope.$watchCollection('issues', function(issues) {
                // set up the select box
                if (issues) {
                    $scope.select2Options.data.splice(0);
                    $scope.select2Options.data.push(defaultSelectObj);
                    issues.forEach(function(issue) {
                        if (issue.attrs.security_type) {
                            $scope.select2Options.data.push({
                                id: issue.name,
                                text: 'Add to ' + issue.name,
                                issue: issue
                            });
                        }
                    });
                    $scope.selectedIssue = defaultSelectObj;
                }
            });

            var optionFields = ['vestcliff', 'vestingbegins', 'terms', 'vestfreq', 'price'];
            $scope.optionField = function(field) {
                if (optionFields.indexOf(field.name) != -1) {
                    return true;
                }
                return false;
            };
        }],
    };
});

app.directive('docTransactionList', function() {
    return {
        restrict: 'E',
        scope: {
            trans: "="
        },
        templateUrl: "/documents/partials/doc-transaction-list.html",
        controller: ["$scope", 'calculate', '$location', function($scope, calculate, $location) {

            $scope.trans[0].active = true;

            $scope.singleTransaction = function(trans) {
                return (trans.length == 1);
            };

            $scope.gotoCaptable = function() {
                $location.url('/app/ownership/company-captable');
            };

            $scope.formatAmount = function (amount) {
                return calculate.funcformatAmount(amount);
            };

            $scope.formatDollarAmount = function(amount) {
                var output = calculate.formatMoneyAmount($scope.formatAmount(amount), $scope.settings);
                return (output);
            };

            $scope.grantbyIssue = function (tran) {
                if (tran.type == "Option") {
                    return "options";
                }
                else if (tran.type == "Warrant") {
                    return "warrants";
                }
                else {
                    return "shares";
                }
            };

        }]
    };
});
