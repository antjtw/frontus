app.controller('invCaptableController',
    ['$scope', '$parse', 'SWBrijj', 'calculate', '$filter',
     '$routeParams', '$rootScope', '$location', 'navState', 'captable', 'attributes',
function($scope, $parse, SWBrijj, calculate, $filter,
         $routeParams, $rootScope, $location, navState, captable, attributes)
{
    if (navState.role == 'issuer') {
        $location.path('/company-captable');
        return;
    }

    var company = navState.company;
    $scope.currentCompany = company;

    $scope.ct = captable.getCapTable();
    $scope.captable = captable;
    var attrs = attributes.getAttrs();

    $scope.daterange = {};
    $scope.daterange.offset = 0;

    if ($scope.settings)
    {
        $scope.daterange.today = $filter('date')(new Date(), $scope.settings.shortdate);
    }

    $scope.updateDateSlider = function() {
        var d = captable.startDate().getTime();
        $scope.ctFilter.date = new Date(d + $scope.daterange.offset*86400000);
        $scope.daterange.fakeDate = $filter('date')($scope.ctFilter.date, $scope.settings.shortdate);
        $scope.updateBarColor();
    };

    $scope.updateBarColor = function() {
        var p = Math.round(Math.min((Math.max($scope.daterange.offset, 0)/$scope.ct.totalDays)*100, 100)*100)/100;
        $scope.daterange.coloredbar = "background: #C7C7C7;\
            background: -moz-linear-gradient(left,  #1ABC96 0%, #1ABC96 " + p + "%, #C7C7C7 " + p + "%, #C7C7C7 100%);\
            background: -webkit-gradient(linear, left top, right top, color-stop(0%,#1ABC96), color-stop(" + p + "%,#1ABC96), color-stop(" + p + "%,#C7C7C7), color-stop(100%,#C7C7C7));\
            background: -webkit-linear-gradient(left,  #1ABC96 0%,#1ABC96 " + p + "%,#C7C7C7 " + p + "%,#C7C7C7 100%);\
            background: -o-linear-gradient(left,  #1ABC96 0%,#1ABC96 " + p + "%,#C7C7C7 " + p + "%,#C7C7C7 100%);\
            background: -ms-linear-gradient(left,  #1ABC96 0%,#1ABC96 " + p + "%,#C7C7C7 " + p + "%,#C7C7C7 100%);\
            background: linear-gradient(to right,  #1ABC96 0%,#1ABC96 " + p + "%,#C7C7C7 " + p + "%,#C7C7C7 100%);";
    };

    $scope.checkDateRange = function() {
        if ($scope.editMode)
        {
            $scope.ctFilter.date = null;
            return;
        }
        if (!$scope.ctFilter.date)
        {
            $scope.ctFilter.date = new Date();
        }
        $scope.daterange.fakeDate = $filter('date')($scope.ctFilter.date, $rootScope.settings.shortdate);
        $scope.daterange.offset = captable.daysBetween(
            captable.startDate() || new Date(1980),
            $scope.ctFilter.date);
        $scope.updateBarColor();
        $scope.daterange.today = $filter('date')(new Date(), $rootScope.settings.shortdate);
    };
    $scope.$on("settings_loaded", function(evt, msg, cb) {
        $scope.checkDateRange();
    });

    $scope.updateDateInput = function() {
        //TODO: only works for MM/dd/yy & dd/MM/yy. Must change if we add more date formats.
        var nums = $scope.daterange.fakeDate.split('/');
        if (nums.length != 3)
            return;
        if (!(nums[2].length == 2 || nums[2].length == 4))
            return;
        var year = Number(nums[2]);
        if (isNaN(year))
            return;
        if (year < 1000)
            year += 2000;
        var monthInd = ($scope.settings.shortdate.indexOf('MM') == 0) ? 0 : 1;
        if (nums[monthInd].length < 1 || nums[monthInd].length > 2)
            return;
        var month = Number(nums[monthInd]);
        if (isNaN(month))
            return;
        if (month < 1 || month > 12)
            return;
        if (nums[1 - monthInd].length < 1 || nums[1 - monthInd].length > 2)
            return;
        var day = Number(nums[1 - monthInd]);
        if (isNaN(day))
            return;
        if (day < 1 || day > 31)
            return;
        var d = new Date(year, month - 1, day);
        if (!d)
            return;
        $scope.ctFilter.date = d;
        $scope.daterange.fakeDate = $filter('date')($scope.ctFilter.date, $scope.settings.shortdate);
        $scope.daterange.offset = captable.daysBetween(captable.startDate(), $scope.ctFilter.date);
        $scope.updateBarColor();
    };

    $scope.setToday = function() {
        $scope.ctFilter.date = new Date();
        $scope.daterange.fakeDate = $filter('date')($scope.ctFilter.date, $scope.settings.shortdate);
        $scope.daterange.offset = captable.daysBetween(captable.startDate(), $scope.ctFilter.date);
        $scope.updateBarColor();
    };

    $scope.ctFilter = {date: new Date(),
        vesting: true,
        security_types: ['Show All']};
    $scope.$watch('ctFilter', function(newVal, oldVal) {
        switch (selectedThing()) {
            case "selectedCell":
                if ($scope.filteredSecurityList()
                    .reduce(captable.accumulateProperty('name'), [])
                    .indexOf($scope.selectedCell.security) == -1) {
                    deselectCell();
                }
                return;
            case "selectedInvestor":
                return;
            case "selectedSecurity":
                if ($scope.filteredSecurityList()
                    .indexOf($scope.selectedSecurity) == -1) {
                    deselectSecurity();
                }
                return;
        }
    }, true);
    $scope.filteredSecurityList = function() {
        return $filter('filter')($scope.ct.securities, $scope.securityFilter);
    };
    $scope.filteredSecurityNames = function() {
        return $scope.filteredSecurityList()
            .reduce(captable.accumulateProperty('name'), []);
    };

    $scope.securityUnitLabel = function(security) {
        var type = $filter('issueUnitLabel')(security.attrs.security_type);
        return type;
    };
    $scope.selectedCell = null;
    $scope.selectedInvestor = null;
    $scope.selectedSecurity = null;

    function displayIntroSidebar() {
        $scope.sideBar = "home";
    }
    function displayInvestorDetails() {
        $scope.sideBar = 3;
    }
    function displaySecurityDetails() {
        $scope.sideBar = 1;
    }
    function displayCellDetails() {
        $scope.sideBar = 2;
    }
    function selectedThing() {
        if ($scope.selectedCell) return 'selectedCell';
        if ($scope.selectedInvestor) return 'selectedInvestor';
        if ($scope.selectedSecurity) return 'selectedSecurity';
        return null;
    }
    function cellIsSelected(inv, sec) {
        return $scope.selectedCell.investor == inv
            && $scope.selectedCell.security == sec;
    }
    SWBrijj.procm('ownership.return_status').then(function (x) {
        $scope.level = x[0].return_status;
        if ($scope.level != 'Full View' && $scope.level != 'Personal View') {
            $location.url("/app/home/");
        }
        if ($scope.level == 'Full View') {
            $scope.fullview = true;
        }
    });
    $scope.selectCell = function(inv, sec) {
        $scope.selectedSecurity = $scope.selectedInvestor = null;
        if ($scope.selectedCell && cellIsSelected(inv, sec)) {
            $scope.selectedCell = null;
            displayIntroSidebar();
        } else {
            $scope.selectedCell = captable.cellFor(inv, sec);
            displayCellDetails();
        }
    };
    $scope.selectSecurity = function(security_name) {
        $scope.selectedCell = $scope.selectedInvestor = null;
        if ($scope.selectedSecurity &&
                $scope.selectedSecurity.name==security_name) {
            displayIntroSidebar();
            $scope.selectedSecurity = null;
        } else {
            $scope.selectedSecurity = null;
            $scope.selectedSecurity = $scope.ct.securities
                .filter(function(el) {
                    return el.name == security_name;
                })[0];
            displaySecurityDetails();
        }
    };
    $scope.selectInvestor = function(investor_name) {
        $scope.selectedCell = $scope.selectedSecurity = null;
        if ($scope.selectedInvestor &&
                $scope.selectedInvestor.name == investor_name) {
            displayIntroSidebar();
            $scope.selectedInvestor = null;
        } else {
            $scope.selectedInvestor = $scope.ct.investors
                .filter(function(el) {
                    return el.name == investor_name;
                })[0];
            displayInvestorDetails();
        }
    };

    // Toggles sidebar back and forth
    $scope.toggleSide = function () {
        if ($scope.sideToggle) {
            $scope.sideToggleName = "Show"
            return true
        }
        else {
            $scope.sideToggleName = "Hide"
            return false
        }
        ;

    };

    //switches the sidebar based on the type of the issue
    $scope.formatAmount = function (amount) {
        return calculate.funcformatAmount(amount);
    };

    $scope.formatDollarAmount = function(amount) {
        var output = calculate.formatMoneyAmount($scope.formatAmount(amount), $scope.settings);
        return output;
    };

    // Functions derived from services for use in the table

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
                total += 1;
            }
        });
        return total;
    };

    $scope.singleTransaction = function(trans) {
        return (trans.length == 1);
    };

    // This should really be in a directive (or more properly get some clever css set-up to do it for me...
    $scope.$watch(function() {
        return $(".leftBlock").height();
    }, function(newValue, oldValue) {
        $scope.stretchheight = {height: String(newValue + 59) + "px"};
    });

    $scope.securityTypeDropdown = function(for_display) {
        var not_these = ['Equity', 'Equity Common'];
        var res = Object.keys(attrs).sort();
        if (for_display)
            res = res.filter(function(el) {
                return not_these.indexOf(el) == -1; });
        return res;
    };
    $scope.showSecurityType = function(t) {
        if (!t || !$scope.ctFilter || !$scope.ctFilter.security_types) {
            return null;
        } else if ($scope.ctFilter.security_types.indexOf('Show All') !== -1) {
            return true;
        } else {
            return $scope.ctFilter.security_types.indexOf(t) !== -1;
        }
    };
    $scope.toggleSecurityType = function(t) {
        if (!t) return null;
        var idx = $scope.ctFilter.security_types.indexOf(t);
        if (idx == -1) {
            if ($scope.showSecurityType('Show All')) {
                $scope.ctFilter.security_types = $scope.securityTypeDropdown()
                    .filter(function(el) {
                        return el != t;
                    });
            } else {
                $scope.ctFilter.security_types.push(t);
                if ($scope.ctFilter.security_types.length ==
                    $scope.securityTypeDropdown().length) {
                    $scope.ctFilter.security_types = ['Show All'];
                }
            }
        } else {
            $scope.ctFilter.security_types.splice(idx, 1);
            if ($scope.ctFilter.security_types.length === 0) {
                $scope.toggleSecurityType('Show All');
            }
        }
    };
    $scope.securityFilter = function(sec) {
        return $scope.editMode ||
            $scope.showSecurityType('Show All') ||
            $scope.showSecurityType(sec.attrs.security_type);
    };
    $scope.securityFilterLabel = function() {
        if (!$scope.ctFilter.vesting ||
            !$scope.showSecurityType('Show All')) {
            return "Showing Filtered";
        } else {
            return "Showing All";
        }
    };
    $scope.dateSecurityFilter = function(sec) {
        return !$scope.ctFilter.date || $scope.editMode ||
            sec.effective_date < $scope.ctFilter.date;
    };
    $scope.rowSum = function(row) {
        return captable.rowSum(
            row.name,
            ($scope.editMode ? false : $scope.filteredSecurityNames()),
            ($scope.editMode ? false : $scope.ctFilter.date),
            ($scope.editMode ? true : $scope.ctFilter.vesting));
    };
    $scope.investorOwnershipPercentage = function(row) {
        return captable.investorOwnershipPercentage(
            row.name,
            ($scope.editMode ? false : $scope.filteredSecurityNames()),
            ($scope.editMode ? false : $scope.ctFilter.date),
            ($scope.editMode ? true : $scope.ctFilter.vesting));
    };
    $scope.numUnissued = function(sec) {
        return captable.numUnissued(sec,
            ($scope.editMode ? false : $scope.ctFilter.date),
            ($scope.editMode ? true : $scope.ctFilter.vesting));
    };
    $scope.securityUnissuedPercentage = function(sec) {
        return captable.securityUnissuedPercentage(sec, $scope.ct.securities,
            ($scope.editMode ? false : $scope.ctFilter.date),
            ($scope.editMode ? true : $scope.ctFilter.vesting));
    };
    $scope.totalOwnershipUnits = function(x) {
        return captable.totalOwnershipUnits(x,
            ($scope.editMode ? false : $scope.filteredSecurityNames()),
            ($scope.editMode ? false : $scope.ctFilter.date),
            ($scope.editMode ? true : $scope.ctFilter.vesting));
    };
    $scope.securityTotalUnits = function(sec) {
        return captable.securityTotalUnits(sec,
            ($scope.editMode ? false : $scope.ctFilter.date),
            ($scope.editMode ? true : $scope.ctFilter.vesting));
    };
    $scope.securityTotalAmount = function(sec) {
        return captable.securityTotalAmount(sec,
            ($scope.editMode ? false : $scope.ctFilter.date),
            ($scope.editMode ? true : $scope.ctFilter.vesting));
    };
}]);
