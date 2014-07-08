var roundController = function ($scope, $rootScope, $location, $parse, SWBrijj, calculate) {
    $scope.optioncollapsed = true;
    $scope.debtcollapsed = true;
    $rootScope.greypage = true;


    $scope.fields = {'premoney': 8000000, 'investment': 2000000, 'optionpool': 20};
    $scope.initialrounds = [];
    $scope.rounds = [];
    $scope.initialtotals = {};
    $scope.totals = {};

    $scope.getRounds = function() {
        var rounds = [];
        SWBrijj.tblm('ownership.company_issue').then(function (issues) {
            SWBrijj.tblm('ownership.company_transaction').then(function (trans) {
                $scope.trans = trans;
                rounds = issues;
                var existingoptions = 0;
                totals = {'units': 0, 'amount': 0};
                angular.forEach(rounds, function(round) {
                    round.units = 0;
                    round.amount = 0;
                    round.name = round.issue;
                    if (round.type == "Debt") {
                        round.convertme = false;
                        $scope.debtpresent = true;
                    }
                    angular.forEach(trans, function(tran) {
                        if (tran.issue == round.issue) {
                            round.units += tran.units;
                            round.amount += tran.amount;
                            totals.units += tran.units;
                            totals.amount += tran.amount;
                        }
                    });
                    if (!isNaN(round.totalauth)) {
                        if (round.totalauth > round.units && round.type == "Option") {
                            var unauth = (round.totalauth - round.units);
                            existingoptions += unauth;
                            totals.units += unauth;
                        }
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
            });
        });
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
            angular.forEach($scope.trans, function (tran) {
                if (round.type == "Debt" && round.issue == tran.issue && round.convertme) {
                    var actualdiscount;
                    if (!isNaN(parseFloat(tran.valcap))) {
                        actualdiscount = Math.max(tran.discount, 1 - (tran.valcap / $scope.premoney));
                    } else {
                        actualdiscount = tran.discount;
                    }
                    $scope.effectivepremoney -= (tran.amount / (1 - (actualdiscount/100)));
                    $scope.totaldebtcost += (tran.amount / (1 - (actualdiscount/100)));
                }
            });
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
            angular.forEach($scope.trans, function (tran) {
                if (round.type == "Debt" && round.issue == tran.issue && round.convertme) {
                    convertTran = {};
                    convertTran.method = "Valuation";
                    convertTran.tran = tran;
                    convertTran.newtran = tran;
                    convertTran.toissue = {};
                    convertTran.toissue.premoney = $scope.premoney;
                    convertTran.toissue.ppshare = $scope.effectiveppshare;
                    converted = calculate.conversion(convertTran);
                    round.units += converted.units;
                    $scope.totals.units += round.units;
                }
            });
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

        // Reset rounds and totals to their cap table levels
        $scope.rounds = angular.copy($scope.initialrounds);
        $scope.totals = angular.copy($scope.initialtotals);

        console.log($scope.rounds);

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

    $scope.getRounds();

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
    }

};
