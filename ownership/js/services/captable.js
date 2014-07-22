var ownership = angular.module('ownerServices');

/*
 * u, ukey and a, akey refer to units and amount
 * 'key' is actually the backup/previous/undo value
 * TODO implement 'key' values as a stack with generic undo facility
 * TODO do not add cells directly to row object
 *      create row.cells array
 *      look at updateCell
 *      removes weird bugs when issue name collides with js property
 */
CapTable = function() {
    this.vInvestors = [];
    this.security_names = [];
    this.securities = [];
    this.rows = [];
    this.uniquerows = [];
    this.trans = [];
    this.grants = [];
    this.paripassu = [];
    this.conversions = [];
    this.transfers = [];

    this.cells = {};
};
NewCapTable = function() {
    this.cells = {};
    this.rows = [];
    this.security_names = [];
    this.securities = [];
    this.transactions = [];
    this.ledger_entries = [];
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
Issue = function() {
    this.name = "";
    this.date = new Date(2100, 1, 1);
};
Security = function() {
    this.name = "";
    this.effective_date = null;
    this.insertion_date = null;
    this.transaction = [];
};
// if nameeditable == 0 then it's not a real investor row (unissued rows)
Row = function() {
    this.name = "";
    this.editable = "0";
    this.nameeditable = null;
    this.cells = {};
};
// TODO should issue_type be here?
// I want more data in the cells.
// Issue
// Security
// [] of transactions
Cell = function() {
    this.u = this.ukey = null;
    this.a = this.akey = null;
    this.x = null; // TODO what is x used for? it's always null
    this.transactions = [];
    this.security = null;
};

ownership.service('captable',
function($rootScope, calculate, sorting, SWBrijj, $q) {

    var captable = new CapTable();
    var _captable = new NewCapTable();

    this.getCapTable = function() {
        return captable;
        //return _captable;
    };
    this.loadCapTable = function() { 
        $q.all([loadIssues(),
                loadTransactions(),
                loadGrants(),
                loadPariPassu(),
                loadConversions(),
                loadTransfers(),
                loadEvidence(),
                loadRowNames()])
        .then(function(results) {
            captable.securities  = results[0];
            captable.trans       = results[1];
            handleTransactions(    results[1]);
            captable.grants      = results[2];
            captable.paripassu   = results[3];
            captable.conversions = results[4];
            captable.transfers   = results[5];
            attachEvidence(        results[6]);

            generateCaptable(      results[7]);
            loadNewCapTable();
        }, logErrorPromise);

    };
    this.loadCapTable();

    function loadNewCapTable() {
        $q.all([loadLedger(),
                loadTransactionLog(),
                loadRowNames()])
        .then(function(results) {
            _captable.ledger_entries = results[0];
            _captable.transactions   = results[1].map(parseTransaction);
            // FIXME also need email address associated with rows,
            //       if one is available
            _captable.rows           = results[2].map(rowFromName);
            generateCells();
            console.log(_captable);
            if (_captable.cells != captable.cells ||
                _captable.rows  != captable.rows) {
                throw "captables don't match!";
            }
        }, logErrorPromise);
    }

    function loadIssues() {
        var promise = $q.defer();
        SWBrijj.tblm('ownership.company_issue')
        .then(function(securities) {
            promise.resolve(securities);
        }).except(logErrorPromise);
        return promise.promise;
    }
    function loadTransactions() {
        var promise = $q.defer();
        SWBrijj.tblm('ownership.company_transaction')
        .then(function(trans) {
            promise.resolve(trans);
        }).except(logErrorPromise);
        return promise.promise;
    }
    function loadGrants() {
        var promise = $q.defer();
        SWBrijj.tblm('ownership.company_grants')
        .then(function(grants) {
            promise.resolve(grants);
        }).except(logErrorPromise);
        return promise.promise;
    }
    function loadPariPassu() {
        var promise = $q.defer();
        SWBrijj.tblm('ownership.company_paripassu')
        .then(function(paripassu) {
            promise.resolve(paripassu);
        }).except(logErrorPromise);
        return promise.promise;
    }
    function loadConversions() {
        var promise = $q.defer();
        SWBrijj.tblm('ownership.company_conversion')
        .then(function(conversions) {
            promise.resolve(conversions);
        }).except(logErrorPromise);
        return promise.promise;
    }
    function loadTransfers() {
        var promise = $q.defer();
        SWBrijj.tblm('ownership.company_transfer')
        .then(function(transfers) {
            promise.resolve(transfers);
        }).except(logErrorPromise);
        return promise.promise;
    }
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
        security.transaction.push(tran.transaction);
        security.attrs = tran.attrs;
        _captable.security_names.push(security.name);

        _captable.securities.push(security);
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
    function setCellUnits(cell) {
    // FIXME this should depend on the type of security and transaction
        cell.u = cell.ukey = sum_ledger(cell.ledger_entries);
    }
    function setCellAmount(cell) {
    // FIXME this should depend on the type of security
        cell.a = cell.akey = sum_ledger(cell.ledger_entries);
    }
    function sum_ledger(entries) {
        return entries.reduce(
                function(prev, cur, index, arr) {
                   return prev + (cur.credit - cur.debit); 
                }, 0);
    }
    function generateCells() {
        angular.forEach(_captable.rows, function(inv) {
            if (!(inv.name in _captable.cells)) {
                _captable.cells[inv.name] = {};
            }
            angular.forEach(_captable.securities, function(sec) {
                var cell = nullCell();
                cell.transactions = _captable.transactions.filter(
                    function(tran) {
                        return tran.attrs.investor == inv.name &&
                               tran.attrs.security == sec.name;
                    });
                cell.ledger_entries = _captable.ledger_entries.filter(
                    function(ent) {
                        return ent.investor == inv.name &&
                               ent.security == sec.name;
                    });
                setCellUnits(cell);
                setCellAmount(cell);
                cell.security = sec.name;
                _captable.cells[inv.name][sec.name] = cell;
            });
        });
    }
    function rowFromName(name) {
        var row = newRow(_captable.securities);
        row.namekey = row.name = name.name;
        row.editable = "yes";
        return row;
    }
    function initUI() {
        $rootScope.$broadcast('captable:initui');
    }
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
    function attachEvidence(data) {
        angular.forEach(captable.trans, function(tran) {
            tran.evidence_data = data.filter(function(el) {
                return el.evidence==tran.evidence;
            });
        });
        // TODO implement for securities
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
        if (captable.uniquerows.indexOf(tran.investor) == -1) {
            captable.uniquerows.push(tran.investor);
            angular.forEach(captable.rows, function(row) {
                if (row.namekey == tran.investor) {
                    row.email = tran.email;
                    row.emailkey = tran.email;
                }
            });
        }
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
        var sec = nullSecurity();
        // Silly future date so that the issue always appears
        // on the rightmost side of the table
        sec.date = new Date(2100, 1, 1);
        captable.securities.push(sec);
        _captable.securities.push(sec);
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
        var row = newRow(captable.security_names);
        if (idx) {
            captable.rows.splice(idx, 0, row);
        } else {
            captable.rows.push(row);
        }
        return row;
    }
    this.addRow = addRow;
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
    function cellsForIssue(iss) {
        var cells = [];
        angular.forEach(captable.rows, function(row) {
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
    function addTranToCell(tran) {
        angular.forEach(captable.rows, function (row) {
            if (row.name == tran.investor) {
                updateCell(tran, row);
            } else if (!(tran.issue in row.cells)) {
                // TODO can both just call updateCell?
                row.cells[tran.issue] = nullCell();
            }
        });
    }
    function processTransaction(tran) {
        reformatDate(tran);
        setTransactionKeys(tran);
        setVestingDates(tran);
        inheritDataFromIssue(tran);
        addTranToRows(tran); // incorporate transaction's investor
        addTranToCell(tran);
    }
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
        angular.forEach(captable.rows, function (row) {
            angular.forEach(captable.securities, function (issue) {
                var cell = row.cells[issue.issue];
                if (cell !== undefined &&
                    issue.type == "Debt" &&
                    (!calculate.isNumber(cell.u) || cell.u === 0) &&
                    calculate.isNumber(cell.a))
                {
                    cell.x = calculate.debt(captable.rows,
                                            issue, row);
                }
            });
        });
    }
    this.calculateDebtCells = calculateDebtCells;
    function generateUnissuedRows() {
        angular.forEach(captable.securities, function(iss) {
            if (!calculate.isNumber(iss.totalauth)) return;
            var total = iss.totalauth;
            var num_granted = unitsGranted(iss, true);
            var leftovers = total - num_granted;
            var unissued_cell = nullCell();
            unissued_cell.u = unissued_cell.ukey = leftovers;
            var unissued_row = captable.rows.filter(
                function(el) {
                    return el.name == iss.issue + " (unissued)";
                })[0];
            if (unissued_row) {
                if (leftovers !== 0) {
                    unissued_row.cells[iss.issue] = unissued_cell;
                } else {
                    captable.rows.splice(
                        captable.rows.indexOf(unissued_row), 1);
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
        angular.forEach(captable.rows, function (row) {
            angular.forEach(captable.security_names, function (issuekey) {
                if (!(issuekey in row.cells)) {
                    row.cells[issuekey] = nullCell();
                }
            });
        });
    }
    this.fillEmptyCells = fillEmptyCells;
    //switches the sidebar based on the type of the issue
    function funcformatAmount(amount) {
        return calculate.funcformatAmount(amount);
    }

    var memformatamount = memoize(funcformatAmount);
    function formatAmount(amount) {
        return memformatamount(amount);
    }
    // Total Shares in captable
    var totalShares = memoize(calculate.totalShares);
    function totalShares(rows) {
        return formatAmount(totalShares(rows));
    }

    function formatDollarAmount(amount) {
        var output = calculate.formatMoneyAmount(memformatamount(amount),
                                                 $rootScope.settings);
        return (output);
    }
    // Total Shares | Paid for an issue column (type is either u or a)
    var totalPaid = memoize(calculate.totalPaid);
    function totalPaid(rows) {
        return formatDollarAmount(totalPaid(rows));
    }
    // Total Shares for a shareholder row
    var shareSum = memoize(calculate.shareSum);
    function shareSum(row) {
        return formatAmount(shareSum(row));
    }
    function calculateInvestorPercentages() {
        angular.forEach(captable.rows, function(row) {
            row.startpercent =
                calculate.sharePercentage(row,
                                          captable.rows,
                                          captable.security_names,
                                          shareSum(row),
                                          totalShares(captable.rows));
        });
    }
    function prepareForDisplay() {
        // Sort the columns before finally showing them
        // Issues are sorted by date, rows by ownership within each issue
        captable.securities.sort(sorting.issuedate);
        captable.security_names = sorting.security_names(captable.security_names,
                                               captable.securities);
        captable.rows.sort(sorting.basicrow());
        do {
            addRow();
        } while (captable.rows.length < 5);

        //Calculate the total vested for each row
        captable.rows = calculate.detailedvested(captable.rows, captable.trans);

        // Add extra blank issue, which will create a new one when clicked.
        addSecurity();
        return true;
    }
    function attachWatches() {
        for (var i=0; i < captable.trans.length; i++) {
            $rootScope.$watch('trans['+i+']', transaction_watch, true);
        }
        for (var j=0; j < captable.securities.length; j++) {
            $rootScope.$watch('securities['+j+']', issue_watch, true);
        }
    }
    this.attachWatches = attachWatches;
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
        angular.forEach(captable.rows, function (row) {
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

        angular.forEach(captable.rows, function(row) {
            if (!(row.name in captable.cells)) {
                captable.cells[row.name] = {};
            }
            angular.forEach(row.cells, function(cell, sec) {
                captable.cells[row.name][sec] = cell;
            });
        });
        console.log(captable);
    }
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
        angular.forEach(captable.rows, function (row) {
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
});
