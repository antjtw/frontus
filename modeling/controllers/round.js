

var roundController = function ($scope, $rootScope, $location, $parse, SWBrijj, calculate, switchval, sorting, navState) {
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

                rounds.push({'issue': "Options Unissued", 'units': existingoptions});
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
                existingpercent += round.percent
            }
        });
        var optionpoolpercentage = ($scope.optionpool/100)/ (1-($scope.investment / ($scope.investment + $scope.effectivepremoney)));
        var withoutoptionsunits = Math.ceil((optionpoolpercentage/(1-optionpoolpercentage)) * (100-(existingpercent)));
        var optionscreated = withoutoptionsunits - existingpercent;
        $scope.effectivepremoney = $scope.effectivepremoney - (((optionscreated/(100+optionscreated)) * $scope.effectivepremoney));
        $scope.effectiveppshare = $scope.effectivepremoney / $scope.totals.units;
    };

    $scope.optionshuffle = function() {
        var optionpoolpercentage = ($scope.optionpool/100)/ (1-($scope.investment / ($scope.investment + $scope.premoney)));
        var withoutoptionstotals = 0;
        var existingoptions = 0;
        var existingoptionspercentage = 0;
        var withoutoptionsunits = 0;
        var optionscreated = 0;
        angular.forEach($scope.rounds, function (round) {
            if (round.issue == "Options Unissued") {
                withoutoptionstotals = $scope.totals.units - round.units;
                existingoptions = round.units;
                existingoptionspercentage = round.start_percent;
                withoutoptionsunits = Math.ceil((optionpoolpercentage/(1-optionpoolpercentage)) * withoutoptionstotals);
                optionscreated = withoutoptionsunits - existingoptions;
                $scope.totals.units += optionscreated;
                round.units +=optionscreated;
            }
        });

        angular.forEach($scope.rounds, function (round) {
            round.percent = (round.units / $scope.totals.units) * 100;
            $scope.optionrounds.push(angular.copy(round));
        });

        $scope.effectiveppshare = $scope.premoney / ($scope.totals.units);
    };

    $scope.debtconversion = function() {
        var converted, convertTran;
        $scope.lessdebt = 0;
        angular.forEach($scope.rounds, function (round) {
            angular.forEach($scope.trans, function (tran) {
                if (round.type == "Debt" && round.issue == tran.issue) {
                    var actualdiscount = Math.max(tran.discount, 1 - (tran.valcap / $scope.premoney));
                    $scope.effectivepremoney -= (round.amount / (1 - (actualdiscount/100)));
                    $scope.effectiveppshare = $scope.effectivepremoney / $scope.totals.units;
                }
            });
        });

        angular.forEach($scope.rounds, function (round) {
            angular.forEach($scope.trans, function (tran) {
                if (round.type == "Debt" && round.issue == tran.issue) {
                    convertTran = {};
                    convertTran.method = "Valuation";
                    convertTran.tran = tran;
                    convertTran.newtran = tran;
                    convertTran.toissue = {};
                    convertTran.toissue.premoney = $scope.premoney;
                    convertTran.toissue.ppshare = $scope.effectiveppshare;
                    converted = calculate.conversion(convertTran);
                    round.units += Math.ceil(converted.units);
                    $scope.totals.units += round.units;
                    $scope.lessdebt += round.units * converted.ppshare;
                }
            });
        });


        angular.forEach($scope.rounds, function (round) {
            round.percent = (round.units / $scope.totals.units) * 100;
            $scope.debtrounds.push(angular.copy(round));
        });
    };

    $scope.calculate = function() {
        $scope.premoney = parseFloat($scope.fields.premoney);
        $scope.investment = parseFloat($scope.fields.investment);
        $scope.optionpool = parseFloat($scope.fields.optionpool);
        $scope.effectivepremoney = $scope.premoney;
        $scope.effectiveppshare = $scope.effectivepremoney / $scope.totals.units;

        $scope.rounds = angular.copy($scope.initialrounds);
        $scope.totals = angular.copy($scope.initialtotals);
        $scope.optionrounds = [];
        $scope.debtrounds = [];
        $scope.finalrounds = [];

        $scope.optionpoolcost();
        $scope.debtconversion();
        $scope.optionshuffle();

        $scope.newseries = {"issue": "New Series"};
        $scope.newseries.start_percent = 0;
        $scope.newseries.final_percent = ($scope.investment / ($scope.investment + $scope.premoney)) * 100;
        $scope.newseries.units = (($scope.newseries.final_percent/100) / (1- ($scope.newseries.final_percent/100))) * $scope.totals.units;
        angular.forEach($scope.rounds, function(round) {
            round.final_percent = ((1 - ($scope.newseries.final_percent/100)) * round.percent);
            $scope.finalrounds.push(round);
        });
        $scope.finalrounds.push($scope.newseries);
    };

    $scope.getRounds();

    $scope.formatAmount = function (amount) {
        return calculate.funcformatAmount(amount);
    };

};
