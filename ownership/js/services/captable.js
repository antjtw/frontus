var ownership = angular.module('ownerServices');

/*
 * u, ukey and a, akey refer to units and amount
 * 'key' is actually the backup/previous/undo value
 * TODO implement 'key' values as a stack with generic undo facility
CapTable = function() {
    this.vInvestors = [];
    this.security_names = [];
    this.securities = [];
    this.investors = [];
    this.uniqueinvestors = [];
    this.trans = [];
    this.grants = [];
    this.paripassu = [];
    this.conversions = [];
    this.transfers = [];
};
 */
NewCapTable = function() {
    this.investors = [];
    this.securities = [];
    this.transactions = [];
    this.ledger_entries = [];

    this.cells = [];
};
Transaction = function() {
    this.active = null;
    this.atype = null;
    this.new = null;
    this.investor = null;
    this.investorkey = null;
    this.company = null;
    this.date = Date.today();
    this.datekey = Date.today();
    this.issue = null;
    this.units = null;
    this.unitskey = null;
    this.paid = null;
    this.paidkey = null;
    this.key = 'undefined';
    this.convert = [];
};
/*
Issue = function() {
    this.name = "";
    this.date = new Date(2100, 1, 1);
};
*/
Security = function() {
    this.name = "";
    this.effective_date = null;
    this.insertion_date = null;
    this.transactions = [];
};
// if nameeditable == 0 then it's not a real investor row (unissued investors)
Row = function() {
    this.name = "";
    this.editable = "0";
    this.nameeditable = null;
    this.transactions = [];
};
// TODO should issue_type be here?
// I want more data in the cells.
// Issue
// Security
// [] of transactions
Cell = function() {
    this.u = this.ukey = null;
    this.a = this.akey = null;
    this.x = null; // percentage
    this.transactions = [];
    this.security = null;
};

ownership.service('captable',
function($rootScope, calculate, SWBrijj, $q, attributes, History) {

    console.log(History);
//    var captable = new CapTable();
    var captable = new NewCapTable();

    /*
    this.getCapTable = function() {
        return captable;
    };
    */
    this.getNewCapTable = function() {
        return captable;
    };
    function loadNewCapTable() {
        $q.all([loadLedger(),
                loadTransactionLog(),
                loadRowNames(),
                loadAttributes(),
                loadEvidence()])
        .then(function(results) {
            captable.ledger_entries = results[0];
            captable.transactions = results[1].map(parseTransaction);
            handleTransactions(captable.transactions);
            captable.investors = results[2].map(rowFromName);
            captable.attributes = results[3];
            attachEvidence(results[4]);
            generateCells(new Date());
            console.log(captable);
        }, logErrorPromise);
    }
    loadNewCapTable();

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
        if (cellPrimaryMeasure(cell) == "units") {
            cell.u = cell.ukey = sum_ledger(cell.ledger_entries);
        }
    }
    function setCellAmount(cell) {
        if (cellPrimaryMeasure(cell) == "amount") {
            cell.a = cell.akey = sum_ledger(cell.ledger_entries);
        } else {
            cell.a = cell.akey = sum_transactions(cell.transactions);
        }
    }
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
                return investorOwnershipPercentage(inv.name);
            };
        });
    }
    function rowFromName(name) {
        var row = newRow();
        row.namekey = row.name = name.name;
        row.editable = "yes";
        row.transactions = captable.transactions
            .filter(function(el) {return el.attrs.investor == row.name;});
        // TODO row.email = ______
        return row;
    }
    function initUI() {
        $rootScope.$broadcast('captable:initui');
    }
    /*
    function updateCell(tran, row) {
        var cell;
        if (tran.issue in row.cells) {
            cell = row.cells[tran.issue];
        } else {
            cell = row.cells[tran.issue] = {};
            cell.state = false;
        }
        cell.ukey = cell.u = calculate.sum(cell.u, tran.units);
        cell.akey = cell.a = calculate.sum(cell.a, tran.amount);
        if (calculate.isNumber(tran.forfeited)) {
            cell.ukey = cell.u =
                calculate.sum(cell.u, (-tran.forfeited));
        }
        if (calculate.isNumber(tran.exercised)) {
            cell.exercised =
                calculate.sum(cell.exercised, tran.exercised);
        }
    }
    */
    function attachEvidence(data) {
        angular.forEach(captable.transactions, function(tran) {
            tran.evidence_data = data.filter(function(el) {
                return el.evidence==tran.evidence;
            });
        });
    }
    function setIssueKey(iss) {
        iss.key = iss.issue;
        captable.security_names.push(iss.key);
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
    // Uses the grants to update the transactions with forfeited values
    // Eliminates the need for further reference to forfeit grants
    /*
    function incorporateGrantsIntoTransactions(grants, transactions) {
        angular.forEach(grants, function(grant) {
            angular.forEach(transactions, function(tran) {
                if (grant.tran_id == tran.tran_id) {
                    grant.investor = tran.investor;
                    if (grant.action == "forfeited") {
                        if (tran.forfeited) {
                            tran.forfeited = tran.forfeited + grant.unit;
                        } else { tran.forfeited = grant.unit; }
                    }
                    if (grant.action == "exercised") {
                        if (tran.exercised) {
                            tran.exercised = tran.exercised + grant.unit;
                        } else { tran.exercised = grant.unit; }
                    }
                }
            });
        });
    }
    */
    /*
    function initRowsFromNames(names) {
        angular.forEach(names, function(name) {
            var row = addRow();
            row.namekey = row.name = name.name;
            row.editable = "yes";
        });
    }
    
    function setTransactionKeys(tran) {
        tran.key = tran.issue;
        tran.unitskey = tran.units;
        tran.paidkey = tran.amount;
        tran.datekey = tran.date.toUTCString();
        tran.investorkey = tran.investor;
    }
    function inheritDataFromIssue(obj) {
        angular.forEach(captable.securities, function(iss) {
            if (obj.issue == iss.issue) {
                obj.totalauth = iss.totalauth;
                obj.premoney = iss.premoney;
                obj.postmoney = iss.postmoney;
            }
        });
    }
    function inheritAllDataFromIssue(tran, issue) {
        if (!issue) {throw "Cannot inherit from null issue.";}
        tran.company = issue.company;
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
    }
    function addTranToRows(tran) {
        if (captable.uniqueinvestors.indexOf(tran.investor) == -1) {
            captable.uniqueinvestors.push(tran.investor);
            angular.forEach(captable.investors, function(row) {
                if (row.namekey == tran.investor) {
                    row.email = tran.email;
                    row.emailkey = tran.email;
                }
            });
        }
    }
    */
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
    function nullRow() {
        return new Row();
    }
    function newRow(cols) {
        var row = nullRow();
        angular.forEach(cols, function(k) {
            row.cells[k] = nullCell();
        });
        return row;
    }
    function addRow(idx) {
        /*
        var row = newRow(captable.security_names);
        if (idx) {
            captable.investors.splice(idx, 0, row);
        } else {
            captable.investors.push(row);
        }
        return row;
        */
    }
    this.addRow = addRow;
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
    function tranIsInvalid(tran) {
        if (tran === undefined || tran.issue === undefined ||
                (isNaN(parseFloat(tran.units)) &&
                 isNaN(parseFloat(tran.amount)))) {
            return true;
        } else if (tran.type == "Option" &&
                   tran.units < 0) {
            tran.units = tran.unitskey;
            $rootScope.$emit("notification:fail",
                    "Cannot have a negative number of shares");
            return true;
        } else if (tran.amount < 0) {
            tran.amount = tran.paidkey;
            $rootScope.$emit("notification:fail",
                    "Cannot have a negative amount for options");
            return true;
        } else {
            return false;
        }
    }
    this.tranIsInvalid = tranIsInvalid;
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
    /*
    function addTranToCell(tran) {
        angular.forEach(captable.investors, function (row) {
            if (row.name == tran.investor) {
                updateCell(tran, row);
            } else if (!(tran.issue in row.cells)) {
                // TODO can both just call updateCell?
                row.cells[tran.issue] = nullCell();
            }
        });
    }
    */
    /*
    function processTransaction(tran) {
        reformatDate(tran);
        setTransactionKeys(tran);
        setVestingDates(tran);
        inheritDataFromIssue(tran);
        addTranToRows(tran); // incorporate transaction's investor
        addTranToCell(tran);
    }
    */
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
    function incorporateConversionsTransfers(tran) {
        tran.convert = [];
        angular.forEach(captable.conversions, function(con) {
            if (con.tranto == tran.tran_id) {
                con.date = calculate.timezoneOffset(con.date);
                if (con.method == "Split") {
                    con.split = new Fraction(con.split);
                }
                tran.convert.push(con);
            }
        });
        angular.forEach(captable.transfers, function(transf) {
            transf.date = calculate.timezoneOffset(transf.date);
            var final = angular.copy(transf);
            if (transf.tranto == tran.tran_id) {
                final.direction = "To";
            } else if (transf.tranfrom == tran.tran_id) {
                final.direction = "From";
            }
            tran.convert.push(final);
        });
    }
    function calculateDebtCells() {
        // FIXME why does calculate.debt return null?!?
        // return immediately.
        angular.forEach(captable.investors, function (row) {
            angular.forEach(captable.securities, function (issue) {
                var cell = row.cells[issue.issue];
                if (cell !== undefined &&
                    issue.type == "Debt" &&
                    (!calculate.isNumber(cell.u) || cell.u === 0) &&
                    calculate.isNumber(cell.a))
                {
                    cell.x = calculate.debt(captable.investors,
                                            issue, row);
                }
            });
        });
    }
    this.calculateDebtCells = calculateDebtCells;
    */
    function generateUnissuedRows() {
        angular.forEach(captable.securities, function(iss) {
            if (!calculate.isNumber(iss.totalauth)) return;
            var total = iss.totalauth;
            var num_granted = unitsGranted(iss, true);
            var leftovers = total - num_granted;
            var unissued_cell = nullCell();
            unissued_cell.u = unissued_cell.ukey = leftovers;
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
    function fillEmptyCells() {
        angular.forEach(captable.investors, function (row) {
            angular.forEach(captable.security_names, function (issuekey) {
                if (!(issuekey in row.cells)) {
                    row.cells[issuekey] = nullCell();
                }
            });
        });
    }
    this.fillEmptyCells = fillEmptyCells;
    function totalOwnershipUnits() {
        return captable.cells.reduce(sumCellUnits, 0);
    }
    this.totalOwnershipUnits = totalOwnershipUnits;
    function investorOwnershipPercentage(inv) {
        var x = captable.cells
            .filter(function(el) { return el.investor == inv; })
            .reduce(sumCellUnits, 0);
        return x / totalOwnershipUnits() * 100;
    }
    this.investorOwnershipPercentage = investorOwnershipPercentage;
    this.securityTotalUnits = function(sec) {
        return captable.cells
            .filter(function(el) { return el.security == sec; })
            .reduce(sumCellUnits, 0);
    };
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
    /*
    function prepareForDisplay() {
        // Sort the columns before finally showing them
        // Issues are sorted by date, investors by ownership within each issue
        captable.securities.sort(sorting.issuedate);
        captable.security_names = sorting.security_names(captable.security_names,
                                               captable.securities);
        captable.investors.sort(sorting.basicrow());
        do {
            addRow();
        } while (captable.investors.length < 5);

        //Calculate the total vested for each row
        captable.investors = calculate.detailedvested(captable.investors, captable.trans);

        // Add extra blank issue, which will create a new one when clicked.
        addSecurity();
        return true;
    }
    */
    /*
    function attachWatches() {
        for (var i=0; i < captable.trans.length; i++) {
            $rootScope.$watch('trans['+i+']', transaction_watch, true);
        }
        for (var j=0; j < captable.securities.length; j++) {
            $rootScope.$watch('securities['+j+']', issue_watch, true);
        }
    }
    this.attachWatches = attachWatches;
    */
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
            for (var y=0; y < obj.length; y++) {
                if (obj[y] && obj[y].tran_id == newval.tran_id) {
                    obj[y].discount = oldval.discount;
                }
            }
        }
        if (parseFloat(newval.vestcliff) > 100 ||
            parseFloat(newval.vestcliff) < 0)
        {
            for (var z=0; z < obj.length; z++) {
                if (obj[z] && obj[z].tran_id == newval.tran_id) {
                    obj[z].vestcliff = oldval.vestcliff;
                }
            }
        }
    }

    function transaction_watch(newval, oldval) {
        generic_watch(newval, oldval, captable.trans);
    }

    function issue_watch(newval, oldval) {
        generic_watch(newval, oldval, captable.securities);
    }
    */
    /*
    function generateCaptable(names) {
        angular.forEach(captable.securities, processIssue);
        incorporateGrantsIntoTransactions(captable.grants, captable.trans);
        initRowsFromNames(names);
        angular.forEach(captable.trans, processTransaction);
        attachPariPassu(captable.securities, captable.paripassu);
        angular.forEach(captable.trans, incorporateConversionsTransfers);
        calculateDebtCells();
        generateUnissuedRows();
        fillEmptyCells();
        calculateInvestorPercentages();
        captable.finishedsorting = prepareForDisplay();
        attachWatches();
        pingIntercomIfCaptableStarted();
        populateListOfInvestorsWithoutAccessToTheCaptable();

        console.log(captable);
    }
    */
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
