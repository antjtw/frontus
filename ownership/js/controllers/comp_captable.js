app.controller('captableController',
        ["$scope", "$rootScope", "$location", "$parse", "$filter",
         "SWBrijj", "calculate", "switchval", "navState", "captable",
         "displayCopy", "History",
function($scope, $rootScope, $location, $parse, $filter, SWBrijj,
         calculate, switchval, navState, captable, displayCopy, History)
{
    if (navState.role == 'investor') {
        $location.path('/investor-captable');
        return;
    }
    var company = navState.company;
    $scope.currentCompany = company;
    
    $scope.ct = captable.getCapTable();
    $scope.captable = captable;

    // Set the view toggles to their defaults
    $scope.editMode = false;
    $scope.windowToggle = false;
    $scope.$on('windowToggle', function(evt, val) {
        void(evt);
        $scope.windowToggle = val;
    });
    $scope.currentTab = 'details';
    $scope.state = {evidenceQuery: ""};
    $scope.tourshow = false;
    $scope.tourstate = 0;
    $scope.tourUp = function () { $scope.tourModal = true; };
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

    // Initialize a few visible variables
    $scope.investorOrder = "name";
    $scope.sideToggleName = "Hide";
    $('.tour-box').affix({});

    $rootScope.$on('captable:initui', initUI);
    function initUI() {
        if (!$rootScope.companyIsZombie()) {
            $scope.editMode = false;
            $scope.tourshow = true;
            $scope.sideToggle = true;
            $scope.tourUp();
        }
    }
    function cellIsSelected(inv, sec) {
        return $scope.selectedCell.investor == inv
            && $scope.selectedCell.security == sec;
    }
    $scope.selectCell = function(inv, sec) {
        $scope.currentTab = 'details';
        $scope.selectedSecurity = $scope.selectedInvestor = null;
        if (!$scope.editMode && $scope.selectedCell && cellIsSelected(inv, sec)) {
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
    };
    $scope.selectSecurity = function(security_name) {
        $scope.selectedCell = $scope.selectedInvestor = null;
        if (!$scope.editMode && $scope.selectedSecurity &&
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
    $scope.selectInvestor = function(investor_name) {
        $scope.selectedCell = $scope.selectedSecurity = null;
        //deselectAllCells();
        if (!$scope.editMode && $scope.selectedInvestor &&
                $scope.selectedInvestor.name == investor_name) {
            displayIntroSidebar();
            $scope.selectedInvestor = null;
            History.forget($scope, 'selectedInvestor');
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
        captable.updateInvestorName(investor);
    };
    $scope.updateSecurity = function(security) {
        captable.updateSecurityName(security);
    };
    $scope.createNewSec = function() {
        $scope.new_sec = captable.newSecurity();
        $scope.selectedCell = $scope.selectedInvestor = null;
        History.forget($scope, 'selectedSecurity');
        $scope.selectedSecurity = $scope.new_sec;
        History.watch('selectedSecurity', $scope);
        displaySecurityDetails();
    };
    $scope.addSecurity = function(new_sec) {
        if (new_sec.name == "" || new_sec == undefined || new_sec == null)
            return;
        captable.addSecurity(new_sec);
        $scope.selectSecurity(new_sec.name);
        $scope.new_sec = null;
    };
    $scope.updateSecName = function(sec) {
        sec.name = sec.attrs.security = sec.transactions[0].attrs.security;
    }
    $scope.$on('addSecurity', function(evt) {
        void(evt);
        $scope.addSecurity($scope.new_sec);
    });
    $scope.addInvestor = function(new_inv) {
        if (new_inv) captable.addInvestor(new_inv);
        $scope.selectInvestor(new_inv);
        $scope.new_inv = "";
    };

    $scope.addIssuePari = function(items) {
        items.push({"company": items[0].company,
                    "issue": items[0].issue,
                    "pariwith": null});
    };

    $scope.availableKeys = function(securities, paripassu) {
        var list = [];
        var used = [];
        list.push("");
        angular.forEach(paripassu, function(pari) {
            used.push(pari.pariwith);
        });
        angular.forEach(securities, function(issue) {
            if (used.indexOf(issue) == -1) {
                list.push(issue);
            }
        });
        return list;
    };

    $scope.showPari = function(list) {
        return list.length > 0;
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
    $scope.rowFor = function(inv) {
        return $scope.ct.cells
            .filter(function(cell) {
                return cell.investor == inv;
            });
    };
    $scope.rowSum = function(inv) {
        return $scope.rowFor(inv)
            .reduce(function(prev, cur, idx, arr) {
                return prev + (calculate.isNumber(cur.u) ? cur.u : 0);
            }, 0);
    };
    $scope.canHover = function(cell) {
        return cell && (cell.u || cell.a);
    };

    function reselectCurrentSelection() {
        switch (selectedThing()) {
            case "selectedCell":
                $scope.selectCell($scope.selectedCell.investor,
                                  $scope.selectedCell.security);
                break;
            case "selectedInvestor":
                $scope.selectInvestor($scope.selectedInvestor.name);
                break;
            case "selectedSecurity":
                $scope.selectSecurity($scope.selectedSecurity.name);
                break;
        }
    }
    $scope.editViewToggle = function() {
        toggleDetailsView();
        $scope.editMode = !$scope.editMode;
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

    $scope.tabnumber = function() {
        var total = 0;
        angular.forEach($scope.tabs, function(tab) {
            if ($scope.tabvisible(tab)) {
                total += 1;
            }
        });
        return total;
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
    // Captable Conversion Modal
    $scope.convertSharesUp = function(trans) {
        $scope.convertTran = {};
        $scope.convertTran.tran = trans[0];
        $scope.convertTran.newtran = {}
        $scope.convertTran.step = '1';
        $scope.convertTran.date = new Date.today();
        $scope.convertTransOptions = trans;
        $scope.convertModal = true;

        $scope.$watch('convertTran.ppshare', function(newval, oldval) {
            if (!calculate.isNumber(newval)) {
                $scope.convertTran.ppshare = oldval;
            }
        }, true);
    };

    $scope.convertSharesClose = function() {
        $scope.convertModal = false;
    };

    $scope.convertgoto = function(number) {
        $scope.convertTran.step = number;
        if (number == '2') {
            $scope.convertTran.newtran = angular.copy($scope.convertTran.tran);
            $scope.convertTran.newtran = captable.inheritAllDataFromIssue($scope.convertTran.newtran, $scope.convertTran.toissue);
            $scope.convertTran.newtran.amount = calculate.debtinterest($scope.convertTran);
            $scope.convertTran.newtran = calculate.conversion($scope.convertTran);
        }
    };

    $scope.convertopts = {
        backdropFade: true,
        dialogFade: true,
        dialogClass: 'convertModal modal'
    };

    // Filters the dropdown to only equity securities
    $scope.justEquity = function(securities, tran) {
        var list = [];
        angular.forEach(securities, function(issue) {
            if (issue.type == "Equity" && issue.issue != tran.issue) {
                list.push(issue);
            }
        });
        return list;
    };

    $scope.assignConvert = function(tran) {
        $scope.convertTran.tran = tran;
    }

    // Performs the assignment for the dropdown selectors
    $scope.assignConvert = function(field, value) {
        $scope.convertTran[field] = value;
        if (field == "toissue") {
            $scope.convertTran.method = null;
        }
    };

    // Date grabber
    $scope.dateConvert = function (evt) {
        //Fix the dates to take into account timezone differences
        if (evt) { // User is typing
            if (evt != 'blur')
                keyPressed = true;
            var dateString = angular.element('converttrandate').val();
            var charCode = (evt.which) ? evt.which : event.keyCode; // Get key
            if (charCode == 13 || (evt == 'blur' && keyPressed)) { // Enter key pressed or blurred
                var date = Date.parse(dateString);
                if (date) {
                    $scope.convertTran.date = calculate.timezoneOffset(date);
                    keyPressed = false;
                }
            }
        } else { // User is using calendar
            if ($scope.convertTran.date instanceof Date) {
                $scope.convertTran.date = calculate.timezoneOffset($scope.convertTran.date);
                keyPressed = false;
            }
        }
    };

    $scope.splitSharesUp = function(issue) {
        $scope.splitIssue = angular.copy(issue);
        $scope.splitIssue.ratioa = 1;
        $scope.splitIssue.ratiob = 1;
        $scope.splitIssue.date = new Date.today();
        $scope.splitModal = true;
    };

    $scope.splitSharesClose = function() {
        $scope.splitModal = false;
    };

    // Date grabber
    $scope.dateSplit = function (evt) {
        //Fix the dates to take into account timezone differences
        if (evt) { // User is typing
            if (evt != 'blur')
                keyPressed = true;
            var dateString = angular.element('splitissuedate').val();
            var charCode = (evt.which) ? evt.which : event.keyCode; // Get key
            if (charCode == 13 || (evt == 'blur' && keyPressed)) { // Enter key pressed or blurred
                var date = Date.parse(dateString);
                if (date) {
                    $scope.splitIssue.date = calculate.timezoneOffset(date);
                    keyPressed = false;
                }
            }
        } else { // User is using calendar
            if ($scope.splitIssue.date instanceof Date) {
                $scope.splitIssue.date = calculate.timezoneOffset($scope.splitIssue.date);
                keyPressed = false;
            }
        }
    };

    $scope.totalinissue = function(issue) {
        var total = 0;
        angular.forEach($scope.ct.trans, function(tran) {
            if (tran.issue == issue.issue) {
                total += tran.units;
                if (tran.forfeited) {
                    total -= tran.forfeited
                }
            }
        });
        return total;
    };

    $scope.splitvalue = function(issue) {
        var ratio = parseFloat(issue.ratioa) / parseFloat(issue.ratiob);
        if (isFinite($scope.totalinissue(issue) / ratio)) {
            return ($scope.totalinissue(issue) / ratio);
        }
    };

    $scope.splitppshare = function(issue) {
        var ratio = parseFloat(issue.ratioa) / parseFloat(issue.ratiob);
        if (isFinite(ratio)) {
            if (issue.type == "Equity") {
                return (issue.ppshare * ratio);
            }
            else if (issue.type == "Option") {
                return (issue.price * ratio);
            }
        }
    };

    // Captable Transfer Modal

    $scope.ct.transferSharesUp = function(activetran) {
        $scope.ct.transferModal = true;
        $scope.ct.transfer = {};
        $scope.ct.transfer.trans = angular.copy(activetran);
        $scope.ct.transfer.date = new Date.today();
        for (var i=0; i < $scope.ct.transfer.trans.length; i++) {
            $scope.ct.transfer.trans[i].transferunits = 0;

            // This watch caps the amount you can transfer to the units available
            // This seems depressingly long winded, definitely worth looking into further
            $scope.$watch('transfer.trans['+i+']', function(newval, oldval) {
                if (parseFloat(newval.transferunits) > parseFloat(oldval.units) || newval.transferunits == "-" || parseFloat(newval.transferunits) < 0) {
                    for (var x=0; x < $scope.ct.transfer.trans.length; x++) {
                        if ($scope.ct.transfer.trans[x].tran_id == newval.tran_id) {
                            $scope.ct.transfer.trans[x].transferunits = oldval.transferunits;
                        }
                    }
                }
            }, true);
        }
    };

    $scope.ct.transferSharesClose = function() {
        $scope.ct.transferModal = false;
    };

    $scope.ct.transferopts = {
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
            var charCode = (evt.which) ? evt.which : event.keyCode; // Get key
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
                done = false
                return false
            }
        });
        if (done) {
            return true
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

    // Captable transaction delete modal
    $scope.tranDeleteUp = function (transaction) {
        $scope.deleteTran = transaction;
        $scope.tranDelete = true;
    };

    $scope.deleteclose = function () {
        $scope.closeMsg = 'I was closed at: ' + new Date();
        $scope.tranDelete = false;
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
        $scope.capShare = true;
    };

    $scope.close = function () {
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

    /*
    $scope.alterEmail = function() {
        if ($scope.newEmail != "") {
            SWBrijj.proc('ownership.update_row_share',
                         $scope.newEmail,
                         $scope.oldEmail,
                         $scope.activeInvestorName)
            .then(function(data) {
                $scope.lastsaved = Date.now();
                angular.forEach($scope.ct.investors, function (row) {
                    if (row.name == $scope.activeInvestorName) {
                        $scope.$emit("notification:success",
                                     "Email address updated");
                        row.emailkey = row.email = $scope.newEmail;
                        $scope.activeInvestorEmail = $scope.newEmail;
                    }
                });
            });
        }
    };
    */

    $scope.opts = {
        backdropFade: true,
        dialogFade: true
    };

    $scope.select2Options = {
        'multiple': true,
        'simple_tags': true,
        'tags': $scope.ct.vInvestors,
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
                row.permission = "Personal"
            }
        } else {
            row.send = false;
            row.permission = null
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
                        });
                    }
                    else {
                        $scope.lastsaved = Date.now();
                        $scope.$emit("notification:success", "Your table has been shared!");
                    }
                    row.send = false;
                    row.emailkey = row.email;
                }).except(function(err) {
                        if (err.message = "ERROR: Duplicate email for the row") {
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
        return !(checksome && checkcontent)
    };

    // Hides transaction fields for common stock
    $scope.commonstock = function(tran) {
        var common = false;
        angular.forEach($scope.ct.securities, function(issue) {
            if (issue.issue == tran.issue) {
                common = issue.common ? true : false
            }
        });
        return common
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
        $scope.selectedI.level = value
    };

    $scope.changeVisibility = function (person) {
        SWBrijj.proc('ownership.update_investor_captable', person.email, person.level).then(function (data) {
            void(data);
            angular.forEach($scope.userstatuses, function(peep) {
                if (peep.email == person.email) {
                    peep.level = person.level
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
                    '/app/company/profile/view?id='+email;
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

    /*$scope.typeLocked = function(issue) {
        if (issue.liquidpref || issue.interestrate || issue.valcap || issue.discount || issue.optundersecurity || issue.vestcliff || issue.vestingbegins || issue.vestfreq) {
            return false
        }
        else {
            return true
        }
    };*/

    $scope.chosenTab = function(tab, type) {
        return (tab.title == type);
    };

    // CSV Generation

    $scope.downloadCsv = function() {
        SWBrijj.procd($rootScope.navState.name + '_captable.csv', 'text/csv', 'ownership.export_captable').then(function(x) {
            document.location.href = x;
        });
    };

    //switches the sidebar based on the type of the issue
    $scope.trantype = function (type, activetype) {
        return switchval.trantype(type, activetype);
    };

    // Number of shareholders
    $scope.numShareholders = function() {
        return calculate.numShareholders($scope.ct.investors);
    };

    /*
    var totalShares = memoize(calculate.totalShares)
    $scope.totalShares = function(investors) {
        return $scope.formatAmount(totalShares(investors));
    };
    */

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

    // Total Shares | Paid for an issue column (type is either u or a)
    var colTotalIssued = memoize(calculate.colTotalIssued);
    $scope.colTotalIssued = function(header, investors, type) {
        return colTotalIssued(header, investors, type);
    };

    // Total Shares | Paid for an issue column (type is either u or a)
    var colTotal = memoize(calculate.colTotal);
    $scope.colTotal = function(header, investors, type) {
        return colTotal(header, investors, type);
    };

    /*
    var sharePercentage = memoize(calculate.sharePercentage);
    $scope.sharePercentage = function(row, investors) {
        return sharePercentage(shareSum(row), totalShares(investors));
    };
    */

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

    //Watches constraining various values

    // This should really be in a directive (or more properly get some clever css set-up to do it for me...
    $scope.$watch(function() {return $(".leftBlock").height(); }, function(newValue, oldValue) {
        $scope.stretchheight = {height: String(newValue + 59) + "px"}
    });

    /*
    function generic_watch(newval, oldval, obj) {
        if (!newval || !oldval) {return;}
        if (parseFloat(newval.interestrate) > 100 ||
            parseFloat(newval.interestrate) < 0)
        {
            for (var x=0; x < obj.length; x++) {
                if (obj[x] && obj[x].tran_id == newval.tran_id) {
                    obj[x].interestrate = oldval.interestrate;
                }
            }
        }
        if (parseFloat(newval.discount) > 100 ||
            parseFloat(newval.discount) < 0)
        {
            for (var x=0; x < obj.length; x++) {
                if (obj[x] && obj[x].tran_id == newval.tran_id) {
                    obj[x].discount = oldval.discount;
                }
            }
        }
        if (parseFloat(newval.vestcliff) > 100 ||
            parseFloat(newval.vestcliff) < 0)
        {
            for (var x=0; x < obj.length; x++) {
                if (obj[x] && obj[x].tran_id == newval.tran_id) {
                    obj[x].vestcliff = oldval.vestcliff;
                }
            }
        }
    }

    $scope.ct.transaction_watch = function(newval, oldval) {
        generic_watch(newval, oldval, $scope.ct.trans);
    };

    $scope.issue_watch = function(newval, oldval) {
        generic_watch(newval, oldval, $scope.ct.securities);
    };
    */

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
