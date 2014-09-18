app.controller('roundController',
    ['$scope', '$rootScope', '$location', '$parse', 'SWBrijj', 'calculate','captable',
        function($scope, $rootScope, $location, $parse, SWBrijj, calculate, captable) {
    $scope.optioncollapsed = true;
    $scope.debtcollapsed = true;
    $rootScope.greypage = true;

    $scope.fields = {'premoney': 8000000, 'investment': 2000000, 'optionpool': 20, 'convertdate': new Date.today()};
    $scope.initialrounds = [];
    $scope.rounds = [];
    $scope.initialtotals = {};
    $scope.totals = {};

    $scope.ct = captable.getCapTable();

    $scope.$watch('ct', function(newval, oldval) {
        if (newval.securities.length > 0) {
            $scope.ct = angular.copy($scope.ct);
            $scope.getRounds();
        }
    }, true);

    $scope.getRounds = function() {
        var existingoptions = 0;
        var rounds = angular.copy($scope.ct.securities);
        console.log($scope.ct.securities);
        totals = {'units': 0, 'amount': 0};
        angular.forEach(rounds, function(round) {
            round.units = 0;
            round.amount = 0;
            round.issue = round.name;
            if (round.attrs.security_type == "Convertible Debt") {
                round.convertme = false;
                $scope.debtpresent = true;
            }

            if (round.attrs.security_type == "Option") {
                angular.forEach($scope.ct.transactions, function(tran) {
                    if (tran.kind == "grant" && tran.attrs.security == round.name) {
                        round.units += tran.attrs.units;
                        totals.units += tran.attrs.units;
                    }
                });
                if (!isNaN(round.attrs.totalauth)) {
                    if (round.attrs.totalauth > round.units) {
                        var unauth = (captable.numUnissued(round, $scope.ct.securities));
                        console.log(unauth);
                        existingoptions += unauth;
                        totals.units += unauth;
                    }
                }
            }
            else {
                round.units += captable.securityTotalUnits(round) + captable.numUnissued(round, $scope.ct.securities);
                totals.units += captable.securityTotalUnits(round) + captable.numUnissued(round, $scope.ct.securities);
            }
        });

        rounds.push({'issue': "Options Unissued", 'name': "Options Unissued" , 'units': existingoptions});
        angular.forEach(rounds, function(round) {
            round.start_percent = (round.units / totals.units) * 100;
            round.percent = round.start_percent;
        });
        $scope.initialrounds = rounds;
        $scope.initialtotals = totals;
        $scope.calculate();
    };

    $scope.optionpoolcost = function() {
        var existingpercent = 0;
        angular.forEach($scope.rounds, function(round) {
            if (round.issue == "Options Unissued") {
                existingpercent += round.percent;
            }
        });
        $scope.optionpoolpercentage = ($scope.optionpool/100)/ (1-(($scope.investment + $scope.totaldebtcost) / ($scope.investment + $scope.premoney)));
        var withoutoptionsunits = ($scope.optionpoolpercentage/(1-$scope.optionpoolpercentage)) * (100-(existingpercent));
        var optionscreated = withoutoptionsunits - existingpercent;
        $scope.optioncost = (((optionscreated/(100+optionscreated)) * ($scope.effectivepremoney)));
        if (optionscreated > 0) {
            $scope.effectivepremoney = $scope.effectivepremoney - $scope.optioncost;
        }
    };

    $scope.debtcost = function() {
        $scope.totaldebtcost = 0;
        angular.forEach($scope.rounds, function (round) {
            if (round.attrs && round.attrs.security_type == "Convertible Debt" && round.convertme) {
                angular.forEach($scope.ct.transactions, function (tran) {
                    if (tran.kind == "purchase" && tran.attrs.security == round.name) {
                        var actualdiscount;
                        tran.convert_date = $scope.rounddate;
                        tran.interestamount = calculate.debtinterest(tran);
                        if (!isNaN(parseFloat(tran.attrs.valcap)) && tran.attrs.discount) {
                            actualdiscount = Math.max(tran.attrs.discount, (1 - (tran.attrs.valcap / $scope.premoney)) *100);
                        } else if (tran.attrs.discount) {
                            actualdiscount = tran.attrs.discount;
                        } else {
                            actualdiscount = 0;
                        }
                        if (actualdiscount > 0) {
                            $scope.effectivepremoney -= (tran.interestamount / (1 - (actualdiscount/100)));
                            $scope.totaldebtcost += (tran.interestamount / (1 - (actualdiscount/100)));
                        } else {
                            $scope.effectivepremoney -= tran.interestamount;
                            $scope.totaldebtcost += tran.interestamount;
                        }

                    }
                });
            }
        });
    };

    $scope.optionshuffle = function() {
        var withoutoptionstotals = 0;
        var existingoptions = 0;
        var withoutoptionsunits = 0;
        var optionscreated = 0;
        angular.forEach($scope.rounds, function (round) {
            if (round.issue == "Options Unissued") {
                withoutoptionstotals = $scope.totals.units - round.units;
                existingoptions = round.units;
                $scope.optionpoolpercentage = ($scope.optionpool/100)/ (1-(($scope.investment) / ($scope.investment + $scope.premoney)));
                withoutoptionsunits = ($scope.optionpoolpercentage/(1-$scope.optionpoolpercentage)) * withoutoptionstotals;
                optionscreated = withoutoptionsunits - existingoptions;
                if (optionscreated > 0) {
                    $scope.totals.units += optionscreated;
                    round.units +=optionscreated;
                }
            }
        });

        angular.forEach($scope.rounds, function (round) {
            round.percent = (round.units / $scope.totals.units) * 100;
            $scope.optionrounds.push(angular.copy(round));
        });
    };

    $scope.debtconversion = function() {
        var converted, convertTran;
        $scope.lessdebt = 0;

        angular.forEach($scope.rounds, function (round) {
            if (round.attrs && round.attrs.security_type == "Convertible Debt" && round.convertme) {
                angular.forEach($scope.ct.transactions, function (tran) {
                    if (tran.kind == "purchase" && tran.attrs.security == round.name) {
                        convertTran = {};
                        convertTran.method = "Valuation";
                        convertTran.tran = angular.copy(tran);
                        convertTran.tran.attrs.amount = tran.attrs.interestamount;
                        convertTran.newtran = tran;
                        convertTran.toissue = {};
                        convertTran.toissue.premoney = $scope.premoney;
                        convertTran.toissue.ppshare = $scope.effectiveppshare;
                        converted = calculate.conversion(convertTran);
                        round.units += converted.attrs.amount / converted.attrs.effectivepps;
                        $scope.totals.units += converted.attrs.amount / converted.attrs.effectivepps;
                    }
                });
            }
        });


        angular.forEach($scope.rounds, function (round) {
            round.percent = (round.units / $scope.totals.units) * 100;
            $scope.debtrounds.push(angular.copy(round));
        });

    };

    $scope.calculate = function() {
        // Get User Input
        $scope.premoney = parseFloat(String($scope.fields.premoney).replace(/[^0-9.]/g,''));
        $scope.investment = parseFloat(String($scope.fields.investment).replace(/[^0-9.]/g,''));
        $scope.optionpool = parseFloat(String($scope.fields.optionpool).replace(/[^0-9.]/g,''));
        $scope.rounddate = $scope.fields.convertdate;

        // Reset rounds and totals to their cap table levels
        $scope.rounds = angular.copy($scope.initialrounds);
        $scope.totals = angular.copy($scope.initialtotals);


        // Get the initial price per share and premoney
        $scope.effectivepremoney = $scope.premoney;
        $scope.effectiveppshare = $scope.effectivepremoney / $scope.totals.units;

        // Save these for the visualization
        $scope.initialeffectivepremoney = angular.copy($scope.effectivepremoney);
        $scope.initialppshare = angular.copy($scope.effectiveppshare);


        // Empty out the stages
        $scope.optionrounds = [];
        $scope.debtrounds = [];
        $scope.finalrounds = [];

        // Calculate the cost of adding debt and options
        $scope.debtcost();
        $scope.optionpoolcost();

        $scope.effectiveppshare = ($scope.effectivepremoney / $scope.totals.units);

        $scope.debtconversion();

        $scope.optionshuffle();

        $scope.newseries = {"issue": "New Series", "name": "New Series"};
        $scope.newseries.start_percent = 0;
        $scope.newseries.final_percent = ($scope.investment / ($scope.investment + $scope.premoney)) * 100;
        $scope.newseries.percent = ($scope.investment / ($scope.investment + $scope.premoney)) * 100;
        $scope.newseries.units = (($scope.newseries.final_percent/100) / (1- ($scope.newseries.final_percent/100))) * $scope.totals.units;
        var finaltotals = 0;
        angular.forEach($scope.rounds, function(round) {
            round.final_percent = ((1 - ($scope.newseries.final_percent/100)) * round.percent);
            round.percent = round.final_percent;
            $scope.finalrounds.push(round);
            finaltotals += round.units;
        });
        $scope.finalrounds.push($scope.newseries);
        finaltotals += $scope.newseries.units;
        $scope.dilution = ((finaltotals - $scope.initialtotals.units)/ $scope.initialtotals.units) * 100;
        $scope.doneround = true;
    };

    $scope.currency = function () {
        return calculate.currencysymbol($scope.settings);
    };

    $scope.formatAmount = function (amount) {
        return calculate.funcformatAmount(amount);
    };

    $scope.formatDollarAmount = function(amount) {
        var output = calculate.formatMoneyAmount($scope.formatAmount(amount), $scope.settings);
        return (output);
    };

    $scope.roundable = function() {
        return ($scope.rounds.length > 1 && !isNaN($scope.rounds[0].percent))
    };

    var keyPressed = false;
    $scope.dateconversion = function (fields, evt) {
        //Fix the dates to take into account timezone differences
        if (evt) { // User is typing
            if (evt != 'blur')
                keyPressed = true;
            var dateString = angular.element('#convertdate').val();
            var charCode = (evt.which) ? evt.which : event.keyCode; // Get key
            if (charCode == 13 || (evt == 'blur' && keyPressed)) { // Enter key pressed or blurred
                var date = Date.parse(dateString);
                if (date) {
                    $scope.fields.convertdate = calculate.timezoneOffset(date);
                    $scope.calculate();
                    keyPressed = false;
                }
            }
        } else { // User is using calendar
            if (fields['convertdate'] instanceof Date) {
                $scope.fields.convertdate = calculate.timezoneOffset(fields['convertdate']);
                $scope.calculate();
                keyPressed = false;
            }
        }
    };

}]);
