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
            docShareState: '=',
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
            modals: '=',
        },
        templateUrl: '/documents/partials/documentVersionRow.html',
        controller: DocumentVersionRowController
    };
});

app.directive('annotationList', function() {
    return {
        restrict: "EA",
        scope: {
            docId: "=",
        },
        templateUrl: "/documents/partials/annotationList.html",
        controller: ["$scope", "$element", "$rootScope", "Annotations",
            function($scope, $element, $rootScope, Annotations) {
                $scope.annotations = [];
                $scope.$watch("docId", function(new_doc_id, old_doc_id) {
                    $scope.annotations = Annotations.getDocAnnotations(new_doc_id);
                });

                // weird hack to set a property on the annotation marking it as the first on the page ...
                var currentPage = -1;
                $scope.newPage = function(annotation) {
                    if (annotation.first || currentPage != annotation.page) {
                        annotation.first = true;
                    }
                    currentPage = annotation.page;
                    return annotation.first;
                };
            }
        ],
    };
});

app.directive('annotation', function() {
    return {
        restrict: "EA",
        scope: {
            annot: "=",
            isAnnotable: "=",
            signatureprocessing: "=",
            removeannot: "&",
        },
        templateUrl: "/documents/partials/annotation.html",
        controller: annotationController
    };
});
