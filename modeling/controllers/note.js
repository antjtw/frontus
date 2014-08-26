app.controller('noteController',
    ['$scope', '$rootScope', '$location', '$parse', 'SWBrijj', 'calculate', 'captable',
        function($scope, $rootScope, $location, $parse, SWBrijj, calculate, captable) {

    $scope.variablewidth = 800;
    $rootScope.greypage = true;

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
        $scope.variablewidth = false;
        $scope.$apply();
        $scope.variablewidth = 800;
        $scope.$apply();
    };


    window.onresize = $scope.updateWindow;

    $scope.getNotes = function() {
        $scope.debttrans = [];
        angular.forEach($scope.ct.transactions, function(tran) {
            if (tran.attrs.security_type == 'Convertible Debt' && tran.kind == "purchase") {
                $scope.debttrans.push(tran);
            }
        });
        console.log($scope.debttrans);
    };

    $scope.ct = captable.getCapTable();

    $scope.$watch('ct', function(newval, oldval) {
        if (newval.securities.length > 0) {
            $scope.ct = angular.copy($scope.ct);
            $scope.getNotes();
        }
    }, true);

    $scope.fromtran = {"insertion_date":"2014-08-27T07:44:49.092Z","transaction":746788505,"inet":null,"attrs":{"amount":100000,"discount":20,"interestrate":null,"interestratefreq":null,"investor":"Peter","physical":false,"security":"Debt","security_type":"Convertible Debt","term":null,"units":null,"valcap":4000000},"entered_by":null,"evidence":null,"company":"2f5169a3e8b1.sharewave.com","effective_date":"2014-08-27T07:44:49.092Z","kind":"purchase","valid":true,"evidence_data":[],"active":true};
    $scope.convertTran = {"toissue": {}};
    $scope.fields = {"fromtranamount": $scope.fromtran.attrs.amount, "fromtranvalcap": $scope.fromtran.attrs.valcap, "fromtrandiscount": $scope.fromtran.attrs.discount, "convertTranamountsold" : "2000000", "premoney" : "6000000", "postmoney" : "8000000", "convertTranpercentsold": "25", "convertdate": new Date.today()};
    $scope.intervals = 200;
    $scope.fiddled = false;
    $scope.debttab = "one";
    $scope.graphtype = "Effective Discount";
    $scope.selectedNote = "Custom Note";

    $scope.resetDefaults = function() {
        $scope.fields = {"fromtranamount": "500000", "fromtranvalcap": "4000000", "fromtrandiscount": "20", "convertTranamountsold" : "2000000", "premoney" : "6000000", "postmoney" : "8000000", "convertTranpercentsold": "25"};
        $scope.conversion("start");
    };

    $scope.conversion = function(changed) {
        if (changed != "start") {
            $scope.fiddled = "true"
        }
        //Clear out commas and assign to the correct transaction fields;
        $scope.fromtran.attrs.amount = parseFloat(String($scope.fields.fromtranamount).replace(/[^0-9.]/g,''));
        $scope.fromtran.attrs.valcap = parseFloat(String($scope.fields.fromtranvalcap).replace(/[^0-9.]/g,''));
        $scope.fromtran.attrs.discount = parseFloat(String($scope.fields.fromtrandiscount).replace(/[^0-9.]/g,''));
        $scope.convertTran.percentsold = parseFloat(String($scope.fields.convertTranpercentsold).replace(/[^0-9.]/g,''));
        $scope.convertTran.amountsold = parseFloat(String($scope.fields.convertTranamountsold).replace(/[^0-9.]/g,''));
        $scope.premoney = parseFloat(String($scope.fields.premoney).replace(/[^0-9.]/g,''));
        $scope.postmoney = parseFloat(String($scope.fields.postmoney).replace(/[^0-9.]/g,''));
        $scope.convertTran.effective_date = $scope.fields.convertdate;

        if (isNaN(parseFloat($scope.fromtran.discount))) {
            $scope.fromtran.discount = 0;
        }

        $scope.convertTran.method = "Valuation";
        if ($scope.convertTran.method == "Valuation") {
            //Empty Graph data
            $scope.graphdatadiscount = [];
            $scope.graphdataequity = [];
            //Default ppshare to 1 we're not displaying this for now
            $scope.convertTran.toissue.ppshare = 1;

            //Default values before the loop
            $scope.convertTran.tran = $scope.fromtran;
            $scope.convertTran.newtran = angular.copy($scope.fromtran);
            console.log($scope.convertTran);
            $scope.convertTran.newtran.attrs.amount = calculate.debtinterest($scope.convertTran.tran);

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



            $scope.convertTran.newtran.amount = calculate.debtinterest($scope.convertTran.tran);
            $scope.convertTran.newtran = calculate.conversion($scope.convertTran);
            var convalue = $scope.convertTran.newtran.units;
            var fixedpercentage = (((1 - (parseFloat($scope.convertTran.percentsold)/100)) * parseFloat($scope.fromtran.amount)) / parseFloat($scope.fromtran.valcap));
            var shiftpercentage = ((parseFloat($scope.fromtran.amount)/ (1- (parseFloat($scope.fromtran.discount) /100)))/ $scope.convertTran.toissue.postmoney);
            $scope.convertTran.ownership = (fixedpercentage > shiftpercentage ? fixedpercentage : shiftpercentage) * 100;
        }
    };

    $scope.selectNote = function (tran) {
        if (tran == "Custom Note") {
            $scope.selectedNote = "Custom Note"
            $scope.fields.fromtranamount = $scope.addCommas("500000");
            $scope.fields.fromtranvalcap = $scope.addCommas("4000000");
            $scope.fields.fromtrandiscount = $scope.addCommas("20");
            $scope.fromtran.interestrate = null;
            $scope.fromtran.interestratefreq = null;
            $scope.fixinputs = false;
        } else {
            $scope.selectedNote = tran.investor +"'s " + tran.issue;
            $scope.fields.fromtranamount = tran.amount != null ? $scope.addCommas(String(tran.amount)) : null;
            $scope.fields.fromtranvalcap = tran.valcap != null ? $scope.addCommas(String(tran.valcap)): null;
            $scope.fields.fromtrandiscount = tran.discount != null ? $scope.addCommas(String(tran.discount)) : null;
            $scope.fromtran.interestrate = tran.interestrate;
            $scope.fromtran.interestratefreq = tran.interestratefreq;
            $scope.fromtran.date = tran.date;

            $scope.fixinputs = true;
        }
        $scope.conversion("Note");
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
                    $scope.conversion('date');
                    keyPressed = false;
                }
            }
        } else { // User is using calendar
            if (fields['convertdate'] instanceof Date) {
                $scope.fields.convertdate = calculate.timezoneOffset(fields['convertdate']);
                $scope.conversion('date');
                keyPressed = false;
            }
        }
    };

    $scope.pickGraph = function(which) {
        $scope.graphtype = which;
        if (which == "Effective Discount") {
            $scope.debttab = "one"
        } else {
            $scope.debttab = "two"
        }
    };

    $scope.currency = function () {
        return calculate.currencysymbol($scope.settings);
    };

    $scope.conversion("start");
}]);