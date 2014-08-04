var ownership = angular.module('ownerServices');

CapTable = function() {
    this.investors = [];
    this.securities = [];
    this.transactions = [];
    this.ledger_entries = [];
    this.cells = [];
};
Transaction = function() {
    this.attrs = {};
    this.company = null;
    this.effective_date = null;
    this.entered_by = null;
    this.ip = null;
    this.evidence = null;
    this.evidence_data = null;
    this.insertion_date = null;
    this.transaction = null;
    this.kind = null;
    this.verified = false;
};
Security = function() {
    this.name = "";
    this.effective_date = null;
    this.insertion_date = null;
    this.transactions = [];
};
// if nameeditable == 0 then it's not a real investor row
// (unissued investors)
// TODO can this be cut out?
Investor = function() {
    this.name = "";
    this.editable = "0";
    this.nameeditable = null;
    this.transactions = [];
};
Cell = function() {
    this.u = null; // units
    this.a = null; // amount
    this.x = null; // percentage
    this.transactions = [];
    this.security = null;
};

ownership.service('captable',
function($rootScope, calculate, SWBrijj, $q, attributes, History) {

    var captable = new CapTable();
    this.getCapTable = function() { return captable; };
    function loadCapTable() {
        $q.all([loadLedger(),
                loadTransactionLog(),
                loadRowNames(),
                loadAttributes(),
                loadEvidence()])
        .then(function(results) {
            captable.ledger_entries = results[0];
            captable.transactions = results[1].map(parseTransaction);
            captable.investors = results[2].map(rowFromName);
            captable.attributes = results[3];

            handleTransactions(captable.transactions);
            attachEvidence(results[4]);
            generateCells();

            console.log(captable);
        }, logErrorPromise);
    }
    loadCapTable();

    function loadEvidence() {
        var promise = $q.defer();
        SWBrijj.tblm('ownership.my_company_evidence')
        .then(function(evidence) {
            promise.resolve(evidence);
        }).except(logErrorPromise);
        return promise.promise;
    }
    function loadRowNames() {
        var promise = $q.defer();
        SWBrijj.tblm('ownership.company_row_names')
        .then(function(names) {
            promise.resolve(names);
        }).except(logErrorPromise);
        return promise.promise;
    }
    function handleTransactions(trans) {
        if (Object.keys(trans).length === 0 &&
            Modernizr.testProp('pointerEvents'))
        {
            $rootScope.$on('billingLoaded', function(x) {
                initUI();
            });
            initUI();
        }
    }
    function loadLedger() {
        var promise = $q.defer();
        SWBrijj.tblm('_ownership.my_company_ledger')
        .then(function(entries) {
            promise.resolve(entries);
        }).except(logErrorPromise);
        return promise.promise;
    }
    function loadTransactionLog() {
        var promise = $q.defer();
        SWBrijj.tblm('_ownership.my_company_transactions')
        .then(function(trans) {
            promise.resolve(trans);
        }).except(logErrorPromise);
        return promise.promise;
    }
    // TODO refactor to use attributes service
    function loadAttributes() {
        var promise = $q.defer();
        SWBrijj.tblm('ownership.transaction_attributes',
                     ['name', 'display_name'])
        .then(function(attrs) {
            promise.resolve(attrs);
        }).except(logErrorPromise);
        return promise.promise;
    }
    /* Based on the type of each transaction,
     * generate the relevant data types.
     *
     * For example:
     * -  generate securities from 'issue security' transactions
     */
    var transactionParser = {"issue security": parseIssueSecurity,
                             "retire security": parseRetireSecurity,
                             "purchase": parsePurchase,
                             "repurchase": parseRepurchase,
                             "transfer": parseTransfer,
                             "convert": parseConvert,
                             "split": parseSplit,
                             "grant": parseGrant,
                             "exercise": parseExercise,
                             "forfeit": parseForfeit
                             };
    function parseTransaction(tran) {
        tran.attrs = JSON.parse(tran.attrs);
        if (tran.kind in transactionParser) {
            transactionParser[tran.kind](tran);
        }
        return tran;
    }
    function parseIssueSecurity(tran) {
        var security = nullSecurity();
        security.name = tran.attrs.security;
        security.effective_date = tran.effective_date;
        security.insertion_date = tran.insertion_date;
        security.transactions.push(tran);
        security.attrs = tran.attrs;

        captable.securities.push(security);
    }
    function parseRetireSecurity(tran) {
    }
    function parsePurchase(tran) {
    }
    function parseRepurchase(tran) {
    }
    function parseTransfer(tran) {
    }
    function parseConvert(tran) {
    }
    function parseSplit(tran) {
    }
    function parseGrant(tran) {
    }
    function parseExercise(tran) {
    }
    function parseForfeit(tran) {
    }
    function visibleInvestors() {
        return captable.cells
            .filter(function(el) {
                return true;})
            .reduce(function(prev, cur, idx, arr) {
                if (prev.indexOf(cur.investor) == -1) {
                    prev.push(cur.investor);
                }
                return prev;}, []);
    }
    function visibleSecurities() {
        return captable.cells
            .filter(function(el) {
                return el.security !== "";})
            .reduce(function(prev, cur, idx, arr) {
                if (prev.indexOf(cur.security) == -1) {
                    prev.push(cur.security);
                }
                return prev;}, []);
    }
    function numUnissued(sec) {
        if (calculate.isNumber(sec.attrs.totalauth)) {
            return sec.attrs.totalauth - securityTotalUnits(sec);
        } else {
            return null;
        }
    }
    this.numUnissued = numUnissued;
    function secHasUnissued(sec) {
        return numUnissued(sec);
    }
    this.securitiesWithUnissuedUnits = function() {
        return captable.securities.filter(secHasUnissued);
    };
    this.securityUnissuedPercentage = function(sec) {
        var tot = totalOwnershipUnits();
        if (tot === 0) return 100;
        return numUnissued(sec) / tot;
    };
    function rowFor(inv) {
        return captable.cells
            .filter(function(cell) {
                return cell.investor == inv;
            });
    }
    function cellPrimaryMeasure(cell) {
        return calculate.primaryMeasure( cellSecurityType(cell) );
    }
    function cellSecurityType(cell) {
        if (cell && cell.security) {
            return captable.securities
                .filter(function(el) {
                    return el && el.name == cell.security && el.attrs;
                })[0].attrs.security_type;
        }
    }
    this.cellSecurityType = cellSecurityType;
    function setCellUnits(cell) {
        if (!cell) return;
        if (cellPrimaryMeasure(cell) == "units") {
            cell.u = sum_ledger(cell.ledger_entries);
        }
    }
    this.setCellUnits = setCellUnits;
    function setCellAmount(cell) {
        if (!cell) return;
        if (cellPrimaryMeasure(cell) == "amount") {
            cell.a = sum_ledger(cell.ledger_entries);
        } else {
            cell.a = sum_transactions(cell.transactions);
        }
    }
    this.setCellAmount = setCellAmount;
    function sum_ledger(entries) {
        return entries.reduce(
                function(prev, cur, index, arr) {
                   return prev + (cur.credit - cur.debit); 
                }, 0);
    }
    function sum_transactions(trans) {
        return trans.reduce(sumTransactionAmount, 0);
    }
    function generateCells() {
        angular.forEach(captable.investors, function(inv) {
            angular.forEach(captable.securities, function(sec) {
                var cell = nullCell();
                cell.transactions = captable.transactions.filter(
                    function(tran) {
                        return tran.attrs.investor == inv.name &&
                               tran.attrs.security == sec.name;
                    });
                cell.ledger_entries = captable.ledger_entries.filter(
                    function(ent) {
                        return ent.investor == inv.name &&
                               ent.security == sec.name;
                    });
                cell.security = sec.name;
                cell.investor = inv.name;
                setCellUnits(cell);
                setCellAmount(cell);
                captable.cells.push(cell);
            });
            inv.percentage = function() {
                return investorSorting(inv.name);
            };
        });
    }
    function investorSorting(inv) {
        if (inv === "") { return -100; } // keep new inv rows at bottom
        return investorOwnershipPercentage(inv);
    }
    function splice_many(array, elements) {
        var indices = elements
            .map(function(el) {return array.indexOf(el);})
            .filter(function(el) {return el!==-1;});
        return indices.map(function(idx) {return array.splice(idx, 1);});
    }
    function splice_many_by(array, filter_fn) {
        return splice_many(array, array.filter(filter_fn));
    }
    function saveTransaction(tran) {
        // TODO this is getting called too often.
        // use ng-change instead of ui-event?
        //
        // or maybe add a save button for now
        var old_ledger_entries = captable.ledger_entries
            .filter(function(el) {
                    return el.transaction == tran.transaction;
            });
        console.log(JSON.stringify(tran));
        SWBrijj.procm('_ownership.save_transaction',
                      JSON.stringify(tran))
        .then(function(new_entries) {
            console.log(splice_many(captable.ledger_entries,
                                    old_ledger_entries));
            console.log(new_entries);
            //captable.ledger_entries.push.apply(captable., new_entries);
            //console.log(captable.ledger_entries.filter(function(el) {return el.transaction==tran.transaction;}));
        }).except(logError);
    }
    this.saveTransaction = saveTransaction;
    this.deleteTransaction = function(tran, cell) {
        SWBrijj.procm('_ownership.delete_transaction', tran.transaction)
        .then(function(x) {
            var res = x[0].delete_transaction;
            if (res > 0) {
                $rootScope.$emit("notification:success",
                    "Transaction deleted");
                splice_many(captable.transactions, [tran]);
                splice_many(cell.transactions, [tran]);
                // TODO removeit from cells
            } else {
                $rootScope.$emit("notification:fail",
                    "Oops, something went wrong.");
            }
        }).except(function(err) {
            console.log(err);
            $rootScope.$emit("notification:fail",
                "Oops, something went wrong.");
        });
    };
    this.deleteSecurity = function(sec) {
        SWBrijj.procm('_ownership.delete_security', sec.name)
        .then(function(x) {
            var res = x[0].delete_security;
            if (res > 0) {
                $rootScope.$emit("notification:success",
                    "Security deleted");

                var idx = captable.securities.indexOf(sec);
                if (idx !== -1) { captable.securities.splice(idx, 1); }
                splice_many_by(captable.cells,
                    function(el) {return el.security==sec.name;});
                splice_many(captable.transactions, sec.transactions);
                
            } else {
                $rootScope.$emit("notification:fail",
                    "Oops, something went wrong.");
            }
        }).except(function(err) {
            console.log(err);
            $rootScope.$emit("notification:fail",
                "Oops, something went wrong.");
        });
    };
    this.removeInvestor = function(inv) {
        SWBrijj.procm('_ownership.remove_investor', inv.name)
        .then(function(x) {
            var res = x[0].remove_investor;
            if (res > 0) {
                $rootScope.$emit("notification:success",
                    "Investor removed from captable.");

                var idx = captable.investors.indexOf(inv);
                if (idx !== -1) { captable.investors.splice(idx, 1); }
                splice_many_by(captable.cells,
                    function(el) {return el.investor==inv.name;});
                splice_many(captable.transactions, inv.transactions);
            } else {
                $rootScope.$emit("notification:fail",
                    "Oops, something went wrong.");
            }
        }).except(function(err) {
            console.log(err);
        });
    };
    function rowFromName(name) {
        var row = new Investor();
        row.name = name.name;
        row.editable = "yes";
        row.transactions = captable.transactions
            .filter(function(el) {return el.attrs.investor == row.name;});
        // TODO row.email = ______
        return row;
    }
    function initUI() {
        $rootScope.$broadcast('captable:initui');
    }
    function attachEvidence(data) {
        angular.forEach(captable.transactions, function(tran) {
            tran.evidence_data = data.filter(function(el) {
                return el.evidence==tran.evidence;
            });
        });
    }
    function reformatDate(obj) {
        obj.date = calculate.timezoneOffset(obj.date);
    }
    function setVestingDates(obj) {
        if (obj.vestingbegins) {
            obj.vestingbegins =
                calculate.timezoneOffset(obj.vestingbegins);
            obj.vestingbeginsdisplay =
                calculate.monthDiff(obj.vestingbegins, obj.date);
        }
    }
    function processIssue(iss) {
        setIssueKey(iss);
        reformatDate(iss);
        setVestingDates(iss);
    }
    function logError(err) { console.log(err); }
    function logErrorPromise(err) {
        console.log(err);
        promise.reject(err);
    }
    function nullCell() {
        return new Cell();
    }
    this.nullCell = nullCell;
    function newCell(issue) {
        var cell = new Cell();
        cell.issue_type = issue.type;
        return cell;
    }
    this.newCell = newCell;
    function nullIssue() {
        return new Issue();
    }
    this.nullIssue = nullIssue;
    function nullSecurity() {
        return new Security();
    }
    function addSecurity() {
        /*
        var sec = nullSecurity();
        // Silly future date so that the issue always appears
        // on the leftmost side of the table
        sec.insertion_date = new Date(2100, 1, 1);
        captable.securities.push(sec);
        */
    }
    this.addInvestor = function() {
        var inv = new Investor();
        inv.editable = "yes";
        inv.company = $rootScope.navState.company;
        inv.percentage = function() {return investorSorting(inv.name);};
        captable.investors.splice(0, 0, inv);
    };
    this.addTran = function(inv, sec, tp) {
        var tran = new Transaction();
        tran.company = $rootScope.navState.company;
        debugger;
        if (tp == "issue_security") {
            // captable.securities.push()
            //
        } else {
            // TODO other transaction types may affect investor list
            //
            var security = captable.securities
                .filter(function(el) { return el.security == sec; })[0];
            var investor = captable.investors
                .filter(function(el) { return el.investor == inv; })[0];
            tran.investor = inv;
            tran.security = sec;
            tran.kind = tp;
            // instantiate from allowed attrs
            console.log(Object.keys(captable.attributes[security.security_type][tp]));
            tran.attrs =
                Object.keys(captable.attributes
                                [security.security_type][tp])
                    .map(function(el) {return {el: null};});
            // captable.transactions.push
            // pass to cell as well
        }
        console.log(tran);
        // TODO create a transaction of a specified type
    };
    /*
    function newTransaction(issuekey, investor) {
        var tran = new Transaction();
        tran.new = "yes";
        tran.investor = tran.investorkey = investor;
        inheritAllDataFromIssue(tran, getIssue(issuekey));
        return tran;
    }
    this.newTransaction = newTransaction;
    function getIssue(issuekey) {
        return captable.securities
            .filter(function(el) {
                return el.issue==issuekey;
            })[0];
    }
    this.getIssue = getIssue;
    */
    /*
    function cellsForIssue(iss) {
        var cells = [];
        angular.forEach(captable.investors, function(row) {
            if (iss.issue in row.cells && row.nameeditable !== 0) {
                cells.push(row.cells[iss.issue]);
            }
        });
        return cells;
    }
    function derivativeIssues(underlying_issue) {
        return captable.securities
            .filter(function(iss) {
                return iss.optundersec == underlying_issue.issuename;
            });
    }
    function unitsGranted(iss, dilute) {
        var num_granted = cellsForIssue(iss).reduce(
            function(prev, cur, index, arr) {
                return prev + (calculate.isNumber(cur.u) ? cur.u : 0);
            }, 0);
        if (dilute) {
            num_granted += derivativeIssues(iss).reduce(
                function(prev, cur, index, arr) {
                    return prev +
                calculate.isNumber(cur.totalauth) ? cur.totalauth : 0;
                }, 0);
        }
        return num_granted;
    }
    */
    function massageTransactionValues(tran) {
        tran.units = calculate.cleannumber(tran.units);
        tran.amount = calculate.cleannumber(tran.amount);

        tran.units = calculate.undoIf(calculate.numberIsInvalid,
                                      tran.units, tran.unitskey);
        tran.amount = calculate.undoIf(calculate.numberIsInvalid,
                                       tran.amount, tran.paidkey);
        if (tran.tran_id === undefined) { tran.tran_id = ''; }
    }
    this.massageTransactionValues = massageTransactionValues;
    function attachPariPassu(securities, links) {
        angular.forEach(securities, function(iss) {
            iss.paripassu = [];
            angular.forEach(links, function(link) {
                if (link.issue == iss.issue) {
                    iss.paripassu.push(link);
                }
            });
            if (iss.paripassu.length === 0) {
                iss.paripassu.push({"company": iss.company,
                                    "issue": iss.issue,
                                    "pariwith": null});
            }
        });
    }
    /*
    function generateUnissuedRows() {
        angular.forEach(captable.securities, function(iss) {
            if (!calculate.isNumber(iss.totalauth)) return;
            var total = iss.totalauth;
            var num_granted = unitsGranted(iss, true);
            var leftovers = total - num_granted;
            var unissued_cell = nullCell();
            unissued_cell.u = leftovers;
            var unissued_row = captable.investors.filter(
                function(el) {
                    return el.name == iss.issue + " (unissued)";
                })[0];
            if (unissued_row) {
                if (leftovers !== 0) {
                    unissued_row.cells[iss.issue] = unissued_cell;
                } else {
                    captable.investors.splice(
                        captable.investors.indexOf(unissued_row), 1);
                }
            } else {
                if (leftovers !== 0) {
                    unissued_row = addRow(-1);
                    unissued_row.name = iss.issue + " (unissued)";
                    unissued_row.editable = 0;
                    unissued_row.nameeditable = 0;
                    unissued_row.cells[iss.issue] = unissued_cell;
                }
            }
        });
    }
    this.generateUnissuedRows = generateUnissuedRows;
    */
    function totalOwnershipUnits() {
        return captable.cells.reduce(sumCellUnits, 0);
    }
    this.totalOwnershipUnits = totalOwnershipUnits;
    function investorOwnershipPercentage(inv) {
        var x = captable.cells
            .filter(function(el) { return el.investor == inv; })
            .reduce(sumCellUnits, 0);
        var res = x / totalOwnershipUnits() * 100;
        return res;
    }
    this.investorOwnershipPercentage = investorOwnershipPercentage;
    function securityTotalUnits(sec) {
        return captable.cells
            .filter(function(el) { return el.security == sec; })
            .reduce(sumCellUnits, 0);
    }
    this.securityTotalUnits = securityTotalUnits;
    this.securityTotalAmount = function(sec) {
        return captable.cells
            .filter(function(el) { return el.security == sec; })
            .reduce(sumCellAmount, 0);
    };
    function sumCellUnits(prev, cur, idx, arr) {
        return prev + (calculate.isNumber(cur.u) ? cur.u : 0);
    }
    function sumCellAmount(prev, cur, idx, arr) {
        return prev + (calculate.isNumber(cur.a) ? cur.a : 0);
    }
    function sumTransactionAmount(prev, cur, idx, arr) {
        return prev + (calculate.isNumber(cur.attrs.amount) ?
                          cur.attrs.amount : 0);
    }
    function pingIntercomIfCaptableStarted() {
        var earliestedit = new Date.today().addDays(1);
        var duplicate = earliestedit;
        angular.forEach(captable.securities, function(issue) {
            if (issue.created &&
                Date.compare(earliestedit, issue.created) > -1) {
                earliestedit = issue.created;
            }
        });
        if (earliestedit != duplicate) {
            Intercom('update',
                     {company: {'captablestart_at':
                                   parseInt(Date.parse(earliestedit)
                                                .getTime()/1000, 10) } });
        }
    }
    function populateListOfInvestorsWithoutAccessToTheCaptable() {
        var emailedalready = [];
        angular.forEach(captable.investors, function (row) {
            if (row.emailkey !== null) {
                emailedalready.push(row.emailkey);
            }
        });
        // FIXME move to loadCaptable
        SWBrijj.tblm('global.investor_list', ['email', 'name'])
        .then(function(investors) {
            angular.forEach(investors, function(investor, idx) {
                if (emailedalready.indexOf(investor.email) == -1) {
                    var label = (investor.name ? investor.name : "") +
                                "(" + investor.email + ")";
                    captable.vInvestors.push(label);
                }
            });
        });
    }
    /*
    var issuetypes = [];
    this.getIssueTypes = function() {return issuetypes;};
    function loadIssueTypes() {
        SWBrijj.procm('ownership.get_transaction_types')
        .then(function (results) {
            angular.forEach(results, function (result) {
                // extra enum value, hard to remove
                if (result.get_transaction_types != "warrant") {
                    issuetypes.push(result.get_transaction_types);
                }
            });
        }).except(logError);
    }
    loadIssueTypes();
    var freqtypes = [];
    this.getFrequencyTypes = function() {return freqtypes;};
    function loadFrequencyTypes() {
        SWBrijj.procm('ownership.get_freqtypes')
        .then(function (results) {
            angular.forEach(results, function (result) {
                freqtypes.push(result.get_freqtypes);
            });
        }).except(logError);
    }
    loadFrequencyTypes();
    */
    var eligible_evidence = [];
    this.getEligibleEvidence = function() {
        return eligible_evidence;
    };
    function loadEligibleEvidence() {
        SWBrijj.tblm('ownership.my_company_eligible_evidence')
        .then(function(data) {
            angular.forEach(data, function(x) {
                if (x.tags) { x.tags = JSON.parse(x.tags); }
                eligible_evidence.push(x);
            });
        }).except(logError);
    }
    loadEligibleEvidence();
    function setTransactionEmail(tran) {
        angular.forEach(captable.investors, function (row) {
            if ((row.name == tran.investor) && row.email) {
                tran.email = row.email;
            }
        });
        if (!tran.email) { tran.email = null; }
    }
    this.setTransactionEmail = setTransactionEmail;
    function autocalcThirdTranValue(tran) {
        if (tran.units && tran.amount &&
                tran.ppshare !== 0 && !tran.ppshare) {
            tran.ppshare =
                parseFloat(tran.amount) / parseFloat(tran.units);
        }
        else if (!tran.units && tran.units !== 0 &&
                    tran.amount && tran.ppshare) {
            tran.units =
                parseFloat(tran.amount) / parseFloat(tran.ppshare);
        }
        else if (tran.units && !tran.amount &&
                    tran.amount !== 0 && tran.ppshare) {
            tran.amount =
                parseFloat(tran.units) * parseFloat(tran.ppshare);
        }
    }
    this.autocalcThirdTranValue = autocalcThirdTranValue;
    this.displayAttr = function(key) {
        return captable.attributes.filter(
                function(el) { return el.name==key; })[0].display_name;
    };
    this.isDebt = function(cell) {
        if (!cell) return;
        var type = cellSecurityType(cell);
        return type == "Debt" || type == "Safe";
    };
});
