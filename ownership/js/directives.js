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
                if (viewValue == '')
                    return null;
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
                $scope.t = ($scope.data && $scope.data.kind) ? "grant"
                                                             : "cap";
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
        controller: ["$scope", "$rootScope", "$filter",
                     "calculate", "captable", "History",
            function($scope, $rootScope, $filter, calculate, captable, history) {
                $scope.settings = $rootScope.settings;
                $scope.captable = captable;
                $scope.isDebt = captable.isDebt;
                $scope.isOption = captable.isOption;
                $scope.isWarrant = captable.isWarrant;
                $scope.ct = captable.getCapTable();

                $scope.loaddirective = function() {
                    $scope.destination_transaction = null;
                    if ($scope.data && $scope.data.transactions && $scope.data.transactions.length == 1) {
                        $scope.data.transactions[0].active = true;
                    }
                };

                $scope.saveIt = function(key, value) {
                    var data = $scope.data;
                    if (!data) {
                        data = $scope.selectedCell;
                    }
                    if (data) {
                        console.log(data);
                        if (data.transactions.length > 1) {
                            $scope.openTranPicker(key, value);
                        } else {
                            var defaultTran = captable.newTransaction(
                                    $scope.sec.name,
                                    captable.defaultKind(
                                       $scope.sec.attrs.security_type),
                                    $scope.inv);
                            var del = true;
                            if (captable.transactionsAreDifferent(
                                        data.transactions[0],
                                        defaultTran)) {
                                del = false;
                            }
                            if (!del)
                            {
                                captable.saveTransaction(data.transactions[0], true);
                            }
                        }
                    }
                };
                function updateAttr(key, val) {
                    if ($scope.data.transactions.length == 1) {
                        $scope.data.transactions[0].attrs[key] = val;
                    } else if ($scope.destination_transaction) {
                        $scope.destination_transaction.attrs[key] = val;
                        captable.saveTransaction(
                            $scope.destination_transaction, true);
                    }
                    $scope.destination_transaction = null;
                }
                $scope.units = function(newval) {
                    //console.log(newval, typeof(newval));
                    if (angular.isDefined(newval)) {
                        var num = 0;
                        if (newval !== null)
                        {
                            num = parseFloat(newval);
                        }
                        if (!$scope.data) {
                            $scope.data = $scope.selectedCell;
                        }
                        $scope.data.u = num;
                        updateAttr('units', num);

                    } else {
                        return ($scope.data ? $filter('formatAmount')($scope.data.u, 'units') : null);
                    }
                };
                $scope.amount = function(newval) {
                    if (angular.isDefined(newval)) {
                        var num = 0;
                        if (newval !== null)
                        {
                            num = parseFloat(newval);
                        }
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
                    var newVal = $scope.selectedCell[key[0]];
                    if (key == 'units')
                        captable.setCellUnits($scope.selectedCell);
                    else
                        captable.setCellAmount($scope.selectedCell);
                    $scope.picker.diff = newVal - $scope.selectedCell[key[0]];
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
/*
own.directive('grantCell', [function() {
    return {
        restrict: 'E',
        scope: {inv: '=',
                sec: '=',
                kind: '=',
                data: '='},
        templateUrl: '/ownership/partials/grantCell.html',
        controller: ["$scope", "$rootScope", "captable",
            function($scope, $rootScope, captable) {
                $scope.settings = $rootScope.settings;
            }
        ],
    };
}]);
own.directive('editableGrantCell', [function() {
    return {
        restrict: 'E',
        scope: {inv: '=',
                sec: '=',
                kind: '=',
                data: '='},
        templateUrl: '/ownership/partials/editableGrantCell.html',
        controller: ["$scope", "$rootScope", "captable",
            function($scope, $rootScope, captable) {
            }
        ],
    };
}]);
*/
own.directive('securityDetails', [function() {
    return {
        restrict: 'EA',
        scope: {
            sec: '=',

        },
        templateUrl: '/ownership/partials/securityDetails.html',
        controller: ["$scope", "displayCopy", '$location',
            function($scope, displayCopy, $location) {
                $scope.tips = displayCopy.captabletips;
                $scope.currentTab = 'details';
                $scope.switchCapTab = function(tab) {
                    $scope.currentTab = tab;
                };

                $scope.loaddirective = function() {
                    if ($scope.sec && $scope.sec.transactions && $scope.sec.transactions.length == 1) {
                        $scope.sec.transactions[0].active = true;
                    }
                };

                $scope.viewEvidence = function(ev) {
                    if (ev.doc_id !== null) {
                        $location.url('/app/documents/company-view?doc='+ev.original+'&investor='+ev.investor+'&page=1');
                    } else if (ev.original !== null) {
                        $location.url('/app/documents/company-view?doc='+ev.original+'&page=1');
                    }
                };

                $scope.loaddirective();

                $scope.$watch('sec', function(newval, oldval) {
                    $scope.loaddirective();
                }, true);
            }
        ],
    };
}]);
own.directive('editableSecurityDetails', [function() {
    return {
        restrict: 'E',
        scope: {
            sec: '=',
            currentTab: '=currenttab',
            windowToggle: '='
        },
        templateUrl: '/ownership/partials/editableSecurityDetails.html',
        controller: ["$scope", "displayCopy", "captable", "$filter", 'calculate',
            function($scope, displayCopy, captable, $filter, calculate) {
                console.log($scope.windowToggle)

                $scope.loaddirective = function() {
                    $scope.captable = captable;
                    $scope.tips = displayCopy.captabletips;
                    $scope.displayAttr = captable.displayAttr;
                    // $scope.currentTab = 'details';
                    $scope.actions = ["split", "grant", "exercise"];
                    $scope.ct = captable.getCapTable();
                };

                $scope.switchCapTab = function(tab) {
                        $scope.currentTab = tab;
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
                $scope.toggleTransaction = function() {
                    $scope.switchCapTab('details');
                    $scope.editEvidence();
                    $scope.newTran = null;
                };
                $scope.editEvidence = function(obj) {
                    $scope.ct.evidence_object = obj;
                    $scope.windowToggle = (obj ? true : false);
                    // toggle the window
                    $scope.$emit('windowToggle', $scope.windowToggle);
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

                $scope.hasActions = function(tran) {
                    var actions = $filter('validActions')(tran.attrs.security_type, 'security', tran.kind);
                    return actions.length > 0;
                };
                $scope.makeNewTran = function(kind) {
                    if (kind == "split") {
                        $scope.splitSharesUp(captable.newTransaction($scope.sec.name, kind, null));
                    } else {
                        $scope.newTran = captable.newTransaction($scope.sec.name, kind, null);
                    }
                };

                $scope.checkNewTran = function(tran) {
                    var invalid = false;
                    for (var attribute in tran.attrs) {
                        if (tran.attrs.hasOwnProperty(attribute)) {
                            if ($filter('isRequired')(tran.attrs.security_type, tran.kind, attribute) && (tran.attrs[attribute] == null  || tran.attrs[attribute].toString().length == 0)) {
                                invalid = true;
                            }
                        }
                    }
                    return invalid;
                };

                $scope.submitAction = function(tran) {
                    captable.saveTransaction(tran, true);
                    $scope.sec.transactions.push(tran);
                    $scope.newTran = null;
                };
                $scope.$on('newSelection', function(evt) {
                    $scope.newTran = null;
                });

                $scope.convertopts = {
                    backdropFade: true,
                    dialogFade: true,
                    dialogClass: 'convertModal modal'
                };

                // Captable Conversion Modal
                $scope.splitSharesUp = function(to_convert) {
                    $scope.splitIssue = angular.copy(to_convert);
                    $scope.splitIssue.name = $scope.splitIssue.attrs.security;
                    angular.forEach($scope.ct.securities, function(sec) {
                        console.log(sec);
                        if (sec.name == $scope.splitIssue.name) {
                            if (calculate.isNumber(sec.attrs.ppshare)) {
                                $scope.ppshare = sec.attrs.ppshare;
                            } else if (calculate.isNumber(sec.attrs.price)) {
                                $scope.ppshare = sec.attrs.price;
                            }

                        }
                    });
                    $scope.splitIssue.ratioa = 1;
                    $scope.splitIssue.ratiob = 1;
                    $scope.splitIssue.date = new Date.today();
                    $scope.splitModal = true;
                };

                $scope.splitSharesClose = function() {
                    $scope.splitModal = false;
                };

                // Date grabber
                var keyPressed;
                $scope.dateSplit = function (evt) {
                    //Fix the dates to take into account timezone differences
                    if (evt) { // User is typing
                        if (evt != 'blur')
                            keyPressed = true;
                        var dateString = angular.element('splitissuedate').val();
                        var charCode = (evt.which) ? evt.which : event.keyCode; // Get key
                        if (charCode == 13 || (evt == 'blur' && keyPressed)) { // Enter key pressed or blurred
                            var date = Date.parse(dateString);
                            if (date) {
                                $scope.splitIssue.effective_date = calculate.timezoneOffset(date);
                                keyPressed = false;
                            }
                        }
                    } else { // User is using calendar
                        if ($scope.splitIssue.effective_date instanceof Date) {
                            $scope.splitIssue.effective_date = calculate.timezoneOffset($scope.splitIssue.date);
                            keyPressed = false;
                        }
                    }
                };

                $scope.splitvalue = function(issue) {
                    var ratio = parseFloat(issue.ratioa) / parseFloat(issue.ratiob);
                    if (isFinite(($scope.captable.securityTotalUnits(issue) + $scope.captable.numUnissued(issue, $scope.ct.securities)) / ratio)) {
                        return (($scope.captable.securityTotalUnits(issue) + $scope.captable.numUnissued(issue, $scope.ct.securities)) / ratio);
                    }
                };

                $scope.splitppshare = function(issue, ppshare) {
                    var ratio = parseFloat(issue.ratioa) / parseFloat(issue.ratiob);
                    if (isFinite(ratio)) {
                        return (ppshare * ratio);
                    }
                };

                $scope.performSplit = function (splittran) {
                    splittran.attrs.ratio =  parseFloat(splittran.ratioa) / parseFloat(splittran.ratiob);
                    var trans = [splittran];
                    angular.forEach($scope.ct.securities, function (sec) {
                        if (sec.transactions[0].attrs['optundersecurity'] == $scope.sec.name)
                        {
                            var tmp = angular.copy(splittran);
                            tmp.attrs['security'] = sec.transactions[0].attrs['security'];
                            tmp.attrs['security_type'] = sec.transactions[0].attrs['security_type'];
                            trans.push(tmp);
                            sec.transactions.push(tmp);
                        }
                    });
                    for (var t in trans)
                    {
                        captable.saveTransaction(trans[t], true);
                    }

                    $scope.sec.transactions.push(splittran);
                };

                $scope.loaddirective();

                $scope.$watch('sec', function(newval, oldval) {
                    $scope.loaddirective();
                }, true);
            }
        ],
    };
}]);
own.directive('cellSummary', [function() {
    return {
        restrict: 'E',
        scope: {cell: '='},
        templateUrl: '/ownership/partials/cellSummary.html',
        controller: ["$scope", "captable",
            function($scope, captable) {
                $scope.grouped_entries = [];
                $scope.$watchCollection('cell.ledger_entries', function(entries) {
                    $scope.grouped_entries.splice(0);
                    entries.forEach(function(orig_entry) {
                        if (!$scope.grouped_entries.some(function(new_entry) {
                            if (orig_entry.effective_date.getFullYear() == new_entry.effective_date.getFullYear() &&
                                orig_entry.effective_date.getMonth() == new_entry.effective_date.getMonth() &&
                                orig_entry.effective_date.getDate() == new_entry.effective_date.getDate()) {
                                // sum the credits and debits (which is all we really care about)
                                new_entry.credit = parseFloat(new_entry.credit) + parseFloat(orig_entry.credit);
                                new_entry.debit = parseFloat(new_entry.debit) + parseFloat(orig_entry.debit);
                                return true; // found it, don't add orig_entry to new_arr
                            }
                            return false;
                        })) {
                            $scope.grouped_entries.push(angular.copy(orig_entry)); // copy because we may modify data on later loops
                        }
                    });
                    $scope.grouped_entries.sort(function(entryA, entryB) {
                        return entryA.effective_date - entryB.effective_date;
                    });
                });
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

                $scope.loaddirective = function() {
                    if ($scope.cell && $scope.cell.transactions && $scope.cell.transactions.length == 1) {
                        $scope.cell.transactions[0].active = true;
                    }
                };

                $scope.viewEvidence = function(ev) {
                    if (ev.doc_id !== null) {
                        $location.url('/app/documents/company-view?doc='+ev.original+'&investor='+ev.investor+'&page=1');
                    } else if (ev.original !== null) {
                        $location.url('/app/documents/company-view?doc='+ev.original+'&page=1');
                    }
                };

                $scope.hasDocuments = function(tran) {
                    return tran.evidence_data && (tran.evidence_data.length > 0);
                };

                $scope.toggleTransaction = function() {
                    $scope.switchCapTab('details');
                };

                $scope.loaddirective();
                $scope.$watch('cell', function(newval, oldval) {
                    $scope.loaddirective();
                }, true);
            }
        ],
    };
}]);
own.directive('editableCellDetails', [function() {
    return {
        restrict: 'EA',
        scope: {cell: '=',
                currentTab: '=currenttab',
                undo: '=undo',
                windowToggle: '='},
        templateUrl: '/ownership/partials/editableCellDetails.html',
        controller: ["$scope", "$rootScope", "attributes", "captable", "calculate", "$filter",
            function($scope, $rootScope, attributes, captable, calculate, $filter) {

                $scope.settings = $rootScope.settings;
                $scope.attrs = attributes.getAttrs();
                $scope.ct = captable.getCapTable();
                $scope.captable = captable;

                $scope.loaddirective = function() {
                    if ($scope.cell && $scope.cell.transactions && $scope.cell.transactions.length == 1) {
                        $scope.cell.transactions[0].active = true;
                    }
                    // captable.evidence_object = null;
                    // $scope.windowToggle = false;
                };

                $scope.switchCapTab = function(tab) {
                    $scope.currentTab = tab;
                };
                $scope.makeNewTran = function(kind, tran) {
                    if (kind == "convert") {
                        $scope.convertSharesUp(tran);
                    } else {
                        $scope.newTran = captable.newTransaction(
                            $scope.cell.security,
                            kind,
                            $scope.cell.investor);
                        if ($scope.newTran.attrs.hasOwnProperty('transaction_from'))
                        {
                            $scope.newTran.attrs.transaction_from = tran.transaction;
                        }
                    }
                };
                $scope.$on('newSelection', function(evt) {
                    $scope.newTran = null;
                });
                $scope.nonactions = ["issue security", "grant", "purchase"];

                $scope.hasActions = function(tran) {
                    var actions = $filter('validActions')(tran.attrs.security_type, 'transaction', tran.kind);
                    return actions.length > 0;
                };

                $scope.addTransaction = function() {
                    console.log("here");
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
                $scope.toggleTransaction = function() {
                    $scope.switchCapTab('details');
                    $scope.editEvidence();
                    $scope.newTran = null;
                };

                $scope.editEvidence = function(obj) {
                    $scope.ct.evidence_object = obj;
                    $scope.windowToggle = (obj ? true : false);
                    $scope.$emit('windowToggle', $scope.windowToggle);
                };

                $scope.checkNewTran = function(tran) {
                    var invalid = false;
                    for (var attribute in tran.attrs) {
                        if (tran.attrs.hasOwnProperty(attribute)) {
                            if ($filter('isRequired')(tran.attrs.security_type, tran.kind, attribute) && (tran.attrs[attribute] == null  || tran.attrs[attribute].toString().length == 0)) {
                                invalid = true;
                            }
                        }
                    }
                    return invalid;
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
                $scope.convertSharesUp = function(to_convert) {
                    $scope.convertTran = {};
                    $scope.convertTran.tran = to_convert;
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
                        $scope.convertTran.newtran = captable.newTransaction($scope.convertTran.tran.attrs.security, 'convert', $scope.convertTran.tran.attrs.investor);
                        $scope.convertTran.newtran.attrs.amount = calculate.debtinterest($scope.convertTran.tran);
                        $scope.convertTran.newtran.attrs.to_security = $scope.convertTran.toissue.attrs.security;
                        $scope.convertTran.newtran.attrs.transaction_from = $scope.convertTran.tran.transaction;
                        $scope.convertTran.newtran = calculate.conversion($scope.convertTran);
                    }
                };

                $scope.performConvert = function (convertTran) {
                    captable.saveTransaction(convertTran.newtran, true);
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
                        if (issue.attrs.security_type == "Equity Common" || issue.attrs.security_type == "Equity") {
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
        controller: ["$scope", "$rootScope", "captable", "displayCopy", "attributes", "$filter",
            function($scope, $rootScope, captable, displayCopy, attributes, $filter) {
                $scope.displayAttr = captable.displayAttr;
                $scope.tips = displayCopy.captabletips;
                $scope.hasTip = function(key) {
                    return key in $scope.tips;
                };

                var attrs = attributes.getAttrs();

                $scope.attr_info = function(key) {
                    return attrs[$scope.data.attrs.security_type]
                                [$scope.data.kind][key] || {};
                };

                $scope.loaddirective = function () {
                    $scope.keys = filterSortKeys($scope.data.attrs, $scope.data.attrs.security_type, $scope.data.kind);
                    function filterSortKeys(attrs, sec_type, kind) {
                    var filtered = $filter('attrsForDisplay')(attrs);
                    var sorted = Object.keys(filtered)
                            .sort(function(x1, x2) {
                                return $filter('sortAttributeTypes')(x1, sec_type, kind) -
                                    $filter('sortAttributeTypes')(x2, sec_type, kind);
                            });
                        return sorted;
                    }
                };
                
                $scope.toFraction = function (num) {
                    var f = new Fraction(num);
                    return f.numerator + " : " + f.denominator;
                };

                $scope.loaddirective();
                $scope.$watch('data', function(newval, oldval) {
                    $scope.loaddirective();
                }, true);
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
                    $scope.keys = filterSortKeys($scope.tran_attrs, $scope.data.attrs.security_type, $scope.data.kind);
                };

                function filterSortKeys(attrs, sec_type, kind) {
                    var filtered = $filter('attrsForEdit')(attrs);
                    var sorted = Object.keys(filtered)
                            .sort(function(x1, x2) {
                                return $filter('sortAttributeTypes')(x1, sec_type, kind) -
                                       $filter('sortAttributeTypes')(x2, sec_type, kind);
                            });
                    return sorted;
                }

                $scope.getInvestors = function() {
                    var invs = [];
                    for (var i in ct.investors)
                    {
                        invs.push(ct.investors[i].name);
                    }
                    return invs;
                };

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
                        case "boolean":
                            return "boolean";
                        case "fraction":
                        case "number":
                            return "number";
                        case "array_text":
                            return "array_text";
                        default:
                            return "text_field";
                    }
                }
                this.inputType = inputType;
                $scope.displayName = function(key) {
                    return key_display_info(key).display_name;
                };
                $scope.description = function(key) {
                    return key_display_info(key).description;
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
                $scope.useBool = function(key) {
                    return inputType(key) == "boolean";
                };
                $scope.useDropdown = function(key) {
                    return isArray(inputType(key));
                };
                $scope.isRequired = function(key) {
                    return $filter('isRequired')($scope.data.attrs.security_type, $scope.data.kind, key);
                };
                $scope.pickIssue = function(key) {
                    return inputType(key) == "security";
                };
                $scope.pickMulti = function(key) {
                    return inputType(key) == "array_text";
                };
                $scope.setIt = function(tran, cell, errorFunc, k, v) {
                    if (inputType(k) == "array_text") {
                        if (!tran.attrs[k]) {
                            tran.attrs[k] = [];
                        }
                        tran.attrs[k].push(v);
                    } else {
                        if (v === "") {
                            delete tran.attrs[k];
                        } else {
                            tran.attrs[k] = v;
                        }
                    }
                    if ($scope.save  && !(tran.kind == "issue security" && tran.attrs.security.length == 0))
                    {
                        captable.saveTransaction(tran, cell, errorFunc);
                    }
                };
                $scope.removeIt = function(tran, cell, errorFunc, k, v) {
                    if (inputType(k) == "array_text") {
                        var ix = tran.attrs[k].indexOf(v);
                        if (ix >= 0) {
                            tran.attrs[k].splice(ix, 1);
                        }
                        if (tran.attrs[k].length === 0) {
                            delete tran.attrs[k];
                        }
                    } else {
                        delete tran.attrs[k];
                    }
                    if ($scope.save  && !(tran.kind == "issue security" && tran.attrs.security.length == 0))
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
                            var charCode = (evt.which) ? evt.which : evt.keyCode; // Get key
                            if (charCode == 13 || (evt == 'blur' && keyPressed)) { // Enter key pressed or blurred
                                var date = Date.parse(dateString);
                                if (date) {
                                    tran[field] = calculate.timezoneOffset(date);
                                    if ($scope.save  && !(tran.kind == "issue security" && tran.attrs.security.length == 0))
                                    {
                                        captable.saveTransaction(tran, cell, errorFunc);
                                    }
                                    keyPressed = false;
                                }
                            }
                        } else { // User is using calendar
                            if (tran[field] instanceof Date) {
                                tran[field] = calculate.timezoneOffset(tran[field]);
                                if ($scope.save  && !(tran.kind == "issue security" && tran.attrs.security.length == 0))
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
                                    if ($scope.save  && !(tran.kind == "issue security" && tran.attrs.security.length == 0))
                                    {
                                        captable.saveTransaction(tran, cell, errorFunc);
                                    }
                                    keyPressed = false;
                                }
                            }
                        } else { // User is using calendar
                            if (tran.attrs[field] instanceof Date) {
                                tran.attrs[field] = moment(calculate.timezoneOffset(tran.attrs[field])).format($rootScope.settings.lowercasedate.toUpperCase());
                                if ($scope.save  && !(tran.kind == "issue security" && tran.attrs.security.length == 0))
                                {
                                    captable.saveTransaction(tran, cell, errorFunc);
                                }
                                keyPressed = false;
                            }
                        }
                    }

                };
                $scope.saveIt = function(tran, cell, errorFunc) {
                    if ($scope.save  && !(tran.kind == "issue security" && tran.attrs.security.length == 0))
                    {
                        captable.saveTransaction(tran, cell, errorFunc);
                    }
                };

                $scope.loaddirective();
                $scope.$watch('data', function(newval, oldval) {
                    $scope.loaddirective();
                }, true);
                var dropdowncalctime = Date.parse('1970');
                var selectablesecurities;
                $scope.getValidDropdownSecurities = function(data) {
                    if (Date.now() - dropdowncalctime > 500) { // debounce
                        dropdowncalctime = Date.now();
                        selectablesecurities = $filter('selectablesecurities')($scope.securities, data);
                    }
                    return selectablesecurities;
                };
                $scope.getValidPariSecurities = function(data, key) {
                    return $filter('usedsecurities')($scope.getValidDropdownSecurities(data), data.attrs[key]);
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
