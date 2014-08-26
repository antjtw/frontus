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
                selectCell: '=selectCell',
                selectedCell: '=selectedCell'},
        templateUrl: '/ownership/partials/editableCaptableCell.html',
        controller: ["$scope", "$rootScope",
                     "calculate", "captable", "History",
            function($scope, $rootScope, calculate, captable, history) {
                $scope.settings = $rootScope.settings;
                $scope.captable = captable;
                $scope.isDebt = captable.isDebt;
                $scope.ct = captable.getCapTable()

                $scope.loaddirective = function() {
                    $scope.destination_transaction = null;
                };
                $scope.saveIt = function(key, value) {
                    if ($scope.data) {
                        if ($scope.data.transactions.length > 1) {
                            $scope.openTranPicker(key, value);
                        } else {
                            captable.saveTransaction(
                                $scope.data.transactions[0],
                                $scope.data);
                        }
                    }
                };
                function updateAttr(key, val) {
                    if ($scope.data.transactions.length == 1) {
                        $scope.data.transactions[0].attrs[key] = val;
                    } else if ($scope.destination_transaction) {
                        $scope.destination_transaction.attrs[key] = val;
                        captable.saveTransaction(
                            $scope.destination_transaction,
                            $scope.data);
                    }
                    $scope.destination_transaction = null;
                }
                $scope.units = function(newval) {
                    if (angular.isDefined(newval)) {
                        var num = parseFloat(newval);
                        if (!$scope.data) {
                            $scope.data = $scope.selectedCell;
                        }
                        $scope.data.u = num;
                        updateAttr('units', num);

                    } else {
                        return ($scope.data ? $scope.data.u : null);
                    }
                };
                $scope.amount = function(newval) {
                    if (angular.isDefined(newval)) {
                        var num = parseFloat(newval);
                        if (!$scope.data) {
                            $scope.data = $scope.selectedCell;
                        }
                        $scope.data.a = num;
                        updateAttr('amount', num);
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
                        "diff": 0
                    };
                    angular.forEach($scope.selectedCell.transactions, function(cell) {
                        if (calculate.isNumber(cell.attrs[key])) {
                            $scope.picker.diff += parseFloat(cell.attrs[key]);
                        }
                    });
                    $scope.picker.diff = $scope.selectedCell.u - $scope.picker.diff;
                    if ($scope.picker.diff != 0) {
                        $scope.tranPicker = true;
                    }
                };
                $scope.closeTranPicker = function(update) {
                    if (update) {
                        if (!$scope.destination_transaction) {
                            $scope.destination_transaction =
                                captable.newTransaction($scope.selectedCell.security, captable.defaultKind($scope.sec.attrs['security_type']), $scope.selectedCell.investor);
                        }
                        if (calculate.isNumber($scope.destination_transaction.attrs[$scope.picker.key])) {
                            $scope.picker.diff = $scope.picker.diff + parseFloat($scope.destination_transaction.attrs[$scope.picker.key]);
                        }
                        updateAttr($scope.picker.key, $scope.picker.diff);
                    } else {
                        $scope.selectedCell.u -= $scope.picker.diff
                    }
                    $scope.picker = {};
                    $scope.tranPicker = false;
                };
                $scope.pickTran = function(id) {
                    $scope.destination_transaction = id;
                };

                // TODO working except for if there are already transactions in the cells
                $scope.numberPaste = function(ev, row, sec, type) {
                    var pastedvalues = ev.originalEvent.clipboardData.getData('text/plain');
                    var splitvalues = pastedvalues.split("\n");
                    var startindex = -1;
                    angular.forEach($scope.ct.investors, function(investor) {
                        if (investor.name == row) {
                            startindex = $scope.ct.investors.indexOf(investor)
                        }
                    });
                    var number = splitvalues.length;
                    for (var i = 0; i < number; i++) {
                        splitvalues[i] = Number(calculate.cleannumber(splitvalues[i]));
                        if (isNaN(splitvalues[i]))
                        {
                            startindex += 1;
                            break;
                        }
                        if (i == 0)
                        {
                            var anewTran = captable.newTransaction(sec.name, captable.defaultKind(sec.transactions[0].attrs.security_type), $scope.ct.investors[startindex].name);
                        }
                        else
                        {
                            var anewTran = captable.addTransaction($scope.ct.investors[startindex].name, sec.name, captable.defaultKind(sec.transactions[0].attrs.security_type));
                        }
                        anewTran.attrs[type] = splitvalues[i];
                        captable.saveTransaction(
                            anewTran,
                            true);
                        startindex += 1;
                    }
                    return false;
                };

                $scope.loaddirective();
                $scope.$watch('selectedCell', function(newval, oldval) {
                    $scope.loaddirective();
                }, true);
                $scope.$watch('data', function(newval, oldval) {
                    if (!newval && oldval)
                    {
                        $scope.selectCell(oldval.investor, oldval.security);
                    }
                }, true);
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

                $scope.loaddirective = function() {
                    $scope.captable = captable;
                    $scope.tips = displayCopy.captabletips;
                    $scope.displayAttr = captable.displayAttr;
                    $scope.currentTab = 'details';
                    $scope.actions = ["split", "grant", "exercise"];
                    $scope.switchCapTab = function(tab) {
                        $scope.currentTab = tab;
                    };
                    $scope.ct = captable.getCapTable();
                };

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
                    if (!$scope.windowToggle)
                        $scope.newTran = null;
                };
                $scope.addSecurity = function() {
                    $scope.$emit('addSecurity');
                };
                $scope.$on('newSelection', function(evt) {
                    $scope.newTran = null;
                });
                $scope.setIt = function(tran, k, v, att) {
                    if (att)
                    {
                        tran.attrs[k] = v;
                    }
                    else
                    {
                        tran[k] = v;
                    }
                    $scope.saveIt(tran);
                };
                $scope.saveIt = function(tran, cell, errorFunc) {
                    if (!$scope.sec.creating)
                    {
                        captable.saveTransaction(tran, cell, errorFunc);
                    }
                };
                $scope.editSecName = function(tran) {
                    $scope.sec.name = $scope.sec.attrs.security = tran.attrs.security;
                    captable.saveTransaction(tran);
                };
                $scope.makeNewTran = function(kind) {
                    $scope.newTran = captable.newTransaction(
                                         $scope.sec.name, kind, null);
                };
                $scope.submitAction = function(tran) {
                    captable.saveTransaction(tran, true);
                    $scope.sec.transactions.push(tran);
                    $scope.newTran = null;
                };
                $scope.$on('newSelection', function(evt) {
                    $scope.newTran = null;
                });
                $scope.loaddirective();
                $scope.$watch('sec', function(newval, oldval) {
                    $scope.loaddirective();
                }, true);
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
        controller: ["$scope", "$rootScope", "attributes", "captable", "calculate",
            function($scope, $rootScope, attributes, captable, calculate) {

                $scope.settings = $rootScope.settings;
                $scope.attrs = attributes.getAttrs();
                $scope.ct = captable.getCapTable();

                $scope.loaddirective = function() {
                    $scope.captable = captable;
                    captable.evidence_object = null;
                    $scope.windowToggle = false;
                };

                $scope.switchCapTab = function(tab) {
                    $scope.currentTab = tab;
                };
                $scope.makeNewTran = function(kind) {
                    if (kind == "convert") {
                        $scope.convertSharesUp()
                    } else {
                        $scope.newTran = captable.newTransaction(
                            $scope.cell.security,
                            kind,
                            $scope.cell.investor);
                    }
                };
                $scope.$on('newSelection', function(evt) {
                    $scope.newTran = null;
                });
                $scope.nonactions = ["issue security", "grant", "purchase"];

                $scope.addTransaction = function() {
                    var tran = captable.addTransaction($scope.cell.investor, $scope.cell.security, 
                                     captable.defaultKind($scope.cell.transactions[0].attrs.security_type));
                    tran.active = true;
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
                    $scope.ct.evidence_object = obj;
                    $scope.windowToggle = (obj ? true : false);
                    $scope.$emit('windowToggle', $scope.windowToggle);
                    if (!$scope.windowToggle)
                        $scope.newTran = null;
                };
                $scope.submitAction = function(tran) {
                    captable.saveTransaction(tran, true);
                    $scope.newTran = null;
                };

                $scope.loaddirective();
                $scope.$watch('cell', function(newval, oldval) {
                    $scope.loaddirective();
                }, true);

                // Captable Conversion Modal
                $scope.convertSharesUp = function() {
                    $scope.convertTran = {};
                    angular.forEach($scope.cell.transactions, function(tran) {
                        if (tran.active) {
                            $scope.convertTran.tran = tran;
                        }
                    });
                    $scope.convertTran.newtran = {};
                    $scope.convertTran.step = '1';
                    $scope.convertTran.date = new Date.today();
                    $scope.convertModal = true;

                    $scope.$watch('convertTran.ppshare', function(newval, oldval) {
                        if (!calculate.isNumber(newval)) {
                            $scope.convertTran.ppshare = oldval;
                        }
                    }, true);
                };

                $scope.convertSharesClose = function() {
                    $scope.convertModal = false;
                };

                $scope.convertgoto = function(number) {
                    $scope.convertTran.step = number;
                    if (number == '2') {
                        $scope.convertTran.toissue.ppshare = $scope.convertTran.toissue.attrs.ppshare;
                        $scope.convertTran.newtran = angular.copy($scope.convertTran.tran);
                        $scope.convertTran.newtran.amount = calculate.debtinterest($scope.convertTran.tran);
                        $scope.convertTran.newtran = calculate.conversion($scope.convertTran);
                    }
                };

                $scope.convertopts = {
                    backdropFade: true,
                    dialogFade: true,
                    dialogClass: 'convertModal modal'
                };

                // Filters the dropdown to only equity securities
                $scope.justEquity = function(securities) {
                    var list = [];
                    angular.forEach(securities, function(issue) {
                        if (issue.attrs.security_type == "Equity Common" || issue.attrs.security_type == "Equity Preferred") {
                            list.push(issue);
                        }
                    });
                    return list;
                };

                $scope.assignConvert = function(tran) {
                    $scope.convertTran.tran = tran;
                };

                // Performs the assignment for the dropdown selectors
                $scope.assignConvert = function(field, value) {
                    $scope.convertTran[field] = value;
                    console.log($scope.convertTran);
                    if (field == "toissue") {
                        $scope.convertTran.method = null;
                    }
                };

                // Date grabber
                $scope.dateConvert = function (evt) {
                    //Fix the dates to take into account timezone differences
                    if (evt) { // User is typing
                        if (evt != 'blur')
                            keyPressed = true;
                        var dateString = angular.element('converttrandate').val();
                        var charCode = (evt.which) ? evt.which : event.keyCode; // Get key
                        if (charCode == 13 || (evt == 'blur' && keyPressed)) { // Enter key pressed or blurred
                            var date = Date.parse(dateString);
                            if (date) {
                                $scope.convertTran.date = calculate.timezoneOffset(date);
                                keyPressed = false;
                            }
                        }
                    } else { // User is using calendar
                        if ($scope.convertTran.date instanceof Date) {
                            $scope.convertTran.date = calculate.timezoneOffset($scope.convertTran.date);
                            keyPressed = false;
                        }
                    }
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
                undo: '=undo',
                save: '=save'},
        templateUrl:
            '/ownership/partials/editableTransactionAttributes.html',
        controller: ["$rootScope","$scope", "$filter", "captable", "attributes", "calculate",
            function($rootScope, $scope, $filter, captable, attributes, calculate) {
                var attrs = attributes.getAttrs();
                var ct;
                $scope.attrs = attrs;
                $scope.loaddirective = function() {
                    ct = captable.getCapTable();
                    $scope.securities = ct.securities;
                    $scope.tran_attrs =
                        attrs[$scope.data.attrs.security_type]
                            [$scope.data.kind];
                    $scope.keys = filterSortKeys($scope.tran_attrs);
                };

                function filterSortKeys(attrs) {
                    var filtered = $filter('attrsForEdit')(attrs);
                    var sorted = Object.keys(filtered)
                            .sort(function(x1, x2) {
                                return $filter('sortAttributeTypes')(x1)
                                     - $filter('sortAttributeTypes')(x2);
                            });
                    return sorted;
                }
                
                $scope.getInvestors = function() {
                    var invs = [];
                    for (i in ct.investors)
                    {
                        invs.push(ct.investors[i].name);
                    }
                    return invs;
                }

                function key_display_info(key) {
                    //console.log("bug for some values, use below to debug");
                    //console.log($scope.data.attrs.security_type);
                    //console.log($scope.data.kind);
                    return attrs[$scope.data.attrs.security_type]
                                [$scope.data.kind][key] || {};
                }
                function inputType(key) {
                    if (key.indexOf("investor") != -1)
                    {
                        return "investor";
                    }
                    if (key.indexOf("security") != -1 &&
                            key.indexOf("type") == -1)
                    {
                        return "security";
                    }
                    switch (key_display_info(key).type)
                    {
                        case "enum":
                            return key_display_info(key).labels;
                        case "number":
                            return "number";
                        default:
                            return "text_field";
                    };
                }
                this.inputType = inputType;
                $scope.displayName = function(key) {
                    return key_display_info(key).display_name;
                };
                $scope.description = function(key) {
                    return key_display_info(key).description;
                };
                $scope.hasDescription = function(key) {
                    return $scope.description(key)!==null;
                };
                $scope.useTextField = function(key) {
                    return inputType(key) == "text_field";
                };
                $scope.useNumberField = function(key) {
                    return inputType(key) == "number";
                };
                $scope.pickInvestor = function(key) {
                    return inputType(key) == "investor";
                };
                $scope.useDropdown = function(key) {
                    return isArray(inputType(key));
                };
                var datefields = [];
                $scope.useDatePicker = function(key) {
                    return datefields.indexOf(key) >= 0
                };
                $scope.isRequired = function(key) {
                    return $filter('isRequired')($scope.data.attrs.security_type, $scope.data.kind, key);
                };
                $scope.pickIssue = function(key) {
                    return inputType(key) == "security";
                };
                $scope.setIt = function(tran, cell, errorFunc, k, v) {
                    tran.attrs[k] = v;
                    if ($scope.save)
                    {
                        captable.saveTransaction(tran, cell, errorFunc);
                    }
                };
                $scope.saveItDate = function(tran, cell, errorFunc, evt, field) {
                    if (field == "effective_date") {
                        if (evt) {
                            if (evt != 'blur')
                                keyPressed = true;
                            var dateString = angular.element(field + '#' + tran.$$hashKey).val();
                            var charCode = (evt.which) ? evt.which : event.keyCode; // Get key
                            if (charCode == 13 || (evt == 'blur' && keyPressed)) { // Enter key pressed or blurred
                                var date = Date.parse(dateString);
                                if (date) {
                                    tran[field] = calculate.timezoneOffset(date);
                                    if ($scope.save)
                                    {
                                        captable.saveTransaction(tran, cell, errorFunc);
                                    }
                                    keyPressed = false;
                                }
                            }
                        } else { // User is using calendar
                            if (tran[field] instanceof Date) {
                                tran[field] = calculate.timezoneOffset(tran[field]);
                                if ($scope.save)
                                {
                                    captable.saveTransaction(tran, cell, errorFunc);
                                }
                                keyPressed = false;
                            }
                        }
                    } else {
                        if (evt) {
                            if (evt != 'blur')
                                keyPressed = true;
                            var dateString = angular.element(field + '#' + tran.$$hashKey).val();
                            var charCode = (evt.which) ? evt.which : event.keyCode; // Get key
                            if (charCode == 13 || (evt == 'blur' && keyPressed)) { // Enter key pressed or blurred
                                var date = Date.parse(dateString);
                                if (date) {
                                    tran.attrs[field] = moment(calculate.timezoneOffset(date)).format($rootScope.settings.lowercasedate.toUpperCase());
                                    if ($scope.save)
                                    {
                                        captable.saveTransaction(tran, cell, errorFunc);
                                    }
                                    keyPressed = false;
                                }
                            }
                        } else { // User is using calendar
                            if (tran.attrs[field] instanceof Date) {
                                tran.attrs[field] = moment(calculate.timezoneOffset(tran.attrs[field])).format($rootScope.settings.lowercasedate.toUpperCase());
                                if ($scope.save)
                                {
                                    captable.saveTransaction(tran, cell, errorFunc);
                                }
                                keyPressed = false;
                            }
                        }
                    }

                };
                $scope.saveIt = function(tran, cell, errorFunc) {
                    if ($scope.save)
                    {
                        captable.saveTransaction(tran, cell, errorFunc);
                    }
                };

                $scope.loaddirective();
                $scope.$watch('data', function(newval, oldval) {
                    $scope.loaddirective();
                }, true);
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
