'use strict';

app.controller('captableController',
        ["$scope", "$rootScope", "$location", "$parse", "$filter",
         "SWBrijj", "calculate", "navState", "captable",
         "displayCopy", "History", "Investor", "attributes",
function($scope, $rootScope, $location, $parse, $filter, SWBrijj,
         calculate, navState, captable, displayCopy, History, Investor,
         attributes)
{
    if (navState.role == 'investor') {
        $location.path('/investor-captable');
        return;
    }
    var company = navState.company;
    $scope.currentCompany = company;

    captable.forceRefresh();
    $scope.ct = captable.getCapTable();
    $scope.captable = captable;
    var attrs = attributes.getAttrs();

    // Set the view toggles to their defaults
    $scope.editMode = false;
    $scope.windowToggle = false;
    $scope.$on('windowToggle', function(evt, val) {
        void(evt);
        $scope.windowToggle = val;
    });
    $scope.currentTab = 'details';
    $scope.state = {evidenceQuery: ""};
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
        return $filter('filter')($scope.ct.securities, $scope.securityFilter
                                 );
    };
    $scope.filteredSecurityNames = function() {
        return $scope.filteredSecurityList()
            .reduce(captable.accumulateProperty('name'), []);
    };
    $scope.tourshow = false;
    $scope.tourstate = 0;
    $scope.tourUp = function () { $scope.tourModal = false; };
    $scope.tourmessages = displayCopy.tourmessages;
    $scope.captabletips = displayCopy.captabletips;
    $scope.activityView = "ownership.company_activity_feed";
    $scope.tabs = [{'title': "Information"}, {'title': "Activity"}];
    $scope.tf = ["yes", "no"];
    $scope.liquidpref = ['None', '1X', '2X', '3X'];
    $scope.extraPeople = [];
    function logError(err) { console.log(err); }

    $scope.selectedCell = null;
    $scope.selectedInvestor = null;
    $scope.selectedSecurity = null;

    function selectedThing() {
        if ($scope.selectedCell) return 'selectedCell';
        if ($scope.selectedInvestor) return 'selectedInvestor';
        if ($scope.selectedSecurity) return 'selectedSecurity';
        return null;
    }
    $scope.undo = function() {
        console.log("undo");
        History.undo(selectedThing(), $scope);
    };
    $scope.redo = function() {
        History.redo(selectedThing(), $scope);
    };
    $scope.revert = function() {
        History.revert(selectedThing(), $scope);
    };

    // Sorting variables
    $scope.issueSort = 'date';
    $scope.rowSort = '-name';
    $scope.activeTran = [];
    
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
            background: linear-gradient(to right,  #1ABC96 0%,#1ABC96 " + p + "%,#C7C7C7 " + p + "%,#C7C7C7 100%);"
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

    // Initialize a few visible variables
    $scope.investorOrder = "name";
    $scope.sideToggleName = "Hide";
    $('.tour-box').affix({});

    $rootScope.$on('captable:initui', initUI);
    function initUI() {
        if (!$rootScope.companyIsZombie()) {
            $scope.editMode = false;
            $scope.sideToggle = false;
        } else {
            if (captable.totalOwnershipUnits() == 0) {
                $scope.editMode = true;
                $scope.ctFilter.date = null;
            }
        }
    }
    function cellIsSelected(inv, sec) {
        return $scope.selectedCell.investor == inv
            && $scope.selectedCell.security == sec;
    }
    $scope.selectCell = function(inv, sec, reselect) {
        $scope.currentTab = 'details';
        $scope.selectedSecurity = $scope.selectedInvestor = null;
        if (captable.cellFor(inv, sec) || $scope.editMode) {
            if (!$scope.editMode && ($scope.selectedCell && !reselect) && cellIsSelected(inv, sec)) {
                $scope.selectedCell = null;
                History.forget($scope, 'selectedCell');
                displayIntroSidebar();
            } else {
                History.forget($scope, 'selectedCell');
                $scope.selectedCell =
                    captable.cellFor(inv, sec, $scope.editMode);
                History.watch('selectedCell', $scope);
                displayCellDetails();
            }
            $scope.$broadcast("newSelection");
        }
    };
    function deselectCell() {
        displayIntroSidebar();
        $scope.selectedCell = null;
        History.forget($scope, 'selectedCell');
    }
    $scope.selectSecurity = function(security_name, reselect) {
        $scope.selectedCell = $scope.selectedInvestor = null;
        if (!$scope.editMode && ($scope.selectedSecurity && !reselect) &&
            $scope.selectedSecurity.name == security_name)
        {
            displayIntroSidebar();
            $scope.selectedSecurity = null;
            History.forget($scope, 'selectedSecurity');
        } else {
            History.forget($scope, 'selectedSecurity');
            $scope.selectedSecurity = null;
            $scope.selectedSecurity = $scope.ct.securities
                .filter(function(el) {
                    return el.name == security_name;
                })[0];
            History.watch('selectedSecurity', $scope);
            displaySecurityDetails();
        }
        $scope.$broadcast("newSelection");
    };
    function deselectSecurity() {
        displayIntroSidebar();
        $scope.selectedSecurity = null;
        History.forget($scope, 'selectedSecurity');
    }
    function deselectInvestor() {
        displayIntroSidebar();
        $scope.selectedInvestor = null;
        History.forget($scope, 'selectedInvestor');
    }
    $scope.selectInvestor = function(investor_name, reselect) {
        $scope.selectedCell = $scope.selectedSecurity = null;
        //deselectAllCells();
        if (!$scope.editMode && ($scope.selectedInvestor && !reselect) &&
                $scope.selectedInvestor.name == investor_name) {
            displayIntroSidebar();
            deselectInvestor();
        } else {
            History.forget($scope, 'selectedInvestor');
            $scope.selectedInvestor = $scope.ct.investors
                .filter(function(el) {
                    return el.name == investor_name;
                })[0];
            //$scope.selectedInvestor.old_name = $scope.selectedInvestor.name;
            History.watch('selectedInvestor', $scope);
            displayInvestorDetails();
        }
        $scope.$broadcast("newSelection");
    };
    $scope.updateInvestor = function(investor) {
        if (!investor.new_name || investor.new_name == "")
            $scope.removeInvestor(investor);
        else
            captable.updateInvestorName(investor);
    };
    $scope.removeInvestor = function(investor) {
        captable.removeInvestor(investor);
        $scope.selectedInvestor = null;
        displayIntroSidebar();
        History.forget($scope, 'selectedInvestor');
    };
    $scope.updateSecurity = function(security) {
        if (security.new_name.length == 0 && security.name.length > 0) {
            captable.deleteSecurity(security);
        }
        else if (security.new_name !== security.name) {
            captable.updateSecurityName(security);
        }
    };
    $scope.createNewSec = function() {
        $scope.addSecurityModal = true;
        $scope.newTranName = "";
        $scope.newTranType = "";
        $scope.newTranDate = new Date.today();
        $scope.newthing = null;
        $scope.selectedCell = $scope.selectedInvestor = null;
        History.forget($scope, 'selectedSecurity');
        History.watch('selectedSecurity', $scope);
    };

    $scope.addSecurityModalClose = function () {
        $scope.addSecurityModal = false;
    };

    $scope.modalAddSecurity = function() {
        $scope.newthing = captable.newSecurity();
        $scope.newthing.transactions[0].attrs.security = $scope.newTranName;
        $scope.newthing.transactions[0].attrs.security_type = $scope.newTranType;
        $scope.newthing.transactions[0].effective_date = $scope.newTranDate;
        captable.addSecurity($scope.newthing);
        $scope.selectedCell = $scope.selectedInvestor = null;
        History.forget($scope, 'selectedSecurity');
        $scope.selectedSecurity = $scope.newthing;
        History.watch('selectedSecurity', $scope);
        displaySecurityDetails();
    };

    $scope.setNewType = function(key) {
        $scope.newTranType = key;
    };

    // Date grabber
    $scope.dateSecurity = function (evt) {
        //Fix the dates to take into account timezone differences
        if (evt) { // User is typing
            if (evt != 'blur')
                keyPressed = true;
            var dateString = angular.element('securitydate').val();
            var charCode = (evt.which) ? evt.which : event.keyCode; // Get key
            if (charCode == 13 || (evt == 'blur' && keyPressed)) { // Enter key pressed or blurred
                var date = Date.parse(dateString);
                if (date) {
                    $scope.newTranDate = calculate.timezoneOffset(date);
                    keyPressed = false;
                }
            }
        } else { // User is using calendar
            if ($scope.newTranDate instanceof Date) {
                $scope.newTranDate = calculate.timezoneOffset($scope.newTranDate);
                keyPressed = false;
            }
        }
    };

    $scope.optsSec = {
        backdropFade: true,
        dialogFade: true,
        dialogClass: 'modal securitymodal'
    };

    $scope.addSecurity = function(new_sec) {
        if (new_sec.name == "" || new_sec == undefined || new_sec == null)
            return;
        captable.addSecurity(new_sec);
        $scope.selectSecurity(new_sec.name);
        $scope.new_sec = null;
    };
    $scope.$on('deleteSecurity', function(sec) {
        displayIntroSidebar();
        $scope.selectedSecurity = null;
        History.forget($scope, 'selectedSecurity');
    });
    $scope.updateSecName = function(sec) {
        sec.name = sec.attrs.security = sec.transactions[0].attrs.security;
    };
    $scope.$on('addSecurity', function(evt) {
        void(evt);
        $scope.addSecurity($scope.new_sec);
    });
    $scope.addInvestor = function(new_inv) {
        if (new_inv) captable.addInvestor(new_inv);
        $scope.selectInvestor(new_inv);
        $scope.new_inv = "";
    };

    // Preformatting on the date to factor in the local timezone offset
    var keyPressed = false;
    // Needed because selecting a date in the calendar is considered a blur,
    // so only save on blur if user has typed a key
    /*
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
    */
    $scope.canHover = function(cell) {
        return cell && (cell.u || cell.a);
    };

    function reselectCurrentSelection() {
        switch (selectedThing()) {
            case "selectedCell":
                $scope.selectCell($scope.selectedCell.investor,
                                  $scope.selectedCell.security, true);
                break;
            case "selectedInvestor":
                $scope.selectInvestor($scope.selectedInvestor.name, true);
                break;
            case "selectedSecurity":
                $scope.selectSecurity($scope.selectedSecurity.name, true);
                break;
        }
    }
    $scope.editViewToggle = function() {
        toggleDetailsView();
        $scope.editMode = !$scope.editMode;
        if ($scope.editMode)
        {
            $scope.ctFilter.date = null;
        }
        reselectCurrentSelection();
    };

    $scope.tabvisible = function(tab) {
        if (tab.title == "Activity") {
            if (tab.active === true &&
                    !(!$scope.editMode && $scope.fieldActive())) {
                tab.active = false;
                $scope.tabs[0].active = true;
            }
            return !$scope.editMode;
        } else {
            return true;
        }
    };

    function editableDetailsVisible() {
        return $scope.sideBar == 2 || $scope.sideBar == 1;
    }
    function viewOnlyDetailsVisible() {
        return $scope.sideBar == 4 || $scope.sideBar == 5;
    }
    function hideEditableDetails() {
        if (editableDetailsVisible()) {
            $scope.sideBar = "hello";
        }
    }
    function hideViewOnlyDetails() {
        if (viewOnlyDetailsVisible()) {
            $scope.sideBar = "hello";
        }
    }
    function displayCellDetails() {
        $scope.sideBar = $scope.editMode ? 2 : 4;
    }
    function displaySecurityDetails() {
        $scope.sideBar = $scope.editMode ? 1 : 5;
    }
    function displayIntroSidebar() {
        $scope.sideBar = "home";
    }
    function displayInvestorDetails() {
        $scope.sideBar = 3;
    }
    function toggleDetailsView() {
        switch ($scope.sideBar) {
            case 1:
                $scope.sideBar = 5;
                break;
            case 2:
                $scope.sideBar = 4;
                break;
            case 4:
                $scope.sideBar = 2;
                break;
            case 5:
                $scope.sideBar = 1;
                break;
            default:
                $scope.sideBar = "home";
                break;
        }
    }
    $scope.toggleView = function () {
        if ($scope.editMode) {
            hideEditableDetails();
            $scope.editMode = false;
            return $scope.editMode;
        } else {
            hideViewOnlyDetails();
            $scope.editMode = true;
            $scope.ctFilter.date = null;
            return $scope.editMode;
        }
    };

    $scope.fieldActive = function () {
        return isNaN(parseInt($scope.sideBar, 10));
    };

    $scope.switchCapTab = function(tab) {
        $scope.currentTab = tab;
    };
    $scope.toggleShown = function(obj) {
        if (obj.shown === undefined) {
            obj.shown = true;
        } else {
            obj.shown = !obj.shown;
        }
    };
    $scope.editEvidence = function(obj) {
        if (obj) {
            captable.evidence_object = obj;
            $scope.windowToggle = true;
        } else {
            captable.evidence_object = null;
            $scope.windowToggle = false;
        }
        return $scope.windowToggle;
    };

    $scope.shareModalOpts = {
        backdropFade: true,
        dialogFade: true,
        dialogClass: 'transferModal modal'
    };

    // Date grabber
    $scope.dateTransfer = function (evt) {
        //Fix the dates to take into account timezone differences
        if (evt) { // User is typing
            if (evt != 'blur')
                keyPressed = true;
            var dateString = angular.element('transferdate').val();
            var charCode = (evt.which) ? evt.which : evt.keyCode; // Get key
            if (charCode == 13 || (evt == 'blur' && keyPressed)) { // Enter key pressed or blurred
                var date = Date.parse(dateString);
                if (date) {
                    $scope.ct.transfer.date = calculate.timezoneOffset(date);
                    keyPressed = false;
                }
            }
        } else { // User is using calendar
            if ($scope.ct.transfer.date instanceof Date) {
                $scope.ct.transfer.date = calculate.timezoneOffset($scope.ct.transfer.date);
                keyPressed = false;
            }
        }
    };


    $scope.trantorow = function(tran, name) {
        tran.transferto = name;
    };

    $scope.isDebt = function(key) {
        var done = true;
        angular.forEach($scope.ct.securities, function(issue) {
            if (key == issue.issue &&
                    (issue.type=="Debt" || issue.type=="Safe")) {
                done = false;
                return false;
            }
        });
        if (done) {
            return true;
        }
    };

    $scope.tourclose = function () {
        $scope.sideToggle = false;
        $scope.tourModal = false;
    };

    $scope.touropts = {
        backdropFade: true,
        dialogFade: true,
        dialogClass: 'tourModal modal'
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

    //Captable row delete modal

    $scope.rmodalUp = function (investor) {
        $scope.rowDelete = true;
        $scope.minvestor = investor.namekey;
    };

    $scope.rclose = function () {
        $scope.closeMsg = 'I was closed at: ' + new Date();
        $scope.rowDelete = false;
    };


    //modal for updating issue fields that have different underlying values

    $scope.imodalUp = function (issue, field) {
        $scope.issueModal = true;
        $scope.changedIssue = issue;
        $scope.changedIssueField = field;
    };

    $scope.iclose = function () {
        $scope.closeMsg = 'I was closed at: ' + new Date();
        $scope.issueModal = false;
    };

    $scope.irevert = function (issue) {
        for (var i = 0, l = $scope.ct.securities.length; i < l; i++) {
            if ($scope.ct.securities[i].issue == issue.issue) {
                $scope.ct.securities[i] = angular.copy($scope.issueRevert);
                $scope.activeIssue = angular.copy($scope.issueRevert);
            }
        }
    };

    // Captable Sharing Modal
    $scope.modalUp = function () {
        $scope.ct.investors.forEach(function(inv) {
            if (inv.email && inv.email.trim().length > 0 && !inv.send) {
                inv.alreadyShared = true;
            }
        });
        $scope.capShare = true;
    };

    $scope.close = function () {
        $scope.ct.investors.forEach(function(inv) {
            if (!inv.alreadyshared && !inv.send) {
                // if they didn't have an email to start with, and we aren't emailing them now, blank out their email
                inv.email = "";
                inv.permission = "";
            }
        });
        $scope.closeMsg = 'I was closed at: ' + new Date();
        $scope.capShare = false;
    };

    // Alter already shared row's email address
    $scope.alterEmailModalUp = function (email) {
        $scope.capEditEmail = true;
        $scope.oldEmail = email;
        $scope.newEmail = angular.copy(email);
    };

    $scope.alterEmailModalClose = function () {
        $scope.closeMsg = 'I was closed at: ' + new Date();
        $scope.capEditEmail = false;
    };

    $scope.opts = {
        backdropFade: true,
        dialogFade: true
    };

    $scope.select2Options = {
        'multiple': true,
        'simple_tags': true,
        'tags': Investor.investors,
        'tokenSeparators': [",", " "],
        'placeholder': 'Enter email address & press enter'
    };

    // Controls the orange border around the send boxes if an email is not given
    $scope.emailCheck = function (bool, person) {
        if (bool) {
            return !person;
        } else {
            return false;
        }
    };

    $scope.autoCheck = function(person) {
        return person != null && person.length > 0;
    };

    $scope.turnOnShares = function () {
        angular.forEach($scope.ct.investors, function (row) {
            row.send = $scope.selectAll;
        });
    };

    $scope.updateSendRow = function(row) {
        if (row.email.length > 0) {
            row.send = $scope.autoCheck(row.email);
            if (!row.permission) {
                row.permission = "Personal";
            }
        } else {
            row.send = false;
            row.permission = null;
        }
    };

    //regex to deal with the parentheses
    var regExp = /\(([^)]+)\)/;
    // Send the share invites from the share modal
    $scope.sendInvites = function () {
        angular.forEach($scope.ct.investors, function (row) {
            if (row.send == true) {
                SWBrijj.procm("ownership.share_captable",
                              row.email.toLowerCase(),
                              row.name)
                .then(function(data) {
                    if (row.permission == "Full") {
                        SWBrijj.proc('ownership.update_investor_captable', row.email.toLowerCase(), 'Full View').then(function (data) {
                            $scope.lastsaved = Date.now();
                            $scope.$emit("notification:success", "Your table has been shared!");
                            row.access_level = "Full View";
                        });
                    }
                    else {
                        $scope.lastsaved = Date.now();
                        $scope.$emit("notification:success", "Your table has been shared!");
                        row.access_level = "Personal View";
                    }
                    row.send = false;
                }).except(function(err) {
                    if (err.message == "ERROR: Duplicate email for the row") {
                        $scope.$emit("notification:fail", row.email + " failed to send as this email is already associated with another row");
                    }
                    else {
                        $scope.$emit("notification:fail", "Email : " + row.email + " failed to send");
                    }
                });
            }
        });

        // Handles the non-shareholder shares
        if ($scope.extraPeople.length > 0) {
            angular.forEach($scope.extraPeople, function (people) {
                if (people) {
                    var matches = regExp.exec(people);
                    if (matches == null) {
                        matches = ["", people];
                    }
                    SWBrijj.procm("ownership.share_captable", matches[1].toLowerCase(), "").then(function (data) {
                        SWBrijj.proc('ownership.update_investor_captable', matches[1].toLowerCase(), 'Full View').then(function (data) {
                            $scope.lastsaved = Date.now();
                            $scope.$emit("notification:success", "Your table has been shared!");
                        });
                    }).except(function(err) {
                            $scope.$emit("notification:fail", "Email : " + people + " failed to send");
                        });
                }
            });
            $scope.extraPeople = [];
        }
    };

    var re = /^(([^<>()[\]\\.,;:\s@\"]+(\.[^<>()[\]\\.,;:\s@\"]+)*)|(\".+\"))@((\[[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\])|(([a-zA-Z\-0-9]+\.)+[a-zA-Z]{2,}))$/;
    $scope.fieldCheck = function(email) {
        return re.test(email);
    };

    // Prevents the share button from being clickable until
    // a send button has been clicked and an address filled out
    $scope.checkInvites = function () {
        var checkcontent = false;
        var checksome = false;
        angular.forEach($scope.ct.investors, function(row) {
            if (row.send == true &&
                    (row.email != null &&
                     row.email != "" &&
                     $scope.fieldCheck(row.email))) {
                checkcontent = true;
            }
            if (row.send == true) {
                checksome = true;
            }
        });
        angular.forEach($scope.extraPeople, function(people) {
            var matches = regExp.exec(people);
            if (matches == null) {
                matches = ["", people];
            }
            if (matches[1] != null &&
                    matches[1] != "" &&
                    $scope.fieldCheck(matches[1])) {
                checkcontent = true;
            } else {
                checkcontent = false;
            }
            if (people) {
                checksome = true;
            }
        });
        return !(checksome && checkcontent);
    };

    $scope.tourfunc = function() {
        if ($scope.tourstate > 4) {
            $scope.tourstate = 0;
        } else if ($scope.tourstate == 1) {
            $(".captable.tableView > tbody > tr:nth-child(3) > td:nth-child(3) input:first-of-type").focus();
        } else if ($scope.tourstate == 2) {
            $(".tableView.captable th > input:first-of-type").focus();
        } else if ($scope.tourstate == 3) {
            $scope.sideToggle = false;
        } else if ($scope.tourstate == 4) {
            $(".captable.tableView > tbody > tr:nth-child(3) > td:nth-child(4) input:first-of-type").focus();
        }
    };

    $scope.kissTour = function() {
        _kmq.push(['record', 'CT Tour Started']);
    };
    $scope.moveTour = function() {
        $scope.tourstate += 1;
        $scope.tourfunc();
    };
    $scope.gotoTour = function(x) {
        $scope.tourstate = parseInt(x);
        $scope.tourfunc();
    };
    $scope.closeTour = function() {
        $scope.tourstate = 0;
        $scope.tourshow = false;
    };

    $scope.tourNotification = function() {
        $scope.$emit("notification:success",
                     $scope.tourmessages.success);
    };

    $scope.accessmodalUp = function (person) {
        $scope.capAccess = true;
        angular.forEach($scope.userstatuses, function(user) {
            if (person == user.email) {
                person = user;
            }
        });
        $scope.selectedI = angular.copy(person);
    };

    $scope.accessclose = function () {
        $scope.closeMsg = 'I was closed at: ' + new Date();
        $scope.capAccess = false;
    };

    $scope.selectVisibility = function (value, person) {
        $scope.selectedI.level = value;
    };

    $scope.changeVisibility = function (person) {
        SWBrijj.proc('ownership.update_investor_captable', person.email, person.level).then(function (data) {
            void(data);
            angular.forEach($scope.userstatuses, function(peep) {
                if (peep.email == person.email) {
                    peep.level = person.level;
                }
            });
            $scope.$emit("notification:success", "Successfully changed permissions");
        }).except(function(x) {
            void(x);
            $scope.$emit("notification:fail", "Something went wrong, please try again later.");
        });
    };

    $scope.shareopts = {
        backdropFade: true,
        dialogFade: true,
        dialogClass: 'modal'
    };

    $scope.gotoProfile = function(email, name) {
        if (!email) return;
        var link = (navState.userid == email) ?
                    '/app/account/profile' :
                    '/app/company/profile/view?id='+encodeURIComponent(email);
        $location.url(link);
    };

    $scope.securityUnitLabel = function(security) {
        var type = $filter('issueUnitLabel')(security.attrs.security_type);
        return type;
    };

    //switches the sidebar based on the type of the issue
    $scope.funcformatAmount = function (amount) {
        return calculate.funcformatAmount(amount);
    };

    var memformatamount = memoize($scope.funcformatAmount);
    $scope.formatAmount = function(amount) {
        return memformatamount(amount);
    };

    $scope.formatDollarAmount = function(amount) {
        var output = calculate.formatMoneyAmount(memformatamount(amount), $scope.settings);
        return (output);
    };

    $scope.chosenTab = function(tab, type) {
        return (tab.title == type);
    };

    // CSV Generation

    $scope.downloadCsv = function() {
        SWBrijj.procd($rootScope.navState.name + '_captable.csv', 'text/csv', 'ownership.export_captable').then(function(x) {
            document.location.href = x;
        });
    };

    // Number of shareholders
    $scope.numShareholders = function() {
        return calculate.numShareholders($scope.ct.investors);
    };

    // Total Shares | Paid for an issue column (type is either u or a)
    var totalPaid = memoize(calculate.totalPaid);
    $scope.totalPaid = function(investors) {
        return $scope.formatDollarAmount(totalPaid(investors));
    };

    // Total Shares for a shareholder row
    var shareSum = memoize(calculate.shareSum);
    $scope.shareSum = function(row) {
        return $scope.formatAmount(shareSum(row));
    };

    // Total percentage ownership for each shareholder row
    $scope.pricePerShare = function() {
        return $scope.formatDollarAmount(calculate.pricePerShare($scope.ct.securities, $scope.finishedsorting));
    };

    // Last issue date for the sidebar In Brief section
    $scope.lastIssue = function() {
        return calculate.lastIssue($scope.ct.securities, $scope.finishedsorting);
    };

    // Last issue date for the sidebar In Brief section
    $scope.lastPostMoney = function() {
        return $scope.formatDollarAmount(calculate.lastPostMoney($scope.ct.securities, $scope.finishedsorting));
    };

    $scope.namePaste = function(ev, row) {
        var pastednames = ev.originalEvent.clipboardData.getData('text/plain');
        var splitnames = pastednames.split("\n");
        var number = splitnames.length;
        for (var i = 0; i < number; i++) {
            var name = splitnames[i];
            captable.addInvestor(name);
        }
        return false;
    };

    $scope.securityTypeDropdown = function() {
        return Object.keys(attrs).sort();
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
        return captable.numUnissued(sec, $scope.ct.securities,
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

// IE fix to remove enter to submit form
function testForEnter(event)
{
    if (event.keyCode == 13)
    {
        event.cancelBubble = true;
        event.returnValue = false;
    }
}
