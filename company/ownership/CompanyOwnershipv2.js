'use strict';

/* App Module */

var owner = angular.module('companyownership', ['ui.bootstrap', 'ui.event', '$strap.directives', 'brijj']);

owner.config(function($routeProvider, $locationProvider) {
  $locationProvider.html5Mode(true).hashPrefix('');
    
  $routeProvider.
      when('/', {templateUrl: 'captable.html',   controller: captableController}).
      when('/grant', {templateUrl: 'grant.html', controller: grantController}).
      when('/status', {templateUrl: 'status.html', controller: statusController}).
      otherwise({redirectTo: '/'});
});

owner.service('calculate', function() {
  this.whatsleft = function(total, issue, rows) {
    var leftover = total
    angular.forEach(rows, function(row) {
      if (issue.issue in row && row.nameeditable != 0 && !isNaN(parseInt(row[issue.issue]['u']))) {
        leftover = leftover - row[issue.issue]['u'];
      }
    });
    return leftover
  };

  this.sum = function(current, additional) {
    if (!isNaN(parseInt(additional))) {
      return (current + parseInt(additional));
    }
    else {
      return current;
    }
  }

  this.debt = function(rows, issue, row) {
    var mon = parseInt(issue.premoney);
    if (isNaN(parseInt(mon))) {
      return null
    }
    else {
      angular.forEach(rows, function(r) {
        if (r[issue.issue] != undefined) {
          if (isNaN(parseInt(r[issue.issue]['u'])) && !isNaN(parseInt(r[issue.issue]['a']))) {
            mon = mon + parseInt(r[issue.issue]['a']);
          };
        };
      });
    };
    return ((parseFloat(row[issue.issue]['a'])/parseFloat(mon)) * 100)
  };
});

owner.service('switchval', function() {
  this.tran = function(type) {
    if (type == "debt" || type == 0) {
      return 0;
    }
    else if (type == "options" || type == 1) {
      return 1;
    }
    else {
      return 2;
    }
  };

  this.typeswitch = function(tran) {
    if (tran.optundersec != null) {
      tran.atype = 1;
    }
    else if (!isNaN(parseInt(tran.amount)) && isNaN(parseInt(tran.units))) {
      tran.atype = 2;
    }
    else {
      tran.atype = 0;
    }
    return tran;
  };

  this.typereverse = function(tran) {
    if (tran == 1) {
      tran = "options";
    }
    else if (tran == 2) {
      tran = "debt";
    }
    else {
      tran = "shares";
    }
    return tran;
  };
});

owner.service('sorting', function() {

  this.issuekeys = function(keys, issues) {
    var sorted = []
    angular.forEach(issues, function(issue) {
      angular.forEach(keys, function(key) {
        if (issue.issue == key) {
          sorted.push(key);
        };
      });
    });
    return sorted;
  };

  this.issuedate = function(a,b) {
  if (a.date < b.date)
     return -1;
  if (a.date > b.date)
    return 1;
  return 0;
  };

  this.row = function(prop) {
    return function(a, b) {
        var i = 0
        while (i < prop.length) {
        if (a[prop[i]]['u'] < b[prop[i]]['u'])
           return 1;
        if (a[prop[i]]['u'] > b[prop[i]]['u'])
          return -1;
        i++
        }
        return 0;
    }
  };

});

owner.run(function($rootScope) {

$rootScope.rowOrdering = function(row) {
  var total = 0
  for (var key in row) {
    if (row.hasOwnProperty(key)) {
      if (key != "name") {
        if (!isNaN(parseInt(row[key]['u'])) && String(key) != "$$hashKey") {
          total = total + parseInt(row[key]['u']);
        }
      }
    }
  }
  return -total;
  };

$rootScope.trantype = function(type, activetype) {
  if (activetype == 2 && type == "options") {
    return false;
  }
  else if (activetype == 1 && type == "debt") {
    return false;
  }
  else {
    return true
  }
};

//Calculates total grants in each issue
$rootScope.totalGranted = function(issue, trans) {
  var granted = 0
  angular.forEach(trans, function(tran) {
    if (tran.issue == issue && tran.type == "options" && !isNaN(parseInt(tran.units))) {
      granted = granted + parseInt(tran.units);
    };
  });
  return granted;
};

//Calculates total grant actions in grant table
$rootScope.totalGrantAction = function(type, grants) {
  var total = 0
  angular.forEach(grants, function(grant) {
    if (grant.action == type && !isNaN(parseInt(grant.unit))) {
      total = total + parseInt(grant.unit);
    };
  });
  return total;
};

//Calculates total granted to and forfeited in grant table
$rootScope.totalTranAction = function(type, trans) {
  var total = 0
  angular.forEach(trans, function(tran) {
    if (type == "granted") {
      if (!isNaN(parseInt(tran.units)) && parseInt(tran.units) > 0) {
        total = total + parseInt(tran.units);
      };
    }
    else if (type == "forfeited") {
      if (!isNaN(parseInt(tran.units)) && parseInt(tran.units) < 0) {
        total = total + parseInt(tran.units);
      };
    };
  });
  return total;
};

/* Calculates the Total Shares owned by an investor across all rounds */
$rootScope.shareSum = function(row) {
  var total = 0
  for (var key in row) {
    if (row.hasOwnProperty(key)) {
      if (key != "name") {
        if (parseInt(row[key]['u']) % 1 === 0 && String(key) != "$$hashKey" && row['nameeditable'] != 0) {
          total = total + parseInt(row[key]['u']);
        }
      }
    }
  }
  return total;
};
  /* Calculates total shares */
  $rootScope.totalShares = function(rows) {
    var total = 0;
    angular.forEach(rows, function(row) {
      for (var key in row) {
        if (row.hasOwnProperty(key)) {
          if (key != "name") {
            if (parseInt(row[key]['u']) % 1 == 0 && String(key) != "$$hashKey" && row['nameeditable'] != 0) {
              total = total + parseInt(row[key]['u']);
            }
          };
        };
      };
    });
    return total;
  };

  $rootScope.sharePercentage = function(row, rows, issuekeys) {
    var percentage = 0
    var totalpercentage = 0
    for(var i = 0, l = issuekeys.length; i < l; i++) {
      if (row[issuekeys[i]] != undefined) {
        if (row[issuekeys[i]]['x'] != undefined) {
          percentage = percentage + row[issuekeys[i]]['x'];
        };
      }
    };
    for(var j = 0, a = rows.length; j < a; j++) {
      for(var i = 0, l = issuekeys.length; i < l; i++) {
        if (rows[j][issuekeys[i]] != undefined) {
          if (rows[j][issuekeys[i]]['x'] != undefined) {
            totalpercentage = totalpercentage + rows[j][issuekeys[i]]['x'];
          };
        }
      };
    };
    return (percentage + ($rootScope.shareSum(row) / $rootScope.totalShares(rows) * (100 - totalpercentage)));
    };

  $rootScope.colTotal = function(header, rows, type) {
      var total = 0;
      angular.forEach(rows, function(row) {
      for (var key in row) {
          if (key == header) {
            if (parseInt(row[key][type]) % 1 == 0 && String(key) != "$$hashKey") {
            total = total + parseInt(row[key][type]);
              }
          }
      };
    });
      return total;
    };

    $rootScope.postIssues = function(keys, issue) {
      console.log(keys);
      console.log(issue);
    };

});

var captableController = function($scope, $parse, SWBrijj, calculate, switchval, sorting) {

  $scope.issuetypes = [];
  $scope.freqtypes = [];
  $scope.issuekeys = [];
  $scope.tf = ["yes", "no"]
  SWBrijj.procm('ownership.get_issuetypes').then(function(results) {
    angular.forEach(results, function(result) {
        $scope.issuetypes.push(result['get_issuetypes']);
      });
  });
  SWBrijj.procm('ownership.get_freqtypes').then(function(results) {
    angular.forEach(results, function(result) {
        $scope.freqtypes.push(result['get_freqtypes']);
      });
  });
	$scope.issues = []
  $scope.issueSort = 'date';
  $scope.rowSort = '-name';
	$scope.rows = []
	$scope.uniquerows = []
  $scope.activeTran = []

  $scope.investorOrder = "name";
  
  SWBrijj.tblm('account.companies').then(function(comp) {
    $scope.company = comp[0]['company'];
  });
	SWBrijj.tblm('ownership.company_issue').then(function(data) {
		$scope.issues = data;
    for(var i = 0, l = $scope.issues.length; i < l; i++) {
        $scope.issues[i] = switchval.typeswitch($scope.issues[i]);
	      $scope.issues[i].key = $scope.issues[i].issue;
        $scope.issuekeys.push($scope.issues[i].key);
	    };
	    $scope.issues.push({"name":"", "date":Date(2100, 1, 1)})

		// Pivot shenanigans
		SWBrijj.tblm('ownership.company_transaction').then(function(trans) {
			$scope.trans = trans
      for(var i = 0, l = $scope.trans.length; i < l; i++) {
        $scope.trans[i].atype = switchval.tran($scope.trans[i].type);
			  $scope.trans[i].key = $scope.trans[i].issue;
        $scope.trans[i].datekey = $scope.trans[i]['date'].toUTCString();
        $scope.trans[i].investorkey = $scope.trans[i].investor;
		      if ($scope.uniquerows.indexOf($scope.trans[i].investor) == -1) {
		      	$scope.uniquerows.push($scope.trans[i].investor);
		      	$scope.rows.push({"name":$scope.trans[i].investor, "namekey":$scope.trans[i].investor, "editable":"yes"});
		      }
        angular.forEach($scope.issues, function(issue) {
          if ($scope.trans[i].issue == issue.issue) {
            $scope.trans[i].totalauth = issue.totalauth;
            $scope.trans[i].premoney = issue.premoney;
            $scope.trans[i].postmoney = issue.postmoney;
          };
        });
		  };

			angular.forEach($scope.trans, function(tran) {
				angular.forEach($scope.rows, function(row) {
			      if (row.name == tran.investor) {
			      	if (tran.issue in row) {
			      		row[tran.issue]["u"] = calculate.sum(row[tran.issue]["u"], tran.units);
                row[tran.issue]["a"] = calculate.sum(row[tran.issue]["a"], tran.amount);
			      	}
			      	else {
              row[tran.issue] = {}
			      	row[tran.issue]["u"] = tran.units;
              row[tran.issue]["a"] = tran.amount;
			      	};
            }
            else {
              if (tran.issue in row) {
              }
              else {
                row[tran.issue] = {"u":null, "a":null};
              }
            };
			    });
		  });

      angular.forEach($scope.rows, function(row) {
        angular.forEach($scope.issues, function(issue) {
          if (row[issue.issue] != undefined) {
            if (isNaN(parseInt(row[issue.issue]['u'])) && !isNaN(parseInt(row[issue.issue]['a']))) {
              row[issue.issue]['x'] = calculate.debt($scope.rows, issue, row);
            };
          };
        });
      });

      angular.forEach($scope.issues, function(issue) {
        if (parseFloat(issue.totalauth) % 1 == 0) {
          var leftovers = calculate.whatsleft(issue.totalauth, issue, $scope.rows);
          if (leftovers != 0) {
            var issuename = String(issue.issue)
            var shares = {"u":leftovers, "a":null};
            $scope.rows.push({"name":issuename+" (unissued)", "editable":0, "nameeditable":0});
            $scope.rows[($scope.rows.length)-1][issuename] = shares
          }
        }
      });


      angular.forEach($scope.rows, function(row) {
        angular.forEach($scope.issuekeys, function(issuekey) {
          if (issuekey in row) {
          }
          else {
            row[issuekey] = {"u":null, "a":null};
          };
        });
      });


    $scope.issues.sort(sorting.issuedate);
    $scope.issuekeys= sorting.issuekeys($scope.issuekeys, $scope.issues);
    $scope.rows.sort(sorting.row($scope.issuekeys));

    var values = {"name":"", "editable":"0"}
    angular.forEach($scope.issuekeys, function(key) {
      values[key] = {"u":null, "a":null};
    });
    $scope.rows.push(values);
    
		});
	});

$scope.findValue = function(row, header) {
	angular.forEach($scope.rows, function(picked) {
		if (picked==row) {
			return $scope.rows[header];
		};
	});
};

$scope.getActiveTransaction = function(currenttran, currentcolumn) {
	$scope.sideBar = 2;
  $scope.activeTran = [];
  $scope.activeIssue = currentcolumn;
  $scope.activeInvestor = currenttran;
  // Get the all the issues that aren't the current issue for the drop downs
  var allowablekeys = angular.copy($scope.issuekeys);
  var index = allowablekeys.indexOf(currentcolumn);
  allowablekeys.splice(index, 1);
  $scope.allowKeys = allowablekeys;

	var first = 0
	angular.forEach($scope.trans, function(tran) {
		if (tran.investor == currenttran) {
      if (tran.issue == currentcolumn){
    		if (first == 0) {
    			tran['active'] = true
    			first = first + 1
        }
        if (String(tran['partpref']) == "true") {
          tran.partpref = $scope.tf[0];
        }
        else {
          tran.partpref = $scope.tf[1];
        }
        if (String(tran['liquidpref']) == "true") {
          tran.liquidpref = $scope.tf[0];
        }
        else {
          tran.liquidpref = $scope.tf[1];
        }
        console.log(tran);
        tran = switchval.typeswitch(tran);
  			$scope.activeTran.push(tran);
      }
		}
	});
  if ($scope.activeTran.length < 1) {
    var newTran = {}
    newTran = {"active":true, "atype":0, "new":"yes", "investor":$scope.activeInvestor, "investorkey":$scope.activeInvestor, "company":$scope.company, "date":(Date.today()), "datekey":(Date.today()), "issue":($scope.activeIssue), "units":null, "paid":null, "key":undefined};
    $scope.trans.push(newTran);
    $scope.activeTran.push(newTran);
  }
	$scope.$apply();
};

$scope.getActiveIssue = function(issue) {
	$scope.sideBar = 1;
	$scope.activeIssue = issue;

  // Get the all the issues that aren't the current issue for the drop downs
  var allowablekeys = angular.copy($scope.issuekeys);
  var index = allowablekeys.indexOf(issue.issue);
  allowablekeys.splice(index, 1);
  $scope.allowKeys = allowablekeys;

  // Set Boolean Values for the Angularjs Select
  if (String($scope.activeIssue.partpref) == "true") {
    $scope.activeIssue.partpref = $scope.tf[0];
  }
  else {
    $scope.activeIssue.partpref = $scope.tf[1];
  }
  if (String($scope.activeIssue.liquidpref) == "true") {
    $scope.activeIssue.liquidpref = $scope.tf[0];
  }
  else {
    $scope.activeIssue.liquidpref = $scope.tf[1];
  }
  if ($scope.activeIssue.name == "") {
    $scope.activeIssue.date = (Date.today()).toUTCString();
  }
  // Set Freq Value for Angularjs Select
  var index = $scope.freqtypes.indexOf(issue.vestfreq);
  $scope.activeIssue.vestfreq = $scope.freqtypes[index];
	$scope.$apply();
};

$scope.saveIssue = function(issue) {
  angular.forEach($scope.issues, function(coreissue) {
    if(issue.issue == coreissue.issue && issue['$$hashKey'] != coreissue['$$hashKey']) {
      issue.issue = issue.issue + " (1)";
    };
  });
  if (issue['issue'] == null && issue['key'] == null) {
    return
  }

  else if (issue['issue'] == "" && issue['key'] != null) {
  	SWBrijj.proc('ownership.delete_issue', issue['key']).then(function(data) {
  		angular.forEach($scope.issues, function(oneissue) {
  			if (oneissue['key'] == issue['key']) {
  				var index = $scope.issues.indexOf(oneissue);
				  $scope.issues.splice(index, 1);
          var indexed = $scope.issuekeys.indexOf(oneissue.key);
          $scope.issuekeys.splice(indexed, 1);
  			}
      });
      angular.forEach($scope.rows, function(row) {
        if (issue.key in row) {
          delete row[issue.key];
        }
        if (row["name"] == issue.key+ " (unissued)") {
          var index = $scope.rows.indexOf(row);
          $scope.rows.splice(index, 1);
        }
      });
  	});
  	$scope.$apply();
    return
  }

  else {

    if (issue['key'] != null) {
      var dateconvert = new Date(issue['date']);
      var d1 = dateconvert.toUTCString();
      if (issue['partpref'] != null) {
          var partpref = $scope.strToBool(issue['partpref']);
        };
        if (issue['liquidpref'] != null) {
          var liquidpref = $scope.strToBool(issue['liquidpref']);
        };

      if (issue['vestingbegins'] == undefined) {
        var vestcliffdate = null
      }

      else {
        var vestcliffdate = (issue['vestingbegins']).toUTCString();
      }
      SWBrijj.proc('ownership.update_issue', issue['key'], d1, issue['issue'], parseFloat(issue['premoney']), parseFloat(issue['postmoney']), parseFloat(issue['ppshare']), parseFloat(issue['totalauth']), partpref, liquidpref, issue['optundersec'], parseFloat(issue['price']), parseFloat(issue['terms']), vestcliffdate, parseFloat(issue['vestcliff']), issue['vestfreq'], issue['debtundersec'], parseFloat(issue['interestrate']), parseFloat(issue['valcap']), parseFloat(issue['discount']), parseFloat(issue['term'])).then(function(data) { 
        issue = switchval.typeswitch(issue);
        var oldissue = issue['key'];
        if (issue['issue'] != issue.key) {
          angular.forEach($scope.rows, function(row) {
          	row[issue['issue']] = row[issue.key];
            delete row[issue.key];
          });
        };
        var keepgoing = true;
        var deleterow = -1;
        var issuename = String(issue.issue)
        var leftovers = calculate.whatsleft(issue.totalauth, issue, $scope.rows);
        var shares = {"u":leftovers, "x":null};
        angular.forEach($scope.rows, function(row) {
          if (keepgoing) {
            if (row.name == oldissue+" (unissued)") {
              keepgoing = false;
              if (issue.totalauth > 0 || issue.totalauth < 0) {
                row[issuename] = shares;
                row['name'] = issue.issue + " (unissued)";
              }
              else {
                deleterow = $scope.rows.indexOf(row);
              }
            }
          }
        });
        if (keepgoing != false) {
          if (parseInt(leftovers) % 1 == 0) {
            $scope.rows.push({"name":issuename+" (unissued)", "editable":0, "nameeditable":0});
            $scope.rows[($scope.rows.length)-1][issuename] = shares;
          };
        }
        if (deleterow > -1) {
          $scope.rows.splice(deleterow, 1);
        };
        angular.forEach($scope.trans, function(tran) {
          if (tran.issue == issue.key) {
            tran.issue = issue['issue'];
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
            tran.vestingbegins = issue.vestingbegins;
            tran.vestcliff = issue.vestcliff;
            tran.vestfreq = issue.vestfreq;
            tran.debtundersec = issue.debtundersec;
            tran.interestrate = issue.interestrate;
            tran.valcap = issue.valcap;
            tran.discount = issue.discount;
            tran.term = issue.term;
            $scope.saveTran(tran);
          }
        });

        angular.forEach($scope.rows, function(row) {
        if (row[issue.issue] != undefined) {
          if (isNaN(parseInt(row[issue.issue]['u'])) && !isNaN(parseInt(row[issue.issue]['a']))) {
            row[issue.issue]['x'] = calculate.debt($scope.rows, issue, row);
            };
          };
        });

        var index = $scope.issuekeys.indexOf(issue.key);
        $scope.issuekeys[index] = issue.issue;
        issue.key=issue.issue;
      	});
    } 

    else {
      var d1 = (Date.today()).toUTCString();
      var expire = null;
      SWBrijj.proc('ownership.create_issue', d1, expire, issue['issue'], parseFloat(issue['price'])).then(function(data) { 
        issue.key=issue['issue'];
        $scope.issues.push({name:""})
        $scope.issuekeys.push(issue.key);
        angular.forEach($scope.rows, function(row) {
          row[issue.key] = {"u":null, "a":null};
        });

        var allowablekeys = angular.copy($scope.issuekeys);
        var index = allowablekeys.indexOf(issue.issue);
        allowablekeys.splice(index, 1);
        $scope.allowKeys = allowablekeys;
      });	
    }
  }
};

$scope.tranChangeU = function(value) {
  console.log("thing firing");
  if ($scope.activeTran.length < 2) {
  $scope.activeTran[0]['units'] = value;
  };
};

$scope.tranChangeA = function(value) {
  if ($scope.activeTran.length < 2) {
  $scope.activeTran[0]['amount'] = value;
  };
};

$scope.getActiveInvestor = function(investor) {
  $scope.sideBar=3;
  if (investor.name == "") {
    var values = {"name":"", "editable":"0"}
    angular.forEach($scope.issuekeys, function(key) {
      values[key] = {"u":null, "a":null};
    });
    $scope.rows.push(values);
  }
  $scope.activeInvestorName = investor.name;
  $scope.$apply();
};

$scope.nameChangeLR = function(investor) {
  $scope.activeInvestorName = investor.name;
  if ((investor.name).length > 0) {
    angular.forEach($scope.rows, function(row) {
      if (row.name == investor.name) {
        row.editable = "yes";
      }
    });
  }
  else {
    angular.forEach($scope.rows, function(row) {
      if (row.name == investor.name) {
        row.editable = "0";
      }
    });
  }
};

$scope.nameChangeRL = function(investor) {
  $scope.activeInvestorName = investor.name;
};

$scope.updateRow = function(investor) {
  if (investor.name == "") {
    var index = $scope.rows.indexOf(investor);
    $scope.rows.splice(index, 1);
    return
  }
  angular.forEach($scope.rows, function(row) {
    if(investor.name == row.name && investor['$$hashKey'] != row['$$hashKey']) {
      investor.name = investor.name + " (1)";
    };
  });
  if (investor.name != investor.namekey) {
    var index = $scope.rows.indexOf(investor);
    angular.forEach($scope.trans, function(tran) { 
      if (tran.investor == investor.namekey) {
        tran.investor = investor.name;
        $scope.saveTran(tran);
      };
  });
  if (investor.name) {
    $scope.rows[index].namekey = investor.name
    };
  }
  $scope.$apply();
};

$scope.createTran = function() {
  var newTran = {}
  newTran = {"new":"yes", "atype":0, "investor":$scope.activeInvestor, "investorkey":$scope.activeInvestor, "company":$scope.company, "date":(Date.today()), "datekey":(Date.today()), "issue":($scope.activeIssue), "units":null, "paid":null, "key":"undefined"};
	$scope.trans.push(newTran);
  $scope.activeTran.push(newTran);
}

$scope.deleteTran = function(tran) {
  console.log("deleting");
  console.log(tran);
    var d1 = tran['date'].toUTCString();
    SWBrijj.proc('ownership.delete_transaction', tran['tran_id']).then(function(data) { 
      var index = $scope.trans.indexOf(tran);
      $scope.trans.splice(index, 1);
      angular.forEach($scope.rows, function(row) {
        if (row.name === tran['investor']) {
          row[tran['issue']] = (parseInt(row[tran['issue']]) - parseInt(tran['units']))
          row[tran['issue']] = {"u":null, "a":null};
        };
      });
  });
}

$scope.manualdeleteTran = function(tran) {
    var d1 = tran['date'].toUTCString();
    SWBrijj.proc('ownership.delete_transaction', tran['tran_id']).then(function(data) { 
      var index = $scope.trans.indexOf(tran);
      $scope.trans.splice(index, 1);
      var index = $scope.activeTran.indexOf(tran);
      $scope.activeTran.splice(index, 1);
      angular.forEach($scope.rows, function(row) { 
        if (row.name === tran['investor']) {
          row[tran['issue']] = (parseInt(row[tran['issue']]) - parseInt(tran['units']))
          row[tran['issue']] = {"u":null, "a":null};
        };
      });
  });
}

$scope.saveTran = function(transaction) {
  var savingActive = $scope.activeTran
  if (transaction == undefined || isNaN(parseInt(transaction.units)) && isNaN(parseInt(transaction.amount)) && isNaN(parseInt(transaction.tran_id))) {
    console.log("transaction is undefined")
    return
  }
  if (isNaN(parseInt(transaction.units)) && isNaN(parseInt(transaction.amount)) && !isNaN(parseInt(transaction.tran_id))) {
    console.log("deleting transaction");
    $scope.deleteTran(transaction);
    return
  }
  else if (transaction['issue'] == undefined || (parseInt(transaction['units']) % 1 != 0 && parseInt(transaction['amount'] % 1 != 0))) {
    console.log("incomplete transaction");
    return;
  }
  else {
        var d1 = transaction['date'].toUTCString();
        if (transaction['tran_id'] == undefined) {
          transaction['tran_id'] = '';
        };
        if (parseFloat(transaction['amount']) % 1 != 0) {
        };
        if (transaction['partpref'] != null) {
          var partpref = $scope.strToBool(transaction['partpref']);
        };
        if (transaction['liquidpref'] != null) {
          var liquidpref = $scope.strToBool(transaction['liquidpref']);
        };
        if (transaction['vestingbegins'] == undefined) {
          var vestcliffdate = null
        }

        else {
          var vestcliffdate = (transaction['vestingbegins']).toUTCString();
        }

        transaction = switchval.typeswitch(transaction);
        transaction.type = switchval.typereverse(transaction.atype);
        SWBrijj.proc('ownership.update_transaction', String(transaction['tran_id']), transaction['investor'], transaction['issue'], parseFloat(transaction['units']), d1, String(transaction['type']), parseFloat(transaction['amount']), parseFloat(transaction['premoney']), parseFloat(transaction['postmoney']), parseFloat(transaction['ppshare']), parseFloat(transaction['totalauth']), partpref, liquidpref, transaction['optundersec'], parseFloat(transaction['price']), parseFloat(transaction['terms']), vestcliffdate, parseFloat(transaction['vestcliff']), transaction['vestfreq'], transaction['debtundersec'], parseFloat(transaction['interestrate']), parseFloat(transaction['valcap']), parseFloat(transaction['discount']), parseFloat(transaction['term'])).then(function(data) { 
          transaction = switchval.typeswitch(transaction);
          if (transaction.units >= 0) {
            var tempunits = 0;
          };
          if (transaction.amount >= 0) {
            var tempamount = 0;
          };
          angular.forEach($scope.rows, function(row) {
          	angular.forEach(savingActive, function(tran) {
      			if (row.name == tran.investor) {
          				if (tran.issue == transaction.issue) {
                    tran.key = tran.issue;
                    tran.tran_id=data[1][0];
                    transaction.datekey = d1
          					tempunits = calculate.sum(tempunits, tran.units);
                    tempamount = calculate.sum(tempamount, tran.amount);
          					row[tran.issue]['u'] = tempunits;
                    row[tran.issue]['a'] = tempamount;
          				}
          		}
              if (row.name == tran.issue+" (unissued)") {
                angular.forEach($scope.issues, function(issue) {
                  if (issue.issue == tran.issue) {
                    var leftovers = calculate.whatsleft(issue.totalauth, issue, $scope.rows);
                    var shares = {"u":leftovers};
                    row[issue.issue] = shares;
                  }
                });
              }
          	});
            
            if (row[transaction.issue]['x'] != undefined) {
              angular.forEach($scope.issues, function(issue) {
                if (issue.issue == transaction.issue) {
                  row[transaction.issue]['x'] = calculate.debt($scope.rows, issue, row);
                };
              });
            }
          });
        });
      };
      console.log("done saving");
};

  $scope.strToBool = function(string){
    switch(String(string).toLowerCase()){
      case "true": case "yes": case "1": return true;
      case "false": case "no": case "0": case null: return false;
      default: return Boolean(string);
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
    
  $scope.opts = {
      backdropFade: true,
      dialogFade:true
      };

  $scope.share = function (message, email) {
    SWBrijj.procm("ownership.share_captable", email, message).then(function(data) {
      console.log(data);
    });
  };
};







// Grants page controller
var grantController = function($scope, $parse, SWBrijj, calculate, switchval, sorting) {

  $scope.rows = []
  $scope.uniquerows = []
  $scope.freqtypes = [];

  //Get the available range of frequency types
  SWBrijj.procm('ownership.get_freqtypes').then(function(results) {
    angular.forEach(results, function(result) {
        $scope.freqtypes.push(result['get_freqtypes']);
      });
  });

  // Initialisation. Get the transactions and the grants
  SWBrijj.tblm('ownership.company_options').then(function(data) {

    // Pivot from transactions to the rows of the table
    $scope.trans = data;
    angular.forEach($scope.trans, function(tran) {
    tran.datekey = tran['date'].toUTCString();
    if ($scope.uniquerows.indexOf(tran.investor) == -1) {
      $scope.uniquerows.push(tran.investor);
      $scope.rows.push({"state":true, "name":tran.investor, "namekey":tran.investor, "editable":"yes", "granted":null, "forfeited":null, "issue":tran.issue});
      }
    });

    // Get the full set of company grants
    SWBrijj.tblm('ownership.company_grants').then(function(data) {

    $scope.grants = data;

    angular.forEach($scope.grants, function(grant) {
      angular.forEach($scope.trans, function(tran) {
        if (grant.tran_id == tran.tran_id) {
          grant.investor = tran.investor;
        }
      });
    });

    //Calculate the total granted and forfeited for each row
    angular.forEach($scope.trans, function(tran) {
        angular.forEach($scope.rows, function(row) {
          if (row.name == tran.investor) {
            if (parseInt(tran.units) > 0) {
              row["granted"] = calculate.sum(row["granted"], tran.units);
            }
            else {
              row["forfeited"] = calculate.sum(row["forfeited"], tran.units);
            }
          };
        });
      });

    angular.forEach($scope.grants, function(grant) {
      angular.forEach($scope.rows, function(row) {
        if (row.name == grant.investor) {
          if (parseInt(grant.unit) > 0) {
            if (row[grant.action] == undefined) {
              row[grant.action] = 0;
            };
            row[grant.action] = calculate.sum(row[grant.action], grant.unit);
          };
        };
      });
    });

    });
  });


  //Get the active row for the sidebar
  $scope.getActiveTransaction = function(currenttran) {
    $scope.sideBar = 1;
    $scope.activeTran = [];
    $scope.activeInvestor = currenttran;
    var first = 0
    for(var i = 0, l = $scope.trans.length; i < l; i++) {
      if ($scope.trans[i].investor == currenttran) {
        if (first == 0) {
          $scope.trans[i].active = true
          first = first + 1
        }
        $scope.trans[i] = switchval.typeswitch($scope.trans[i]);
        $scope.activeTran.push($scope.trans[i]);
      }
    };

    angular.forEach($scope.rows, function(row) {
      if (row.name == currenttran) {
        row.state = true;
      }
      else {
        row.state = false;
      }
    });

    //Pair the correct grants with the selected rows transactions
    for(var i = 0, l = $scope.activeTran.length; i < l; i++) {
      var activeAct = []
      for(var j = 0, a = $scope.grants.length; j < a; j++) {
        if ($scope.activeTran[i].tran_id == $scope.grants[j].tran_id) {
          activeAct.push($scope.grants[j]);
        };
      };
      activeAct.push({"unit":null, "tran_id":$scope.activeTran[i].tran_id, "date":(Date.today()), "action":null, "investor":$scope.activeTran[i].investor, "issue":$scope.activeTran[i].issue});
      $scope.activeTran[i].activeAct = activeAct;
    };
  };

  $scope.saveGrant = function(grant) {
    if (grant.action == "" && isNaN(parseInt(grant.unit))) {
      if (grant.grant_id != null) {
        SWBrijj.proc('ownership.delete_grant', parseInt(grant.grant_id)).then(function(data) {
          console.log("deleted")
          var index = $scope.grants.indexOf(grant);
          $scope.grants.splice(index, 1);
          angular.forEach($scope.activeTran, function(tran) {
            var activeAct = []
            angular.forEach($scope.grants, function(grant) {
              if (tran.tran_id == grant.tran_id) {
                activeAct.push(grant);
              };
            });
            activeAct.push({"unit":null, "tran_id":tran.tran_id, "date":(Date.today()), "action":null, "investor":tran.investor, "issue":tran.issue});
            tran.activeAct = activeAct;
          });

          angular.forEach($scope.rows, function(row) {
            row['vested'] = null;
            row['exercised'] = null;
            angular.forEach($scope.grants, function(grant) {
              if (row.name == grant.investor) {
                row[grant.action] = calculate.sum(row[grant.action], grant.unit)
              }
            });
          });
        });
      }
      else {
      return;
    };
    }
    if (grant.action == "" || grant.action == undefined || isNaN(parseInt(grant.unit))) {
      return;
    };
    if (grant.grant_id == undefined) {
      grant.grant_id = "";
    }
    var d1 = grant['date'].toUTCString();
    SWBrijj.proc('ownership.update_grant', String(grant.grant_id), String(grant.tran_id), grant.action, d1, parseInt(grant.unit)).then(function(data) {
      angular.forEach($scope.activeTran, function(tran) {
        if (tran.tran_id == grant.tran_id) {
          angular.forEach(tran.activeAct, function(act) {
            if (act.grant_id == "") {
              act.grant_id = data[1][0];
              grant.grant_id = data[1][0];
              $scope.grants.push(grant);
            }
          });
        };
      });

      // Calculate the total exercised for each transaction from the grant list
      var exercises = {}
      angular.forEach($scope.grants, function(grant) {
        if (grant.action == "exercised") {
          if (exercises[grant.tran_id] == undefined) {
            exercises[grant.tran_id] = parseInt(grant.unit);
          }
          else {
            exercises[grant.tran_id] = parseInt(exercises[grant.tran_id]) + parseInt(grant.unit);
          };
        };
      });

      // Get the correct transaction and save the new amount value
      angular.forEach(exercises, function(value, key) {
        angular.forEach($scope.trans, function(tran) {
          if (tran.tran_id == key) {
            tran.amount = value;
            $scope.saveTran(tran);
          }
        });
      });

      // Update the activeTran list and push a new blank grant
      angular.forEach($scope.activeTran, function(tran) {
        var activeAct = []
        angular.forEach($scope.grants, function(grant) {
          if (tran.tran_id == grant.tran_id) {
            activeAct.push(grant);
          };
        });
        activeAct.push({"unit":null, "tran_id":tran.tran_id, "date":(Date.today()), "action":null, "investor":tran.investor, "issue":tran.issue});
        tran.activeAct = activeAct;
      });

      // Recalculate the grant rows
      angular.forEach($scope.rows, function(row) {
        row['vested'] = null;
        row['exercised'] = null;
        angular.forEach($scope.grants, function(grant) {
          if (row.name == grant.investor) {
            row[grant.action] = calculate.sum(row[grant.action], grant.unit)
          }
        });
      });
    });
  };

  $scope.saveTran = function(transaction) {
    if (transaction['vestingbegins'] == undefined) {
        var vestcliffdate = null
      }

    else {
      var vestcliffdate = (transaction['vestingbegins']).toUTCString();
    }
    var d1 = transaction['date'].toUTCString();
    SWBrijj.proc('ownership.update_transaction', String(transaction['tran_id']), String(transaction['investor']), String(transaction['issue']), parseFloat(transaction['units']), d1, String(transaction['type']), parseFloat(transaction['amount']), parseFloat(transaction['premoney']), parseFloat(transaction['postmoney']), parseFloat(transaction['ppshare']), parseFloat(transaction['totalauth']), Boolean(transaction.partpref), Boolean(transaction.liquidpref), transaction['optundersec'], parseFloat(transaction['price']), parseFloat(transaction['terms']), vestcliffdate, parseFloat(transaction['vestcliff']), transaction['vestfreq'], transaction['debtundersec'], parseFloat(transaction['interestrate']), parseFloat(transaction['valcap']), parseFloat(transaction['discount']), parseFloat(transaction['term'])).then(function(data) { 
    });
  };


};

var statusController = function($scope, SWBrijj) {

  SWBrijj.tblm("ownership.company_audit").then(function(data) {
    $scope.userStatus = data;
    for (var i = 0; i < $scope.userStatus.length; i++) {
      $scope.userStatus[i].shown = false;
      $scope.userStatus[i].button = "icon-plus";
      $scope.userStatus[i].viewed = "unviewed";
      $scope.userStatus[i].viewflag = 0;
      $scope.userStatus[i].lastlogin = 0;
      if ($scope.userStatus[i].fullview == false) {
        $scope.userStatus[i].fullview = "personal";
      }
    };
    SWBrijj.procm("ownership.get_company_views").then(function(views) {
      angular.forEach($scope.userStatus, function(person) {
        angular.forEach(views, function(view) {
          if (view.email == person.email) {
            person.viewed = "viewed";
            person.whenviewed = view.whendone;
            person.viewflag = 1;
          }
        });
      });
    })
    SWBrijj.tblm("ownership.user_tracker").then(function(logins) {
      angular.forEach($scope.userStatus, function(person) {
        angular.forEach(logins, function(login) {
          if (login.email == person.email) {
            person.lastlogin = login.logintime;
          }
        });
      });
    })
  });



  $scope.opendetails = function(selected) {
   $scope.userStatus.forEach(function(name) {     
    if (selected == name.email)
      if (name.shown == true) {
        name.shown = false;
        name.button = "icon-plus";
      }
      else {
        name.button = "icon-minus";
        name.shown = true;
      }
    });
  };

};
