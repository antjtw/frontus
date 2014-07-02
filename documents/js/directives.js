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
            docId: "=",
        },
        templateUrl: "/documents/partials/annotationList.html",
        controller: ["$scope", "$element", "$rootScope", "Annotations", "Documents",
            function($scope, $element, $rootScope, Annotations, Documents) {
                $scope.annotations = [];
                $scope.$watch("docId", function(new_doc_id, old_doc_id) {
                    $scope.annotations = Annotations.getDocAnnotations(new_doc_id);
                    $scope.doc = Documents.getDoc(new_doc_id);

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
        },
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
            $scope.doc.currentPage = $scope.currentPage
            $scope.$watch('docId', function(new_doc_id) {
                $scope.doc = Documents.getDoc(new_doc_id);
                $scope.doc.currentPage = $scope.currentPage
            });
            $scope.template_original = false;
            $scope.$watch('doc.currentPage', function(page) {
                if ((page != void(page)) && $scope.doc.pages) {
                    if (page < 1) {
                        $scope.doc.currentPage = 1;
                    } else if (page > $scope.doc.pages.length) {
                        $scope.doc.currentPage = $scope.doc.pages.length;
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
        },
        transclude: true,
        templateUrl: "/documents/partials/doc-action.html",
        controller: ["$scope", function($scope) {
            $scope.rejectVerb = "Reject";
            console.log($scope.rejectable);
            console.log($scope.rejectAction);
        }],
    };
});
