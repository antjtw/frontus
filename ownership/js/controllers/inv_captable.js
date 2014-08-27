app.controller('invCaptableController',
    ['$scope', '$parse', 'SWBrijj', 'calculate', 'switchval', '$filter',
     '$routeParams', '$rootScope', '$location', 'navState', 'captable',
function($scope, $parse, SWBrijj, calculate, switchval, $filter,
         $routeParams, $rootScope, $location, navState, captable)
{
    if (navState.role == 'issuer') {
        $location.path('/company-captable');
        return;
    }

    var company = navState.company;
    $scope.currentCompany = company;
    
    $scope.ct = captable.getCapTable();
    $scope.captable = captable;

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
    SWBrijj.procm('_ownership.my_visible_investors').then(function(x) {
        console.log(x);
    }).except(function(x) {
        console.log(x);
    });
    SWBrijj.procm('ownership.return_status').then(function (x) {
        $scope.level = x[0].return_status;
        if ($scope.level != 'Full View' && $scope.level != 'Personal View') {
            $location.url("/app/home/");
        }
        if ($scope.level == 'Full View') {
            $scope.fullview = true;
        }
        console.log($scope.level);
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
}]);
