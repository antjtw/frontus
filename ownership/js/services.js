var ownership = angular.module('ownerServices', []);

CapTable = function() {
    this.vInvestors = [];
    this.issuekeys = [];
    this.issues = [];
    this.rows = [];
    this.uniquerows = [];
    this.trans = [];
    this.grants = [];
    this.paripassu = [];
    this.conversions = [];
    this.transfers = [];
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
Row = function() {
    this.name = "";
    this.editable = "0";
};
Cell = function() {
    this.u = this.ukey = null;
    this.a = this.akey = null;
};
ownership.service('captable',
function($rootScope, calculate, sorting, SWBrijj, $q) {

    var captable = new CapTable();
    this.getCapTable = function() {
        return captable;
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
            captable.issues      = results[0];
            captable.trans       = results[1];
            handleTransactions(    results[1]);
            captable.grants      = results[2];
            captable.paripassu   = results[3];
            captable.conversions = results[4];
            captable.transfers   = results[5];
            attachEvidence(        results[6]);

            generateCaptable(      results[7]);
        }, logErrorPromise);
    };
    this.loadCapTable();
    function loadIssues() {
        var promise = $q.defer();
        SWBrijj.tblm('ownership.company_issue')
        .then(function(issues) {
            promise.resolve(issues);
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
    function initUI() {
        $rootScope.$broadcast('captable:initui');
    }
    function updateCell(tran, row) {
        var cell;
        if (tran.issue in row) {
            cell = row[tran.issue];
        } else {
            cell = row[tran.issue] = {};
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
        // TODO implement for issues
    }
    function setIssueKey(iss) {
        iss.key = iss.issue;
        captable.issuekeys.push(iss.key);
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
        angular.forEach(captable.issues, function(iss) {
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
    function nullRow() {
        return new Row();
    }
    function newRow() {
        var row = nullRow();
        angular.forEach(captable.issuekeys, function(k) {
            row[k] = nullCell();
        });
        return row;
    }
    function addRow() {
        var row = newRow();
        captable.rows.push(row);
        return row;
    }
    function newTransaction(issuekey, investor) {
        var tran = new Transaction();
        tran.new = "yes";
        tran.investor = tran.investorkey = investor;
        inheritAllDataFromIssue(tran, getIssue(issuekey));
        return tran;
    }
    this.newTransaction = newTransaction;
    function getIssue(issuekey) {
        return captable.issues.filter(function(el) {
            return el.issue==issuekey;
        })[0];
    }
    this.getIssue = getIssue;
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
            } else if (!(tran.issue in row)) {
                row[tran.issue] = nullCell();
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
    function attachPariPassu(issues, links) {
        angular.forEach(issues, function(iss) {
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
        angular.forEach(captable.rows, function (row) {
            angular.forEach(captable.issues, function (issue) {
                var cell = row[issue.issue];
                if (cell !== undefined &&
                    issue.type == "Debt" &&
                    !calculate.isNumber(cell.u) &&
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
        angular.forEach(captable.issues, function (issue) {
            // FIXME there has to be a way to simplify
            captable.rows = calculate.unissued(captable.rows,
                                               captable.issues,
                                               String(issue.issue));
        });
    }
    this.generateUnissuedRows = generateUnissuedRows;
    function fillEmptyCells() {
        angular.forEach(captable.rows, function (row) {
            angular.forEach(captable.issuekeys, function (issuekey) {
                if (!(issuekey in row)) {
                    row[issuekey] = nullCell();
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
                                          captable.issuekeys,
                                          shareSum(row),
                                          totalShares(captable.rows));
        });
    }
    function prepareForDisplay() {
        // Sort the columns before finally showing them
        // Issues are sorted by date, rows by ownership within each issue
        captable.issues.sort(sorting.issuedate);
        captable.issuekeys = sorting.issuekeys(captable.issuekeys,
                                               captable.issues);
        captable.rows.sort(sorting.basicrow());
        do {
            addRow();
        } while (captable.rows.length < 5);

        //Calculate the total vested for each row
        captable.rows = calculate.detailedvested(captable.rows, captable.trans);

        // Add extra blank issue, which will create a new one when clicked.
        // Silly future date so that the issue always appears
        // on the rightmost side of the table
        captable.issues.push({"name": "", "date": new Date(2100, 1, 1)});
        return true;
    }
    function attachWatches() {
        for (var i=0; i < captable.trans.length; i++) {
            $rootScope.$watch('trans['+i+']', transaction_watch, true);
        }
        for (var j=0; j < captable.issues.length; j++) {
            $rootScope.$watch('issues['+j+']', issue_watch, true);
        }
    }
    this.attachWatches = attachWatches;
    function pingIntercomIfCaptableStarted() {
        var earliestedit = new Date.today().addDays(1);
        var duplicate = earliestedit;
        angular.forEach(captable.issues, function(issue) {
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
        generic_watch(newval, oldval, captable.issues);
    }
    function generateCaptable(names) {
        angular.forEach(captable.issues, processIssue);
        incorporateGrantsIntoTransactions(captable.grants, captable.trans);
        initRowsFromNames(names);
        angular.forEach(captable.trans, processTransaction);
        attachPariPassu(captable.issues, captable.paripassu);
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

// Captable functions for basic mathematics.
// FIXME make into library of pure functions
ownership.service('calculate', function () {

    this.whenVestingBegins = function(obj) {
        if (this.isNumber(obj.vestingbeginsdisplay, 10)) {
            return angular.copy(obj.date).addMonths(
                parseInt(obj.vestingbeginsdisplay, 10));
        } else {
            return obj.vestingbegins;
        }
    };
    this.complement = function(a, b) {
        return a.filter(function(el) {return b.indexOf(el)==-1;});
    };
    this.toFloat = function(value) {
        return isNaN(parseFloat(value)) ? null : parseFloat(value);
    };

    // The remainder calculated for outstanding units rows.
    this.whatsleft = function (total, issue, rows) {
        var leftover = total;
        angular.forEach(rows, function (row) {
            if (issue.issue in row && row.nameeditable != 0 && !isNaN(parseFloat(row[issue.issue]['u']))) {
                leftover = leftover - row[issue.issue]['u'];
            }
        });
        return leftover
    };

    // Calculate and update the unissued rows on the captable
    this.unissued = function (rows, issues, issuename) {
        var keepgoing = true;
        var deleterow = -1;
        var leftovers;
        angular.forEach(issues, function (issue) {
            if (issue.issue == issuename) {
                if (!isNaN(parseFloat(issue.totalauth))) {
                    leftovers = issue.totalauth;
                    angular.forEach(rows, function (row) {
                        if (issue.issue in row && row.nameeditable != 0 && !isNaN(parseFloat(row[issue.issue]['u']))) {
                            leftovers = leftovers - row[issue.issue]['u'];
                        }
                    });
                }
            }
        });

        angular.forEach(issues, function(issue) {
            if (issue.optundersec == issuename && !isNaN(parseFloat(issue.totalauth))) {
                leftovers = leftovers - issue.totalauth;
            }
        });

        var shares = {"u": leftovers, "ukey": leftovers, "x": null};
        angular.forEach(rows, function (row) {
            if (keepgoing) {
                if (row.name == issuename + " (unissued)") {
                    keepgoing = false;
                    if (leftovers != 0) {
                        row[issuename] = shares;
                    }
                    else {
                        deleterow = rows.indexOf(row);
                    }
                }
            }
        });
        if (keepgoing != false) {
            if (!isNaN(parseFloat(leftovers)) && leftovers != 0) {
                rows.splice(-1, 0, {"name": issuename + " (unissued)", "editable": 0, "nameeditable": 0});
                rows[(rows.length) - 2][issuename] = shares;
            }
        }
        if (deleterow > -1) {
            rows.splice(deleterow, 1);
        }
        return rows
    };

    // Simple summation checking that the added value is a number.
    this.sum = function (current, additional) {
        if ((!current || isNaN(parseFloat(current))) && !isNaN(parseFloat(additional))) {
            current = 0;
        }
        if (!isNaN(parseFloat(additional))) {
            return (current + parseFloat(additional));
        }
        else {
            return current;
        }
    };

    // Calculates the debt for the captable based on transactions with paid but no shares. Must be called on each row.
    this.debt = function (rows, issue, row) {
        return null;
/*        var mon = parseFloat(issue.premoney);
        if (isNaN(parseFloat(mon))) {
            return null
        }
        else {
            angular.forEach(rows, function (r) {
                if (r[issue.issue] != undefined) {
                    if ((isNaN(parseFloat(r[issue.issue]['u'])) || r[issue.issue]['u'] == 0 ) && !isNaN(parseFloat(r[issue.issue]['a']))) {
                        mon = mon + parseFloat(r[issue.issue]['a']);
                    }
                }
            });
        }
        return ((parseFloat(row[issue.issue]['a']) / parseFloat(mon)) * 100)*/
    };

    // Calculates the vested amounts for the grant table. This takes in the row array and returns the new row array.
    this.vested = function (rows, trans) {
        var vesting = {};
        angular.forEach(trans, function (tran) {
            var vestbegin = angular.copy(tran.vestingbegins);
            if (!isNaN(parseFloat(tran.vestcliff)) && !isNaN(parseFloat(tran.terms)) && tran.vestfreq != null && tran.date != null && vestbegin != null) {
                if (Date.compare(Date.today(), vestbegin) > -1) {
                    if (!isNaN(parseFloat(vesting[tran.investor]))) {
                        vesting[tran.investor] = vesting[tran.investor] + (tran.units * (tran.vestcliff / 100));
                    }
                    else {
                        vesting[tran.investor] = (tran.units * (tran.vestcliff / 100));
                    }
                    var cycleDate = angular.copy(tran.date);
                    var remainingterm = angular.copy(tran.terms);
                    while (Date.compare(vestbegin, cycleDate) > -1) {
                        remainingterm = remainingterm - 1;
                        cycleDate.addMonths(1);
                    }
                    remainingterm = remainingterm;
                    var finalDate = vestbegin.addMonths(remainingterm);
                    var monthlyperc = (100 - tran.vestcliff) / (remainingterm);
                    var x = 1;
                    if (tran.vestfreq == "monthly") {
                        x = 1;
                    } else if (tran.vestfreq == "weekly") {
                        x = 0.25;
                    } else if (tran.vestfreq == "bi-weekly") {
                        x = 0.5;
                    } else if (tran.vestfreq == "quarterly") {
                        x = 3;
                    } else if (tran.vestfreq == "yearly") {
                        x = 12;
                    }
                    if (x < 1) {
                        cycleDate.addWeeks(x * 4);
                    } else {
                        cycleDate.addMonths(x);
                    }
                    while (Date.compare(Date.today(), cycleDate) > -1 && Date.compare(finalDate.addDays(1), cycleDate) > -1) {
                        vesting[tran.investor] = vesting[tran.investor] + (x * ((monthlyperc / 100) * tran.units));
                        if (x < 1) {
                            cycleDate.addWeeks(x * 4);
                        }
                        else {
                            cycleDate.addMonths(x);
                        }
                    }
                }
            }
        });
        angular.forEach(rows, function (row) {
            if (!isNaN(vesting[row.name])) {
                var result =Math.round(vesting[row.name]*1000)/1000
                row.vested = result;
                if (parseFloat(row.vested) > (parseFloat(row.granted)-parseFloat(row.forfeited))) {
                    row.vested = (parseFloat(row.granted)-parseFloat(row.forfeited));
                }
            }
        });
        return rows;
    };

    // Calculates vested on each transaction returning dictionary of date:amount vested
    this.tranvested = function (tran) {
        var tranvested = [];
        var vestbegin = angular.copy(tran.vestingbegins);
        var maxunits = parseFloat(tran.units) - parseFloat(tran.forfeited);
        var vestedunits = 0;
        if (!isNaN(parseFloat(tran.vestcliff)) && !isNaN(parseFloat(tran.terms)) && tran.vestfreq != null && tran.date != null && vestbegin != null) {
            var cycleDate = angular.copy(tran.date).add(1).days();
            if (Date.compare(Date.today(), vestbegin) > -1) {
                tranvested.push({"date" : angular.copy(vestbegin), "units" : (tran.units * (tran.vestcliff / 100))});
                vestedunits += (tran.units * (tran.vestcliff / 100));
            }
            if (vestedunits > maxunits) {
                var diff = vestedunits - maxunits;
                tranvested[tranvested.length-1].units -= diff;
            }
            var remainingterm = angular.copy(tran.terms);
            while (Date.compare(vestbegin, cycleDate) > -1) {
                remainingterm = remainingterm - 1;
                cycleDate.addMonths(1);
            }
            cycleDate.add(-1).days();
            var finalDate = vestbegin.addMonths(remainingterm);
            var monthlyperc = (100 - tran.vestcliff) / (remainingterm);
            var x = 1;
            if (tran.vestfreq == "monthly") {
                x = 1
            }
            else if (tran.vestfreq == "weekly") {
                x = 0.25
            }
            else if (tran.vestfreq == "bi-weekly") {
                x = 0.5
            }
            else if (tran.vestfreq == "quarterly") {
                x = 3;
            }
            else if (tran.vestfreq == "yearly") {
                x = 12;
            }
            finalDate.add(-1).days();
            while (Date.compare(finalDate, cycleDate) > -1) {
                if (x < 1) {
                    cycleDate.addWeeks(x * 4);
                }
                else {
                    cycleDate.addMonths(x);
                }
                if (Date.compare(Date.today(), cycleDate) > -1) {
                    tranvested.push({"date" : angular.copy(cycleDate), "units" : (x * ((monthlyperc / 100) * tran.units))});
                    vestedunits += (x * ((monthlyperc / 100) * tran.units));
                    if (vestedunits > maxunits) {
                        var diff = vestedunits - maxunits;
                        tranvested[tranvested.length-1].units -= diff;
                        return tranvested;
                    }
                }
            }
        }
        return tranvested;
    };

    // Calculates the vested amounts for the
    this.detailedvested = function (rows, trans) {
        var vesting = {};
        angular.forEach(trans, function (tran) {
            var vestbegin = angular.copy(tran.vestingbegins)
            if (!isNaN(parseFloat(tran.vestcliff)) && !isNaN(parseFloat(tran.terms)) && tran.vestfreq != null && tran.date != null && vestbegin != null) {
                if (Date.compare(Date.today(), vestbegin) > -1) {
                    if (!vesting[tran.investor]) {
                        vesting[tran.investor] = {};
                    }
                    if (!isNaN(parseFloat(vesting[tran.investor][tran.issue]))) {
                        vesting[tran.investor][tran.issue] = vesting[tran.investor][tran.issue] + (tran.units * (tran.vestcliff / 100));
                    }
                    else {
                        vesting[tran.investor][tran.issue] = (tran.units * (tran.vestcliff / 100));
                    }
                    var cycleDate = angular.copy(tran.date);
                    var remainingterm = angular.copy(tran.terms);
                    while (Date.compare(vestbegin, cycleDate) > -1) {
                        remainingterm = remainingterm - 1;
                        cycleDate.addMonths(1);
                    }
                    remainingterm = remainingterm;
                    var finalDate = vestbegin.addMonths(remainingterm);
                    var monthlyperc = (100 - tran.vestcliff) / (remainingterm);
                    var x = 1;
                    if (tran.vestfreq == "monthly") {
                        x = 1
                    }
                    else if (tran.vestfreq == "weekly") {
                        x = 0.25
                    }
                    else if (tran.vestfreq == "bi-weekly") {
                        x = 0.5
                    }
                    else if (tran.vestfreq == "quarterly") {
                        x = 3;
                    }
                    else if (tran.vestfreq == "yearly") {
                        x = 12;
                    }
                    if (x < 1) {
                        cycleDate.addWeeks(x * 4);
                    }
                    else {
                        cycleDate.addMonths(x);
                    }
                    while (Date.compare(Date.today(), cycleDate) > -1 && Date.compare(finalDate.addDays(1), cycleDate) > -1) {
                        vesting[tran.investor][tran.issue] = vesting[tran.investor][tran.issue] + (x * ((monthlyperc / 100) * tran.units));
                        if (x < 1) {
                            cycleDate.addWeeks(x * 4);
                        }
                        else {
                            cycleDate.addMonths(x);
                        }
                    }
                }
            }
        });
        angular.forEach(rows, function (row) {
            if (vesting[row.name]) {
                row.vested = {}
                for (var issue in vesting[row.name]) {
                    if (!isNaN(vesting[row.name][issue])) {
                        var result = Math.round(vesting[row.name][issue]*1000)/1000
                        row.vested[issue] = result;
                    }
                }
            }
        });
        return rows
    };

    this.myvested = function (trans) {
        var myvested = {};
        var tranvested = {};
        var firstcolumn = new Date(5000000000000);
        var lastcolumn = new Date(01-12-1000);
        angular.forEach(trans, function(tran) {
            tranvested[tran.date] = 0;
            var vestbegin = angular.copy(tran.vestingbegins);
            if (!isNaN(parseFloat(tran.vestcliff)) && !isNaN(parseFloat(tran.terms)) && tran.vestfreq != null && tran.date != null && vestbegin != null) {
                firstcolumn = Date.compare(vestbegin, firstcolumn) > -1 ? firstcolumn : vestbegin;
            }
            var remainingterm = angular.copy(tran.terms);
            var startdate = angular.copy(tran.date);
            while (remainingterm > 0) {
                startdate.addMonths(1);
                remainingterm -= 1;
            }
            lastcolumn = Date.compare(startdate, lastcolumn) > -1 ? startdate : lastcolumn;
        });
        while (Date.compare(lastcolumn, firstcolumn) > -1) {
            myvested[firstcolumn.toString("MMM yyyy")] = [0,0];
            firstcolumn.addMonths(1);
        }
        angular.forEach(trans, function (tran) {
            var vestbegin = angular.copy(tran.vestingbegins);
            if (!isNaN(parseFloat(tran.vestcliff)) && !isNaN(parseFloat(tran.terms)) && tran.vestfreq != null && tran.date != null && vestbegin != null) {
                var cycleDate = angular.copy(tran.date).add(1).days();
                // Create dictionary of all vesting events, [number vested by today's date, number that will be vested in total]
                if (myvested[vestbegin.toString("MMM yyyy")]) {
                    myvested[vestbegin.toString("MMM yyyy")][1] += (tran.units * (tran.vestcliff / 100));
                }
                else {
                    myvested[vestbegin.toString("MMM yyyy")] = [0,(tran.units * (tran.vestcliff / 100))];
                }
                if (Date.compare(Date.today(), vestbegin) > -1) {
                    myvested[vestbegin.toString("MMM yyyy")][0] += (tran.units * (tran.vestcliff / 100));
                    tranvested[tran.date] += (tran.units * (tran.vestcliff / 100));
                }
                var remainingterm = angular.copy(tran.terms);
                while (Date.compare(vestbegin, cycleDate) > -1) {
                    remainingterm = remainingterm - 1;
                    cycleDate.addMonths(1);
                }
                cycleDate.add(-1).days();
                var finalDate = vestbegin.addMonths(remainingterm);
                var monthlyperc = (100 - tran.vestcliff) / (remainingterm);
                var x = 1;
                if (tran.vestfreq == "monthly") {
                    x = 1
                }
                else if (tran.vestfreq == "weekly") {
                    x = 0.25
                }
                else if (tran.vestfreq == "bi-weekly") {
                    x = 0.5
                }
                else if (tran.vestfreq == "quarterly") {
                    x = 3;
                }
                else if (tran.vestfreq == "yearly") {
                    x = 12;
                }
                finalDate.add(-1).days();
                while (Date.compare(finalDate, cycleDate) > -1) {
                    if (x < 1) {
                        cycleDate.addWeeks(x * 4);
                    }
                    else {
                        cycleDate.addMonths(x);
                    }
                    if (myvested[cycleDate.toString("MMM yyyy")]) {
                        myvested[cycleDate.toString("MMM yyyy")][1] += (x * ((monthlyperc / 100) * tran.units));
                    }
                    else {
                        myvested[cycleDate.toString("MMM yyyy")] = [0,(x * ((monthlyperc / 100) * tran.units))];
                    }
                    if (Date.compare(Date.today(), cycleDate) > -1) {
                        myvested[cycleDate.toString("MMM yyyy")][0] += (x * ((monthlyperc / 100) * tran.units));
                        tranvested[tran.date] += (x * ((monthlyperc / 100) * tran.units));
                    }
                }
            }
        });
        return [myvested,tranvested];
    };

    // Generates the diluted rows
    this.dilution = function (rows, issues) {
        var dilutedRows = [];
        angular.forEach(rows, function (row) {
            if (row.name != undefined) {
                var something = null;
                var temprow = {"name": row.name, "email": row.email};
                angular.forEach(issues, function (issue) {
                    if (issue.issue) {
                        temprow[issue.issue] = {};
                        if (row.editable == "yes" && (issue.type == "Equity" || issue.type == null) && row[issue.issue]['u'] > 0) {
                            temprow[issue.issue] = row[issue.issue];
                            something = true;
                        }
                        if (row[issue.issue]['exercised'] && row.vested && row[issue.issue]['exercised'] > row.vested[issue.issue]) {
                            if (row[issue.issue]['u'] < row[issue.issue]['exercised']) {
                                temprow[issue.issue]['u'] = row[issue.issue]['u'];
                            }
                            else {
                                temprow[issue.issue]['u'] = row[issue.issue]['exercised'];
                            }
                            temprow[issue.issue]['a'] = row[issue.issue]['a'];
                            something = true;
                        }
                        else if (row[issue.issue]['exercised'] && !row.vested) {
                            if (row[issue.issue]['u'] < row[issue.issue]['exercised']) {
                                temprow[issue.issue]['u'] = row[issue.issue]['u'];
                            }
                            else {
                                temprow[issue.issue]['u'] = row[issue.issue]['exercised'];
                            }
                            temprow[issue.issue]['a'] = row[issue.issue]['a'];
                            something = true;
                        }
                        else if (row.vested && issue.type == "Option" && row.vested[issue.issue] > 0) {
                            if (row[issue.issue]['u'] < row.vested[issue.issue]) {
                                temprow[issue.issue]['u'] = row[issue.issue]['u'];
                            }
                            else {
                                temprow[issue.issue]['u'] = row.vested[issue.issue];
                            }
                            temprow[issue.issue]['a'] = row[issue.issue]['a'];
                            something = true;
                        }
                    }
                });
                if (something) {
                    dilutedRows.push(temprow);
                }
            }
        });
        return dilutedRows;
    };




    // Returns the number of shareholders (rows -1 for the empty row)
    this.numShareholders = function (rows) {
        var number = 0
        angular.forEach(rows, function(row) {
            if (row.editable == "yes") {
                number += 1
            }
        });
        return number;
    };

    // Calculates the Total Shares owned by an investor across all rounds
    this.shareSum = function (row) {
        var total = 0;
        for (var key in row) {
            if (row.hasOwnProperty(key)) {
                if (row[key] != null) {
                    if (!isNaN(parseFloat(row[key]['u'])) && String(key) != "$$hashKey") {
                        total = total + parseFloat(row[key]['u']);
                    }
                }
            }
        }
        return total;
    };

    // Returns the percentage ownership for each shareholder
    this.sharePercentage = function (row, rows, issuekeys, sharesum, totalshares) {
        var percentage = 0;
        var totalpercentage = 0;
        for (var i = 0, l = issuekeys.length; i < l; i++) {
            if (row[issuekeys[i]] != undefined) {
                if (row[issuekeys[i]]['x'] != undefined) {
                    percentage = percentage + row[issuekeys[i]]['x'];
                }
            }
        }
        for (var j = 0, a = rows.length; j < a; j++) {
            for (var i = 0, l = issuekeys.length; i < l; i++) {
                if (rows[j][issuekeys[i]] != undefined) {
                    if (rows[j][issuekeys[i]]['x'] != undefined) {
                        totalpercentage = totalpercentage + rows[j][issuekeys[i]]['x'];
                    }
                }
            }
        }
        return (percentage + (sharesum / totalshares * (100 - totalpercentage)));
    };

    // Calculates total shares for the captable
    this.totalShares = function (rows) {
        var total = 0;
        angular.forEach(rows, function (row) {
            for (var key in row) {
                if (row.hasOwnProperty(key)) {
                    if (row[key] != null) {
                        if (!isNaN(parseFloat(row[key]['u'])) && String(key) != "$$hashKey") {
                            total = total + parseFloat(row[key]['u']);
                        }
                    }
                }
            }
        });
        return total;
    };

    //Calculates the total for a column, will do either shares or money depending
    this.colTotal = function (header, rows, type) {
        var total = 0;
        for (var i = 0, a = rows.length; i < a; i++) {
            if (rows[i][header]) {
                var possfloat = parseFloat(rows[i][header][type]);
                if (!isNaN(possfloat) && String(header) != "$$hashKey") {
                    total += possfloat;
                }
            }
        }
        return total;
    };

    //Calculates the total for a column, without unissued shares
    this.colTotalIssued = function (header, rows, type) {
        var total = 0;
        angular.forEach(rows, function (row) {
            if (row.editable == "yes") {
                for (var key in row) {
                    if (key == header) {
                        if (!isNaN(parseFloat(row[key][type])) && String(key) != "$$hashKey") {
                            total = total + parseFloat(row[key][type]);
                        }
                    }
                }
            }
        });
        return total;
    };

    //Calculates the total money for all issues and transactions
    this.totalPaid = function (rows) {
        var total = 0;
        angular.forEach(rows, function (row) {
            for (var key in row) {
                if (row[key] != null && !isNaN(parseFloat(row[key]['a'])) && String(key) != "$$hashKey") {
                    total = total + parseFloat(row[key]['a']);
                }
            }
        });
        return total;
    };

    //Returns the price per share for the most recent issue assuming such a value is given
    this.pricePerShare = function (issues, finishedsorting) {
        if (finishedsorting && issues[issues.length-2]) {
            return issues[issues.length-2].ppshare;
        }
    };

    //Returns the price per share for the most recent issue assuming such a value is given
    this.lastIssue = function (issues, finishedsorting) {
        if (finishedsorting && issues[issues.length-2]) {
            return issues[issues.length-2].date;
        }
    };

    //Returns the post money valuation for the most recent issue assuming such a value is given
    this.lastPostMoney = function (issues, finishedsorting) {
        if (finishedsorting && issues[issues.length-2]) {
            return issues[issues.length-2].postmoney;
        }
    };

    this.funcformatAmount = function (amount) {
        if (amount && !isNaN(amount)) {
            var n = amount.toString().split(".");
            //Comma-fies the first part
            n[0] = n[0].replace(/\B(?=(\d{3})+(?!\d))/g, ",");
            // Caps decimals to 3 places
            if (n[1] && n[1].length > 4) {
                n[1] = n[1].substring(0,3);
            }
            // Takes a .x and makes it .x0
            else if (n[1] && n[1].length == 1) {
                n[1] = n[1] + "0"
            }
            //Combines the two sections
            amount = n.join(".");
        }
        else {
            amount = null;
        }
        return amount;
    };

    var sizes = {0:'', 1:'K', 2:'M', 3:'B'};
    this.abrAmount = function(amount) {
        if (amount) {
            var n = amount.toString().split(".");
            var sizefactor = Math.floor((n[0].length-1)/3);
            if (sizefactor == 0) {
                amount = n[0];
            }
            else {
                var big = String(n[0]).substring(0, n[0].length - (sizefactor*3));
                var small = String(n[0]).substring(n[0].length - (sizefactor*3), n[0].length - (sizefactor*3) + 2);
                if (parseInt(small) % 10 == 0) {
                    small = small.substring(0, 1);
                    if (parseInt(small) == 0) {
                        small = ""
                    }
                }
                small = small != "" ? "." + small : "";
                amount = big + small + sizes[sizefactor];
            }
        }
        else {
            amount = 0;
        }
        return amount
    };

    this.cleanZeros = function(amount) {
        if (amount) {
            var n = amount.toString().split(".");
            if (n[1]) {
                var small = n[1].substring(0,2);
                if (parseInt(small) % 10 == 0) {
                    small = small.substring(0, 1);
                    if (parseInt(small) == 0) {
                        small = ""
                    }
                }
                small = small != "" ? "." + small : "";
                amount = n[0] + small;
            }
        }
        return amount;
    };

    var currencydictionary = {'EUR': '€', 'GBP': '£', 'USD': '$'};

    this.currencysymbol = function(settings) {
        return settings && currencydictionary[settings.currency] ? currencydictionary[settings.currency] : '$'
    };

    this.formatMoneyAmount = function (amount, settings) {
        var symbol = settings && currencydictionary[settings.currency] ? currencydictionary[settings.currency] : '$'
        if (amount) {
            return symbol + amount;
        }
    };

    this.debtinterest = function(convertTran) {
        if (convertTran.date && convertTran.tran.date && convertTran.tran.interestrate && convertTran.tran.interestratefreq && convertTran.tran.amount) {
            var x =1;
            switch (convertTran.tran.interestratefreq)
            {
                case 'monthly':
                    x=1;
                    break;
                case 'weekly':
                    x=0.25;
                    break;
                case 'bi-weekly':
                    x=0.5;
                    break;
                case 'quarterly':
                    x=3;
                    break;
                case 'yearly':
                    x=12;
                    break;
                default:
                    x=1;
            }
            var cycleDate = angular.copy(convertTran.tran.date);
            var length = 500;
            if (convertTran.tran.term) {
               length = parseInt(convertTran.tran.term)
            }
            if (x < 1) {
                cycleDate.addWeeks(x * 4);
            }
            else {
                cycleDate.addMonths(x);
            }
            var finalDate = angular.copy(convertTran.tran.date).addMonths(length);
            while (Date.compare(convertTran.date, cycleDate) > -1 && Date.compare(finalDate.addDays(1), cycleDate) > -1) {
                convertTran.newtran.amount = parseFloat(convertTran.newtran.amount) + ((parseFloat(convertTran.tran.interestrate)/100) * parseFloat(convertTran.newtran.amount));
                if (x < 1) {
                    cycleDate.addWeeks(x * 4);
                }
                else {
                    cycleDate.addMonths(x);
                }
            }
        }
        return convertTran.newtran.amount;
    };



    this.conversion = function(convertTran) {
        if (convertTran.method == "Valuation") {
            var discount = !isNaN(parseFloat(convertTran.tran.discount)) ? (parseFloat(convertTran.tran.discount)/100) : 0;
            var regularppshare = parseFloat(convertTran.toissue.ppshare) * (1-discount);
            if (!isNaN(parseFloat(convertTran.toissue.premoney)) && !isNaN(parseFloat(convertTran.tran.valcap))) {
                var premoneypercent = (1-(parseFloat(convertTran.tran.valcap) / parseFloat(convertTran.toissue.premoney)));
                convertTran.newtran.prevalcappercentage = String(premoneypercent*100);
                if (premoneypercent > (discount)) {
                    regularppshare = parseFloat(convertTran.toissue.ppshare) * (1-premoneypercent);
                    convertTran.newtran.caphit = true;
                }
            }
            if (!isNaN(parseFloat(convertTran.toissue.ppshare))) {
                convertTran.newtran.ppshare = regularppshare;
                convertTran.newtran.units = parseFloat(convertTran.newtran.amount) / convertTran.newtran.ppshare;
            }
            return convertTran.newtran;
        }
        else if (convertTran.method == "Price Per Share") {
            convertTran.newtran.ppshare = convertTran.ppshare;
            convertTran.newtran.units = parseFloat(convertTran.newtran.amount) / convertTran.ppshare;
        }
        return convertTran.newtran;
    };

    this.undoIf = function(fn, cur, prev) {
        return fn(cur) ? prev : cur;
    };
    this.numberIsInvalid = function(num) {
        return !(/^(\d+)*(\.\d+)*$/.test(num)) && num != null && num != "";
    };
    this.cleannumber = function(potentialnumber) {
        if (potentialnumber) {
            var finalnumber = String(potentialnumber).replace(/\,/g,'');
            finalnumber = String(finalnumber).replace(/\$/g , '');
            return finalnumber
        }
    };
    this.isNumber = function(val) {
        return !isNaN(parseFloat(val));
    };

    // Converts strings to boolean
    this.strToBool = function (string) {
        switch (String(string).toLowerCase()) {
            case "true":
            case "yes":
            case "1":
                return true;
            case "false":
            case "no":
            case "0":
                return false;
            case null:
            case undefined:
            case "undefined":
                return null;
            default:
                return Boolean(string);
        }
    };

    this.booltoYN = function (object, field, options) {
        if (String(object[field]) == "true") {
            object[field] = options[0];
        }
        else if (String(object[field]) == "false") {
            object[field] = options[1];
        }
        return object[field]
    };

    this.timezoneOffset = function (date) {
        return date.addMinutes(date.getTimezoneOffset());
    };

    this.monthDiff = function(d1, d2) {
        var diffYears = d1.getFullYear()-d2.getFullYear();
        var diffMonths = d1.getMonth()-d2.getMonth();
        return (diffYears*12 + diffMonths);
    }

});

ownership.service('switchval', function () {

    // Toggles the sidebar based on the type of the issue
    this.trantype = function (type, activetype) {
        if (activetype == "Option" && type == "Option") {
            return true;
        }
        else if (activetype == "Debt" && type == "Debt") {
            return true;
        }
        else if (activetype == "Equity" && type == "Equity") {
            return true;
        }
        else if (activetype == "Safe" && type == "Safe") {
            return true;
        }
        else if (activetype == "Warrant" && type == "Warrant") {
            return true;
        }
        else {
            return false;
        }
    };

    this.typeswitch = function (tran) {
        if (tran.type = "Option") {
            tran.atype = 1;
        }
        else if (tran.type = "Debt") {
            tran.atype = 2;
        }
        else {
            tran.atype = 0;
        }
        return tran;
    };

    this.typereverse = function (tran) {
        if (tran == 1) {
            tran = "Option";
        }
        else if (tran == 2) {
            tran = "Debt";
        }
        else {
            tran = "Equity";
        }
        return tran;
    };
});

ownership.service('sorting', function () {

    this.issuekeys = function (keys, issues) {
        var sorted = [];
        angular.forEach(issues, function (issue) {
            angular.forEach(keys, function (key) {
                if (issue.issue == key) {
                    sorted.push(key);
                }
            });
        });
        return sorted;
    };

    this.issuedate = function (a, b) {
        if (a.date < b.date)
            return -1;
        if (a.date > b.date)
            return 1;
        if (a.date = b.date) {
            if (a.created < b.created)
                return -1;
            if (a.created > b.created)
                return 1;
        }
        return 0;
    };

    /*    // Sorts the rows by issue type from earliest to latest
     this.row = function (prop) {
     return function (a, b) {
     var i = 0;
     // Working for the earliest issue to the latest
     while (i < prop.length) {

     // Filters out the unissued shares lines
     if (a['nameeditable'] == 0) {
     if (b['nameeditable'] == 0) {
     if (Math.abs(a[prop[i]]['u']) < Math.abs(b[prop[i]]['u']))
     return 1;
     if (Math.abs(a[prop[i]]['u']) > Math.abs(b[prop[i]]['u']))
     return -1;
     }
     return -1
     }
     if (b['nameeditable'] == 0) {
     if (a['nameeditable'] == 0) {
     if (Math.abs(a[prop[i]]['u']) < Math.abs(b[prop[i]]['u']))
     return -1;
     if (Math.abs(a[prop[i]]['u']) > Math.abs(b[prop[i]]['u']))
     return 1;
     }
     return -1
     }
     // Ranks the adjacent rows and returns the order for the pair
     if (a[prop[i]]['u'] < b[prop[i]]['u'])
     return 1;
     if (a[prop[i]]['u'] > b[prop[i]]['u'])
     return -1;
     i++
     }
     return 0;
     }
     };*/

    // Sorts the rows by greatest ownership
    this.basicrow = function () {
        return function (a, b) {
            if (a.startpercent > b.startpercent) return -1
            else if (b.startpercent > a.startpercent) return 1
            else return 0;
        }
    };

});

app.run(function ($rootScope) {

    $rootScope.rowOrdering = function (row) {
        var total = 0;
        for (var key in row) {
            if (row.hasOwnProperty(key)) {
                if (key != "name") {
                    if (!isNaN(parseFloat(row[key]['u'])) && String(key) != "$$hashKey") {
                        total = total + parseFloat(row[key]['u']);
                    }
                }
            }
        }
        return -total;
    };

//Calculates total grants in each issue
    $rootScope.totalGranted = function (issue, trans) {
        var granted = 0;
        angular.forEach(trans, function (tran) {
            if (tran.issue == issue && tran.type == "Option" && !isNaN(parseFloat(tran.units))) {
                granted = granted + parseFloat(tran.units);
                if (tran.forfeited) {
                    granted = granted - tran.forfeited;
                }
            }
        });
        return granted;
    };

//Calculates total grant actions in grant table
    $rootScope.totalGrantAction = function (type, grants) {
        var total = 0;
        angular.forEach(grants, function (grant) {
            if (grant.action == type && !isNaN(parseFloat(grant.unit))) {
                total = total + parseFloat(grant.unit);
            }
        });
        return total;
    };

//Calculates total granted to and forfeited in grant table
    $rootScope.totalTranAction = function (type, trans) {
        var total = 0;
        angular.forEach(trans, function (tran) {
            if (type == "granted") {
                if (!isNaN(parseFloat(tran.units)) && parseFloat(tran.units) > 0) {
                    total = total + parseFloat(tran.units);
                }
            }
            else if (type == "forfeited") {
                if (!isNaN(parseFloat(tran.units)) && parseFloat(tran.units) < 0) {
                    total = total + parseFloat(tran.units);
                }
            }
        });
        return total;
    };

//Calculates total vested in column
    $rootScope.totalVestedAction = function (rows) {
        var total = 0;
        angular.forEach(rows, function (row) {
            if (!isNaN(parseFloat(row.vested))) {
                total = total + parseFloat(row.vested);
            }
        });
        return total;
    };

    $rootScope.postIssues = function (keys, issue) {
        console.log(keys);
        console.log(issue);
    };

    $rootScope.myPercentage = function (everyone) {
        return (100 - everyone);
    };

});

function hidePopover() {
    angular.element('.popover').hide();
}

ownership.value('displayCopy', {
    tourmessages: {
        intro:
            "Hover over these icons to reveal helpful info " +
            "about your table",
        share:
            "When you’re finished, share your cap table with " +
            "others",
        view:
            "When you’re not editing, click here for the best "+
            "view of your data",
        sidebar:
            "Additional details for securities and " +
            "transactions are tucked away here",
        issuecog:
            "Additional details for securities and " +
            "transactions are tucked away here"
    },
    captabletips: {
        premoneyval:
            "The valuation before taking money in this round",
        postmoneyval:
            "The sum of the pre-money valuation and the "+
            "total money paid into this round",
        ppshare:
            "The price at which each share was purchased",
        totalauth:
            "The sum total of shares authorized " +
            "to be issued",
        liquidpref:
            "The minimum return multiple each investor " +
            "is guaranteed on a liquidity event",
        partpref:
            "Allows an investor to collect their liquidation "
            + "preference AND stock on a liquidity event",
        dragalong:
            "When a majority shareholder enters a sale, " +
            "minority shareholders are also forced to sell "+
            "their shares",
        tagalong:
            "When a majority shareholder enters a sale, " +
            "minority shareholders have the right to join " +
            "the deal and sell their shares",
        optundersec:
            "The security each granted share will convert "
            + "to upon exercise",
        totalgranted:
            "The sum total of shares granted",
        price:
            "The price at which each granted share can be "
            + "purchased at when vested",
        pricewarrant:
            "The price each granted share can be purchased at",
        terms:
            "The total number of months until fully vested",
        vestingbegins:
            "Months until the vesting cliff % is vested",
        vestcliff:
            "The percentage of granted shares that are considered "
            + "vested on the cliff date",
        vestfreq:
            "The frequency that granted shares vest after the "
            + "cliff date, distributed evenly by frequency until "
            + "the vesting term ends",
        valcap:
            "The maximum pre-money valuation at which the debt "
            + "notes convert to equity",
        valcapsafe:
            "The maximum pre-money valuation at which the safe "
            + "converts to equity",
        interestrate:
            "The rate that interest accrus on this debt",
        discount:
            "The percentage discount applied upon conversion",
        term:
            "The term of the note before expiration",
        termwarrant:
            "The term of the warrant before expiration",
        common:
            "Indicates that a security is common stock",
        paripassu:
            "Liquidation proceeds are distributed in proportion "
            + "to each series’ share of preference, instead of "
            + "by seniority",
        evidence:
            "Tie documents to items in your captable",
        permissions:
            "Share just personal holdings, or the full cap table"
    }
});
