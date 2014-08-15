var own = angular.module('ownerDirectives', []);

own.directive('currency', function() {
    return {
        restrict: 'A',
        require: 'ngModel',
        link: function(scope, element, attr, ctrl) {
            ctrl.$formatters.push(function(modelValue) {
                if (!modelValue) return "";
                var r = modelValue.toString()
                    .replace(/\B(?=(?:\d{3})+(?!\d))/g, ',');
                return r;
            });
            ctrl.$parsers.push(function(viewValue) {
                var re = new RegExp(",", "g");
                var res = parseFloat(viewValue.replace(re, ''));
                return isNaN(res) ? undefined : res;
            });
        }
    };
});
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
        scope: {inv: '=',
                sec: '=',
                data: '='},
        templateUrl: '/ownership/partials/captableCell.html',
        controller: ["$scope", "$rootScope", "captable",
            function($scope, $rootScope, captable) {
                $scope.settings = $rootScope.settings;
            }
        ],
    };
}]);
own.directive('editableCaptableCell', [function() {
    return {
        restrict: 'E',
        replace: true,
        scope: {sec: '=',
                inv: '=',
                data: '=',
                validateCell: '=',
                selectCell: '=selectCell',
                selectedCell: '=selectedCell'},
        templateUrl: '/ownership/partials/editableCaptableCell.html',
        controller: ["$scope", "$rootScope",
                     "calculate", "captable", "History",
            function($scope, $rootScope, calculate, captable, history) {
                $scope.destination_transaction = null;
                $scope.settings = $rootScope.settings;
                $scope.captable = captable;
                $scope.isDebt = captable.isDebt;
                $scope.saveIt = function(value) {
                };
                function updateAttr(key, val) {
                    if ($scope.data.transactions.length == 1) {
                        $scope.data.transactions[0].attrs[key] = val;
                        captable.saveTransaction(
                                $scope.data.transactions[0],
                                $scope.data);
                    } else if ($scope.destination_transaction) {
                        // FIXME no straight update
                        // $scope.destination_transaction.attrs[key] = val;
                    } else {
                        $scope.openTranPicker(key, val);
                    }
                }
                $scope.units = function(newval) {
                    if (angular.isDefined(newval)) {
                        if (!$scope.data) {
                            console.log($scope.data);
                            console.log($scope.selectedCell);
                            console.log(captable.cellFor($scope.inv, $scope.sec));
                            alert("ahhh");
                        } else {
                            $scope.data.u = newval;
                            updateAttr('units', newval);
                        }
                    } else {
                        return ($scope.data ? $scope.data.u : null);
                    }
                };
                $scope.amount = function(newval) {
                    if (angular.isDefined(newval)) {
                        if (!$scope.data) {
                            alert("ahh");
                        } else {
                            $scope.data.a = newval;
                            updateAttr('amount', newval);
                        }
                    } else {
                        return ($scope.data ? $scope.data.a : null);
                    }
                };
                $scope.opts = {
                    backdropFade: true,
                    dialogFade: true
                };
                $scope.openTranPicker = function(key, val) {
                    $scope.picker = {
                        "key": key,
                        "val": val,
                        "history": captable.selectedCellHistory()
                    };
                    var k = key[0]; // units -> units; amount -> a
                    var hist_len = $scope.picker.history.length;
                    console.log($scope.picker.history.length);
                    $scope.picker.diff =
                        $scope.picker.history[hist_len-1][k] -
                        $scope.picker.history[hist_len-2][k];
                    $scope.tranPicker = true;
                };
                $scope.closeTranPicker = function(update) {
                    if (update) {
                        if (!$scope.destination_transaction) {
                            $scope.destination_transaction =
                                captable.newTran();
                        }
                        updateAttr($scope.picker.key, $scope.picker.val);
                    } else {
                        // reset
                    }
                    $scope.picker = {};
                    $scope.tranPicker = false;
                };
                $scope.pickTran = function(id) {
                    $scope.destination_transaction = id;
                };
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
                $scope.currentTab = 'details';
                $scope.switchCapTab = function(tab) {
                    $scope.currentTab = tab;
                };
                $scope.viewEvidence = function(ev) {
                    if (ev.doc_id !== null) {
                        $location.url('/app/documents/company-view?doc='+ev.original+'&investor='+ev.investor+'&page=1');
                    } else if (ev.original !== null) {
                        $location.url('/app/documents/company-view?doc='+ev.original+'&page=1');
                    }
                };
            }
        ],
    };
}]);
own.directive('editableSecurityDetails', [function() {
    return {
        restrict: 'E',
        scope: {
            sec: '='
        },
        templateUrl: '/ownership/partials/editableSecurityDetails.html',
        controller: ["$scope", "displayCopy", "captable",
            function($scope, displayCopy, captable) {
                $scope.captable = captable;
                $scope.tips = displayCopy.captabletips;
                $scope.displayAttr = captable.displayAttr;
                $scope.currentTab = 'details';
                $scope.actions = ["split", "grant", "exercise"];
                $scope.switchCapTab = function(tab) {
                    $scope.currentTab = tab;
                };
                $scope.ct = captable.getCapTable();
                $scope.addTransaction = function() {
                    var tran = captable.addTransaction(null, $scope.sec.name, 'split');
                    tran.active = true;
                };
                $scope.viewEvidence = function(ev) {
                    if (ev.doc_id !== null) {
                        $scope.viewme = ['investor', ev.doc_id];
                    } else if (ev.original !== null) {
                        $scope.viewme = ['issuer', ev.original];
                    }
                };
                $scope.editEvidence = function(obj) {
                    $scope.ct.evidence_object = obj;
                    $scope.windowToggle = (obj ? true : false);
                    $scope.$emit('windowToggle', $scope.windowToggle);
                };
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
        controller: ["$scope", "$rootScope", "$location",
                     "displayCopy", "captable",
            function($scope, $rootScope, $location,
                     displayCopy, captable) {
                $scope.settings = $rootScope.settings;
                $scope.tips = displayCopy.captabletips;
                $scope.currentTab = 'details';
                $scope.switchCapTab = function(tab) {
                    $scope.currentTab = tab;
                };
                $scope.viewEvidence = function(ev) {
                    if (ev.doc_id !== null) {
                        $location.url('/app/documents/company-view?doc='+ev.original+'&investor='+ev.investor+'&page=1');
                    } else if (ev.original !== null) {
                        $location.url('/app/documents/company-view?doc='+ev.original+'&page=1');
                    }
                };
            }
        ],
    };
}]);
own.directive('editableCellDetails', [function() {
    return {
        restrict: 'EA',
        scope: {cell: '=',
                currentTab: '=currenttab',
                undo: '=undo'},
        templateUrl: '/ownership/partials/editableCellDetails.html',
        controller: ["$scope", "$rootScope", "attributes", "captable",
            function($scope, $rootScope, attributes, captable) {
                $scope.captable = captable;
                var ct = captable.getCapTable();
                $scope.settings = $rootScope.settings;
                $scope.attrs = attributes.getAttrs();
                captable.evidence_object = null;
                $scope.windowToggle = false;
                $scope.switchCapTab = function(tab) {
                    $scope.currentTab = tab;
                };
                $scope.makeNewTran = function(kind) {
                    $scope.newTran = captable.newTransaction(
                                         $scope.cell.security,
                                         kind,
                                         $scope.cell.investor);
                };
                $scope.validActions = function() {
                    return ["exercise", "forfeit", "transfer"];
                };
                $scope.addTransaction = function() {
                    var tran = captable.addTransaction($scope.cell.investor,
                                     $scope.cell.security, 'grant');
                    tran.active = true;
                    // FIXME fails when this is the first transaction
                    // of the cell
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
                $scope.viewEvidence = function(ev) {
                    if (ev.doc_id !== null) {
                        $scope.viewme = ['investor', ev.doc_id];
                    } else if (ev.original !== null) {
                        $scope.viewme = ['issuer', ev.original];
                    }
                };
                $scope.editEvidence = function(obj) {
                    ct.evidence_object = obj;
                    $scope.windowToggle = (obj ? true : false);
                    $scope.$emit('windowToggle', $scope.windowToggle);
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
        scope: {data: '=',
                selected: '=selected'},
        templateUrl:
            '/ownership/partials/editableTransactionAttributes.html',
        controller: ["$scope", "$filter", "captable", "attributes",
            function($scope, $filter, captable, attributes) {
                var attrs = attributes.getAttrs();
                $scope.attrs = attrs;
                function filterSortKeys(attrs) {
                    if (!attrs.security) return null;
                    var filtered = $filter('attrsForEdit')(attrs);
                    var sorted = Object.keys(filtered)
                            .sort(function(x1, x2) {
                                return $filter('sortAttributeTypes')(x1)
                                     - $filter('sortAttributeTypes')(x2);
                            });
                    return sorted;
                }
                $scope.keys = filterSortKeys($scope.data.attrs);
                console.log("keys");
                console.log($scope.keys);
                console.log($scope.data.attrs);
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
                $scope.saveIt = function(tran, cell, errorFunc) {
                    captable.saveTransaction(tran, cell, errorFunc);
                };
            }
        ],
    };
}]);
own.directive('evidenceTable', [function() {
    return {
        restrict: 'E',
        replace: true,
        scope: {state: '='},
        templateUrl: '/ownership/partials/evidenceTable.html',
        controller: ["$scope", "captable",
            function($scope, captable) {
                $scope.captable = captable;
                $scope.eligible_evidence = 
                    captable.getEligibleEvidence();

                $scope.evidenceOrder = 'docname';
                $scope.evidenceNestedOrder = 'name';
                $scope.evidenceFilter = function(obj) {
                    var res = [];
                    if ($scope.state.evidenceQuery && obj) {
                        var items = $scope.state.evidenceQuery
                                        .split(" ");
                        angular.forEach(items, function(item) {
                            res.push(new RegExp(item, 'i'));
                        });
                    }
                    var truthiness = res.length;
                    var result = 0;
                    angular.forEach(res, function(re) {
                        if (re.test(obj.docname) || re.test(obj.tags)) {
                            result += 1;
                        }
                    });
                    return !$scope.state.evidenceQuery ||
                        truthiness == result;
                };
                $scope.toggleShown = function(obj) {
                    if (obj.shown === undefined) {
                        obj.shown = true;
                    } else {
                        obj.shown = !obj.shown;
                    }
                };
                $scope.viewEvidence = function(ev) {
                    if (ev.doc_id !== null) {
                        $scope.viewme = ['investor', ev.doc_id];
                    } else if (ev.original !== null) {
                        $scope.viewme = ['issuer', ev.original];
                    }
                };
            }
        ],
    };
}]);
