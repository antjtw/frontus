var captableController = function(
        $scope, $rootScope, $location, $parse, $filter, SWBrijj,
        calculate, switchval, sorting, navState, captable, displayCopy)
{
    if (navState.role == 'investor') {
        $location.path('/investor-captable');
        return;
    }
    var company = navState.company;
    $scope.currentCompany = company;
    
    $scope.ct = captable.getNewCapTable();

    // Set the view toggles to their defaults
    $scope.radioModel = "Edit";
    $scope.maintoggle = true;
    $scope.windowToggle = false;
    $scope.dilutionSwitch = true;
    $scope.captablestate = 0;
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
    $scope.issuetypes = captable.getIssueTypes();
    $scope.freqtypes = captable.getFrequencyTypes();
    $scope.eligible_evidence = captable.getEligibleEvidence();
    $scope.evidence_object = null;
    $scope.evidenceOrder = 'docname';
    $scope.evidenceNestedOrder = 'name';
    $scope.extraPeople = [];
    function logError(err) { console.log(err); }

    // Sorting variables
    $scope.issueSort = 'date';
    $scope.rowSort = '-name';
    $scope.activeTran = [];

    // Initialize a few visible variables
    $scope.investorOrder = "name";
    $scope.sideToggleName = "Hide";
    $('.tour-box').affix({});

    // TODO get this in a service
    // ownership.clean_company_access
    // => then
    // => $q.all([get_company_activity, user_tracker])
    SWBrijj.tblm("ownership.clean_company_access").then(function (data) {
        Intercom('update', {company : {'captable_shares':data.length}});
        $scope.userstatuses = data;
        var userDict = {};

        angular.forEach($scope.userstatuses, function(userStatus) {
            userDict[userStatus.email] = {};
            userDict[userStatus.email].name =
                userStatus.name ? userStatus.name : userStatus.email;
            userDict[userStatus.email].shown = false;
            userDict[userStatus.email].level = userStatus.level;
        });
        SWBrijj.procm("ownership.get_company_activity")
        .then(function(activities) {
            SWBrijj.tblm("ownership.user_tracker")
            .then(function(logins) {
                angular.forEach($scope.userstatuses, function(person) {
                    angular.forEach(activities, function(activity) {
                        if (activity.email == person.email) {
                            var act = activity.activity;
                            var time = activity.event_time;
                            userDict[person.email][act] = time;
                        }
                    });
                    angular.forEach(logins, function (login) {
                        if (login.email == person.email) {
                            userDict[person.email].lastlogin =
                                login.logintime;
                        }
                    });
                });
            }).except(logError);
        }).except(logError);
        $scope.userDict = userDict;
    });
    $rootScope.$on('captable:initui', initUI);
    function initUI() {
        if (!$rootScope.companyIsZombie()) {
            $scope.maintoggle = false;
            $scope.radioModel = "View";
            $scope.tourshow = true;
            $scope.sideToggle = true;
            $scope.tourUp();
        }
    }
    function deselectAllCells() {
        angular.forEach($scope.ct.rows, function (row) {
            row.state = false;
            angular.forEach($scope.ct.securities, function (issue) {
                if (issue.issue) {
                    if (row.cells[issue.issue]) {
                        row.cells[issue.issue].state = false;
                    }
                    issue.state = false;
                }
            });
        });
    }
    function deselectTransaction(currenttran, currentcolumn) {
        $scope.activeTran = [];
        $scope.activeIssue = undefined;
        $scope.activeInvestor = undefined;
        $scope.sideBar = "home";
        deselectAllCells();
    }
    function selectTransaction(currenttran, currentcolumn) {
        $scope.sideBar = $scope.toggleView() ? 4 : 2;
        $scope.activeTran = [];
        $scope.activeIssue = currentcolumn;
        $scope.activeInvestor = currenttran;
        $scope.allowKeys = calculate.complement($scope.ct.security_names,
                                                [currentcolumn]);
        // try finding the transaction
        var first = 0;
        angular.forEach($scope.ct.trans, function (tran) {
            if (tran.investor == currenttran && tran.issue == currentcolumn) {
                if (first === 0) {
                    tran.active = true;
                    first = first + 1;
                }
                tran.partpref = calculate.booltoYN(tran, 'partpref', $scope.tf);
                tran.dragalong = calculate.booltoYN(tran, 'dragalong', $scope.tf);
                tran.tagalong = calculate.booltoYN(tran, 'tagalong', $scope.tf);
                $scope.activeTran.push(tran);
            }
        });
        // try creating a new transaction
        if ($scope.activeTran.length < 1 && !$scope.toggleView()) {
            var anewTran = captable.newTransaction(currentcolumn,
                                                   $scope.activeInvestor);
            $scope.ct.trans.push(anewTran);
            $scope.activeTran.push(anewTran);
        }

        // give up
        if ($scope.activeTran.length < 1 && $scope.toggleView()) {
            $scope.activeIssue = undefined;
            $scope.activeInvestor = undefined;
            $scope.sideBar = "home";
        }

        // select cell
        angular.forEach($scope.ct.rows, function (row) {
            row.state = false;
            angular.forEach($scope.ct.securities, function (issue) {
                if (issue.issue) {
                    if (row.name == currenttran &&
                            currentcolumn == issue.issue &&
                            $scope.activeTran.length > 0) {
                        row.cells[currentcolumn].state = true;
                    }
                    else if (row.cells[issue.issue]) {
                        row.cells[issue.issue].state = false;
                    } else {
                        issue.state = false;
                    }
                }
            });
        });
    }
    $scope.selectCell = function(inv, sec) {
        $scope.currentTab = 'details';
        $scope.sidebarstart = angular.copy($scope.sidebar);
        $scope.cellRevert = angular.copy($scope.selectedCell);
        if ($scope.selectedCell &&
                $scope.selectedCell.investor == inv &&
                $scope.selectedCell.security == sec) {
            $scope.selectedCell = null;
            $scope.sideBar = "home";
            deselectAllCells();
        } else {
            $scope.selectedCell = $scope.cellFor(inv, sec);
            $scope.sideBar = $scope.toggleView() ? 4 : 2;
            $scope.allowKeys = calculate.complement(
                    $scope.ct.security_names, [sec]);
            console.log($scope.selectedCell);
        }
    };
    /*
    $scope.getActiveTransaction = function(currenttran, currentcolumn) {
        $scope.currentTab = 'details';
        $scope.sidebarstart = angular.copy($scope.sideBar);
        $scope.oldActive = angular.copy($scope.activeTran);
        // selected transaction == active transaction
        if ($scope.toggleView() &&
                $scope.oldActive &&
                $scope.oldActive[0] &&
                $scope.oldActive[0].investorkey == currenttran &&
                $scope.oldActive[0].key == currentcolumn) {
            deselectTransaction(currenttran, currentcolumn);
        } else {
            selectTransaction(currenttran, currentcolumn);
        }
    };
    */

    $scope.selectSecurity = function(security_name) {
        deselectAllCells();
        if ($scope.toggleView() && $scope.selectedSecurity &&
            $scope.selectedSecurity.name == security_name)
        {
            $scope.sideBar = "home";
            $scope.selectedSecurity = null;
        } else {
            $scope.selectedSecurity = $scope.ct.securities
                .filter(function(el) {
                    return el.name == security_name;  
                })[0];
            $scope.sideBar = $scope.toggleView() ? 5 : 1;
            $scope.securityRevert = angular.copy(
                                        $scope.selectedSecurity);
            $scope.allowKeys = calculate.complement(
                    $scope.ct.security_names, [security_name]);
        }
    };
    /*
    $scope.getActiveIssue = function (issuekey) {
        // selected issue == active issue
        if ($scope.toggleView() && $scope.activeIssue &&
                $scope.activeIssue.issue == issuekey) {
            deselectAllCells();
            $scope.sideBar = "home";
            $scope.activeIssue = undefined;
        } else {
            angular.forEach($scope.ct.securities, function(issuefull) {
                if (issuefull.issue == issuekey) {
                    issue = issuefull;
                }
            });
            $scope.sideBar = $scope.toggleView() ? 5 : 1;
            $scope.activeIssue = issue;
            $scope.issueRevert = angular.copy(issue);

            deselectAllCells();

            issue.state = true;
            $scope.allowKeys = calculate.complement($scope.ct.security_names,
                                                    [issuekey]);
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
    */

    $scope.saveIssueAssign = function (issue, field, i) {
        if (i) { issue[field] = i; }
        $scope.saveIssueCheck(issue, field);
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
        if ($scope.issueModal === true) {
            return;
        } else if (!angular.equals(testcopy, $scope.issueRevert)) {
            $scope.saveIssue(issue, field);
        } else {
            return;
        }
    };

    /* Save Issue Function.
     * Takes the issue and the item being changed so sub transactions can
     * also be updated in just that field.
     *  TODO refactor
     */
    $scope.saveIssue = function (issue, item) {
        if (item == "issuekey") {
            item = "issue";
            angular.forEach($scope.ct.securities, function(issuefull) {
                if (issuefull.issue == issue) {
                    issue = issuefull;
                }
            });
        }
        if ((issue.issue === null || issue.issue === "") &&
                issue.key === null) {
            return;
        } else if (issue.issue === "" && issue.key !== null) {
            $scope.dmodalUp(issue);
            return;
        } else {
            if (issue.key !== null && issue.key !== undefined) {
                var dateconvert = issue.date;
                var d1 = dateconvert.toUTCString();
                var partpref = calculate.strToBool(issue.partpref);
                var dragalong = calculate.strToBool(issue.dragalong);
                var tagalong = calculate.strToBool(issue.tagalong);
                var common = calculate.strToBool(issue.common);
                issue.vestingbegins = calculate.whenVestingBegins(issue);
                if (issue.issue == "name") { issue.issue = "No name"; }
                angular.forEach($scope.ct.securities, function (x) {
                    // Duplicate issue names are not allowed
                    if (x.issue !== "" && issue.issue == x.issue && x != issue) {
                        issue.issue = issue.issue + " (1)";
                    }
                });
                SWBrijj.proc('ownership.update_issue',
                             issue.key,
                             issue.type,
                             d1,
                             issue.issue,
                             calculate.toFloat(issue.premoney),
                             calculate.toFloat(issue.postmoney),
                             calculate.toFloat(issue.ppshare),
                             calculate.toFloat(issue.totalauth),
                             partpref,
                             issue.liquidpref,
                             issue.optundersec,
                             calculate.toFloat(issue.price),
                             calculate.toFloat(issue.terms),
                             issue.vestingbegins,
                             calculate.toFloat(issue.vestcliff),
                             issue.vestfreq,
                             issue.debtundersec,
                             calculate.toFloat(issue.interestrate),
                             issue.interestratefreq,
                             calculate.toFloat(issue.valcap),
                             calculate.toFloat(issue.discount),
                             calculate.toFloat(issue.term),
                             dragalong,
                             tagalong,
                             common)
                .then(function(data) {
                    $scope.lastsaved = Date.now();
                    var oldissue = issue.key;
                    var index = -1;

                    // Fires only when you change the issue name to update the rows
                    // Removes unissued rows with the old name, new named ones get added further down
                    if (issue.issue != issue.key) {
                        angular.forEach($scope.ct.rows, function (row) {
                            if (row.name == issue.key + " (unissued)" && index == -1) {
                                index = $scope.ct.rows.indexOf(row);
                            }
                            row.cells[issue.issue] = row.cells[issue.key];
                            delete row.cells[issue.key];
                        });
                        if (index != -1) {
                            $scope.ct.rows.splice(index, 1);
                        }
                    }
                    angular.forEach($scope.ct.securities, function (x) {
                        captable.generateUnissuedRows();
                        if (x.issue == issue.issue && issue.vestingbegins) {
                            x.vestingbegins = issue.vestingbegins;
                        }
                    });

                    // In the case where the issue is changed and there are other securities that use it as the underlying
                    if (item == "issue") {
                        angular.forEach($scope.ct.securities, function (keyissue) {
                            if (item == "issue" &&
                                    keyissue.optundersec &&
                                    keyissue.optundersec == issue.key) {
                                keyissue.optundersec = issue[item];
                                $scope.saveIssue(keyissue, 'optundersec');
                            } else if (item == "issue" && keyissue.debtundersec && keyissue.debtundersec == issue.key) {
                                keyissue.debtundersec = issue[item];
                                $scope.saveIssue(keyissue, 'debtundersec');
                            }
                        });
                    }
                    // Recalculate the debt percentages, but only for 1 issue
                    angular.forEach($scope.ct.rows, function (row) {
                        if (row.cells[issue.issue] !== undefined) {
                            if (issue.type == "Debt" &&
                                !calculate.isNumber(row.cells[issue.issue].u) &&
                                calculate.isNumber(row.cells[issue.issue].a))
                            {
                                row.cells[issue.issue].x = calculate.debt($scope.ct.rows, issue, row);
                            }
                        }
                    });
                    captable.fillEmptyCells();
                    $scope.issueRevert = angular.copy(issue);
                    //Calculate the total vested for each row
                    $scope.ct.rows = calculate.detailedvested($scope.ct.rows, $scope.ct.trans);

                    var index = $scope.ct.security_names.indexOf(issue.key);
                    $scope.ct.security_names[index] = issue.issue;
                    issue.key = issue.issue;
                    $scope.hideTour = true;
                });
            } else {
                var d1 = (Date.today()).toUTCString();
                var expire = null;
                if ($scope.ct.securities.length == 1 &&
                        (window.location.hostname == "www.sharewave.com"
                         || window.location.hostname == "sharewave.com"))
                {
                    _kmq.push(['record', 'cap table creator']);
                    analytics.track('cap table creator');
                }
                if (issue.issue == "name") { issue.issue = "No name"; }
                angular.forEach($scope.ct.securities, function (x) {
                    // Duplicate issue names are not allowed
                    if (x.issue !== "" &&
                            issue.issue == x.issue && x != issue) {
                        // TODO regex to identify (_), inc num
                        issue.issue += " (1)";
                    }
                });

                SWBrijj.proc('ownership.create_issue',
                             d1,
                             expire,
                             issue.issue,
                             calculate.toFloat(issue.price))
                .then(function(data) {
                    $scope.lastsaved = Date.now();
                    issue.key = issue.issue;
                    $scope.ct.securities.push(captable.nullIssue());
                    $scope.ct.security_names.push(issue.key);
                    angular.forEach($scope.ct.rows, function (row) {
                        row.cells[issue.key] = captable.nullCell();
                    });
                    for (var i=0; i < $scope.ct.securities.length; i++) {
                        if ($scope.ct.securities[i] == issue) {
                            $scope.$watch('securities['+i+']',
                                          $scope.issue_watch, true);
                        }
                    }
                    $scope.allowKeys = calculate.complement($scope.ct.security_names,
                                                            [issue.issue]);
                    $scope.hideTour = true;
                });
            }
        }
    };

    $scope.deleteIssueButton = function (activeIssue) {
        $scope.dmodalUp(activeIssue);
    };

    // TODO refactor
    $scope.deleteIssue = function (issue) {
        SWBrijj.proc('ownership.delete_issue', issue['key']).then(function (data) {
            $scope.lastsaved = Date.now();
            angular.forEach($scope.ct.securities, function (oneissue) {
                if (oneissue.key == issue.key) {
                    var index = $scope.ct.securities.indexOf(oneissue);
                    $scope.ct.securities.splice(index, 1);
                    var indexed = $scope.ct.security_names.indexOf(oneissue.key);
                    $scope.ct.security_names.splice(indexed, 1);
                }
            });
            angular.forEach($scope.ct.rows, function (row) {
                if (issue.key in row) {
                    delete row.cells[issue.key];
                }
                if (row.name == issue.key + " (unissued)") {
                    var index = $scope.ct.rows.indexOf(row);
                    $scope.ct.rows.splice(index, 1);
                }
            });
            angular.forEach($scope.ct.trans, function(tran) {
                if (tran.issue == issue.key) {
                    var index = $scope.ct.trans.indexOf(tran);
                    $scope.ct.trans.splice(index, 1);
                }
            });
            if ($scope.ct.securities.length === 0 || ($scope.ct.securities[$scope.ct.securities.length-1].name !== "")) {
                $scope.ct.securities.push({"name": "", "date": new Date(2100, 1, 1)});
            }
            $scope.sideBar = "x";
        });
    };

    $scope.revertIssue = function (issue) {
        angular.forEach($scope.ct.securities, function (x) {
            if (x.key == issue.key) {
                x.issue = issue.key;
            }
        });
    };

    $scope.saveIssuePari = function (pari, item, items) {
        var allpari = "";
        var index;
        angular.forEach(items, function(picked) {
            if (picked == item) {
                picked.pariwith = pari;
            }
            if (picked.pariwith === "") {
                index = items.indexOf(picked);
            } else {
                allpari = allpari + picked.pariwith + ",";
            }
        });
        if (index) {
            items.splice(index, 1);
        }
        SWBrijj.proc('ownership.update_paris',
                     item.company,
                     item.issue,
                     allpari.substring(0, allpari.length-1))
        .then(function(data) {
            $scope.lastsaved = Date.now();
        });
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

    $scope.toggleCommon = function(issue) {
        issue.common = issue.common && issue.type == 'Equity' ? false : true;
        $scope.saveIssue(issue);
    };

    $scope.tranChangeU = function (value, issue) {
        captable.generateUnissuedRows();
        if ($scope.activeTran.length < 2) {
            $scope.activeTran[0].units = value;
        }
    };

    $scope.tranChangeA = function (value) {
        if ($scope.activeTran.length < 2) {
            $scope.activeTran[0].amount = value;
        }
    };

    $scope.getActiveInvestor = function (investor) {
        //selected investor == active investor
        if ($scope.toggleView() && investor.name && investor.name == $scope.activeInvestorName) {
            deselectAllCells();
            $scope.sideBar = "home";
            $scope.activeInvestorName = undefined;
            $scope.activeInvestorEmail = undefined;
        } else {
            $scope.sideBar = 3;
            deselectAllCells();
            investor.state = true;

            var rowindex = $scope.ct.rows.indexOf(investor);
            if (investor.name === "" && rowindex >= 4) {
                captable.addRow();
            }
            $scope.activeInvestorName = investor.name;
            $scope.activeInvestorEmail = investor.email;
            angular.forEach($scope.userstatuses, function(user) {
                if (investor.email == user.email) {
                    $scope.activeInvestorRealName = user.name;
                }
            });
            $scope.activeInvestorNameKey = angular.copy(investor.name);
        }
    };

    $scope.nameChangeLR = function (investor) {
        $scope.activeInvestorName = investor.name;
        if ((investor.name).length > 0) {
            angular.forEach($scope.ct.rows, function (row) {
                if (row.name == investor.name) {
                    row.editable = "yes";
                }
            });
        } else {
            angular.forEach($scope.ct.rows, function (row) {
                if (row.name == investor.name) {
                    row.editable = "0";
                }
            });
        }
    };
    $scope.nameChangeRL = function (investor) {
        $scope.activeInvestorName = investor.name;
    };
    $scope.deletePersonButton = function (name) {
        angular.forEach($scope.ct.rows, function (row) {
            if (row.name == name) {
                $scope.rmodalUp(row);
            }
        });
    };
    // Creates a new blank transaction with today's date
    $scope.createTrantab = function () {
        var inIssue = $scope.activeTran[0].issue;
        var newTran = captable.newTransaction(inIssue,
                                              $scope.activeInvestor);
        newTran.atype = 0;
        $scope.ct.trans.push(newTran);
        $scope.activeTran.push(newTran);
        for (var i = 1; i <= $scope.activeTran.length; i++) {
            if (i == $scope.activeTran.length) {
                $scope.activeTran[i].active = true;
            } else {
                $scope.activeTran[i].active = false;
            }
        }
    };

    $scope.revertTran = function (transaction) {
        angular.forEach($scope.ct.trans, function(tran) {
            if (tran.tran_id == transaction.tran_id) {
                tran.units = tran.unitskey;
                tran.amount = tran.paidkey;
                $scope.saveTran(tran);
            }
        });
    };

    // Function for when the delete transaction button is pressed in the right sidebar
    $scope.manualdeleteTran = function (tran) {
        var d1 = tran.date.toUTCString();
        SWBrijj.proc('ownership.delete_transaction', parseInt(tran.tran_id, 10))
        .then(function(data) {
            $scope.lastsaved = Date.now();
            var index = $scope.ct.trans.indexOf(tran);
            $scope.ct.trans.splice(index, 1);
            var index = $scope.activeTran.indexOf(tran);
            if (index != -1) {
                $scope.activeTran.splice(index, 1);
            }
            if ($scope.activeTran.length == 0) {
                var anewTran = captable.newTransaction(tran.issue,
                                                       $scope.activeInvestor);
                anewTran.active = true;
                anewTran.atype = 0;
                $scope.ct.trans.push(anewTran);
                $scope.activeTran.push(anewTran);
            }
            angular.forEach($scope.ct.rows, function (row) {
                if (row.name === tran['investor']) {
                    if (!isNaN(tran.units)) {
                        row.cells[tran.issue]['u'] = row.cells[tran.issue]['u'] - tran.units;
                        row.cells[tran.issue]['ukey'] = row.cells[tran.issue]['u']
                        if (row.cells[tran.issue]['u'] == 0) {
                            row.cells[tran.issue]['u'] = null;
                            row.cells[tran.issue]['ukey'] = null;
                        }
                    }
                    if (!isNaN(tran.amount)) {
                        row.cells[tran.issue]['a'] = row.cells[tran.issue]['a'] - tran.amount;
                        row.cells[tran.issue]['akey'] = row.cells[tran.issue]['a']
                        if (row.cells[tran.issue]['a'] == 0) {
                            row.cells[tran.issue]['a'] = null;
                            row.cells[tran.issue]['akey'] = null;
                        }
                    }
                }
            });
            captable.generateUnissuedRows();
        });
    };

    $scope.updateRow = function (investor) {
        //Name has been reduced to "" and previously had a value
        if (investor.name === "" && investor.namekey !== undefined) {
            var hastran = false;
            angular.forEach($scope.ct.trans, function(tran) {
                if (tran.investor == investor.namekey) {
                    hastran = true;
                }
            });
            if (hastran) {
                $scope.rmodalUp(investor);
            } else {
                $scope.deletePerson(investor.namekey);
            }
            return;
        }

        var rowindex = $scope.ct.rows.indexOf(investor);

        if (investor.name === "" && rowindex >= 4) {
            var index = $scope.ct.rows.indexOf(investor);
            $scope.ct.rows.splice(index, 1);
            return;
        }
        // TODO this same thing is implemented elsewhere
        angular.forEach($scope.ct.rows, function (row) {
            if (investor.name !== "" &&
                    investor.name == row.name && investor != row) {
                investor.name = investor.name + " (1)";
            }
        });
        if (investor.name !== "" && investor.name != investor.namekey) {
            investor.namekey = investor.namekey ?
                               investor.namekey : "!!";
            SWBrijj.proc('ownership.update_row',
                         investor.namekey,
                         investor.name)
            .then(function (data) {
                $scope.lastsaved = Date.now();
                var index = $scope.ct.rows.indexOf(investor);
                angular.forEach($scope.ct.trans, function (tran) {
                    if (tran.investor == investor.namekey) {
                        tran.investor = investor.name;
                    }
                });
                if (investor.name) {
                    $scope.ct.rows[index].namekey = investor.name;
                }
            });
        }
    };

    $scope.revertPerson = function (investor) {
        angular.forEach($scope.ct.rows, function (row) {
            if (row.namekey == investor) {
                row.name = row.namekey;
                $scope.nameChangeLR(row);
            }
        });
    };

    $scope.deletePerson = function (investor) {
        $scope.sideBar = "x";
        SWBrijj.proc('ownership.delete_row', investor)
        .then(function (data) {
            $scope.lastsaved = Date.now();
            angular.forEach($scope.ct.trans, function (tran) {
                if (tran.investor == investor) {
                    var index = $scope.ct.trans.indexOf(tran);
                    $scope.ct.trans.splice(index, 1);
                    angular.forEach($scope.ct.rows, function (row) {
                        if (row.name === tran['investor']) {
                            if (!isNaN(tran.units)) {
                                row.cells[tran.issue]['u'] = row.cells[tran.issue]['u'] - tran.units;
                                row.cells[tran.issue]['ukey'] = row.cells[tran.issue]['u']
                                if (row.cells[tran.issue]['u'] == 0) {
                                    row.cells[tran.issue]['u'] = null
                                    row.cells[tran.issue]['ukey'] = null
                                }
                            }
                            if (!isNaN(tran.amount)) {
                                row.cells[tran.issue]['a'] = row.cells[tran.issue]['a'] - tran.amount;
                                row.cells[tran.issue]['akey'] = row.cells[tran.issue]['a']
                                if (row.cells[tran.issue]['a'] == 0) {
                                    row.cells[tran.issue]['a'] = null
                                    row.cells[tran.issue]['akey'] = null
                                }
                            }
                        }
                    });
                    captable.generateUnissuedRows();
                }
            });

            // TODO what's this?
            angular.forEach($scope.ct.rows, function (row) {
                if (row.namekey == investor) {
                    var index = $scope.ct.rows.indexOf(row);
                    $scope.ct.rows.splice(index, 1);
                    if ($scope.ct.rows.length <= 5) {
                        var values = {"name": "", "editable": "0"};
                        angular.forEach($scope.ct.security_names, function (key) {
                            values[key] = captable.nullCell();
                        });
                        $scope.ct.rows.splice(index, 0, values);
                    }
                }
            });
        });
    };

    $scope.saveTranAssign = function (transaction, field, value) {
        if (value) { transaction[field] = value; }
        $scope.saveTran(transaction);
    };

    // Preformatting on the date to factor in the local timezone offset
    var keyPressed = false;
    // Needed because selecting a date in the calendar is considered a blur,
    // so only save on blur if user has typed a key
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
    // TODO refactor
    $scope.saveTran = function (transaction) {
        // Triggers the multi modal if more than one transaction exists
        if (transaction.length > 1) {
            angular.forEach($scope.ct.rows, function (row) {
                if (row.name == transaction[0].investor) {
                    // Deals with Changes in Units
                    if (calculate.isNumber(row.cells[transaction[0].issue]['u'])) {
                        if (parseFloat(row.cells[transaction[0].issue]['u']) != parseFloat(row.cells[transaction[0].issue]['ukey'])) {
                            var changed = (parseFloat(row.cells[transaction[0].issue]['u']) - parseFloat(row.cells[transaction[0].issue]['ukey']));
                            $scope.mmodalUp(changed, "u", transaction);
                            return
                        }
                    }
                    // Deals with changes in Price
                    if (calculate.isNumber(row.cells[transaction[0].issue]['a'])) {
                        if (parseFloat(row.cells[transaction[0].issue]['a']) != parseFloat(row.cells[transaction[0].issue]['akey'])) {
                            var changed = (parseFloat(row.cells[transaction[0].issue]['a']) - parseFloat(row.cells[transaction[0].issue]['akey']));
                            $scope.mmodalUp(changed, "a", transaction);
                            return
                        }
                    }
                }
            });
            // Reverts in the case where multitransaction rows are set to blank
            angular.forEach($scope.ct.rows, function(row) {
                if (row.name == transaction[0].investor) {
                    row.cells[transaction[0].issue]['u'] = row.cells[transaction[0].issue]['ukey'];
                    row.cells[transaction[0].issue]['a'] = row.cells[transaction[0].issue]['akey'];
                }
            });
            return
        } else if (isArray(transaction)) {
            transaction = transaction[0];
        }
        // FIXME all validation / data massaging should be done in 1 function
        captable.massageTransactionValues(transaction);

        if (captable.tranIsInvalid(transaction)) { return }
        else {
            var d1 = transaction['date'].toUTCString();
            var partpref = calculate.strToBool(transaction['partpref']);
            var dragalong = calculate.strToBool(transaction['dragalong']);
            var tagalong = calculate.strToBool(transaction['tagalong']);

            transaction.vestingbegins =
                calculate.whenVestingBegins(transaction);
            transaction.amount = calculate.toFloat(transaction.amount);
            transaction.units = calculate.toFloat(transaction.units);
            transaction.ppshare = calculate.toFloat(transaction.ppshare);
            captable.setTransactionEmail(transaction);
            if (transaction.type == "Equity") {
                captable.autocalcThirdTranValue(transaction);
            }
            SWBrijj.proc('ownership.update_transaction',
                    String(transaction['tran_id']),
                    transaction['email'],
                    transaction['investor'],
                    transaction['issue'],
                    transaction['units'],
                    d1,
                    transaction['type'],
                    transaction['amount'],
                    calculate.toFloat(transaction['premoney']),
                    calculate.toFloat(transaction['postmoney']),
                    calculate.toFloat(transaction['ppshare']),
                    calculate.toFloat(transaction['totalauth']),
                    partpref,
                    transaction.liquidpref,
                    transaction['optundersec'],
                    calculate.toFloat(transaction['price']),
                    calculate.toFloat(transaction['terms']),
                    transaction.vestingbegins,
                    calculate.toFloat(transaction['vestcliff']),
                    transaction['vestfreq'],
                    transaction['debtundersec'],
                    calculate.toFloat(transaction['interestrate']),
                    transaction['interestratefreq'],
                    calculate.toFloat(transaction['valcap']),
                    calculate.toFloat(transaction['discount']),
                    calculate.toFloat(transaction['term']),
                    dragalong,
                    tagalong)
            .then(function(data) {
                var returneddata = data[1][0].split("!!!");
                var newid = returneddata[0];
                var newinvestor = returneddata[1];
                $scope.lastsaved = Date.now();
                var tempunits = 0;
                var tempamount = 0;
                // update cells (captable service -> updateCell(t,r)
                angular.forEach($scope.ct.rows, function (row) {
                    angular.forEach($scope.ct.trans, function (tran) {
                        if (row.name == tran.investor &&
                                row.name == newinvestor) {
                            if (transaction.tran_id == '' &&
                                    !tran.tran_id &&
                                    (calculate.isNumber(tran.units) ||
                                        calculate.isNumber(tran.amount)))
                            { // new transaction
                                tran.tran_id = newid;
                                if (transaction.evidence_data) {
                                    $scope.updateEvidenceInDB(transaction,
                                                              'added');
                                }
                                captable.attachWatches();
                            }
                            if (tran.investor == transaction.investor &&
                                    tran.issue == transaction.issue) {
                                tran.key = tran.issue;
                                tran.unitskey = tran.units;
                                tran.paidkey = tran.amount;
                                transaction.datekey = d1;
                                tempunits = calculate.sum(tempunits,
                                                          tran.units);
                                tempamount = calculate.sum(tempamount,
                                                           tran.amount);
                                if (!isNaN(parseFloat(tran.forfeited))) {
                                    tempunits = calculate.sum(tempunits,
                                            (-tran.forfeited));
                                }
                                if (tempunits === 0) {tempunits = null;}
                                if (tempamount === 0) {tempamount = null;}
                                row.cells[tran.issue]['u'] = tempunits;
                                row.cells[tran.issue]['ukey'] = tempunits;
                                row.cells[tran.issue]['a'] = tempamount;
                                row.cells[tran.issue]['akey'] = tempamount;

                                row.cells[tran.issue]['x'] = 0;

                                // setTransactionKeys
                                //
                            }
                        }
                    });
                });

                captable.generateUnissuedRows();

                if (transaction.type == "Option" && calculate.isNumber(transaction.amount)) {
                    var modGrant = {"unit": null, "tran_id": transaction.tran_id, "date": (Date.today()), "action": "exercised", "investor": transaction.investor, "issue": transaction.issue};
                    var previousTotal = 0
                    angular.forEach($scope.ct.grants, function(grant) {
                        if (transaction.tran_id == grant.tran_id && grant.action == "exercised") {
                            previousTotal = previousTotal + grant.unit;
                        }
                    });
                    var units = transaction.amount - (previousTotal * transaction.price);
                    modGrant.unit = (units / transaction.price);
                    angular.forEach($scope.ct.grants, function (grant) {
                        if (transaction.tran_id == grant.tran_id && grant.action == "exercised") {
                            var offset = grant.date.getTimezoneOffset();
                            var today = Date.today().addMinutes(-offset).toUTCString();
                            if (grant.date.toUTCString() == today) {
                                modGrant.unit = modGrant.unit + grant.unit;
                                modGrant.grant_id = grant.grant_id;
                            }
                        }
                    });
                    $scope.saveGrant(modGrant);
                }
                captable.calculateDebtCells();
                $scope.ct.rows = calculate.detailedvested($scope.ct.rows,
                                                          $scope.ct.trans);
                captable.fillEmptyCells();
            }).except(function(x) {
                $scope.$emit("notification:fail",
                    "Transaction failed to save, please try entering again");
                console.log(x);
            });
        }
    };

    // Function for saving grant. Used on the captable when paid is updated from the captable on an option
    $scope.saveGrant = function (grant) {
        if (grant.action == "" && (isNaN(parseFloat(grant.unit)) || parseFloat(grant.unit) == 0)) {
            if (grant.grant_id != null) {
                SWBrijj.proc('ownership.delete_grant', parseInt(grant.grant_id)).then(function (data) {
                    $scope.lastsaved = Date.now();
                    var index = $scope.ct.grants.indexOf(grant);
                    $scope.ct.grants.splice(index, 1);
                });
            }
            else {
                return;
            }
        }
        if (grant.action == "" || grant.action == undefined || isNaN(parseFloat(grant.unit)) || parseFloat(grant.unit) <= 0) {
            return;
        }
        if (grant.grant_id == undefined) {
            grant.grant_id = "";
        }
        var d1 = grant['date'].toUTCString();
        SWBrijj.proc('ownership.update_grant', String(grant.grant_id), String(grant.tran_id), grant.action, d1, parseFloat(grant.unit)).then(function (data) {
            $scope.lastsaved = Date.now();
            if (grant.grant_id == "") {
                grant.grant_id = data[1][0];
                $scope.ct.grants.push(grant);
            }
            else {
                angular.forEach($scope.ct.grants, function(x) {
                    if (x.grant_id == grant.grant_id) {
                        x = grant
                    }
                });
            }
        });
    };

    $scope.cellFor = function(inv, sec) {
        return $scope.ct.cells
            .filter(function(cell) {
                return cell.investor == inv && cell.security == sec;
            })[0];
    };
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

    $scope.editViewToggle = function() {
        $scope.maintoggle = !$scope.maintoggle;
        $scope.radioModel = $scope.maintoggle ? "Edit" : "View";
        deselectAllCells();
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

    // TODO refactor and rename
    $scope.toggleView = function () {
        if ($scope.maintoggle) {
            $scope.captablestate = 1;
            if ($scope.sideBar == 2 || $scope.sideBar == 1) {
                $scope.sideBar = "hello";
            }
            return true;
        }
        else {
            $scope.dilutionSwitch = true;
            $scope.captablestate = 0;
            if ($scope.sideBar == 4 || $scope.sideBar == 5) {
                $scope.sideBar = "hello";
            }
            return false;
        }
    };

    $scope.fieldActive = function () {
        return isNaN(parseInt($scope.sideBar));
    };

    // Toggles editable to view
    $scope.toggleDilution = function () {
        return $scope.dilutionSwitch;
    };

    $scope.switchCapTab = function(tab) {
        $scope.currentTab = tab;
    };
    $scope.toggleShown = function(obj) {
        if (obj.shown == undefined) {
            obj.shown = true;
        } else {
            obj.shown = !obj.shown;
        }
    };
    $scope.viewEvidence = function(ev) {
        if (ev.doc_id != null) {
            if (!$scope.toggleView()) {
                $scope.viewme = ['investor', ev.doc_id];
            } else {
                $location.url('/app/documents/company-view?doc='+ev.original+'&investor='+ev.investor+'&page=1')
            }
        } else if (ev.original != null) {
            if (!$scope.toggleView()) {
                $scope.viewme = ['issuer', ev.original];
            } else {
                $location.url('/app/documents/company-view?doc='+ev.original+'&page=1');
            }
        }
    };
    $scope.editEvidence = function(obj) {
        if (obj) {
            $scope.evidence_object = obj;
            $scope.windowToggle = true;
        } else {
            $scope.evidence_object = null;
            $scope.windowToggle = false;
        }
        return $scope.windowToggle;
    };
    $scope.evidenceEquals = function(ev1, ev2) {
        return (ev1.doc_id && ev2.doc_id && ev1.doc_id==ev2.doc_id && ev1.investor==ev2.investor)
            || (ev1.original && ev2.original && !ev1.doc_id && !ev2.doc_id && ev1.original==ev2.original);
    };
    $scope.isEvidence = function(ev) {
        if ($scope.evidence_object && $scope.evidence_object.evidence_data) {
            return $scope.evidence_object.evidence_data.filter(function(x) {return $scope.evidenceEquals(ev, x);}).length>0;
        } else {
            return false;
        }
    };
    $scope.removeEvidence = function(ev, obj) {
        if (!obj) {
            $scope.evidence_object.evidence_data = $scope.evidence_object.evidence_data.filter(function(x) {return !$scope.evidenceEquals(ev, x);});
            $scope.updateEvidenceInDB($scope.evidence_object, 'removed');
        } else {
            obj.evidence_data = obj.evidence_data.filter(function(x) {return !$scope.evidenceEquals(ev, x);});
            $scope.updateEvidenceInDB(obj, 'removed');
        }
    };
    $scope.addEvidence = function(ev) {
        if ($scope.evidence_object &&
                $scope.evidence_object.evidence_data) {
            // assumes ev is not already in evidence_data
            $scope.evidence_object.evidence_data.push(ev);
        }
    };
    $scope.toggleForEvidence = function(ev) {
        if (!ev || !$scope.evidence_object) {return;}
        if (!$scope.evidence_object.evidence_data) {
            $scope.evidence_object.evidence_data = [];
        } else {
            var action = "";
            if ($scope.isEvidence(ev)) {
                $scope.removeEvidence(ev);
                action = "removed";
            } else {
                $scope.addEvidence(ev);
                action = "added";
            }
            $scope.updateEvidenceInDB($scope.evidence_object, action);
        }
    };
    $scope.updateEvidenceInDB = function(obj, action) {
        if (obj.tran_id && obj.evidence_data) {
            SWBrijj.procm('ownership.upsert_transaction_evidence',
                          parseInt(obj.tran_id, 10),
                          JSON.stringify(obj.evidence_data)
            ).then(function(r) {
                void(r);
            }).except(function(e) {
                $scope.$emit("notification:fail",
                    "Something went wrong. Please try again.");
                console.log(e);
            });
        }
    };
    $scope.evidenceFilter = function(obj) {
        var res = [];
        if ($scope.state.evidenceQuery && obj) {
            var items = $scope.state.evidenceQuery.split(" ");
            angular.forEach(items, function(item) {
                res.push(new RegExp(item, 'i'))
            });
        }
        var truthiness = res.length;
        var result = 0;
        angular.forEach(res, function(re) {
            if (re.test(obj.docname) || re.test(obj.tags)) {
                result += 1;
            }
        });
        return !$scope.state.evidenceQuery || truthiness == result;
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

    $scope.performConvert = function (tranConvert) {
        var newtran = tranConvert.newtran;
        SWBrijj.proc('ownership.conversion',
                     newtran.tran_id,
                     newtran.issue,
                     tranConvert.date,
                     tranConvert.method,
                     parseFloat(newtran.ppshare),
                     parseFloat(newtran.units),
                     parseFloat(newtran.amount))
        .then(function (tranid) {
            $scope.lastsaved = Date.now();
            var oldid = angular.copy(newtran.tran_id);
            newtran.tran_id = tranid[1][0];
            newtran.key = newtran.issue;
            newtran.unitskey = newtran.units;
            newtran.paidkey = newtran.amount;
            newtran.convert = [{"issuefrom": tranConvert.tran.issue,
                                "tranto": newtran.tran_id,
                                "company": newtran.company,
                                "effectivepps": newtran.ppshare,
                                "method": tranConvert.method,
                                "date": tranConvert.date,
                                "tranfrom": oldid}]
            var tempunits = 0;
            var tempamount = 0;
            var index;
            var decrement = {};
            angular.forEach($scope.ct.trans, function (tran) {
                if (tran.tran_id == oldid) {
                    index = $scope.ct.trans.indexOf(tran);
                    decrement.issue = tran.issue;
                    decrement.units = tran.units;
                    decrement.amount = tran.amount;
                    decrement.investor = tran.investor;
                }
            });
            $scope.ct.trans.splice(index, 1);
            $scope.ct.trans.push(newtran);

            angular.forEach($scope.ct.rows, function (row) {
                if (row.cells[decrement.issue] && row.name == decrement.investor) {
                    row.cells[decrement.issue].u = row.cells[decrement.issue].u - decrement.units;
                    row.cells[decrement.issue]['a'] = row.cells[decrement.issue]['a'] - decrement.amount;
                }
                angular.forEach($scope.ct.trans, function (tran) {
                    if (row.name == tran.investor) {
                        if (tran.investor == newtran.investor && tran.issue == newtran.issue) {
                            tempunits = calculate.sum(tempunits, tran.units);
                            tempamount = calculate.sum(tempamount, tran.amount);
                            if (calculate.isNumber(tran.forfeited)) {
                                tempunits = calculate.sum(tempunits, (-tran.forfeited));
                            }
                            if (tempunits === 0) {tempunits = null;}
                            if (tempamount === 0) {tempamount = null;}
                            row.cells[tran.issue]['u'] = tempunits;
                            row.cells[tran.issue]['ukey'] = tempunits;
                            row.cells[tran.issue]['a'] = tempamount;
                            row.cells[tran.issue]['akey'] = tempamount;
                            row.cells[tran.issue]['x'] = 0;
                        }
                    }
                });
            });

            captable.generateUnissuedRows();
            captable.calculateDebtCells();
            //Calculate the total vested for each row
            $scope.ct.rows = calculate.detailedvested($scope.ct.rows, $scope.ct.trans);

            captable.fillEmptyCells();
            $scope.$emit("notification:success", "Conversion Successful");
        }).except(function(err) {
                $scope.$emit("notification:fail", "Conversion Failed");
            });
    };

    // Captable Split Modal

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

    $scope.performSplit = function(issue) {
        var ratio = parseFloat(issue.ratioa) / parseFloat(issue.ratiob);
        if (!isNaN(ratio)) {
            SWBrijj.proc('ownership.split', issue.issue, ratio, issue.date).then(function (data) {
                $scope.lastsaved = Date.now();
                angular.forEach($scope.ct.trans, function(tran) {
                     if (tran.issue == issue.issue) {
                         tran.units = tran.units / ratio;
                         var fraction = new Fraction(ratio);
                         if (issue.type == "Equity") {
                             tran.ppshare = tran.ppshare * ratio;
                             tran.convert.push({"issuefrom": tran.issue, "tranto": tran.tran_id, "company": tran.company, "effectivepps": tran.ppshare, "method": "Split", "date": issue.date, "tranfrom": tran.tran_id, "split" : fraction});
                         }
                         else if (issue.type == "Option") {
                             tran.price = tran.price * ratio;
                             tran.convert.push({"issuefrom": tran.issue, "tranto": tran.tran_id, "company": tran.company, "effectivepps": tran.price, "method": "Split", "date": issue.date, "tranfrom": tran.tran_id, "split" : fraction});
                         }
                     }
                 });
                angular.forEach($scope.ct.rows, function (row) {
                    var tempunits = 0;
                    var tempamount = 0;
                    angular.forEach($scope.ct.trans, function (tran) {
                        if (row.name == tran.investor) {
                            if (tran.issue == issue.issue) {
                                tempunits = calculate.sum(tempunits, tran.units);
                                tempamount = calculate.sum(tempamount, tran.amount);
                                if (calculate.isNumber(tran.forfeited)) {
                                    tempunits = calculate.sum(tempunits, (-tran.forfeited));
                                }
                                if (tempunits === 0) {tempunits = null;}
                                if (tempamount === 0) {tempamount = null;}
                                row.cells[tran.issue]['u'] = tempunits;
                                row.cells[tran.issue]['ukey'] = tempunits;
                                row.cells[tran.issue]['a'] = tempamount;
                                row.cells[tran.issue]['akey'] = tempamount;

                                row.cells[tran.issue]['x'] = 0;
                            }
                        }
                    });
                });

                captable.generateUnissuedRows();
                angular.forEach($scope.ct.securities, function (x) {
                    if (x.issue == issue.issue) {
                        x.ppshare = x.ppshare * ratio;
                    }
                });

                captable.calculateDebtCells();
                //Calculate the total vested for each row
                $scope.ct.rows = calculate.detailedvested($scope.ct.rows, $scope.ct.trans);

                captable.fillEmptyCells();
                $scope.$emit("notification:success", "Split Successful");
            }).except(function(err) {
                $scope.$emit("notification:fail", "Split Failed");
            });
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

    $scope.performTransfer = function() {
        angular.forEach($scope.ct.transfer.trans, function(tran) {
            var transferunits = parseFloat(tran.transferunits);
            if (tran.transferto && !isNaN(tran.transferunits)) {
                SWBrijj.proc('ownership.transfer', tran.tran_id, tran.transferto, transferunits, $scope.ct.transfer.date).then(function (data) {
                    $scope.lastsaved = Date.now();
                    var newtran = angular.copy(tran);
                    var returneddata = data[1][0].split("!!!");
                    newtran.tran_id = returneddata[0];
                    newtran.investor = tran.transferto;
                    newtran.convert.push({"investor_to": tran.transferto, "investor_from": tran.investor, "company": tran.company, "units": transferunits, "direction": "To", "date": $scope.ct.transfer.date});
                    var tempunits = 0;
                    var tempamount = 0;
                    var index;
                    var decrement = {};
                    angular.forEach($scope.ct.trans, function (x) {
                        if (x.tran_id == tran.tran_id) {
                            index = $scope.ct.trans.indexOf(x);
                            x.convert.push({"investor_to": tran.transferto, "investor_from": tran.investor, "company": tran.company, "units": transferunits, "direction": "From", "date": $scope.ct.transfer.date});
                            decrement.issue = x.issue;
                            decrement.units = transferunits;
                            decrement.amount = x.amount * (transferunits/x.units);
                            decrement.investor = x.investor;
                            x.units = x.units - decrement.units;
                            x.amount = x.amount - decrement.amount;
                        }
                    });
                    if (tran.units == 0) {
                        $scope.ct.trans.splice(index, 1);
                    }
                    newtran.units = decrement.units;
                    newtran.amount = decrement.amount;
                    $scope.ct.trans.push(newtran);

                    angular.forEach($scope.ct.rows, function (row) {
                        if (row.cells[decrement.issue] && row.name == decrement.investor) {
                            row.cells[decrement.issue].u = row.cells[decrement.issue].u - decrement.units;
                            row.cells[decrement.issue]['a'] = row.cells[decrement.issue]['a'] - decrement.amount;
                        }
                        angular.forEach($scope.ct.trans, function (tran) {
                            if (row.name == tran.investor) {
                                if (tran.investor == newtran.investor && tran.issue == newtran.issue) {
                                    tempunits = calculate.sum(tempunits, tran.units);
                                    tempamount = calculate.sum(tempamount, tran.amount);
                                    if (calculate.isNumber(tran.forfeited)) {
                                        tempunits = calculate.sum(tempunits, (-tran.forfeited));
                                    }
                                    if (tempunits === 0) {tempunits = null;}
                                    if (tempamount === 0) {tempamount = null;}
                                    row.cells[tran.issue]['u'] = tempunits;
                                    row.cells[tran.issue]['ukey'] = tempunits;
                                    row.cells[tran.issue]['a'] = tempamount;
                                    row.cells[tran.issue]['akey'] = tempamount;

                                    row.cells[tran.issue]['x'] = 0;
                                }
                            }
                        });
                    });

                    captable.generateUnissuedRows();
                    captable.calculateDebtCells();
                    //Calculate the total vested for each row
                    $scope.ct.rows = calculate.detailedvested($scope.ct.rows, $scope.ct.trans);

                    captable.fillEmptyCells();
                    $scope.$emit("notification:success",
                                 "Transfer Successful");
                }).except(function(err) {
                    $scope.$emit("notification:fail",
                                 "Transfer failed");
                });
            }
        });
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
        };
    };


    //Adding to a row with more than one transaction modal

    $scope.mmodalUp = function (number, type, transaction) {
        $scope.changedNum = number;
        $scope.changedType = type;
        $scope.changedTransactions = transaction;
        $scope.capMulti = true;
    };

    $scope.mclose = function () {
        $scope.closeMsg = 'I was closed at: ' + new Date();
        $scope.capMulti = false;
    };

    $scope.dateoptions = function(trans) {
        var options = [];
        angular.forEach(trans, function (row) {
            options.push(row);
        });
        return options;
    };

    $scope.pickmOption = function(value) {
        $scope.pickTran = value;
        $scope.newtransaction = null;
    };

    $scope.pickOddOption = function(value) {
        $scope.newtransaction = value;
        $scope.pickTran = null;
    };

    $scope.mComplete = function (transactions, picked, number, type) {
        var inIssue = transactions[0].issue;
        if (!picked) {
            var newTran = captable.newTransaction(inIssue,
                                                  $scope.activeTran[0].investor);
            newTran.active = true;
            newTran.atype = 0;
            if (type == "u") { newTran.units = newTran.unitskey = number; }
            else { newTran.paid = newtran.paidkey = number; }
            angular.forEach($scope.ct.securities, function (issue) {
                if (issue.issue == inIssue) {
                    newTran = captable.inheritAllDataFromIssue(newTran, issue);
                }
            });
            if (number < 0 && newTran.type == "Option") {
                $scope.$emit("notification:fail",
                        "Cannot have a negative amount for options");
                return;
            }
            $scope.ct.trans.push(newTran);
            $scope.activeTran.push(newTran);
            for (var i = 0; i < $scope.activeTran.length; i++) {
                if (i + 1 == $scope.activeTran.length) {
                    $scope.activeTran[i].active = true;
                } else {
                    $scope.activeTran[i].active = false;
                }
            }
        }
        else {
            if (type == "u") {
                picked.units = picked.units + number;
            }
            else {
                picked.amount = picked.amount + number;
            }
            var newTran = picked;
        }
        $scope.saveTran(newTran);
    };

    $scope.mReset = function () {
        angular.forEach($scope.ct.rows, function (row) {
            if (row.name == $scope.activeTran[0].investor) {
                row.cells[$scope.activeTran[0].issue].u = row.cells[$scope.activeTran[0].issue].ukey;
                row.cells[$scope.activeTran[0].issue].a = row.cells[$scope.activeTran[0].issue].akey;
            }
        });
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

    $scope.alterEmail = function() {
        if ($scope.newEmail != "") {
            SWBrijj.proc('ownership.update_row_share',
                         $scope.newEmail,
                         $scope.oldEmail,
                         $scope.activeInvestorName)
            .then(function(data) {
                $scope.lastsaved = Date.now();
                angular.forEach($scope.ct.rows, function (row) {
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
        angular.forEach($scope.ct.rows, function (row) {
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
        angular.forEach($scope.ct.rows, function (row) {
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
        angular.forEach($scope.ct.rows, function(row) {
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
        var link;
        link = (name ? ((navState.userid != email) ? '/app/company/profile/view?id=' + email : '/app/account/profile/') : '');
        if (link) {
            $location.url(link);
        }
    };

    $scope.securityUnitLabel = function(security_name) {
        var type;
        angular.forEach($scope.ct.securities, function(sec) {
            if (sec.name == security_name) {
                type = $filter('issueUnitLabel')(sec);
            }
        });
        return type;
    };
    /*
    $scope.grantbyIssue = function (key) {
        var type = "";
        angular.forEach($scope.ct.securities, function(issue) {
            if (issue.issue == key) {
                type = $filter('issueUnitLabel')(issue);
            }
        });
        return type
    };
    */

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

    $scope.typeLocked = function(issue) {
        if (issue.liquidpref || issue.interestrate || issue.valcap || issue.discount || issue.optundersec || issue.vestcliff || issue.vestingbegins || issue.vestfreq) {
            return false
        }
        else {
            return true
        }
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

    // Functions derived from services for use in the table

    //switches the sidebar based on the type of the issue
    $scope.dilution = function () {
        $scope.sideBar = 9;
        $scope.dilutedRows = calculate.dilution($scope.ct.rows, $scope.ct.securities);
    };

    //switches the sidebar based on the type of the issue
    $scope.trantype = function (type, activetype) {
        return switchval.trantype(type, activetype);
    };

    // Number of shareholders
    $scope.numShareholders = function() {
        return calculate.numShareholders($scope.ct.rows);
    };

    // Total Shares in captable
    var totalShares = memoize(calculate.totalShares)
    $scope.totalShares = function(rows) {
        return $scope.formatAmount(totalShares(rows));
    };

    // Total Shares | Paid for an issue column (type is either u or a)
    var totalPaid = memoize(calculate.totalPaid);
    $scope.totalPaid = function(rows) {
        return $scope.formatDollarAmount(totalPaid(rows));
    };

    // Total Shares for a shareholder row
    var shareSum = memoize(calculate.shareSum);
    $scope.shareSum = function(row) {
        return $scope.formatAmount(shareSum(row));
    };

    // Total Shares | Paid for an issue column (type is either u or a)
    var colTotalIssued = memoize(calculate.colTotalIssued);
    $scope.colTotalIssued = function(header, rows, type) {
        return colTotalIssued(header, rows, type);
    };

    // Total Shares | Paid for an issue column (type is either u or a)
    var colTotal = memoize(calculate.colTotal);
    $scope.colTotal = function(header, rows, type) {
        return colTotal(header, rows, type);
    };

    // Total percentage ownership for each shareholder row
    var sharePercentage = memoize(calculate.sharePercentage);
    $scope.sharePercentage = function(row, rows, security_names) {
        return sharePercentage(row, rows, security_names, shareSum(row), totalShares(rows));
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

    //Watches constraining various values

    // This should really be in a directive (or more properly get some clever css set-up to do it for me...
    $scope.$watch(function() {return $(".leftBlock").height(); }, function(newValue, oldValue) {
        $scope.stretchheight = {height: String(newValue + 59) + "px"}
    });

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

    $scope.namePaste = function(ev, row) {
        var pastednames = ev.originalEvent.clipboardData.getData('text/plain');
        var splitnames = pastednames.split("\n");
        var startindex = $scope.ct.rows.indexOf(row);
        var number = splitnames.length;
        for (var i = 0; i < number; i++) {
            if (!$scope.ct.rows[startindex]) {
                captable.addRow()
                    .editable = "yes";
            }
            if ($scope.ct.rows[startindex].editable == "0") {
                $scope.ct.rows[startindex].editable = "yes";
            }
            $scope.ct.rows[startindex].name = splitnames[i];
            $scope.updateRow($scope.ct.rows[startindex]);
            startindex += 1;
        }
        captable.addRow();
        return false;
    };

    $scope.numberPaste = function(ev, row, key, type) {
        var pastedvalues = ev.originalEvent.clipboardData.getData('text/plain');
        var splitvalues = pastedvalues.split("\n");
        var startindex = $scope.ct.rows.indexOf(row);
        var number = splitvalues.length;
        for (var i = 0; i < number; i++) {
            if (!$scope.ct.rows[startindex] ||
                    $scope.ct.rows[startindex].editable == "0") {
                break;
            } else {
                splitvalues[i] = calculate.cleannumber(splitvalues[i]);
                if (calculate.isNumber(splitvalues[i]) && !calculate.isNumber($scope.ct.rows[startindex].cells[key][type])) {
                    var anewTran = captable.newTransaction(key,
                                        $scope.ct.rows[startindex].name);
                    anewTran.active = false;
                    anewTran.atype = 0;
                    if (type == "u") {
                        anewTran.units = splitvalues[i];
                        anewTran.unitskey = splitvalues[i];
                    } else {
                        anewTran.amount = splitvalues[i];
                        anewTran.paid = splitvalues[i];
                        anewTran.paidkey = splitvalues[i];
                    }
                    angular.forEach($scope.ct.trans, function(tran) {
                        var found = -1;
                        if (tran.investor == anewTran.investor && tran.issue == anewTran.issue && isNaN(parseFloat(tran.tran_id))) {
                            found = $scope.ct.trans.indexOf(tran);
                        }
                        if (found != -1) {
                            $scope.ct.trans.splice(found, 1)
                        }
                    });
                    if ($scope.activeTran[0].investor == anewTran.investor) {
                        anewTran.active = true;
                        $scope.activeTran = [];
                        $scope.activeTran.push(anewTran);
                    }
                    $scope.ct.trans.push(anewTran);
                    $scope.saveTran(anewTran);
                }
                startindex += 1;
            }
        }
        return false;
    };

};

// IE fix to remove enter to submit form
function testForEnter()
{
    if (event.keyCode == 13)
    {
        event.cancelBubble = true;
        event.returnValue = false;
    }
}
