

var roundController = function ($scope, $rootScope, $location, $parse, SWBrijj, calculate, switchval, sorting, navState) {
    $scope.rounds = [];
    $scope.totals = {};
    $scope.fields = {'premoney': 8000000, 'investment': 2000000};
    $scope.finalrounds = [];

    $scope.getRounds = function() {
        var rounds = [];
        SWBrijj.tblm('ownership.company_issue').then(function (issues) {
            SWBrijj.tblm('ownership.company_transaction').then(function (trans) {
                rounds = issues;
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
                        if (round.totalauth > round.units) {
                            var unauth = (round.totalauth - round.units)
                            rounds.push({'issue': round.issue + " unissued", 'units': unauth})
                            totals.units += unauth;
                        }
                    }
                });
                angular.forEach(rounds, function(round) {
                    round.start_percent = (round.units / totals.units) * 100
                });
                $scope.rounds = rounds;
                $scope.totals = totals;
                $scope.calculate();
            });
        });
    };

    $scope.calculate = function() {
        $scope.premoney = parseFloat($scope.fields.premoney);
        $scope.investment = parseFloat($scope.fields.investment);
        $scope.effectivepremoney = $scope.premoney;

        $scope.newseries = {"issue": "New Series"};
        $scope.newseries.start_percent = 0;
        $scope.newseries.final_percent = ($scope.investment / ($scope.investment + $scope.premoney)) * 100;
        $scope.newseries.units = (($scope.newseries.final_percent/100) / (1- ($scope.newseries.final_percent/100))) * $scope.totals.units;

        angular.forEach($scope.rounds, function(round) {
            round.final_percent = ((1 - ($scope.newseries.final_percent/100)) * round.start_percent);
            $scope.finalrounds.push(round);
        });
        $scope.finalrounds.push($scope.newseries);
    };

    $scope.getRounds();

    $scope.formatAmount = function (amount) {
        return calculate.funcformatAmount(amount);
    };

};
