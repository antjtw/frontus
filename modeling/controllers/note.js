var noteController = function ($scope, $rootScope, $location, $parse, SWBrijj, calculate, switchval, sorting, navState) {
    if (window.innerWidth < 1024) {
        $scope.variablewidth = window.innerWidth;
    } else {
        $scope.variablewidth = 800;
    }

    $scope.addCommas = function(num) {
        var split = num.split('.');
        split[0] = split[0].replace(/(\d)(?=(\d{3})+(?!\d))/g, "$1,");
        if (split.length > 1) {
            num = split[0] + "." + split[1];
        } else {
            num = split[0];
        }
        return num
    };

    $scope.updateWindow = function (){
        if (window.innerWidth < 1024) {
            $scope.variablewidth = false;
            $scope.$apply();
            $scope.variablewidth = window.innerWidth;
            $scope.$apply();
        } else {
            $scope.variablewidth = false;
            $scope.$apply();
            $scope.variablewidth = 800;
            $scope.$apply();
        }
    };


    window.onresize = $scope.updateWindow;

    $scope.fromtran = {"liquidpref":null,"issue":"Debt","terms":null,"investor":"Ellen Orford","dragalong":null,"totalauth":null,"interestratefreq":null,"type":"Debt","date":new Date(1401768000000),"amount":"500000","debtundersec":null,"vestingbegins":null,"ppshare":null,"converted":false,"valcap":"4000000","lastupdated":new Date(1401829600758),"partpref":null,"units":null,"optundersec":null,"discount":"20","postmoney":null,"vestfreq":null,"price":null,"term":null,"premoney":null,"email":null,"tagalong":null,"company":"be7daaf65fcf.sharewave.com","vestcliff":null,"tran_id":741185637,"interestrate":null};
    $scope.convertTran = {"toissue": {}};
    $scope.fields = {"fromtranamount": $scope.fromtran.amount, "fromtranvalcap": $scope.fromtran.valcap, "fromtrandiscount": $scope.fromtran.discount, "convertTranamountsold" : "2000000", "premoney" : "6000000", "postmoney" : "8000000", "convertTranpercentsold": "25"};
    $scope.intervals = 200;
    $scope.fiddled = false;
    $scope.debttab = "one";

    $scope.resetDefaults = function() {
        $scope.fields = {"fromtranamount": "500000", "fromtranvalcap": "4000000", "fromtrandiscount": "20", "convertTranamountsold" : "2000000", "premoney" : "6000000", "postmoney" : "8000000", "convertTranpercentsold": "25"};
        $scope.conversion("start");
    };

    $scope.conversion = function(changed) {
        if (changed != "start") {
            $scope.fiddled = "true"
        }
        //Clear out commas and assign to the correct transaction fields;
        $scope.fromtran.amount = parseFloat(String($scope.fields.fromtranamount).replace(/[^0-9.]/g,''));
        $scope.fromtran.valcap = parseFloat(String($scope.fields.fromtranvalcap).replace(/[^0-9.]/g,''));
        $scope.fromtran.discount = parseFloat(String($scope.fields.fromtrandiscount).replace(/[^0-9.]/g,''));
        $scope.convertTran.percentsold = parseFloat(String($scope.fields.convertTranpercentsold).replace(/[^0-9.]/g,''));
        $scope.convertTran.amountsold = parseFloat(String($scope.fields.convertTranamountsold).replace(/[^0-9.]/g,''));
        $scope.premoney = parseFloat(String($scope.fields.premoney).replace(/[^0-9.]/g,''));
        $scope.postmoney = parseFloat(String($scope.fields.postmoney).replace(/[^0-9.]/g,''));

        if (isNaN(parseFloat($scope.fromtran.discount))) {
            $scope.fromtran.discount = 0;
        }

        //Hard code the valuation type of conversion for now.
        //TODO implement price per share conversion.
        $scope.convertTran.method = "Valuation";
        if ($scope.convertTran.method == "Valuation") {
            //Empty Graph data
            $scope.graphdatadiscount = [];
            $scope.graphdataequity = [];
            //Default ppshare to 1 we're not displaying this for now
            $scope.convertTran.toissue.ppshare = 1;

            //Default values before the loop (will allow for date changing
            $scope.convertTran.date = new Date(1401768000000);
            $scope.convertTran.tran = $scope.fromtran;
            $scope.convertTran.newtran = angular.copy($scope.fromtran);

            //Bottom limit for the range calculation
            $scope.convertTran.bottomamount = parseFloat($scope.convertTran.amountsold) - ($scope.convertTran.amountsold *0.5);
            // Work out the intervals for the graph's x axis.
            var increasing = angular.copy($scope.convertTran.bottomamount);
            var interval = parseFloat($scope.convertTran.amountsold) / $scope.intervals;
            increasing -= interval;

            if (!isNaN(parseFloat($scope.convertTran.percentsold)) && !isNaN(parseFloat($scope.convertTran.amountsold)) && $scope.debttab == "one") {
                $scope.postmoney = parseFloat($scope.convertTran.amountsold) / ($scope.convertTran.percentsold /100);
                $scope.premoney = parseFloat($scope.postmoney) - parseFloat($scope.convertTran.amountsold);
                $scope.fields.premoney = $scope.addCommas(String($scope.premoney));
            } else if (!isNaN(parseFloat($scope.premoney)) && !isNaN(parseFloat($scope.convertTran.amountsold)) && $scope.debttab == "two") {
                $scope.postmoney = parseFloat($scope.convertTran.amountsold) + parseFloat($scope.premoney);
                $scope.convertTran.percentsold = (parseFloat($scope.convertTran.amountsold) / parseFloat($scope.postmoney)) * 100;
                $scope.fields.convertTranpercentsold = $scope.addCommas(String($scope.convertTran.percentsold));
            }

            if ($scope.debttab == "one") {
                //Bottom limit for the range calculation
                $scope.convertTran.bottomamount = parseFloat($scope.convertTran.amountsold) - ($scope.convertTran.amountsold *0.5);
                // Work out the intervals for the graph's x axis.
                var increasing = angular.copy($scope.convertTran.bottomamount);
                var interval = parseFloat($scope.convertTran.amountsold) / $scope.intervals;
                increasing -= interval;
            } else {
                //Bottom limit for the range calculation
                $scope.convertTran.bottomamount = parseFloat($scope.premoney) - ($scope.premoney *0.5);
                // Work out the intervals for the graph's x axis.
                var increasing = angular.copy($scope.convertTran.bottomamount);
                var interval = parseFloat($scope.premoney) / $scope.intervals;
                increasing -= interval;
            }

            $scope.convertTran.toissue.premoney = $scope.premoney;
            $scope.convertTran.toissue.postmoney = $scope.postmoney;

            var valcaphit = false;
            var oncehit = false;
            for (var i = 0; i <= $scope.intervals; i++) {
                increasing += interval;
                var graphpointtran = angular.copy($scope.convertTran);
                if (!isNaN(parseFloat(graphpointtran.percentsold)) && !isNaN(parseFloat(graphpointtran.amountsold)) && $scope.debttab == "one") {
                    graphpointtran.amountsold = increasing;
                    graphpointtran.toissue.postmoney = parseFloat(graphpointtran.amountsold) / (parseFloat(graphpointtran.percentsold)/100);
                    graphpointtran.toissue.premoney = graphpointtran.toissue.postmoney - parseFloat(graphpointtran.amountsold);
                } else if ($scope.debttab == "two") {
                    graphpointtran.toissue.premoney = increasing;
                    graphpointtran.toissue.postmoney = increasing + parseFloat(graphpointtran.amountsold);
                }
                var convertedpoint = calculate.conversion(graphpointtran);
                var percentdiscount = parseFloat(convertedpoint.prevalcappercentage);
                if (isNaN(percentdiscount)) {
                    percentdiscount = 0;
                }
                if (percentdiscount < parseFloat($scope.fromtran.discount)) {
                    percentdiscount = parseFloat($scope.fromtran.discount);
                }
                var convalue = convertedpoint.units;
                var fixedpercentage = 0;
                if (!isNaN(parseFloat($scope.fromtran.valcap))) {
                    fixedpercentage = (((1 - (parseFloat(graphpointtran.percentsold)/100)) * parseFloat($scope.fromtran.amount)) / parseFloat($scope.fromtran.valcap));
                }
                var shiftpercentage = ((parseFloat($scope.fromtran.amount)/ (1- (parseFloat($scope.fromtran.discount) /100)))/ graphpointtran.toissue.postmoney);
                valcaphit = (fixedpercentage > shiftpercentage) && !oncehit ? true : false;
                if (valcaphit && !oncehit) {
                    oncehit = true;
                }
                var ownership = (fixedpercentage > shiftpercentage ? fixedpercentage : shiftpercentage);
                var topline = ownership * graphpointtran.toissue.postmoney;

                $scope.graphdatadiscount.push({x:increasing, y:percentdiscount, headline:convalue, postmoney: graphpointtran.toissue.postmoney,  percentage: ownership*100, hit: valcaphit, num: i});
                $scope.graphdataequity.push({x:increasing, y:ownership*100, headline:convalue, postmoney: graphpointtran.toissue.postmoney,  percentage: ownership*100, hit: valcaphit, num: i, altownership: shiftpercentage *100});
            }



            $scope.convertTran.newtran.amount = calculate.debtinterest($scope.convertTran);
            $scope.convertTran.newtran = calculate.conversion($scope.convertTran);
            var convalue = $scope.convertTran.newtran.units;
            var fixedpercentage = (((1 - (parseFloat($scope.convertTran.percentsold)/100)) * parseFloat($scope.fromtran.amount)) / parseFloat($scope.fromtran.valcap));
            var shiftpercentage = ((parseFloat($scope.fromtran.amount)/ (1- (parseFloat($scope.fromtran.discount) /100)))/ $scope.convertTran.toissue.postmoney);
            $scope.convertTran.ownership = (fixedpercentage > shiftpercentage ? fixedpercentage : shiftpercentage) * 100;
        }
    };

    $scope.conversion("start");
};