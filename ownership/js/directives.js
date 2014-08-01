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

own.directive('captableCell', [function() {
    return {
        restrict: 'E',
        scope: {data: '='},
        templateUrl: '/ownership/partials/captableCell.html',
        controller: ["$scope", "$rootScope", "captable",
            function($scope, $rootScope, captable) {
                $scope.settings = $rootScope.settings;
                $scope.$watchCollection('data.ledger_entries',
                    function(newEntries, oldEntries) {
                        captable.setCellUnits($scope.data);
                        captable.setCellAmount($scope.data);
                    });
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
                selectCell: '=selectCell',
                selectedCell: '=selectedCell'},
        templateUrl: '/ownership/partials/editableCaptableCell.html',
        controller: ["$scope", "$rootScope", "calculate", "captable",
            function($scope, $rootScope, calculate, captable) {
                $scope.settings = $rootScope.settings;
                $scope.captable = captable;
                $scope.isDebt = captable.isDebt;
                $scope.$watchCollection('data.ledger_entries',
                    function(newEntries, oldEntries) {
                        captable.setCellUnits($scope.data);
                        captable.setCellAmount($scope.data);
                    });
                $scope.saveIt = function(value) {
                    console.log(value);
                };
                /*
                $scope.$watch('data.u', function(newUnits, oldUnits) {
                    // TODO update a transaction
                });
                $scope.$watch('data.a', function(newUnits, oldUnits) {
                    // TODO update a transaction
                });
                */
            }
        ],
    };
}]);
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
                $scope.ct = captable.getCapTable();
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
        controller: ["$scope", "$rootScope", "displayCopy", "captable",
            function($scope, $rootScope, displayCopy, captable) {
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
        controller: ["$scope", "$rootScope", "attributes", "captable",
            function($scope, $rootScope, attributes, captable) {
                $scope.settings = $rootScope.settings;
                $scope.attrs = attributes.getAttrs();
                $scope.switchCapTab = function(tab) {
                    $scope.currentTab = tab;
                };
                $scope.addTransaction = function() {
                    captable.addTran($scope.cell.investor,
                                     $scope.cell.security, 'grant');
                };
                // TODO this has to do more. 
                // OR, whatever is watching the transaction object
                // must notice the change and update tran.attrs
                // appropriately.
                $scope.setIt = function(tran, k, v) {
                    tran[k] = v;
                };
                $scope.transaction_types = function(tran) {
                    return Object.keys(
                        $scope.attrs[tran.attrs.security_type]);
                };
            }
        ],
    };
}]);
own.directive('transactionAttributes', [function() {
    return {
        restrict: 'E',
        replace: true,
        scope: {data: '='},
        templateUrl: '/ownership/partials/transactionAttributes.html',
    // TODO refactor to use attributes service
        controller: ["$scope", "$rootScope", "captable", "displayCopy",
            function($scope, $rootScope, captable, displayCopy) {
                $scope.displayAttr = captable.displayAttr;
                $scope.tips = displayCopy.captabletips;
                $scope.hasTip = function(key) {
                    return key in $scope.tips;
                };
            }
        ],
    };
}]);
own.directive('editableTransactionAttributes', [function() {
    return {
        restrict: 'E',
        replace: true,
        scope: {data: '='},
        templateUrl:
            '/ownership/partials/editableTransactionAttributes.html',
        controller: ["$scope", "$filter", "captable", "attributes",
            function($scope, $filter, captable, attributes) {
                var attrs = attributes.getAttrs();
                $scope.attrs = attrs;
                $scope.keys = function() {
                    return Object.keys(attrs[$scope.data.attrs.security_type][$scope.data.kind])
                        .sort(function(x1, x2) {
                            return $filter('sortAttributeTypes')(x1) -
                            $filter('sortAttributeTypes')(x2);
                    });
                };
                function key_display_info(key) {
                    return attrs[$scope.data.attrs.security_type]
                                [$scope.data.kind][key] || {};
                }
                function inputType(key) {
                    return key_display_info(key).input_type;
                }
                this.inputType = inputType;
                $scope.description = function(key) {
                    return key_display_info(key).description;
                };
                $scope.hasDescription = function(key) {
                    return $scope.description(key)!==null;
                };
                $scope.useTextField = function(key) {
                    return inputType(key) == "text_field";
                };
                $scope.useDropdown = function(key) {
                    return isArray(inputType(key));
                };
                $scope.saveIt = function(tran) {
                    console.log(tran);
                    captable.saveTransaction(tran);
                };
            }
        ],
    };
}]);
