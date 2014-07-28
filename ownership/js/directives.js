var own = angular.module('ownerDirectives', []);

own.directive('d3Donut', ['d3', function(d3) {
    return {
        restrict: 'EA',
        scope: {
            data: "=",
            label: "@",
            onClick: "&"
        },
        link: function(scope, iElement, iAttrs) {

            var width = 960,
                height = 500,
                radius = Math.min(width, height) / 2;

            var color = d3.scale.ordinal()
                .range(["#98abc5", "#8a89a6", "#7b6888", "#6b486b",
                        "#a05d56", "#d0743c", "#ff8c00"]);

            var arc = d3.svg.arc()
                .outerRadius(radius - 10)
                .innerRadius(radius - 70);

            var pie = d3.layout.pie()
                .sort(null)
                .value(function(d) { return d.population; });

            var svg = d3.select(iElement[0])
                .attr("width", width)
                .attr("height", height)
                .append("g")
                .attr("transform",
                      "translate(" + width / 2 + "," +
                                     height / 2 + ")");

            scope.$watch('data', function(newVals, oldVals) {
                return scope.render(newVals);
            }, true);

            scope.render = function(data){

                //create the rectangles for the bar chart
                var g = svg.selectAll(".arc")
                    .data(pie(data))
                    .enter().append("g")
                    .attr("class", "arc");

                g.append("path")
                    .attr("d", arc)
                    .style("fill",
                           function(d) { return color(d.data.age); });

                g.append("text")
                    .attr("transform",
                          function(d) {
                              return "translate("+arc.centroid(d)+")";
                          })
                    .attr("dy", ".35em")
                    .style("text-anchor", "middle")
                    .text(function(d) { return d.data.age; });
            };
        }
    };
}]);

// view only
own.directive('securityDetails', [function() {
    return {
        restrict: 'EA',
        scope: {
            sec: '=',
        },
        templateUrl: '/ownership/partials/securityDetails.html',
        controller: ["$scope", "displayCopy",
            function($scope, displayCopy) {
                $scope.tips = displayCopy.captabletips;
            }
        ],
    };
}]);
own.directive('editableSecurityDetails', [function() {
    return {
        restrict: 'EA',
        scope: {
            sec: '='
        },
        templateUrl: '/ownership/partials/editableSecurityDetails.html',
        controller: ["$scope", "displayCopy", "captable",
            function($scope, displayCopy, captable) {
                $scope.tips = displayCopy.captabletips;
                $scope.transactions = $scope.sec.transaction.map(
                console.log($scope.sec);
            }
        ],
    };
}]);
own.directive('cellDetails', [function() {
    return {
        restrict: 'EA',
        scope: {cell: '=',
                currentTab: '=currenttab'},
        templateUrl: '/ownership/partials/cellDetails.html',
        controller: ["$scope", "$rootScope", "displayCopy", "calculate",
            function($scope, $rootScope, displayCopy, calculate) {
                $scope.settings = $rootScope.settings;
                $scope.tips = displayCopy.captabletips;
                $scope.switchCapTab = function(tab) {
                    $scope.currentTab = tab;
                };
            }
        ],
    };
}]);
own.directive('editableCellDetails', [function() {
    return {
        restrict: 'EA',
        scope: {cell: '=',
                currentTab: '=currenttab'},
        templateUrl: '/ownership/partials/editableCellDetails.html',
        controller: ["$scope", "$rootScope", "displayCopy",
            function($scope, $rootScope, displayCopy) {
                $scope.settings = $rootScope.settings;
                $scope.tips = displayCopy.captabletips;
                $scope.switchCapTab = function(tab) {
                    $scope.currentTab = tab;
                };
            }
        ],
    };
}]);
own.directive('captableCell', [function() {
    return {
        restrict: 'E',
        scope: {data: '='},
        templateUrl: '/ownership/partials/captableCell.html',
        controller: ["$scope", "$rootScope", "calculate",
            function($scope, $rootScope, calculate) {
                $scope.settings = $rootScope.settings;
            }
        ],
    };
}]);
own.directive('editableCaptableCell', [function() {
    return {
        restrict: 'E',
        replace: true,
        scope: {data: '=',
                editable: '=',
                selectedCell: '=selectedCell'},
        templateUrl: '/ownership/partials/editableCaptableCell.html',
        controller: ["$scope", "$rootScope", "calculate", "captable",
            function($scope, $rootScope, calculate, captable) {
                $scope.settings = $rootScope.settings;
                $scope.captable = captable;
                $scope.isDebt = captable.isDebt;
            }
        ],
    };
}]);
own.directive('transactionAttributes', [function() {
    return {
        restrict: 'E',
        replace: true,
        scope: {data: '=',
                settings: '='},
        templateUrl: '/ownership/partials/transactionAttributes.html',
        controller: ["$scope", "captable", "displayCopy",
            function($scope, captable, displayCopy) {
                $scope.displayAttr = captable.displayAttr;
                $scope.tips = displayCopy.captabletips;
                $scope.hasTip = function(key) {
                    return key in $scope.tips;
                };
            }
        ],
    };
}]);
