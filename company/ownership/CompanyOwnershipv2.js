'use strict';

/* App Module */

var owner = angular.module('companyownership', ['ui.bootstrap', 'ui.event', '$strap.directives']);

owner.config(function($routeProvider, $locationProvider) {
  $locationProvider.html5Mode(true).hashPrefix('');
    
  $routeProvider.
      when('/', {templateUrl: 'captable.html',   controller: captableController}).
      otherwise({redirectTo: '/'});
});

if(!Array.prototype.indexOf) {
    Array.prototype.indexOf = function(needle) {
        for(var i = 0; i < this.length; i++) {
            if(this[i] === needle) {
                return i;
            }
        }
        return -1;
    };
}

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
      tran.type = 1;
    }
    else if (!isNaN(parseInt(tran.amount)) && isNaN(parseInt(tran.units))) {
      tran.type = 2;
    }
    else {
      tran.type = 0;
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

$rootScope.trantype = function(type, tran) {
  if (tran.type == 2 && type == "options") {
    return false;
  }
  else if (tran.type == 1 && type == "debt") {
    return false;
  }
  else {
    return true
  }
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
    angular.forEach(issuekeys, function(key) {
      if (row[key]['x'] != undefined) {
        percentage = percentage + row[key]['x'];
      };
    });
    angular.forEach(rows, function(r) {
      angular.forEach(issuekeys, function(key) {
        if (r[key]['x'] != undefined) {
          totalpercentage = totalpercentage + r[key]['x'];
        };
      });
    });
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

});

var captableController = function($scope, $parse, calculate, switchval, sorting) {

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
		angular.forEach($scope.issues, function(oneissue) {
	      oneissue.key = oneissue.issue;
        $scope.issuekeys.push(oneissue.key);
	    });
	    $scope.issues.push({"name":"", "date":Date(2100, 1, 1)})

		// Pivot shenanigans
		SWBrijj.tblm('ownership.company_transaction').then(function(trans) {
			$scope.trans = trans
			angular.forEach($scope.trans, function(tran) {
        tran.type = switchval.tran(tran.type);
			  tran.key = tran.issue;
        tran.datekey = tran['date'].toUTCString();
        tran.investorkey = tran.investor;
		      if ($scope.uniquerows.indexOf(tran.investor) == -1) {
		      	$scope.uniquerows.push(tran.investor);
		      	$scope.rows.push({"name":tran.investor, "namekey":tran.investor, "editable":"yes"});
		      }
        angular.forEach($scope.issues, function(issue) {
          if (tran.issue == issue.issue) {
            tran.totalauth = issue.totalauth;
            tran.premoney = issue.premoney;
            tran.postmoney = issue.postmoney;
          };
        });
		  });

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
    
		$scope.$apply();
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
        tran = switchval.typeswitch(tran);
  			$scope.activeTran.push(tran);
      }
		}
	});
  if ($scope.activeTran.length < 1) {
    var newTran = {}
    newTran = {"active":true, "type":0, "new":"yes", "investor":$scope.activeInvestor, "investorkey":$scope.activeInvestor, "company":$scope.company, "date":(Date.today()), "datekey":(Date.today()), "issue":($scope.activeIssue), "units":null, "paid":null, "key":undefined};
    $scope.trans.push(newTran);
    $scope.activeTran.push(newTran);
  }

	$scope.$apply();
};

$scope.getActiveIssue = function(issue) {
	$scope.sideBar = 1;
	$scope.activeIssue = issue;
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
        var shares = {"u":leftovers};
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
        $scope.$apply();
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
        $scope.$apply();
      });	
    }
  }
};

$scope.tranChangeU = function(value) {
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
  newTran = {"new":"yes", "type":0, "investor":$scope.activeInvestor, "investorkey":$scope.activeInvestor, "company":$scope.company, "date":(Date.today()), "datekey":(Date.today()), "issue":($scope.activeIssue), "units":null, "paid":null, "key":"undefined"};
	$scope.trans.push(newTran);
  $scope.activeTran.push(newTran);
}

$scope.deleteTran = function(tran) {
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
      $scope.$apply();
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
      $scope.$apply();
  });
}

$scope.saveTran = function(transaction) {
  var savingActive = $scope.activeTran
  if (transaction == undefined) {
    return
  }
  if (isNaN(parseInt(transaction['units']) % 1) && isNaN(parseInt(transaction['amount']) % 1)) {
    $scope.deleteTran(transaction);
    return
  }
  else if (transaction['issue'] == undefined || (parseInt(transaction['units']) % 1 != 0 && parseInt(transaction['amount'] % 1 != 0))) {
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
        SWBrijj.proc('ownership.update_transaction', String(transaction['tran_id']), transaction['investor'], transaction['issue'], parseFloat(transaction['units']), d1, parseFloat(transaction['amount']), parseFloat(transaction['premoney']), parseFloat(transaction['postmoney']), parseFloat(transaction['ppshare']), parseFloat(transaction['totalauth']), partpref, liquidpref, transaction['optundersec'], parseFloat(transaction['price']), parseFloat(transaction['terms']), vestcliffdate, parseFloat(transaction['vestcliff']), transaction['vestfreq'], transaction['debtundersec'], parseFloat(transaction['interestrate']), parseFloat(transaction['valcap']), parseFloat(transaction['discount']), parseFloat(transaction['term'])).then(function(data) { 
          transaction = switchval.typeswitch(transaction);
          var tempunits = 0;
          var tempamount = 0;
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
          $scope.$apply();
        });
      };
};

  $scope.strToBool = function(string){
    switch(String(string).toLowerCase()){
      case "true": case "yes": case "1": return true;
      case "false": case "no": case "0": case null: return false;
      default: return Boolean(string);
    }
  };


};