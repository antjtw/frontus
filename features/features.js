var app = angular.module('features', ['ngRoute', 'ui.bootstrap', 'nav', 'brijj', 'ownerFilters', 'ui.event',
    'ownerDirectives', 'ownerServices', '$strap.directives', 'd3', 'ui.jq'], function($routeProvider, $locationProvider){
  $locationProvider.html5Mode(true).hashPrefix('');

  $routeProvider.
      when('/features/', {
          controller: 'FeaturesCapCtrl',
          templateUrl:'/features/partials/captable.html'
      }).
      when('/features/debt', {
          controller: 'FeaturesDebtCtrl',
          templateUrl:'/features/partials/debt.html'
      }).
      when('/features/convertible-notes', {
          controller: 'FeaturesDebtCtrl',
          templateUrl:'/features/partials/debt.html'
      }).
      otherwise({redirectTo:'/features'});
});

app.controller('FeaturesCtrl', ['$rootScope', '$scope', 'SWBrijj', '$location',
    function($rootScope, $scope, SWBrijj, $location) {

    $scope.gotopage = function (link) {
        $location.url("/features/" + link);
        };
    }
]);

app.controller('FeaturesDebtCtrl', ['$rootScope', '$scope', 'SWBrijj', '$location', 'calculate', 'switchval', 'sorting', 'navState',
    function($rootScope, $scope, SWBrijj, $location, calculate, switchval, sorting, navState) {

        if (window.innerWidth < 1024) {
            $scope.variablewidth = window.innerWidth;
        } else {
            $scope.variablewidth = 760;
        }

        $rootScope.scrolled = true;
        navState.path = document.location.pathname;

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
                $scope.variablewidth = 760;
                $scope.$apply();
            }
        };


        window.onresize = $scope.updateWindow;

        $scope.gotopage = function (link) {
            $location.url("/features/" + link);
        };

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
    }
]);

app.controller('FeaturesCapCtrl', ['$rootScope', '$scope', 'SWBrijj', '$location', 'calculate', 'switchval', 'sorting', 'navState',
    function($rootScope, $scope, SWBrijj, $location, calculate, switchval, sorting, navState) {

        $scope.gotopage = function (link) {
            $location.url("/features/" + link);
        };

        $scope.clearData = function() {
            angular.forEach($scope.rows, function(row) {
                $scope.deletePerson(row.namekey);
            });
            angular.forEach($scope.rows, function(row) {
                $scope.deletePerson(row.namekey);
            });
            angular.forEach($scope.issues, function(issue) {
                $scope.deleteIssue(issue);
            });
            angular.forEach($scope.issues, function(issue) {
                $scope.deleteIssue(issue);
            });
        };

        $rootScope.scrolled = true;
        navState.path = document.location.pathname;
        console.log(navState.path);


        $scope.captabletips = {};
        $scope.captabletips.premoneyval = "The valuation before taking in money in this round";
        $scope.captabletips.postmoneyval = "The sum of the pre-money valuation and the total money paid into this round";
        $scope.captabletips.ppshare = "The price at which each share was purchased";
        $scope.captabletips.totalauth = "The sum total of shares authorized to be issued";
        $scope.captabletips.liquidpref = "The minimum return multiple each investor is guaranteed on a liquidity event";
        $scope.captabletips.partpref = "Allows an investor to collect their liquidation preference AND stock on a liquidity event";
        $scope.captabletips.dragalong = "When a majority shareholder enters a sale, minority shareholders are also forced sell their shares";
        $scope.captabletips.tagalong = "When a majority shareholder enters a sale, minority shareholders have the right to join the deal and sell their shares";
        $scope.captabletips.optundersec = "The security each granted share will convert to upon exercise";
        $scope.captabletips.totalgranted = "The sum total of shares granted";
        $scope.captabletips.price = "The price each granted share can be purchased at when vested";
        $scope.captabletips.pricewarrant = "The price each granted share can be purchased at";
        $scope.captabletips.terms = "The total number of months until fully vested";
        $scope.captabletips.vestingbegins = "Months until the vesting cliff % is vested";
        $scope.captabletips.vestcliff = "The percentage of granted shares that are considered vested on the cliff date";
        $scope.captabletips.vestfreq = "The frequency that granted shares vest after the cliff date, distributed evenly by frequency until the vesting term ends";
        $scope.captabletips.price = "The price at which each granted share can be purchased when vested";
        $scope.captabletips.valcap = "The maximum pre-money valuation at which the debt notes convert to equity";
        $scope.captabletips.valcapsafe = "The maximum pre-money valuation at which the safe converts to equity";
        $scope.captabletips.interestrate = "The rate that interest accrues on this debt";
        $scope.captabletips.discount = "The percentage discount applied upon conversion";
        $scope.captabletips.term = "The term of the note before expiration";
        $scope.captabletips.termwarrant = "The term of the warrant before expiration";
        $scope.captabletips.common = "Indicates that a security is common stock";
        $scope.captabletips.paripassu = "Liquidation proceeds are distributed in proportion to each series’ share of preference, instead of by seniority.";
        $scope.captabletips.permissions = "Share just personal holdings, or the full cap table";

        $scope.tabs = [{'title': ""}];
        $scope.issuetypes = ["Equity", "Debt", "Option", "Safe", "Warrant"];
        $scope.freqtypes = ["weekly", "bi-weekly", "monthly", "quarterly", "yearly"];
        $scope.tf = ["yes", "no"];
        $scope.liquidpref = ['None','1X','2X', '3X'];
        // Empty variables for issues
        $scope.issuekeys = [];
        $scope.issues = [];

        $scope.settings = {};

        $scope.settings.lowercasedate = 'mm/dd/yyyy';

        // Sorting variables
        $scope.issueSort = 'date';
        $scope.rowSort = '-name';

        // Empty variables for the rows and transactions
        $scope.rows = [];
        $scope.uniquerows = [];
        $scope.activeTran = [];

        $scope.sideBar = "home";

        $scope.generateCaptable = function(names) {
            for (var i = 0, l = $scope.issues.length; i < l; i++) {
                $scope.issues[i].key = $scope.issues[i].issue;
                $scope.issuekeys.push($scope.issues[i].key);
            }

            angular.forEach($scope.issues, function(issue) {
                if (issue.vestingbegins) {
                    issue.vestingbeginsdisplay = calculate.monthDiff(issue.vestingbegins,issue.date);
                }
            });

            // Uses the grants to update the transactions with forfeited values
            // Eliminates the need for further reference to forfeit grants
            angular.forEach($scope.grants, function (grant) {
                angular.forEach($scope.trans, function (tran) {
                    if (grant.tran_id == tran.tran_id) {
                        grant.investor = tran.investor;
                        if (grant.action == "forfeited") {
                            if (tran.forfeited) {
                                tran.forfeited = tran.forfeited + grant.unit;
                            }
                            else {
                                tran.forfeited = grant.unit;
                            }
                        }
                        if (grant.action == "exercised") {
                            if (tran.exercised) {
                                tran.exercised = tran.exercised + grant.unit;
                            }
                            else {
                                tran.exercised = grant.unit;
                            }
                        }
                    }
                });
            });

            angular.forEach(names, function(name) {
                $scope.rows.push({"name": name.name, "namekey": name.name, "editable": "yes"});
            });

            // Various extra key fields given to the transactions to allow for reverting at a later point
            for (var i = 0, l = $scope.trans.length; i < l; i++) {
                $scope.trans[i].key = $scope.trans[i].issue;
                $scope.trans[i].unitskey = $scope.trans[i].units;
                $scope.trans[i].paidkey = $scope.trans[i].amount;
                $scope.trans[i].datekey = $scope.trans[i]['date'].toUTCString();
                if ($scope.trans[i].vestingbegins) {
                    $scope.trans[i].vestingbeginsdisplay = calculate.monthDiff($scope.trans[i].vestingbegins,$scope.trans[i].date);
                }
                $scope.trans[i].investorkey = $scope.trans[i].investor;
                if ($scope.uniquerows.indexOf($scope.trans[i].investor) == -1) {
                    $scope.uniquerows.push($scope.trans[i].investor);
                    angular.forEach($scope.rows, function(row) {
                        if (row.namekey == $scope.trans[i].investor) {
                            row.email = $scope.trans[i].email;
                            row.emailkey = $scope.trans[i].email;
                        }
                    });
                }
                // Transactions inherit the issue values that are uneditable for individual transactions
                angular.forEach($scope.issues, function (issue) {
                    if ($scope.trans[i].issue == issue.issue) {
                        $scope.trans[i].totalauth = issue.totalauth;
                        $scope.trans[i].premoney = issue.premoney;
                        $scope.trans[i].postmoney = issue.postmoney;
                    }
                });
            }

            // Generate the rows from the transactions
            // u represents units throughout, a price
            angular.forEach($scope.trans, function (tran) {
                angular.forEach($scope.rows, function (row) {
                    if (row.name == tran.investor) {
                        if (tran.issue in row) {
                            row[tran.issue]["u"] = calculate.sum(row[tran.issue]["u"], tran.units);
                            row[tran.issue]["a"] = calculate.sum(row[tran.issue]["a"], tran.amount);
                            row[tran.issue]["ukey"] = row[tran.issue]["u"];
                            row[tran.issue]["akey"] = row[tran.issue]["a"];
                            if (!isNaN(parseFloat(tran.forfeited))) {
                                row[tran.issue]["u"] = calculate.sum(row[tran.issue]["u"], (-tran.forfeited));
                                row[tran.issue]["ukey"] = row[tran.issue]["u"];
                            }
                            if (!isNaN(parseFloat(tran.exercised))) {
                                row[tran.issue]["exercised"] = calculate.sum(row[tran.issue]["exercised"], (tran.exercised));
                            }
                        }
                        else {
                            row[tran.issue] = {};
                            row[tran.issue]["u"] = tran.units;
                            row[tran.issue]["a"] = tran.amount;
                            row[tran.issue]["ukey"] = tran.units;
                            row[tran.issue]["akey"] = tran.amount;
                            row[tran.issue]["state"] = false;
                            if (!isNaN(parseFloat(tran.forfeited))) {
                                row[tran.issue]["u"] = calculate.sum(row[tran.issue]["u"], (-tran.forfeited));
                                row[tran.issue]["ukey"] = row[tran.issue]["u"];
                            }
                            if (!isNaN(parseFloat(tran.exercised))) {
                                row[tran.issue]["exercised"] = calculate.sum(row[tran.issue]["exercised"], (tran.exercised));
                            }
                        }
                    }
                    else {
                        if (tran.issue in row) {
                        }
                        else {
                            row[tran.issue] = {"u": null, "a": null, "ukey": null, "akey": null};
                        }
                    }
                });
            });


            // Debt calculation for any rows with paid but no shares
            angular.forEach($scope.rows, function (row) {
                angular.forEach($scope.issues, function (issue) {
                    if (row[issue.issue] != undefined) {
                        if (issue.type == "Debt" && (isNaN(parseFloat(row[issue.issue]['u']))) && !isNaN(parseFloat(row[issue.issue]['a']))) {
                            row[issue.issue]['x'] = calculate.debt($scope.rows, issue, row);
                        }
                    }
                });
            });

            // Generate the unissued rows (the difference between total authorised and actually authorised)
            angular.forEach($scope.issues, function (issue) {
                $scope.rows = calculate.unissued($scope.rows, $scope.issues, String(issue.issue));
            });


            angular.forEach($scope.rows, function (row) {
                angular.forEach($scope.issuekeys, function (issuekey) {
                    if (issuekey in row) {
                    }
                    else {
                        row[issuekey] = {"u": null, "a": null, "ukey": null, "akey": null};
                    }
                });
            });

            angular.forEach($scope.rows, function(row) {
                row.startpercent = calculate.sharePercentage(row, $scope.rows, $scope.issuekeys, shareSum(row), totalShares($scope.rows))
            });


            // Sort the columns before finally showing them
            // Issues are sorted by date, rows by ownership within each issue
            $scope.issues.sort(sorting.issuedate);
            $scope.issuekeys = sorting.issuekeys($scope.issuekeys, $scope.issues);
            $scope.rows.sort(sorting.basicrow());

            do
            {
                var values = {"name": "", "editable": "0"};
                angular.forEach($scope.issuekeys, function (key) {
                    values[key] = {"u": null, "a": null, "ukey": null, "akey": null};
                });
                $scope.rows.push(values);
            }
            while ($scope.rows.length < 5);

            // Add extra blank issue, which will create a new one when clicked. Silly future date so that
            // the issue always appears on the rightmost side of the table
            $scope.issues.push({"name": "", "date": new Date(2100, 1, 1)});

            $scope.finishedsorting = true;
        };

        $scope.formatAmount = function (amount) {
            return calculate.funcformatAmount(amount);
        };

        $scope.toggleCommon = function(issue) {
            issue.common = issue.common && issue.type == 'Equity' ? false : true;
            $scope.saveIssue(issue);
        };

        // Total Shares for a shareholder row
        var shareSum = calculate.shareSum;
        $scope.shareSum = function(row) {
            return $scope.formatAmount(shareSum(row));
        };

        // Total Shares in captable
        var totalShares = calculate.totalShares;
        $scope.totalShares = function(rows) {
            return $scope.formatAmount(totalShares(rows));
        };

        $scope.tabvisible = function(tab) {
            if (tab.title == "Activity") {
                if (tab.active == true && !($scope.toggleView() && $scope.fieldActive())) {
                    tab.active = false;
                    $scope.tabs[0].active = true;
                }
                return $scope.toggleView() && $scope.fieldActive()
            } else {
                return true;
            }
        };

        $scope.tabnumber = function() {
            var total = 0;
            angular.forEach($scope.tabs, function(tab) {
                if ($scope.tabvisible(tab)) {
                    total += 1
                }
            });
            return total;
        };

        $scope.singleTransaction = function(trans) {
            return (trans.length == 1);
        };

        $scope.chosenTab = function(tab, type) {
            return (tab.title == type);
        };

        $scope.toggleView = function () {
            return false;
        };

        $scope.getActiveTransaction = function (currenttran, currentcolumn) {
            $scope.sidebarstart = angular.copy($scope.sideBar);
            $scope.oldActive = angular.copy($scope.activeTran);
            $scope.sideBar = 2;
            $scope.activeTran = [];
            $scope.activeIssue = currentcolumn;
            $scope.activeInvestor = currenttran;
            // Get the all the issues that aren't the current issue for the drop downs
            var allowablekeys = angular.copy($scope.issuekeys);
            var index = allowablekeys.indexOf(currentcolumn);
            allowablekeys.splice(index, 1);
            $scope.allowKeys = allowablekeys;

            var first = 0;
            angular.forEach($scope.trans, function (tran) {
                if (tran.investor == currenttran) {
                    if (tran.issue == currentcolumn) {
                        if (first == 0) {
                            tran['active'] = true;
                            first = first + 1
                        }
                        tran.partpref = calculate.booltoYN(tran, 'partpref', $scope.tf);
                        tran.dragalong = calculate.booltoYN(tran, 'dragalong', $scope.tf);
                        tran.tagalong = calculate.booltoYN(tran, 'tagalong', $scope.tf);
                        $scope.activeTran.push(tran);
                    }
                }
            });
            if ($scope.activeTran.length < 1 && !$scope.toggleView()) {
                var anewTran = {};
                anewTran = {"active": true, "atype": 0, "new": "yes", "investor": $scope.activeInvestor, "investorkey": $scope.activeInvestor, "company": $scope.company, "date": (Date.today()), "datekey": (Date.today()), "issue": (currentcolumn), "units": null, "paid": null, "unitskey": null, "paidkey": null, "key": 'undefined', "convert": []};
                angular.forEach($scope.issues, function (issue) {
                    if (issue.issue == currentcolumn) {
                        anewTran = $scope.tranInherit(anewTran, issue);
                    }
                });
                $scope.trans.push(anewTran);
                $scope.activeTran.push(anewTran);
            }

            angular.forEach($scope.rows, function (row) {
                row.state = false;
                angular.forEach($scope.issues, function (issue) {
                    if (issue.issue) {
                        if (row.name == currenttran && currentcolumn == issue.issue && $scope.activeTran.length > 0) {
                            row[currentcolumn].state = true;
                        }
                        else {
                            row[issue.issue].state = false;
                            issue.state = false;
                        }
                    }
                });
            });
        };

        var keyPressed = false; // Needed because selecting a date in the calendar is considered a blur, so only save on blur if user has typed a key
        $scope.saveTranDate = function (transaction, field, evt) {
            if (evt) { // User is typing
                if (evt != 'blur')
                    keyPressed = true;
                var dateString = angular.element(field + '#' + transaction.$$hashKey).val();
                var charCode = (evt.which) ? evt.which : event.keyCode; // Get key
                if (charCode == 13 || (evt == 'blur' && keyPressed)) { // Enter key pressed or blurred
                    var date = Date.parse(dateString);
                    if (date) {
                        transaction[field] = calculate.timezoneOffset(date);
                        keyPressed = false;
                        $scope.saveTran(transaction);
                    }
                }
            } else { // User is using calendar
                //Fix the dates to take into account timezone differences.
                if (transaction[field] instanceof Date) {
                    transaction[field] = calculate.timezoneOffset(transaction[field]);
                    keyPressed = false;
                    $scope.saveTran(transaction);
                }
            }
        };

        $scope.getActiveIssue = function (issuekey) {
            if ($scope.toggleView() && $scope.activeIssue &&  $scope.activeIssue.issue == issuekey) {
                angular.forEach($scope.rows, function (row) {
                    row.state = false;
                    angular.forEach($scope.issues, function (issue) {
                        if (issue.issue) {
                            row[issue.issue].state = false;
                            issue.state = false;
                        }
                    });
                });
                $scope.sideBar = "home";
                $scope.activeIssue = undefined;
            } else {
                angular.forEach($scope.issues, function(issuefull) {
                    if (issuefull.issue == issuekey) {
                        issue = issuefull;
                    }
                });

                if ($scope.toggleView()) {
                    $scope.sideBar = 5;
                }
                else {
                    $scope.sideBar = 1;
                }
                $scope.activeIssue = issue;
                $scope.issueRevert = angular.copy(issue);

                angular.forEach($scope.rows, function (row) {
                    row.state = false;
                    angular.forEach($scope.issues, function (issue) {
                        if (issue.issue) {
                            row[issue.issue].state = false;
                            issue.state = false;
                        }
                    });
                });

                issue.state = true;

                // Get the all the issues that aren't the current issue for the drop downs
                var allowablekeys = angular.copy($scope.issuekeys);
                var index = allowablekeys.indexOf(issue.issue);
                allowablekeys.splice(index, 1);
                $scope.allowKeys = allowablekeys;

                $scope.activeIssue.partpref = calculate.booltoYN($scope.activeIssue, 'partpref', $scope.tf);
                $scope.activeIssue.dragalong = calculate.booltoYN($scope.activeIssue, 'dragalong', $scope.tf);
                $scope.activeIssue.tagalong = calculate.booltoYN($scope.activeIssue, 'tagalong', $scope.tf);
                if (String($scope.activeIssue.date).indexOf("Mon Feb 01 2100") !== -1) {
                    $scope.activeIssue.date = (Date.today());
                }
                // Set Freq Value for Angularjs Select
                var index = $scope.freqtypes.indexOf(issue.vestfreq);
                $scope.activeIssue.vestfreq = $scope.freqtypes[index];
            }
        };

        $scope.getActiveInvestor = function (investor) {
            $scope.sideBar = 3;

            angular.forEach($scope.rows, function (row) {
                row.state = false;
                angular.forEach($scope.issues, function (issue) {
                    if (issue.issue) {
                        if (row[issue.issue]) {
                            row[issue.issue].state = false;
                        }
                        issue.state = false;
                    }
                });
            });

            investor.state = true;
            var rowindex = $scope.rows.indexOf(investor);

            if (investor.name == "" && rowindex >= 4) {
                var values = {"name": "", "editable": "0"};
                angular.forEach($scope.issuekeys, function (key) {
                    values[key] = {"u": null, "a": null, "ukey": null, "akey": null};
                });
                $scope.rows.push(values);
            }
            $scope.activeInvestorName = investor.name;
            $scope.activeInvestorEmail = investor.email || 'null';
            angular.forEach($scope.userstatuses, function(user) {
                if (investor.email == user.email) {
                    $scope.activeInvestorRealName = user.name;
                }
            });
            $scope.activeInvestorNameKey = angular.copy(investor.name);
        };

        $scope.nameChangeLR = function (investor) {
            $scope.activeInvestorName = investor.name;
            if ((investor.name).length > 0) {
                angular.forEach($scope.rows, function (row) {
                    if (row.name == investor.name) {
                        row.editable = "yes";
                    }
                });
            }
            else {
                angular.forEach($scope.rows, function (row) {
                    if (row.name == investor.name) {
                        row.editable = "0";
                    }
                });
            }
        };

        $scope.updateRow = function (investor) {
            //Name has been reduced to "" and previously had a value
            if (investor.name == "" && investor.namekey != undefined) {
                var hastran = false
                //Check if row has transactions
                angular.forEach($scope.trans, function(tran) {
                    if (tran.investor == investor.namekey) {
                        hastran = true;
                    }
                });
                //If they do, double check with the user
                if (hastran) {
                    $scope.rmodalUp(investor);
                }
                //else just delete the row
                else {
                    $scope.deletePerson(investor.namekey);
                }
                return
            }

            var rowindex = $scope.rows.indexOf(investor);

            if (investor.name == "" && rowindex >= 4) {
                var index = $scope.rows.indexOf(investor);
                $scope.rows.splice(index, 1);
                return
            }
            angular.forEach($scope.rows, function (row) {
                if (investor.name != "" && investor.name == row.name && investor != row) {
                    investor.name = investor.name + " (1)";
                }
            });
            if (investor.name != "" && investor.name != investor.namekey) {
                investor.namekey = investor.namekey ? investor.namekey : "!!";
                $scope.lastsaved = Date.now();
                var index = $scope.rows.indexOf(investor);
                angular.forEach($scope.trans, function (tran) {
                    if (tran.investor == investor.namekey) {
                        tran.investor = investor.name;
                    }
                });
                if (investor.name) {
                    $scope.rows[index].namekey = investor.name
                }
            }
        };

        $scope.saveIssueAssign = function (issue, field, i) {
            if (i) {
                issue[field] = i;
            }
            $scope.saveIssueCheck(issue, field)
        };

        $scope.saveIssueCheckDate = function (issue, field, evt) {
            //Fix the dates to take into account timezone differences
            if (evt) { // User is typing
                if (evt != 'blur')
                    keyPressed = true;
                var dateString = angular.element(field + '#' + issue.$$hashKey).val();
                var charCode = (evt.which) ? evt.which : event.keyCode; // Get key
                if (charCode == 13 || (evt == 'blur' && keyPressed)) { // Enter key pressed or blurred
                    var date = Date.parse(dateString);
                    if (date) {
                        issue[field] = calculate.timezoneOffset(date);
                        $scope.saveIssueCheck(issue, field);
                        keyPressed = false;
                    }
                }
            } else { // User is using calendar
                if (issue[field] instanceof Date) {
                    issue[field] = calculate.timezoneOffset(issue[field]);
                    $scope.saveIssueCheck(issue, field);
                    keyPressed = false;
                }
            }
        };

        $scope.saveIssueCheck = function (issue, field) {
            var x = false;
            var testcopy = angular.copy(issue);
            if ($scope.issueModal == true) {
                return;
            }
            else {
                if (!angular.equals(testcopy, $scope.issueRevert)) {
                    $scope.saveIssue(issue, field);
                }
                else {
                    return;
                }
            }
        };

        $scope.saveIssue = function (issue, item) {
            if (item == "issuekey") {
                item = "issue";
                angular.forEach($scope.issues, function(issuefull) {
                    if (issuefull.issue == issue) {
                        issue = issuefull;
                    }
                });
            }
            if ((issue['issue'] == null || issue['issue'] == "") && issue['key'] == null) {
                return
            }

            else {

                if (issue['key'] != null) {
                    var dateconvert = issue['date'];

                    if (!isNaN(parseInt(issue.vestingbeginsdisplay))) {
                        var vestcliffdate = angular.copy(issue.date).addMonths(parseInt(issue.vestingbeginsdisplay));
                        issue['vestingbegins'] = vestcliffdate;
                    }
                    if (issue['vestingbegins'] == undefined) {
                        var vestcliffdate = null
                    }

                    if (issue.issue == "name") {
                        issue.issue = "No name";
                    }

                    angular.forEach($scope.issues, function (x) {
                        // Duplicate issue names are not allowed
                        if (x.issue != "" && issue.issue == x.issue && x != issue) {
                            issue.issue = issue.issue + " (1)";
                        }
                    });

                    $scope.lastsaved = Date.now();
                    var oldissue = issue['key'];
                    var index = -1;

                    // Fires only when you change the issue name to update the rows
                    // Removes unissued rows with the old name, new named ones get added further down
                    if (issue['issue'] != issue.key) {
                        angular.forEach($scope.rows, function (row) {
                            if (row.name == issue['key'] + " (unissued)" && index == -1) {
                                index = $scope.rows.indexOf(row);
                            }
                            row[issue['issue']] = row[issue.key];
                            delete row[issue.key];
                        });
                        if (index != -1) {
                            $scope.rows.splice(index, 1);
                        }
                    }

                    angular.forEach($scope.issues, function (x) {
                        $scope.rows = calculate.unissued($scope.rows, $scope.issues, String(x.issue));
                        if (x.issue == issue.issue && vestcliffdate) {
                            x.vestingbegins = vestcliffdate;
                        }
                    });

                    $scope.rows = calculate.unissued($scope.rows, $scope.issues, String(issue.issue));

                    // In the case where the issue is changed and there are other issues that use it as the underlying
                    if (item == "issue") {
                        angular.forEach($scope.issues, function (keyissue) {
                            if (item == "issue" && keyissue["optundersec"] && keyissue["optundersec"] == issue.key) {
                                keyissue.optundersec = issue[item];
                                $scope.saveIssue(keyissue, 'optundersec');
                            }
                            else if (item == "issue" && keyissue["debtundersec"] && keyissue["debtundersec"] == issue.key) {
                                keyissue.debtundersec = issue[item];
                                $scope.saveIssue(keyissue, 'debtundersec');
                            }
                        });
                    }


                    // Recalculate the debt percentages
                    angular.forEach($scope.rows, function (row) {
                        if (row[issue.issue] != undefined) {
                            if (issue.type == "Debt" && (isNaN(parseFloat(row[issue.issue]['u']))) && !isNaN(parseFloat(row[issue.issue]['a']))) {
                                row[issue.issue]['x'] = calculate.debt($scope.rows, issue, row);
                            }
                        }
                    });

                    // Make sure we have a clean slate for everyone (including any new unissued rows
                    angular.forEach($scope.rows, function (row) {
                        angular.forEach($scope.issuekeys, function (issuekey) {
                            if (issuekey in row) {
                            }
                            else {
                                row[issuekey] = {"u": null, "a": null, "ukey": null, "akey": null};
                            }
                        });
                    });

                    $scope.issueRevert = angular.copy(issue);

                    //Calculate the total vested for each row

                    var index = $scope.issuekeys.indexOf(issue.key);
                    $scope.issuekeys[index] = issue.issue;
                    issue.key = issue.issue;
                }

                else {

                    angular.forEach($scope.issues, function (x) {
                        // Duplicate issue names are not allowed
                        if (x.issue != "" && issue.issue == x.issue && x != issue) {
                            issue.issue = issue.issue + " (1)";
                        }
                    });

                    $scope.lastsaved = Date.now();
                    issue.key = issue['issue'];
                    $scope.issues.push({name: "", "date": new Date(2100, 1, 1)});
                    $scope.issuekeys.push(issue.key);
                    angular.forEach($scope.rows, function (row) {
                        row[issue.key] = {"u": null, "a": null};
                    });

                    var allowablekeys = angular.copy($scope.issuekeys);
                    var index = allowablekeys.indexOf(issue.issue);
                    allowablekeys.splice(index, 1);
                    $scope.allowKeys = allowablekeys;
                }
            }
        };

        $scope.isDebt = function(key) {
            var done = true;
            angular.forEach($scope.issues, function(issue) {
                if (key == issue.issue && (issue.type=="Debt" || issue.type=="Safe")) {
                    done = false
                    return false
                }
            });
            if (done) {
                return true
            }
        };

        //switches the sidebar based on the type of the issue
        $scope.trantype = function (type, activetype) {
            return switchval.trantype(type, activetype);
        };

        var sharePercentage = calculate.sharePercentage;
        $scope.sharePercentage = function(row, rows, issuekeys) {
            return sharePercentage(row, rows, issuekeys, shareSum(row), totalShares(rows));
        };

        $scope.tranChangeU = function (value, issue) {
            angular.forEach($scope.issues, function (x) {
                $scope.rows = calculate.unissued($scope.rows, $scope.issues, String(x.issue));
            });

            $scope.rows = calculate.unissued($scope.rows, $scope.issues, String(issue));
            if ($scope.activeTran.length < 2) {
                $scope.activeTran[0]['units'] = value;
            }
        };

        $scope.tranChangeA = function (value) {
            if ($scope.activeTran.length < 2) {
                $scope.activeTran[0]['amount'] = value;
            }
        };

        $scope.grantbyIssue = function (key) {
            var type = "";
            angular.forEach($scope.issues, function(issue) {
                if (issue.issue == key) {
                    if (issue.type == "Option") {
                        type = "options";
                    }
                    else if (issue.type == "Warrant") {
                        type = "warrants";
                    }
                    else {
                        type = "shares";
                    }

                }
            });
            return type
        };

        // Creates a new blank transaction with today's date
        $scope.createTrantab = function () {
            var inIssue = $scope.activeTran[0].issue
            var newTran = {};
            newTran = {"new": "yes", "atype": 0, "investor": $scope.activeInvestor, "investorkey": $scope.activeInvestor, "company": $scope.company, "date": (Date.today()), "datekey": (Date.today()), "issue": (inIssue), "units": null, "paid": null, "unitskey": null, "paidkey": null, "key": "undefined", "convert": []};
            angular.forEach($scope.issues, function (issue) {
                if (issue.issue == inIssue) {
                    newTran = $scope.tranInherit(newTran, issue);
                }
            });
            $scope.trans.push(newTran);
            $scope.activeTran.push(newTran);
            for (var i = 0; i < $scope.activeTran.length; i++) {
                if (i + 1 == $scope.activeTran.length) {
                    $scope.activeTran[i].active = true;
                }
                else {
                    $scope.activeTran[i].active = false;
                }
            }
        };

        $scope.saveTranAssign = function (transaction, field, value) {
            if (value) {
                transaction[field] = value;
            }
            $scope.saveTran(transaction);
        };

        // Preformatting on the date to factor in the local timezone offset
        var keyPressed = false; // Needed because selecting a date in the calendar is considered a blur, so only save on blur if user has typed a key
        $scope.saveTranDate = function (transaction, field, evt) {
            if (evt) { // User is typing
                if (evt != 'blur')
                    keyPressed = true;
                var dateString = angular.element(field + '#' + transaction.$$hashKey).val();
                var charCode = (evt.which) ? evt.which : event.keyCode; // Get key
                if (charCode == 13 || (evt == 'blur' && keyPressed)) { // Enter key pressed or blurred
                    var date = Date.parse(dateString);
                    if (date) {
                        transaction[field] = calculate.timezoneOffset(date);
                        keyPressed = false;
                        $scope.saveTran(transaction);
                    }
                }
            } else { // User is using calendar
                //Fix the dates to take into account timezone differences.
                if (transaction[field] instanceof Date) {
                    transaction[field] = calculate.timezoneOffset(transaction[field]);
                    keyPressed = false;
                    $scope.saveTran(transaction);
                }
            }
        };

        // Save transaction function
        $scope.saveTran = function (transaction) {
            if (isArray(transaction)) {
                transaction = transaction[0];
            }

            //Triggers the multi modal if more than one transaction exists
            if (transaction.length > 1) {
                // Reverts in the case where multitransaction rows are set to blank
                angular.forEach($scope.rows, function(row) {
                    if (row.name == transaction[0].investor) {
                        row[transaction[0].issue]['u'] = row[transaction[0].issue]['ukey'];
                        row[transaction[0].issue]['a'] = row[transaction[0].issue]['akey'];
                    }
                });
                return
            }
            // Remove any commas added to the numbers
            if (transaction.units) {
                transaction.units = calculate.cleannumber(transaction.units);
            }
            if (transaction.amount) {
                transaction.amount = calculate.cleannumber(transaction.amount);
            }
            if (!(/^(\d+)*(\.\d+)*$/.test(transaction.units)) && transaction.units != null && transaction.units != "") {
                transaction.units = transaction.unitskey;
            }
            if (!(/^(\d+)*(\.\d+)*$/.test(transaction.amount)) && transaction.amount != null && transaction.amount != "") {
                transaction.amount = transaction.paidkey;
            }
            // Bail out if insufficient data has been added for the transaction
            if (transaction == undefined || isNaN(parseFloat(transaction.units)) && isNaN(parseFloat(transaction.amount)) && isNaN(parseInt(transaction.tran_id))) {
                return
            }
            // Not quite enough information to save
            else if (transaction['issue'] == undefined || (isNaN(parseFloat(transaction['units'])) && isNaN(parseFloat(transaction['amount'])))) {
                return
            }
            // We have enough info to begin the saving process
            else {
                if (transaction.type == "Option" && transaction.units < 0) {
                    transaction.units = transaction.unitskey;
                    $scope.$emit("notification:fail", "Cannot have a negative number of shares");
                    return
                }
                else if (transaction.amount < 0) {
                    transaction.amount = transaction.paidkey;
                    $scope.$emit("notification:fail", "Cannot have a negative amount for options");
                    return
                }
                else {
                    if (transaction['tran_id'] == undefined) {
                        transaction['tran_id'] = '';
                    }

                    var vestcliffdate = null;
                    if (!isNaN(parseInt(transaction.vestingbeginsdisplay))) {
                        vestcliffdate = angular.copy(transaction.date).addMonths(parseInt(transaction.vestingbeginsdisplay));
                        transaction.vestingbegins = vestcliffdate;
                    }

                    // Convert amount to a float but remove the NaNs if amount is undefined
                    transaction['amount'] = parseFloat(transaction['amount']);
                    if (isNaN(transaction['amount'])) {
                        transaction['amount'] = null;
                    }
                    transaction['units'] = parseFloat(transaction['units']);
                    if (isNaN(transaction['units'])) {
                        transaction['units'] = null;
                    }
                    transaction['ppshare'] = parseFloat(transaction['ppshare']);
                    if (isNaN(transaction['ppshare'])) {
                        transaction['ppshare'] = null;
                    }
                    angular.forEach($scope.rows, function (row) {
                        if ((row.name == transaction.investor) && row.email) {
                            transaction.email = row.email;
                        }
                    });
                    if (!transaction.email) {
                        transaction.email = null
                    }
                    // Autocomplete for Equity transactions, fill out the third of units, amount or price per share
                    if (transaction.type == "Equity") {
                        if (transaction.units && transaction.amount && transaction.ppshare != 0 && !transaction.ppshare) {
                            transaction.ppshare = parseFloat(transaction.amount) / parseFloat(transaction.units);
                        }
                        else if (!transaction.units && transaction.units != 0 && transaction.amount && transaction.ppshare) {
                            transaction.units = parseFloat(transaction.amount) / parseFloat(transaction.ppshare);
                        }
                        else if (transaction.units && !transaction.amount && transaction.amount != 0 && transaction.ppshare) {
                            transaction.amount = parseFloat(transaction.units) * parseFloat(transaction.ppshare);
                        }
                    }
                        $scope.lastsaved = Date.now();
                        var tempunits = 0;
                        var tempamount = 0;
                        angular.forEach($scope.rows, function (row) {
                            angular.forEach($scope.trans, function (tran) {
                                if (row.name == tran.investor) {
                                    if (transaction.tran_id == '' && !tran.tran_id && (!isNaN(parseFloat(tran.units)) || !isNaN(parseFloat(tran.amount)))) {
                                        tran.tran_id = String(Math.random()*10000);
                                    }
                                    if (tran.investor == transaction.investor && tran.issue == transaction.issue) {
                                        tran.key = tran.issue;
                                        tran.unitskey = tran.units;
                                        tran.paidkey = tran.amount;
                                        tempunits = calculate.sum(tempunits, tran.units);
                                        tempamount = calculate.sum(tempamount, tran.amount);
                                        if (!isNaN(parseFloat(tran.forfeited))) {
                                            tempunits = calculate.sum(tempunits, (-tran.forfeited));
                                        }
                                        row[tran.issue]['u'] = tempunits;
                                        row[tran.issue]['ukey'] = tempunits;
                                        row[tran.issue]['a'] = tempamount;
                                        row[tran.issue]['akey'] = tempamount;

                                        if (row[tran.issue]['u'] == 0) {
                                            row[tran.issue]['u'] = null;
                                            row[tran.issue]['ukey'] = null;
                                        }
                                        if (row[tran.issue]['a'] == 0) {
                                            row[tran.issue]['a'] = null;
                                            row[tran.issue]['akey'] = null;
                                        }
                                        row[tran.issue]['x'] = 0;
                                    }
                                }
                            });
                        });

                        angular.forEach($scope.issues, function (x) {
                            $scope.rows = calculate.unissued($scope.rows, $scope.issues, String(x.issue));
                        });

                        $scope.rows = calculate.unissued($scope.rows, $scope.issues, String(transaction.issue));


                        angular.forEach($scope.rows, function (row) {
                            angular.forEach($scope.issues, function (issue) {
                                if (row[issue.issue] != undefined) {
                                    if (issue.type == "Debt" && (isNaN(parseFloat(row[issue.issue]['u'])) || row[issue.issue]['u'] == 0) && !isNaN(parseFloat(row[issue.issue]['a']))) {
                                        row[issue.issue]['x'] = calculate.debt($scope.rows, issue, row);
                                    }
                                }
                            });
                        });


                        // Make sure we have a clean slate for everyone (including any new unissued rows
                        angular.forEach($scope.rows, function (row) {
                            angular.forEach($scope.issuekeys, function (issuekey) {
                                if (issuekey in row) {
                                }
                                else {
                                    row[issuekey] = {"u": null, "a": null, "ukey": null, "akey": null};
                                }
                            });
                        });
                }
            }
        };

        // Toggles sidebar back and forth
        $scope.toggleSide = function () {
            if (!$scope.sideToggle) {
                $scope.sideToggleName = "Hide";
                return false
            } else {
                $scope.sideToggleName = "Details";
                return true
            }
        };

        $scope.typeLocked = function(issue) {
            if (issue.liquidpref || issue.interestrate || issue.valcap || issue.discount || issue.optundersec || issue.vestcliff || issue.vestingbegins || issue.vestfreq) {
                return false
            }
            else {
                return true
            }
        };

        $scope.tranInherit = function (tran, issue) {
            tran.issue = issue.issue;
            tran.type = issue.type;
            tran.totalauth = issue.totalauth;
            tran.premoney = issue.premoney;
            tran.postmoney = issue.postmoney;
            tran.ppshare = issue.ppshare;
            tran.totalauth = issue.totalauth;
            tran.liquidpref = issue.liquidpref;
            tran.partpref = issue.partpref;
            tran.optundersec = issue.optundersec;
            tran.price = issue.price;
            tran.terms = issue.terms;
            tran.vestingbeginsdisplay = issue.vestingbeginsdisplay;
            tran.vestcliff = issue.vestcliff;
            tran.vestfreq = issue.vestfreq;
            tran.debtundersec = issue.debtundersec;
            tran.interestrate = issue.interestrate;
            tran.interestratefreq = issue.interestratefreq;
            tran.valcap = issue.valcap;
            tran.discount = issue.discount;
            tran.term = issue.term;
            tran.dragalong = issue.dragalong;
            tran.tagalong = issue.tagalong;
            return tran
        };


        // Captable transaction delete modal
        $scope.tranDeleteUp = function (transaction) {
            $scope.deleteTran = transaction;
            $scope.tranDelete = true;
        };

        $scope.deleteclose = function () {
            $scope.closeMsg = 'I was closed at: ' + new Date();
            $scope.tranDelete = false;
        };

        $scope.revertTran = function (transaction) {
            angular.forEach($scope.trans, function(tran) {
                if (tran.tran_id == transaction.tran_id) {
                    tran.units = tran.unitskey;
                    tran.amount = tran.paidkey;
                    $scope.saveTran(tran);
                }
            });
        };

        // Function for when the delete transaction button is pressed in the right sidebar
        $scope.manualdeleteTran = function (tran) {
            var d1 = tran['date'].toUTCString();
            $scope.lastsaved = Date.now();
            var index = $scope.trans.indexOf(tran);
            $scope.trans.splice(index, 1);
            var index = $scope.activeTran.indexOf(tran);
            if (index != -1) {
                $scope.activeTran.splice(index, 1);
            }
            if ($scope.activeTran.length == 0) {
                var anewTran = {};
                anewTran = {"active": true, "atype": 0, "new": "yes", "investor": $scope.activeInvestor, "investorkey": $scope.activeInvestor, "company": $scope.company, "date": (Date.today()), "datekey": (Date.today()), "issue": (tran.issue), "units": null, "paid": null, "unitskey": null, "paidkey": null, "key": 'undefined', "convert": []};
                angular.forEach($scope.issues, function (issue) {
                    if (issue.issue == tran.issue) {
                        anewTran = $scope.tranInherit(anewTran, issue);
                    }
                });
                $scope.trans.push(anewTran);
                $scope.activeTran.push(anewTran);
            }
            angular.forEach($scope.rows, function (row) {
                if (row.name === tran['investor']) {
                    if (!isNaN(tran.units)) {
                        row[tran.issue]['u'] = row[tran.issue]['u'] - tran.units;
                        row[tran.issue]['ukey'] = row[tran.issue]['u']
                        if (row[tran.issue]['u'] == 0) {
                            row[tran.issue]['u'] = null;
                            row[tran.issue]['ukey'] = null;
                        }
                    }
                    if (!isNaN(tran.amount)) {
                        row[tran.issue]['a'] = row[tran.issue]['a'] - tran.amount;
                        row[tran.issue]['akey'] = row[tran.issue]['a']
                        if (row[tran.issue]['a'] == 0) {
                            row[tran.issue]['a'] = null;
                            row[tran.issue]['akey'] = null;
                        }
                    }
                }
            });
            angular.forEach($scope.issues, function (x) {
                $scope.rows = calculate.unissued($scope.rows, $scope.issues, String(x.issue));
            });

            $scope.rows = calculate.unissued($scope.rows, $scope.issues, String(tran.issue));
        };

        //Captable Delete Issue Modal

        $scope.dmodalUp = function (issue) {
            $scope.capDelete = true;
            $scope.missue = issue;
        };

        $scope.dclose = function () {
            $scope.closeMsg = 'I was closed at: ' + new Date();
            $scope.capDelete = false;
        };

        $scope.deleteIssueButton = function (activeIssue) {
            $scope.dmodalUp(activeIssue);
        };

        $scope.deleteIssue = function (issue) {
            $scope.lastsaved = Date.now();
            angular.forEach($scope.issues, function (oneissue) {
                if (oneissue['key'] == issue['key']) {
                    var index = $scope.issues.indexOf(oneissue);
                    $scope.issues.splice(index, 1);
                    var indexed = $scope.issuekeys.indexOf(oneissue.key);
                    $scope.issuekeys.splice(indexed, 1);
                }
            });
            angular.forEach($scope.rows, function (row) {
                if (issue.key in row) {
                    delete row[issue.key];
                }
                if (row["name"] == issue.key + " (unissued)") {
                    var index = $scope.rows.indexOf(row);
                    $scope.rows.splice(index, 1);
                }
            });
            angular.forEach($scope.trans, function(tran) {
                if (tran.issue == issue.key) {
                    var index = $scope.trans.indexOf(tran);
                    $scope.trans.splice(index, 1);
                }
            })
            if ($scope.issues.length == 0 || ($scope.issues[$scope.issues.length-1].name != "")) {
                $scope.issues.push({"name": "", "date": new Date(2100, 1, 1)});
            }
            $scope.sideBar = "x";
        };

        $scope.revertIssue = function (issue) {
            angular.forEach($scope.issues, function (x) {
                if (x.key == issue.key) {
                    x.issue = issue.key;
                }
            });
        };

        $scope.rmodalUp = function (investor) {
            $scope.rowDelete = true;
            $scope.minvestor = investor.namekey;
        };

        $scope.rclose = function () {
            $scope.closeMsg = 'I was closed at: ' + new Date();
            $scope.rowDelete = false;
        };

        $scope.revertPerson = function (investor) {
            angular.forEach($scope.rows, function (row) {
                if (row.namekey == investor) {
                    row.name = row.namekey;
                    $scope.nameChangeLR(row)
                }
            });
        };

        $scope.deletePerson = function (investor) {
            $scope.sideBar = "x";
            $scope.lastsaved = Date.now();
            angular.forEach($scope.trans, function (tran) {
                if (tran.investor == investor) {
                    var index = $scope.trans.indexOf(tran);
                    $scope.trans.splice(index, 1);
                    angular.forEach($scope.rows, function (row) {
                        if (row.name === tran['investor']) {
                            if (!isNaN(tran.units)) {
                                row[tran.issue]['u'] = row[tran.issue]['u'] - tran.units;
                                row[tran.issue]['ukey'] = row[tran.issue]['u']
                                if (row[tran.issue]['u'] == 0) {
                                    row[tran.issue]['u'] = null
                                    row[tran.issue]['ukey'] = null
                                }
                            }
                            if (!isNaN(tran.amount)) {
                                row[tran.issue]['a'] = row[tran.issue]['a'] - tran.amount;
                                row[tran.issue]['akey'] = row[tran.issue]['a']
                                if (row[tran.issue]['a'] == 0) {
                                    row[tran.issue]['a'] = null
                                    row[tran.issue]['akey'] = null
                                }
                            }
                        }
                    });

                    angular.forEach($scope.issues, function (x) {
                        $scope.rows = calculate.unissued($scope.rows, $scope.issues, String(x.issue));
                    });

                    $scope.rows = calculate.unissued($scope.rows, $scope.issues, String(tran.issue));
                }
            });

            angular.forEach($scope.rows, function (row) {
                if (row.namekey == investor) {
                    var index = $scope.rows.indexOf(row);
                    $scope.rows.splice(index, 1);
                    if ($scope.rows.length <= 5) {
                        var values = {"name": "", "editable": "0"};
                        angular.forEach($scope.issuekeys, function (key) {
                            values[key] = {"u": null, "a": null, "ukey": null, "akey": null};
                        });
                        $scope.rows.splice(index, 0, values);
                    }
                }
            });
        };

        var clean_company_access = [({"level":"Personal View","email":"ellen@sharewave.com","name":"Ellen Orford","company":"be7daaf65fcf.sharewave.com"}), ({"level":"Full View","email":"owen@sharewave.com","name":"Owen Wingrave","company":"be7daaf65fcf.sharewave.com"}), ({"level":"Full View","email":"claggart@sharewave.com","name":"John Claggart","company":"be7daaf65fcf.sharewave.com"}), ({"level":"Personal View","email":"albert@sharewave.com","name":"Albert Herring","company":"be7daaf65fcf.sharewave.com"}),({"level":"Personal View","email":"peter@sharewave.com","name":"Peter Quint","company":"be7daaf65fcf.sharewave.com"})];
        var activities = [({"timenow":new Date(1401897074181),"email":"ellen@sharewave.com","company":"be7daaf65fcf.sharewave.com","event_time":new Date(1398296670142),"activity":"received"}),({"timenow":new Date(1401897074181),"email":"ellen@sharewave.com","company":"be7daaf65fcf.sharewave.com","event_time":new Date(1401825801937),"activity":"viewed"}), ({"timenow":new Date(1401897074181),"email":"owen@sharewave.com","company":"be7daaf65fcf.sharewave.com","event_time":new Date(1398296670142),"activity":"received"}),({"timenow":new Date(1401897074181),"email":"claggart@sharewave.com","company":"be7daaf65fcf.sharewave.com","event_time":new Date(1398296670142),"activity":"received"}),({"timenow":new Date(1401897074181),"email":"claggart@sharewave.com","company":"be7daaf65fcf.sharewave.com","event_time":new Date(1401825801937),"activity":"viewed"}),({"timenow":new Date(1401897074181),"email":"albert@sharewave.com","company":"be7daaf65fcf.sharewave.com","event_time":new Date(1398296670142),"activity":"received"}), ({"timenow":new Date(1401897074181),"email":"peter@sharewave.com","company":"be7daaf65fcf.sharewave.com","event_time":new Date(1398296670142),"activity":"received"})];
        var user_tracker = [({"email":"ellen@sharewave.com","logintime":new Date(1401907608160)}), ({"email":"claggart@sharewave.com","logintime":new Date(1401907608160)})];

        $scope.userstatuses = clean_company_access;

        $scope.userStatus = clean_company_access;
        $scope.userDict = {};
        for (var i = 0; i < $scope.userstatuses.length; i++) {
            $scope.userDict[$scope.userstatuses[i].email] = {};
            $scope.userDict[$scope.userstatuses[i].email].name = ($scope.userStatus[i].name) ? $scope.userStatus[i].name : $scope.userStatus[i].email;
            $scope.userDict[$scope.userstatuses[i].email].shown = false;
            $scope.userDict[$scope.userstatuses[i].email].level = $scope.userstatuses[i].level;
        }
        angular.forEach($scope.userstatuses, function (person) {
            angular.forEach(activities, function (activity) {
                if (activity.email == person.email) {
                    var act = activity.activity;
                    var time;
                    time = activity.event_time;
                    $scope.userDict[person.email][act] = time;
                }
            });
        });
        angular.forEach($scope.userStatus, function (person) {
            angular.forEach(user_tracker, function (login) {
                if (login.email == person.email) {
                    $scope.userDict[person.email].lastlogin = login.logintime;
                }
            });
        });

        $scope.colTotal = function(header, rows, type) {
            return calculate.colTotal(header, rows, type);
        };

        // Generate the Captable from the dummy data.
        $scope.issues = [({"liquidpref":null,"common":true,"issue":"Common A","terms":null,"dragalong":null,"totalauth":null,"type":"Equity","date":new Date(1388552400000),"interestratefreq":null,"debtundersec":null,"created":new Date(1401829586274),"vestingbegins":null,"ppshare":1,"valcap":null,"lastupdated":new Date(1401829593179),"partpref":null,"optundersec":null,"discount":null,"postmoney":null,"vestfreq":null,"price":null,"premoney":null,"term":null,"tagalong":null,"company":"be7daaf65fcf.sharewave.com","vestcliff":null,"interestrate":null}),({"liquidpref":null,"common":null,"issue":"Options","terms":48,"dragalong":null,"totalauth":20000.0,"type":"Option","date":new Date(1401768000000),"interestratefreq":null,"debtundersec":null,"created":new Date(1401829621182),"vestingbegins":new Date(1433304000000),"ppshare":1,"valcap":null,"lastupdated":new Date(1401829632373),"partpref":null,"optundersec":"Common A","discount":null,"postmoney":null,"vestfreq":"monthly","price":1,"premoney":null,"term":null,"tagalong":null,"company":"be7daaf65fcf.sharewave.com","vestcliff":25.0,"interestrate":null})];
        var names = [({"name":"Ellen Orford","company":"be7daaf65fcf.sharewave.com"}),({"name":"Peter Quint","company":"be7daaf65fcf.sharewave.com"}),({"name":"Albert Herring","company":"be7daaf65fcf.sharewave.com"}),({"name":"John Claggart","company":"be7daaf65fcf.sharewave.com"}),({"name":"Owen Wingrave","company":"be7daaf65fcf.sharewave.com"})];
        $scope.trans = [({"liquidpref":null,"issue":"Common A","terms":null,"investor":"Ellen Orford","dragalong":null,"totalauth":null,"interestratefreq":null,"type":"Equity","date":new Date(1401768000000),"amount":50000.0,"debtundersec":null,"vestingbegins":null,"ppshare":1.0,"converted":false,"valcap":null,"lastupdated":new Date(1401829600758),"partpref":null,"units":50000.0,"optundersec":null,"discount":null,"postmoney":null,"vestfreq":null,"price":null,"term":null,"premoney":null,"email":"ellen@sharewave.com","tagalong":null,"company":"be7daaf65fcf.sharewave.com","vestcliff":null,"tran_id":741185637,"interestrate":null}),({"liquidpref":null,"issue":"Common A","terms":null,"investor":"Albert Herring","dragalong":null,"totalauth":null,"interestratefreq":null,"type":"Equity","date":new Date(1401768000000),"amount":20000.0,"debtundersec":null,"vestingbegins":null,"ppshare":1.0,"converted":false,"valcap":null,"lastupdated":new Date(1401829613671),"partpref":null,"units":20000.0,"optundersec":null,"discount":null,"postmoney":null,"vestfreq":null,"price":null,"term":null,"premoney":null,"email":"albert@sharewave.com","tagalong":null,"company":"be7daaf65fcf.sharewave.com","vestcliff":null,"tran_id":1067443693,"interestrate":null}),({"liquidpref":null,"issue":"Options","terms":48.0,"investor":"Owen Wingrave","dragalong":null,"totalauth":20000.0,"interestratefreq":null,"type":"Option","date":new Date(1401768000000),"amount":null,"debtundersec":null,"vestingbegins":new Date(1433304000000),"ppshare":null,"converted":false,"valcap":null,"lastupdated":new Date(1401829661748),"partpref":null,"units":2500.0,"optundersec":"Common A","discount":null,"postmoney":null,"vestfreq":"monthly","price":1.0,"term":null,"premoney":null,"email":"owen@sharewave.com","tagalong":null,"company":"be7daaf65fcf.sharewave.com","vestcliff":25.0,"tran_id":258935959,"interestrate":null}),({"liquidpref":null,"issue":"Options","terms":48.0,"investor":"John Claggart","dragalong":null,"totalauth":20000.0,"interestratefreq":null,"type":"Option","date":new Date(1401768000000),"amount":null,"debtundersec":null,"vestingbegins":new Date(1433304000000),"ppshare":null,"converted":false,"valcap":null,"lastupdated":new Date(1401829792391),"partpref":null,"units":2500.0,"optundersec":"Common A","discount":null,"postmoney":null,"vestfreq":"monthly","price":1.0,"term":null,"premoney":null,"email":"claggart@sharewave.com","tagalong":null,"company":"be7daaf65fcf.sharewave.com","vestcliff":25.0,"tran_id":925349974,"interestrate":null}),({"liquidpref":null,"issue":"Common A","terms":null,"investor":"Peter Quint","dragalong":null,"totalauth":null,"interestratefreq":null,"type":"Equity","date":new Date(1401768000000),"amount":20000.0,"debtundersec":null,"vestingbegins":null,"ppshare":1.0,"converted":false,"valcap":null,"lastupdated":new Date(1401829607416),"partpref":null,"units":20000.0,"optundersec":null,"discount":null,"postmoney":null,"vestfreq":null,"price":null,"term":null,"premoney":null,"email":"peter@sharewave.com","tagalong":null,"company":"be7daaf65fcf.sharewave.com","vestcliff":null,"tran_id":609665841,"interestrate":null})];
        $scope.grants = [];
        $scope.generateCaptable(names);
        $scope.getActiveIssue("Options");
    }
]);

// IE fix to remove enter to submit form
function testForEnter()
{
    if (event.keyCode == 13)
    {
        event.cancelBubble = true;
        event.returnValue = false;
    }
}

function isArray(obj) {
    return Object.prototype.toString.call(obj) === '[object Array]';
}