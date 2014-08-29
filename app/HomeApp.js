
var app = angular.module('HomeApp',
    ['ngAnimate', 'ngRoute', 'ngResource', 'ui.bootstrap',
        '$strap.directives', 'ui.event', 'nav', 'brijj', 'ownerFilters',
        'ownerDirectives', 'ownerServices', 'commonServices', 'd3',
        'homeDirectives', 'activityDirective', 'commonDirectives',
        'ui.select2','documents', 'docServices', 'angularPayments',
        'bootstrap-tagsinput', 'infinite-scroll', 'ui.jq', 'textAngular']);

/** @name $routeParams#msg
 *  @type {string}
 */
//this is used to assign the correct template and controller for each URL path
app.config(function($routeProvider, $locationProvider){
    $locationProvider.html5Mode(true).hashPrefix('');

    $routeProvider.
        when('/app/new-company', {
            controller: 'NewCompanyCtrl',
            templateUrl:'/app/partials/new-company.html'
        }).
        when('/app/home/investor', {
            controller: 'InvestorCtrl',
            templateUrl:'/home/investor.html'
        }).
        when('/app/home/company', {
            controller: 'CompanyCtrl',
            templateUrl:'/home/company.html'
        }).
        when('/app/account/profile', {
            controller: 'ContactCtrl',
            templateUrl: '/account/profile/contact.html'
        }).
        when('/app/company/profile/', {
            controller: 'CompContactCtrl',
            templateUrl: '/company/profile/contact.html'
        }).
        when('/app/company/profile/invoice', {
            controller: 'InvoiceCtrl',
            templateUrl: '/company/profile/invoice.html'
        }).
        when('/app/company/profile/people', {
            controller: 'PeopleCtrl',
            templateUrl: '/company/profile/people.html'
        }).
        when('/app/company/profile/view', {
            controller: 'ViewerCtrl',
            templateUrl: '/company/profile/viewer.html'
        }).
        when('/app/ownership/company-captable', {
            controller: 'captableController',
            templateUrl: '/ownership/partials/comp-captable.html'
        }).
        when('/app/ownership/ledger', {
            controller: 'ledgerController',
            templateUrl: '/ownership/partials/ledger.html'
        }).
        when('/app/ownership/transaction-log', {
            controller: 'transactionLogController',
            templateUrl: '/ownership/partials/transaction-log.html'
        }).
        when('/app/ownership/company-grants', {
            controller: 'grantController',
            templateUrl: '/ownership/partials/comp-grant.html'
        }).
        when('/app/ownership/investor-captable', {
            controller: 'invCaptableController',
            templateUrl: '/ownership/partials/inv-captable.html'
        }).
        when('/app/ownership/investor-grants', {
            controller: 'invGrantController',
            templateUrl: '/ownership/partials/inv-grant.html'
        }).
        when('/app/documents/company-list', {
            templateUrl: '/documents/partials/companyList.html',
            controller: 'CompanyDocumentListController',
            reloadOnSearch: false
        }).
        when('/app/documents/company-view', {
            templateUrl: '/documents/partials/docViewerWrapper.html',
            controller: 'DocumentViewWrapperController',
            reloadOnSearch: false
        }).
        when('/app/documents/prepare', {
            templateUrl: '/documents/partials/prepare.html',
            controller: 'DocumentPrepareController',
            reloadOnSearch: false
        }).
        when('/app/documents/company-status', {
            templateUrl: '/documents/partials/companyStatus.html',
            controller: 'CompanyDocumentStatusController'
        }).
        when('/app/documents/investor-list', {
            templateUrl: '/documents/partials/investorList.html',
            controller: 'InvestorDocumentListController'
        }).
        when('/app/documents/investor-view', {
            templateUrl: '/documents/partials/docViewerWrapper.html',
            controller: 'DocumentViewWrapperController',
            reloadOnSearch: false
        }).
        when('/app/modeling/round', {
            templateUrl: '/modeling/pages/round.html',
            controller: 'roundController'
        }).
        when('/app/modeling/convertible-notes', {
            templateUrl: '/modeling/pages/note.html',
            controller: 'noteController'
        }).
        when('/app/company/messages', {
            templateUrl: '/messages/newMessage.html',
            controller: 'MsgCtrl'

        }).

        otherwise({redirectTo:'/app/home/investor'});
});

app.controller('MessagesCtrl', ['$rootScope', '$scope', 'messages', 'SWBrijj',
    function($rootScope, $scope, messages, SWBrijj) {
        // TODO find better way to bind these 2
        $rootScope.$on('inboxRefresh', function() {
            $scope.inbox = messages.inbox;
        });
        $rootScope.$on('outboxRefresh', function() {
            $scope.outbox = messages.outbox;
        });
        $scope.mailbox = 'inbox';
        $scope.setMailbox = function(mlbx) {
            $scope.mailbox = mlbx;
        };

        $scope.populateResponse = function(message) {
            $scope.message = {};
            $scope.message.subject = message.subject;
            $scope.message.text = message.text;
        };




        SWBrijj.tblm('global.user_list', ['email', 'name']).then(function(x) {
            $scope.people = x;
            SWBrijj.tblm('account.company_issuers', ['email', 'name']).then(function(admins) {
                angular.forEach(admins, function(admin) {
                    angular.forEach($scope.people, function(person) {
                        if (person.name) {
                            person.selector = person.name + "  (" + person.email +")";
                        }
                        else {
                            person.selector = "(" + person.email+")";
                        }

                        if (person.email == admin.email) {
                            person.role = "issuer";
                        }
                    });
                });
                SWBrijj.tblm('account.profile', ['email']).then(function(me) {
                    angular.forEach($scope.people, function(person) {
                        if (person.email == me[0].email)
                            person.hideLock = true;
                        if (!person.name) {
                            person.name = person.email;
                        }

                    });

                });
            });
        });


    }
]);

app.controller('CompanyCtrl',
    ['$scope', '$rootScope', '$route', '$location',
        '$routeParams', '$filter', 'SWBrijj',  'navState', 'calculate', 'captable',
        function($scope, $rootScope, $route, $location,
                 $routeParams, $filter, SWBrijj, navState, calculate, captable)
        {
            $scope.statelist = ['Alabama', 'Alaska', 'Arizona', 'Arkansas', 'California', 'Colorado', 'Connecticut', 'Delaware', 'Florida', 'Georgia', 'Hawaii', 'Idaho', 'Illinois', 'Indiana', 'Iowa', 'Kansas', 'Kentucky', 'Louisiana', 'Maine', 'Maryland', 'Massachusetts', 'Michigan', 'Minnesota', 'Mississippi', 'Missouri', 'Montana', 'Nebraska', 'Nevada', 'New Hampshire', 'New Jersey', 'New Mexico', 'New York', 'North Carolina', 'North Dakota', 'Ohio', 'Oklahoma', 'Oregon', 'Pennsylvania', 'Rhode Island', 'South Carolina', 'South Dakota', 'Tennessee', 'Texas', 'Utah', 'Vermont', 'Virginia', 'Washington', 'West Virginia', 'Wisconsin', 'Wyoming'];
            $scope.currencies = ['United States Dollars (USD)', 'Pound Sterling (GBP)', 'Euro (EUR)'];
            $scope.dateformats = ['MM/DD/YYYY', 'DD/MM/YYYY'];
            $scope.flipped1 = false;
            $scope.flipped2 = false;
            $scope.donutlabel = "100%";
            $scope.default = "100%";
			$scope.ct = captable.getCapTable();
			
            if (navState.role == 'investor') {
                $location.path('/app/home/investor');
                return;
            }

            if ($routeParams.cc) {
                $scope.$emit('notification:success', 'Successfully created new company');
            }

            $scope.uselessbrowser = !Modernizr.csstransforms3d;
            //console.log($scope.uselessbrowser);
            
            $scope.$watch('ct', function(newval, oldval) {
				if (newval.securities.length > 0) {
					$scope.ct = angular.copy($scope.ct);
					$scope.getOwnershipInfo();
				}
			}, true);

            SWBrijj.tblm('account.my_company', ['name', 'company', 'zipcode', 'state', 'address', 'city', 'currency', 'dateformat']).then(function(x) {
                $scope.company = x[0];
                angular.forEach($scope.currencies, function(c) {
                    if (c.indexOf($scope.company.currency) !== -1) {
                        $scope.company.longcurrency = c;
                    }
                });
                $scope.company.dateformat = $scope.company.dateformat == 'MM/dd/yyyy' ? 'MM/DD/YYYY' : 'DD/MM/YYYY';
                $scope.photoURL = '/photo/user?id=company:' + x[0].company;

                // Get all the data required
                $scope.getTokenInfo();
                $scope.getDocumentInfo();
               
            });

            if ($routeParams.msg) {
                if ($routeParams.msg == "resetPassword") {
                    $scope.$emit("notification:success", "You have successfully changed your password.");
                }
            }

			$scope.fullScreen = function() {
				/*var elem = document.getElementById("vid");
				if (elem.requestFullscreen) {
				  elem.requestFullscreen();
				} else if (elem.msRequestFullscreen) {
				  elem.msRequestFullscreen();
				} else if (elem.mozRequestFullScreen) {
				  elem.mozRequestFullScreen();
				} else if (elem.webkitRequestFullscreen) {
				  elem.webkitRequestFullscreen();
				}*/

				document.getElementById("vid-pic").style.visibility="hidden";
			};
            $scope.getTokenInfo = function() {
                SWBrijj.tblm('oauth.company_tokens_info', ['swid', 'service', 'auth_code_exists', 'access_token_exists', 'last_backup']).then(function(data) {
                    $scope.backupInfo = data[0];
                });
            };

            $scope.authorizeOauth = function(svc) {
                SWBrijj.procm('oauth.request_authorization', 'dropbox', navState.role).then(function(x) {window.location.href=x[0].request_authorization;});
            };

            $scope.deauthorizeOauth = function(svc) {
                SWBrijj.procm('oauth.deauthorize', 'dropbox', navState.role).then(function(x) {$scope.getTokenInfo();});
            };

            $scope.backupStatus = function() {
                return ($scope.backupInfo && $scope.backupInfo.last_backup) || "Please authenticate Dropbox for backups.";
            };
            $scope.backupError = function() {
                if ($scope.backupInfo) {
                    return $scope.backupInfo.auth_code_exists > $scope.backupInfo.access_token_exists;
                } else {
                    return false;
                }
            };

            $scope.close = function() {
                $scope.onboarding = false;
                SWBrijj.procm('account.onboarding_update', false);
            };

            $scope.getDocumentInfo = function() {
                SWBrijj.tblm('document.my_company_library', ['doc_id']).then(function(docs) {
                    $scope.docsummary = {};
                    $scope.docsummary.num = docs.length;
                    SWBrijj.tblm("document.my_counterparty_library").then(function(sharedocs) {
                        $scope.docsummary.sig = 0;
                        $scope.docsummary.counter = 0;
                        angular.forEach(sharedocs, function(doc) {
                            if ((doc.signature_status == "countersigned by issuer (awaiting investor confirmation)" ||
                                doc.signature_status == "signature requested (awaiting investor)") && (doc.when_retracted == null)) {
                                $scope.docsummary.sig += 1;
                            }
                            else if ((doc.signature_status == "signed by investor (awaiting countersignature)") && (doc.when_retracted == null)) {
                                $scope.docsummary.counter += 1;
                            }
                        });
                    });
                });
            };

            $scope.isPendingInvestor = function(doc) {
                return $scope.isPendingView(doc) && $scope.isPendingSignature(doc) && $scope.isPendingFinalization(doc);
            };
            $scope.isPendingView = function(doc) {
                return !doc.signature_deadline && !version.last_viewed;
            };
            $scope.isPendingSignature = function(doc) {
                return doc.signature_deadline && !doc.when_signed;
            };
            $scope.isPendingFinalization = function(doc) {
                return doc.when_signed && doc.when_countersigned && !doc.when_finalized;
            };

            $scope.getOwnershipInfo = function() {
                
                console.log($scope.ct);
                $scope.issueArray=[];
                $scope.amountArray=[];
            	var index=-1;
            	$scope.totalIssued=0;
            	
                angular.forEach($scope.ct.ledger_entries, function (entry) {
                	console.log($scope.issueArray[5]);
                	console.log($scope.issueArray);
                	if (calculate.primaryMeasure(entry.security_type)=='units'){
                		$scope.totalIssued+=(entry.credit-entry.debit);
                		console.log("what");
                	}
                	index = $scope.issueArray.indexOf(entry.security);
                	if (index==-1) {
                		
                		if (entry.security!=null) {
							$scope.issueArray.push(entry.security);
							if (calculate.primaryMeasure(entry.security_type)=='units'){
								$scope.issueArray.push(entry.credit-entry.debit);
								console.log('units????');
							}
							else {
								$scope.issueArray.push(0);
							}
						}
                	}
                	else {
                		
                		console.log("ADDING TO OPTIONS");
                		$scope.issueArray[index+1]+=(entry.credit-entry.debit);
                	}
                });
                angular.forEach($scope.ct.transactions, function (tran) {
                	if (calculate.primaryMeasure(tran.attrs.security_type)=='units'){
                		
                		index = $scope.amountArray.indexOf(tran.attrs.security);
                		if (index==-1) {
                		
							if (tran.attrs.security!=null) {
								$scope.amountArray.push(tran.attrs.security);
								if (tran.attrs.amount!=null){
									$scope.amountArray.push(tran.attrs.amount);
								}
								else {
									$scope.amountArray.push(0);
								
								}
							}
                		}
                		else {
                		
                		
                			$scope.issueArray[index+1]+=(tran.attrs.amount);
                		}
                	}
                });
                		
                		
                	
                	
                
                console.log($scope.issueArray);
                console.log($scope.totalIssued);
                $scope.ownersummary = {};
                $scope.rows = [];
                $scope.uniquerows = [];
                SWBrijj.tblm('_ownership.my_company_draft_transactions').then(function (trans) {
                    $scope.ownersummary.people = [];
                    $scope.ownersummary.invested = 0;
                    $scope.trans = trans;
                    angular.forEach(trans, function(tran) {
                        tran.attrs = JSON.parse(tran.attrs);
                        if ($scope.ownersummary.people.indexOf(tran.attrs.investor) == -1) {
                            $scope.ownersummary.people.push(tran.attrs.investor);
                        }
                        $scope.ownersummary.invested = calculate.isNumber(tran.attrs.amount) ? $scope.ownersummary.invested + Number(tran.attrs.amount) : $scope.ownersummary.invested;
                    });
                    $scope.ownersummary.investedraw = angular.copy($scope.ownersummary.invested);
                    $scope.ownersummary.invested = $scope.formatAbrAmount($scope.ownersummary.invested);
                    
                    $scope.issues = [];
                    $scope.grants = [];
                    angular.forEach($scope.trans, function(tran) {
                        if (tran.kind == 'issue security')
                        {
                            $scope.issues.push(tran);
                        }
                        else if (tran.kind == 'grant')
                        {
                            $scope.grants.push(tran);
                        }
                    });
                    //SWBrijj.tblm('ownership.company_issue').then(function (data) {
                      //  $scope.issues = data;
                        //SWBrijj.tblm('ownership.company_grants').then(function (grants) {
                          //  $scope.grants = grants;

                    /*angular.forEach($scope.grants, function (grant) {
                        angular.forEach($scope.trans, function (tran) {
                            if (grant.tran_id == tran.transaction) {        TODO: don't know what forfeited should do
                                grant.investor = tran.attrs.investor;
                                if (grant.action == "forfeited") {
                                    if (tran.attrs.forfeited) {
                                        tran.attrs.forfeited = tran.attrs.forfeited + grant.unit;
                                    }
                                    else {
                                        tran.attrs.forfeited = grant.unit;
                                    }
                                }
                            }
                        });
                    });

                    if ($scope.trans) {
                        for (var i = 0, l = $scope.trans.length; i < l; i++) {
                            if ($scope.uniquerows.indexOf($scope.trans[i].attrs.investor) == -1) {
                                $scope.uniquerows.push($scope.trans[i].attrs.investor);
                                $scope.rows.push({"name": $scope.trans[i].attrs.investor});//TODO: check if email is needed
                            }
                        }
                    }

                    angular.forEach($scope.trans, function (tran) {
                        angular.forEach($scope.rows, function (row) {
                            if (row.name == tran.attrs.investor) {
                                if (tran.attrs.security in row) {
                                    row[tran.attrs.security]["u"] = calculate.sum(row[tran.attrs.security]["u"], calculate.isNumber(tran.attrs.units)? Number(tran.attrs.units) : 0);
                                    row[tran.attrs.security]["a"] = calculate.sum(row[tran.attrs.security]["a"], calculate.isNumber(tran.attrs.amount)? Number(tran.attrs.amount) : 0);
                                    /*if (!isNaN(parseFloat(tran.forfeited))) {TODO: don't know what forfeited should do
                                        row[tran.issue]["u"] = calculate.sum(row[tran.issue]["u"], (-tran.forfeited));
                                    }
                                }
                                else {
                                    row[tran.attrs.security] = {};
                                    row[tran.attrs.security]["u"] = calculate.isNumber(tran.attrs.units)? Number(tran.attrs.units) : 0;
                                    row[tran.attrs.security]["a"] = calculate.isNumber(tran.attrs.amount)? Number(tran.attrs.amount) : 0;
                                    if (!isNaN(parseFloat(tran.forfeited))) {TODO: don't know what forfeited should do
                                        row[tran.issue]["u"] = calculate.sum(row[tran.issue]["u"], (-tran.forfeited));
                                        row[tran.issue]["ukey"] = row[tran.issue]["u"];
                                    }
                                }
                            }
                        });
                    });

                    angular.forEach($scope.rows, function (row) {
                        angular.forEach($scope.issues, function (issue) {
                            if (row[issue.attrs.security] != undefined) {
                                if (issue.attrs.security_type == "Debt" && (isNaN(parseFloat(row[issue.attrs.security]['u']))) && !isNaN(parseFloat(row[issue.attrs.security]['a']))) {
                                    row[issue.attrs.security]['x'] = calculate.debt($scope.rows, issue, row);//TODO: is this calculate correct?
                                }
                            }
                        });
                    });
                    $scope.issuepercent = {};
                    angular.forEach($scope.issues, function (issue) {
                        $scope.issuepercent[issue.attrs.security] = {'units':0,'debt':0};
                        //$scope.rows = calculate.unissued($scope.rows, $scope.issues, String(issue.issue));//TODO: is this calculate correct?
                    });
                    var totalunits = 0;
                    var totaldebt = 0;
                    angular.forEach($scope.rows, function (row) {
                        angular.forEach($scope.issues, function (issue) {
                            if (row[issue.attrs.security]) {
                                if (row[issue.attrs.security]['u']) {
                                    totalunits += row[issue.attrs.security]['u'];
                                    $scope.issuepercent[issue.attrs.security]['units'] += row[issue.attrs.security]['u'];
                                }
                                if (row[issue.attrs.security]['x']) {
                                    totaldebt += row[issue.attrs.security]['x'];
                                    $scope.issuepercent[issue.attrs.security]['debt'] += row[issue.attrs.security]['x'];
                                }
                            }
                        });
*/
                            angular.forEach($scope.trans, function (tran) {
                            	angular.forEach($scope.rows, function (row) {
                            		row[tran.issue]={};
                            		row[tran.issue]["u"] = 0;
                            		row[tran.issue]["a"] = 0;
                            	});
                            });

                            angular.forEach($scope.trans, function (tran) {
                                angular.forEach($scope.rows, function (row) {
                                    if (row.name == tran.investor) {
                                        if (tran.issue in row) {
                                            row[tran.issue]["u"] = calculate.sum(row[tran.issue]["u"], tran.units);
                                            row[tran.issue]["a"] = calculate.sum(row[tran.issue]["a"], tran.amount);
                                           
                                            if (!isNaN(parseFloat(tran.forfeited))) {
                                                row[tran.issue]["u"] = calculate.sum(row[tran.issue]["u"], (-tran.forfeited));
                                            }
                                        }
                                        else {
                                            row[tran.issue] = {};
                                            row[tran.issue]["u"] = tran.units;
                                            row[tran.issue]["a"] = tran.amount;
                                            if (!isNaN(parseFloat(tran.forfeited))) {
                                                row[tran.issue]["u"] = calculate.sum(row[tran.issue]["u"], (-tran.forfeited));
                                                row[tran.issue]["ukey"] = row[tran.issue]["u"];
                                            }
                                        }
                                    }
                                    
                                    
                                });
                            });
                            	var moneyArray = [];
                            	var securityArray = [];
                            	angular.forEach($scope.rows, function (row) {
                            		thisCounter=0;
                            		issueCounter=0;
                            		angular.forEach(row, function (item) {
                            			
                            			if (thisCounter>1) {
                            				
							
											if (securityArray.length<=issueCounter) {
												securityArray[issueCounter]=item.u;
											}
											else {
												securityArray[issueCounter]+=item.u;
											}
											if (moneyArray.length<=issueCounter) {
												moneyArray[issueCounter]=item.a;
											}
											else {
												moneyArray[issueCounter]+=item.a;
											}												
											issueCounter++;
                            			
                            				
                            			}
                            			thisCounter++;
                            		});
                            	});
                            	


                            angular.forEach($scope.rows, function (row) {
                                angular.forEach($scope.issues, function (issue) {
                                    if (row[issue.issue] != undefined) {
                                        if (issue.type == "Debt" && (isNaN(parseFloat(row[issue.issue]['u']))) && !isNaN(parseFloat(row[issue.issue]['a']))) {
                                            row[issue.issue]['x'] = calculate.debt($scope.rows, issue, row);
                                        }
                                    }
                                });
                            });
                            $scope.issuepercent = {};
                            angular.forEach($scope.issues, function (issue) {
                                $scope.issuepercent[issue.issue] = {'units':0,'debt':0};
                                //$scope.rows = calculate.unissued($scope.rows, $scope.issues, String(issue.issue));
                            });
                            var totalunits = 0;
                            var totaldebt = 0;
                            angular.forEach($scope.rows, function (row) {
                                angular.forEach($scope.issues, function (issue) {
                                    if (row[issue.issue]) {
                                        if (row[issue.issue]['u']) {
                                            totalunits += row[issue.issue]['u'];
                                            $scope.issuepercent[issue.issue]['units'] += row[issue.issue]['u'];
                                        }
                                        if (row[issue.issue]['x']) {
                                            totaldebt += row[issue.issue]['x'];
                                            $scope.issuepercent[issue.issue]['debt'] += row[issue.issue]['x'];
                                        }
                                    }
                                });
                            });
                            $scope.graphdata = [];
                            $scope.graphdata2 = [];
                            $scope.graphdata3 = [];
                            var biggestSecurity = "";
                            var bigSecurity = "";
                            var counter = 0;
                            var maxPercent = -1;
							var maxName = "";
                            while (counter < 3) {
								maxPercent = -1;
								maxName = "";
								for (var i=1; i<$scope.issueArray.length; i+=2) {
									
									
								//angular.forEach($scope.issues, function (issue) {
									//var issuepercent = $scope.issuepercent[issue.issue]['debt'] + (($scope.issuepercent[issue.issue]['units'] / totalunits) * (100-totaldebt));
									
									var issuepercent = $scope.issueArray[i]/$scope.totalIssued*100;
									
									var name = String($scope.issueArray[i-1]).length > 14 ? $scope.issueArray[i-1].substring(0, (13)) + ".." : $scope.issueArray[i-1];
									if (counter==0) {
										if (issuepercent > maxPercent) {
											maxPercent = issuepercent;
											maxName = name;
										}
									}
									if (counter==1) {
										if (issuepercent > maxPercent && name != biggestSecurity) {
											maxPercent = issuepercent;
											maxName = name;
										}
									}
									if (counter==2) {
										if (issuepercent > maxPercent && name != biggestSecurity && name != bigSecurity) {
											maxPercent = issuepercent;
											maxName = name;
										}
									}
								}
								if (counter==0) {
									console.log(maxPercent);
									biggestSecurity = maxName;
									$scope.graphdata.push({'name':maxName, 'percent':maxPercent});
									$scope.graphdata.push({'name':'whatever', 'percent':100-maxPercent});
									$scope.graphdata.push({'name':'zero', 'percent': 0});
									
								}
								if (counter==1) {
									bigSecurity = maxName;
									$scope.graphdata2.push({'name':maxName, 'percent':maxPercent});
									$scope.graphdata2.push({'name':'whatever', 'percent':100-maxPercent});
									$scope.graphdata2.push($scope.graphdata[0]);
									
								}
								if (counter==2) {
									$scope.graphdata3.push({'name':maxName, 'percent':maxPercent});
									$scope.graphdata3.push({'name':'whatever', 'percent':100-maxPercent});
									$scope.graphdata3.push({'name':'something', 'percent': $scope.graphdata[0].percent+$scope.graphdata2[0].percent});
									
								}
								counter++;
							}
						
						    $scope.bigIssue=0;	
                            $scope.biggerIssue=0;
                            $scope.biggestIssue=0;
                            var numCounter=0;
                            var amountIndex=0;
                            console.log($scope.amountArray);
                            while (numCounter<3 && $scope.issueArray.length>0) {
                            
                            	var maxIssue=-1;
                            	var maxIndex=-1;
								for (i=1;i<$scope.issueArray.length;i+=2) {
									if ($scope.issueArray[i]>maxIssue) {
										maxIssue=$scope.issueArray[i];
										maxIndex=i;
									}
									
								}
								
								
								if (numCounter==0) {
									$scope.biggestIssue=$filter('number')($scope.issueArray[maxIndex]);
									amountIndex = $scope.amountArray.indexOf($scope.issueArray[maxIndex-1]);
									console.log("MONEY");
									console.log($scope.issueArray[maxIndex-1]);
									console.log(amountIndex);
									$scope.issueArray.splice(maxIndex, 1);
									$scope.issueArray.splice(maxIndex-1, 1);
									
									console.log("Here it is");
									console.log($scope.amountArray);
									console.log(amountIndex);
									$scope.biggestMoney=$filter('number')($scope.amountArray[amountIndex+1]);
									console.log($scope.amountArray[amountIndex+1]);
									console.log($scope.amountArray[5]);
									
									
								}
								if (numCounter==1) {
									$scope.biggerIssue=$filter('number')($scope.issueArray[maxIndex]);
									amountIndex = $scope.amountArray.indexOf($scope.issueArray[maxIndex-1]);
									
									$scope.issueArray.splice(maxIndex, 1);
									$scope.issueArray.splice(maxIndex-1, 1);
									$scope.biggerMoney=$filter('number')($scope.amountArray[amountIndex+1]);
									
									
								}
								if (numCounter==2) {
									$scope.bigIssue=$filter('number')($scope.issueArray[maxIndex]);
									amountIndex = $scope.amountArray.indexOf($scope.issueArray[maxIndex-1]);
									$scope.issueArray.splice(maxIndex, 1);
									$scope.issueArray.splice(maxIndex-1, 1);
									$scope.bigMoney=$filter('number')($scope.amountArray[amountIndex+1]);
									
									
									
                            	}
                            	numCounter++;	
                            	console.log("AAAAAA");
                            	console.log($scope.biggestMoney);
                            }
                            
                        });
                    $scope.graphdata = [];
                    angular.forEach($scope.issues, function (issue) {
                        var issuepercent = $scope.issuepercent[issue.attrs.security]['debt'] + (($scope.issuepercent[issue.attrs.security]['units'] / totalunits) * (100-totaldebt));
                        var name = issue.attrs.security.length > 14 ? issue.attrs.security.substring(0, (13)) + ".." : issue.attrs.security;
                        $scope.graphdata.push({'name':name, 'percent':issuepercent});
                    });

                      //  });
                    //});
                   // $scope.ownersummary.peoplenum = $scope.ownersummary.people.length;
                SWBrijj.tblm("ownership.clean_company_access").then(function (people) {
                    $scope.ownersummary.shares = people.length;
                });
            };

            $scope.activityView = "global.get_company_activity";

            $scope.activityOrder = function(card) {
                return -card.time;
            };

            // Flipping tiles functionality

            $scope.flipTile = function(x) {
                if (!$scope.uselessbrowser) {
                    $scope['flipped'+String(x)] = !$scope['flipped'+String(x)];
                }
            };


            // Profile Change modal

            $scope.profileModalOpen = function () {
                $scope.profileModal = true;
                $scope.editcompany = angular.copy($scope.company);
            };

            $scope.profileModalClose = function () {
                $scope.profileModal = false;
            };

            $scope.profileopts = {
                backdropFade: true,
                dialogFade:true,
                dialogClass: 'profile-modal wideModal modal'
            };

            $scope.setFiles = function(element) {
                $scope.files = [];
                for (var i = 0; i < element.files.length; i++) {
                    $scope.files.push(element.files[i]);
                    var oFReader = new FileReader();
                    oFReader.readAsDataURL($scope.files[0]);

                    oFReader.onload = function (oFREvent) {
                        document.getElementById("updateImage").src = oFREvent.target.result;
                    };
                    $scope.$apply();
                }
            };

            $scope.profileUpdate = function (company) {
                SWBrijj.proc("account.company_update", company.name, company.address, company.city, company.state, company.zipcode).then(function (x) {
                    void(x);
                    var fd = new FormData();
                    if ($scope.files) {
                        for (var i=0;i<$scope.files.length;i++) fd.append("uploadedFile", $scope.files[i]);
                        SWBrijj.uploadLogo(fd).then(function(x) {
                            void(x);
                            $scope.photoURL = '/photo/user?id=company:' + $scope.company.company + '#' + new Date().getTime();
                            $scope.$emit("notification:success", "Company profile successfully updated");
                            $scope.company = company;
                        }).except( function(x) {
                                void(x);
                                $scope.$emit("notification:fail", "Company logo change was unsuccessful, please try again.");
                            });
                    }
                    else {
                        $scope.company = company;
                        $scope.$emit("notification:success", "Company profile successfully updated");
                    }
                }).except(function(x) {
                        void(x);
                        $scope.$emit("notification:fail", "There was an error updating your company profile.");
                    });
            };

            // Settings Change modal

            $scope.settingModalOpen = function () {
                $scope.settingModal = true;
                $scope.editcompany = angular.copy($scope.company);
            };

            $scope.settingModalClose = function () {
                $scope.settingModal = false;
            };

            $scope.setCurrency = function(currency) {
                $scope.editcompany.longcurrency = currency;
                $scope.editcompany.currency = currency.match(/\(...\)/)[0].substring(1,4);
            };

            $scope.setDateFormat = function(dateformat) {
                $scope.editcompany.dateformat = dateformat;
            }

            $scope.saveSettings = function(company) {
                var dateformat = company.dateformat == 'MM/DD/YYYY' ? 'MM/dd/yyyy' : 'dd/MM/yyyy';
                SWBrijj.proc("account.company_settings_update", company.currency, dateformat).then(function (x) {
                    void(x);
                    $scope.company.longcurrency = company.longcurrency;
                    $scope.company.currency = company.currency;
                    $scope.company.dateformat = company.dateformat;
                    $rootScope.settings.currency = company.currency;
                    $scope.ownersummary.invested = $scope.formatAbrAmount($scope.ownersummary.investedraw);
                });
            };

            $scope.gotopage = function (link){
                $location.url(link);
            };

            // Service functions

            $scope.formatAmount = function (amount) {
                return calculate.funcformatAmount(amount);
            };

            $scope.formatDollarAmount = function(amount) {
                var output = calculate.formatMoneyAmount($scope.formatAmount(amount), $rootScope.settings);
                return (output);
            };

            $scope.formatAbrAmount = function(amount) {
                var output = calculate.formatMoneyAmount(calculate.abrAmount(amount), $rootScope.settings);
                return output;
            }
        }]);

app.controller('InvestorCtrl', ['$scope','$rootScope','$location', '$route','$routeParams', 'SWBrijj', 'navState', 'calculate', 'captable',
    function($scope, $rootScope, $location, $route, $routeParams, SWBrijj, navState, calculate, captable) {

        if (navState.role == 'issuer') {
            $location.path('/app/home/company');
            return;
        }

        if ($routeParams.msg) {
            if ($routeParams.msg == "resetPassword") {
                $scope.$emit("notification:success", "You have successfully changed your password.");
            }
        }
        $scope.cti=captable.getCapTable();
        console.log($scope.cti);

        $scope.uselessbrowser = !Modernizr.csstransforms3d;

        $scope.$watch('cti', function(newval, oldval) {
                if (newval.securities.length > 0) {
                    $scope.cti = angular.copy($scope.cti);
                    $scope.getOwnershipInfo();
                }
            }, true);

        //initialisation functions called
        $scope.company = navState.name;

        SWBrijj.tblm('account.profile').then(function(x) {
            $scope.person = x[0];
            $scope.photoURL = '/photo/user?id=' + x[0].email;
            $scope.person.namekey = $scope.person.name;

            $scope.getTokenInfo();
            $scope.getOwnershipInfo();
            $scope.getDocumentInfo();
        });

        SWBrijj.tblm('account.my_company', ['name', 'company', 'zipcode', 'state', 'address', 'city', 'currency', 'dateformat']).then(function(x) {
            $scope.company = x[0];
        });

        $scope.getTokenInfo = function() {
            SWBrijj.tblm('oauth.user_tokens_info', ['swid', 'service', 'auth_code_exists', 'access_token_exists', 'last_backup']).then(function(data) {
                $scope.backupInfo = data[0];
            });
        };

        $scope.authorizeOauth = function(svc) {
            SWBrijj.procm('oauth.request_authorization', 'dropbox', navState.role).then(function(x) {window.location.href=x[0].request_authorization;});
        };

        $scope.deauthorizeOauth = function(svc) {
            SWBrijj.procm('oauth.deauthorize', 'dropbox', navState.role).then(function(x) {$scope.getTokenInfo();});
        };

        $scope.backupStatus = function() {
            if (!$scope.backupInfo) {
                return "Please authenticate Dropbox for backups.";
            } else if ($scope.backupInfo.last_backup) {
                return $scope.backupInfo.last_backup;
            } else if ($scope.backupInfo.access_token_exists) {
                return "Pending backup.";
            }
        };
        $scope.backupError = function() {
            if ($scope.backupInfo) {
                return $scope.backupInfo.auth_code_exists > $scope.backupInfo.access_token_exists;
            } else {
                return false;
            }
        };

        $scope.activityOrder = function(card) {
            return -card.time;
        };

        $scope.activityView = "global.get_investor_activity";

        $scope.getOwnershipInfo = function() {
            $scope.ownersummary = {};
            $scope.rows = [];
            $scope.uniquerows = [];
            $scope.createInvestorTile();
            // this is where robbie is working DANGER ZONE
            SWBrijj.tblm('ownership.this_company_transactions').then(function (trans) {
                $scope.trans = trans;
                SWBrijj.tblm('ownership.this_company_issues').then(function (data) {
                    $scope.issues = data;
                    SWBrijj.tblm('ownership.this_company_options_grants').then(function (grants) {
                        $scope.grants = grants;
                        SWBrijj.procm('ownership.get_everyone_else').then(function (x) {
                            $scope.everyone = {};
                            $scope.everyone.percentage = x[0].get_everyone_else;


                            angular.forEach($scope.grants, function (grant) {
                                angular.forEach($scope.trans, function (tran) {
                                    if (grant.tran_id == tran.tran_id) {
                                        grant.investor = tran.investor;
                                        if (grant.action == "forfeited") {
                                            if (tran.forfeited) {
                                                tran.forfeited = tran.forfeited + grant.unit;
                                            }
                                            else {
                                                tran.forfeited = grant.unit;
                                            }
                                        }
                                        if (grant.action == "exercised") {
                                            if (tran.exercised) {
                                                tran.exercised = tran.exercised + grant.unit;
                                            }
                                            else {
                                                tran.exercised = grant.unit;
                                            }
                                        }
                                    }
                                });
                            });

                            $scope.myownership = {}
                            $scope.myownership.shares = 0;
                            $scope.myownership.amount = 0;
                            angular.forEach($scope.trans, function (tran) {
                                if (tran.email == $rootScope.person.email) {
                                    $scope.myownership.shares = tran.units ? $scope.myownership.shares + tran.units : $scope.myownership.shares;
                                    $scope.myownership.shares = tran.forfeited ? $scope.myownership.shares - tran.forfeited : $scope.myownership.shares;
                                    $scope.myownership.amount = tran.amount ? $scope.myownership.amount + tran.amount : $scope.myownership.amount;
                                }
                            });

                            $scope.myownership.amount = $scope.formatAbrAmount($scope.myownership.amount);

                            for (var i = 0, l = $scope.trans.length; i < l; i++) {
                                if ($scope.uniquerows.indexOf($scope.trans[i].investor) == -1) {
                                    $scope.uniquerows.push($scope.trans[i].investor);
                                    $scope.rows.push({"name": $scope.trans[i].investor, "email": $scope.trans[i].email});
                                }
                            }

                            angular.forEach($scope.trans, function (tran) {
                                angular.forEach($scope.rows, function (row) {
                                    if (row.name == tran.investor) {
                                        if (tran.issue in row) {
                                            row[tran.issue]["u"] = calculate.sum(row[tran.issue]["u"], tran.units);
                                            row[tran.issue]["a"] = calculate.sum(row[tran.issue]["a"], tran.amount);
                                            if (!isNaN(parseFloat(tran.forfeited))) {
                                                row[tran.issue]["u"] = calculate.sum(row[tran.issue]["u"], (-tran.forfeited));
                                            }
                                        }
                                        else {
                                            row[tran.issue] = {};
                                            row[tran.issue]["u"] = tran.units;
                                            row[tran.issue]["a"] = tran.amount;
                                            if (!isNaN(parseFloat(tran.forfeited))) {
                                                row[tran.issue]["u"] = calculate.sum(row[tran.issue]["u"], (-tran.forfeited));
                                                row[tran.issue]["ukey"] = row[tran.issue]["u"];
                                            }
                                        }
                                    }
                                });
                            });

                            angular.forEach($scope.rows, function (row) {
                                angular.forEach($scope.issues, function (issue) {
                                    if (row[issue.issue] != undefined) {
                                        if (issue.type == "Debt" && (isNaN(parseFloat(row[issue.issue]['u']))) && !isNaN(parseFloat(row[issue.issue]['a']))) {
                                            row[issue.issue]['x'] = calculate.debt($scope.rows, issue, row);
                                        }
                                    }
                                });
                            });

                            $scope.optiontrans = [];
                            angular.forEach($scope.trans, function(tran) {
                                if (tran.email == $rootScope.person.email && tran.type == "Option") {
                                    $scope.optiontrans.push(tran);
                                }
                            });

                            $scope.issuepercent = {};
                            angular.forEach($scope.issues, function (issue) {
                                $scope.issuepercent[issue.issue] = {'units':0,'debt':0};
                                $scope.rows = calculate.unissued($scope.rows, $scope.issues, String(issue.issue));
                            });
                            var totalunits = 0;
                            var totaldebt = 0;
                            angular.forEach($scope.rows, function (row) {
                                angular.forEach($scope.issues, function (issue) {
                                    if (row[issue.issue]) {
                                        if (row[issue.issue]['u']) {
                                            totalunits += row[issue.issue]['u'];
                                            $scope.issuepercent[issue.issue]['units'] += row[issue.issue]['u'];
                                        }
                                        if (row[issue.issue]['x']) {
                                            totaldebt += row[issue.issue]['x'];
                                            $scope.issuepercent[issue.issue]['debt'] += row[issue.issue]['x'];
                                        }
                                    }
                                });
                            });

                            // This calculates the data for the ownership donut graph
                            $scope.graphdata = [];
                            angular.forEach($scope.rows, function (row) {
                                if (row.email == $rootScope.person.email) {
                                    $scope.graphdata.push({'name':"mine", 'percent':calculate.cleanZeros(100 - parseFloat($scope.everyone.percentage))});
                                    $scope.myrow = row;
                                }
                            });
                            $scope.graphdata.push({'name':"everyone", 'percent': calculate.cleanZeros(parseFloat($scope.everyone.percentage))});

                            // This calculates the data for the vesting tab
                            var vestedarray = calculate.myvested($scope.optiontrans);
                            $scope.myvested = vestedarray[0];
                            var tranvested = vestedarray[1];
                            angular.forEach(tranvested, function(vest, key) {
                                angular.forEach($scope.optiontrans, function(tran) {
                                    if (key == tran.date) {
                                        tran.vested = vest;
                                    }
                                });
                            });
                            var investorName=$scope.cti.investors[0].name;
                            $scope.vestedgraphdata = [];
                            var transArray = [];
                            var transIndex=-1;
                            var transAttrs;
                            console.log("here?");
                            angular.forEach($scope.cti.transactions, function (tran) {
                            	console.log("loop?");
                            	transArray.push(tran.transaction);
                            	console.log(transArray);
                            });
                            angular.forEach($scope.cti.ledger_entries, function (entry) {
                            	transIndex=transArray.indexOf(entry.transaction);
                            	if (transIndex!=-1) {
                            		transAttrs=$scope.cti.transactions[transIndex].attrs;
                            		console.log("transaction found");
                            		if (transAttrs.terms&&transAttrs.vestcliff&&transAttrs.vestfreq&&transAttrs.vestingbegins){
										if (entry.investor==investorName){
											$scope.vestedgraphdata.push({'date':entry.effective_date, 'units':entry.credit, 'month':(entry.effective_date.getMonth()), 'vested':(Math.abs(Date()-entry.insertion_date))})
										}
									}
                            	}
                            });	
                            
                            /*var totalavailable = 0;
                            var totalvested = 0;
                            $scope.vestedgraphdata = [];
                            $scope.graphnumber= 0;
                            angular.forEach($scope.myvested, function (value, key) {
                                totalavailable += value[1];
                                totalvested += value[0];
                                $scope.vestedgraphdata.push({'date':key, 'units':value[1].toFixed(0), 'month':(key.substring(0,4) + key.substring(6,8)), 'vested': (value[1]-value[0])});
                            });*/
                            $scope.vesteddonut = [{'name':"vested", 'units': (totalvested), 'roundedunits': calculate.abrAmount(totalvested)}, {'name':"rest", 'units': (totalavailable-totalvested)}];
                        });
                    });
                });
            });
        };
          // Total Shares | Paid for an issue column (type is either u or a)
    	var colTotal = memoize(calculate.colTotal);
    	$scope.colTotal = function(header, rows, type) {
      
        
        return colTotal(header, rows, type);
        
    };

        $scope.getDocumentInfo = function() {
            SWBrijj.tblm("document.this_investor_library").then(function(docs) {
                $scope.docs = docs;
                $scope.docsummary = {};
                $scope.docsummary.num = docs.length;
                $scope.docsummary.sig = 0;
                SWBrijj.tblm("document.investor_activity").then(function(active) {
                    angular.forEach($scope.docs, function(doc) {
                        var docActivities = [];
                        angular.forEach(active, function(act) {
                            if (doc.doc_id == act.doc_id) {
                                if (doc.last_event) {
                                    doc.last_event = $scope.compareEvents(doc.last_event, act) ? doc.last_event : act;
                                }
                                else {
                                    doc.last_event = act;
                                }
                                if (act.person === doc.investor && act.activity==="viewed") {
                                    docActivities.push(act);
                                }
                            }
                        });
                        doc.last_viewed = docActivities.length > 0 ? docActivities[0].event_time : null;
                        $scope.setDocStatusRank(doc);
                        if (!((doc.signature_deadline && doc.when_signed) || (!doc.signature_deadline && doc.last_viewed))) {
                            $scope.docsummary.sig += 1;
                        }
                    });
                });
            });
        };

        $scope.compareEvents = function(a, b) {
            var initRank = $scope.eventRank(b) - $scope.eventRank(a);
            return initRank === 0 ? (b.event_time - a.event_time) : initRank;
        };

        $scope.eventRank = function (ev) {
            switch (ev.activity) {
                case "finalized":
                    return 7;
                case "countersigned":
                    return 6;
                // signed or rejected can come either before or after each other depending on chronological ordering.
                // ambiguity is resolve in $scope.compareEvents
                case "signed":
                case "rejected":
                    return 4;
                case "viewed":
                    return 3;
                case "received":
                    return 2;
                case "uploaded":
                    return 1;
                default:
                    return 0;
            }
        };

        $scope.setDocStatusRank = function(doc) {
            doc.statusRank = $scope.eventRank(doc.last_event);
        };

        $scope.docIsComplete = function(doc) {
            return (doc.signature_deadline && doc.when_finalized) ||
                (!doc.signature_deadline && doc.last_viewed);
        };

        $scope.gotopage = function (link){
            $location.url(link);
        };

        // Flipping tiles functionality

        $scope.flipTile = function(x) {
            if (!$scope.uselessbrowser) {
                $scope['flipped'+String(x)] = !$scope['flipped'+String(x)];
            }
        };

        // Password modal

        $scope.passwordModalOpen = function () {
            $scope.passwordModal = true;
        };

        $scope.passwordModalClose = function () {
            $scope.closeMsg = 'I was closed at: ' + new Date();
            $scope.passwordModal = false;
            $scope.currentPassword="";
            $scope.newPassword="";
            $scope.passwordConfirm="";
        };

        // Password code
        $scope.currentPassword="";
        $scope.newPassword="";
        $scope.passwordConfirm="";

        $scope.validPasswordNot = function() {
            return !($scope.currentPassword && $scope.passwordMatches());
            // return !($scope.currentPassword && !($scope.passwordMatchesNot() || $scope.regexPassword())); };
        };

        $scope.regexPassword = function() {
            var newP = $scope.newPassword;
            if (newP.match(/(?=.*?[a-z])(?=.*?[A-Z])(?=.*?[0-9]).{8,}/)) return "";
            else if (newP.match(/(?=.*?[a-z])(?=.*?[A-Z]).{8,}/)) return "Missing a digit";
            else if (newP.match(/(?=.*?[a-z])(?=.*?[0-9]).{8,}/)) return "Missing an uppercase letter";
            else if (newP.match(/(?=.*?[0-9])(?=.*?[A-Z]).{8,}/)) return "Missing a lowercase letter";
            else if (newP.length < 8) return "Must be at least eight characters";
            else return "Must contain at least one lowercase letter, one uppercase letter, and one digit";
        };

        $scope.passwordMatches = function() {
            return $scope.passwordConfirm && $scope.newPassword && $scope.passwordConfirm == $scope.newPassword ;
        };

        $scope.changePassword = function() {
            SWBrijj.proc("account.change_password", $scope.currentPassword, $scope.newPassword).then(function(x) {
                if (x[1][0]) {
                    $scope.$emit("notification:success", "Your password has been updated successfully.");
                } else {
                    $scope.$emit("notification:fail", "There was an error updating your password.");
                    $scope.currentPassword = "";
                    $scope.newPassword = "";
                    $scope.passwordConfirm = "";
                }
            }).except(function(x) {alert("Oops.  Change failed: "+x); });
        };

        $scope.opts = {
            backdropFade: true,
            dialogFade:true,
            dialogClass: 'wideModal modal'
        };

        // Profile Change modal

        $scope.profileModalOpen = function () {
            $scope.profileModal = true;
            $scope.editperson = angular.copy($scope.person);
        };

        $scope.profileModalClose = function () {
            $scope.profileModal = false;
        };

        $scope.profileopts = {
            backdropFade: true,
            dialogFade:true,
            dialogClass: 'profile-modal wideModal modal'
        };

        $scope.setFiles = function(element) {
            $scope.files = [];
            for (var i = 0; i < element.files.length; i++) {
                $scope.files.push(element.files[i]);
                var oFReader = new FileReader();
                oFReader.readAsDataURL($scope.files[0]);

                oFReader.onload = function (oFREvent) {
                    document.getElementById("updateImage").src = oFREvent.target.result;
                };
                $scope.$apply();
            }
        };

        $scope.address1 = function() {
            if ($scope.person) {
                return $scope.person.street;
            }
        };
        $scope.address2 = function() {
            if ($scope.person) {
                if ($scope.person.city && $scope.person.state && $scope.person.postalcode) {
                    return $scope.person.city + ", " + $scope.person.state + " " + $scope.person.postalcode;
                } else if ($scope.person.city || $scope.person.state) {
                    return ($scope.person.city || "") + ($scope.person.state || "") + " " + ($scope.person.postalcode || "");
                } else if ($scope.person.postalcode) {
                    return $scope.person.postalcode;
                } else {
                    return null;
                }
            }
        };

        $scope.profileUpdate = function (person) {
            SWBrijj.proc("account.contact_update", person.name, person.street, person.city, person.state, person.postalcode).then(function (x) {
                void(x);
                var fd = new FormData();
                if ($scope.files) {
                    for (var i=0;i<$scope.files.length;i++) fd.append("uploadedFile", $scope.files[i]);
                    SWBrijj.uploadImage(fd).then(function(x) {
                        $scope.$emit("notification:success", "Profile successfully updated");
                        void(x);
                        $scope.photoURL = '/photo/user?id=' + $scope.person.email + '#' + new Date().getTime();
                        $rootScope.userURL = '/photo/user?id=' + $scope.person.email + '#' + new Date().getTime();
                        $scope.person = person;
                    }).except( function(x) {
                            void(x);
                            $scope.$emit("notification:fail", "Profile photo change was unsuccessful, please try again.");
                        });
                }
                else {
                    $scope.person = person;
                    $scope.$emit("notification:success", "Profile successfully updated");
                }
            }).except(function(x) {
                    void(x);
                    $scope.$emit("notification:fail", "There was an error updating your profile.");
                });
        };

        // Service functions

        $scope.formatAmount = function (amount) {
            return calculate.funcformatAmount(amount);
        };

        $scope.formatDollarAmount = function(amount) {
            var output = calculate.formatMoneyAmount($scope.formatAmount(amount), $rootScope.settings);
            return (output);
        };

        $scope.formatAbrAmount = function(amount) {
            var output = calculate.formatMoneyAmount(calculate.abrAmount(amount), $rootScope.settings);
            return output;
        }

    }]);

app.controller('HomeCtrl',['$scope','$route', 'SWBrijj', function($scope, $route, SWBrijj) {
    SWBrijj.tbl('account.companies').then(function(x) {
        if (x.length > 0) { //User is a CEO of a company
            document.location.href="company";
        } else {
            SWBrijj.tblm('account.invested_companies').then(function(x) {
                document.location.href=x[0]['company'];
            });
        }
    });
}]);

/*
 function initPage($scope, x, row) {
 if(typeof(row)==='undefined') row = 1;
 var y = x[0]; // the fieldnames
 var z = x[row]; // the values

 for(var i=0;i<y.length;i++) { if (z[i] !== null) { $scope[y[i]]=z[i]; } }
 $scope.$apply();
 } */

function initFail(x) {
    void(x);
    // console.log('I would have redirected to login'); // document.location.href='/login';
}

/************************************************************
 *  Filters
 *  *********************************************************/

/* Filter to format the activity time */
angular.module('HomeApp').filter('fromNow', function() {
    return function(date) {
        return moment(date).fromNow();
    }
});

// Filters

app.filter('fromNowSort', function () {
    return function (events) {
        if (events) {
            events.sort(function (a, b) {
                if(a[1] > b[1]) return -1;
                if(a[1] < b[1]) return 1;
                return 0;
            });
        }

        return events;
    };
});





function memoize( fn ) {
    return function () {
        var args = Array.prototype.slice.call(arguments),
            hash = "",
            i = args.length;
        var currentArg = null;
        while (i--) {
            currentArg = args[i];
            hash += (currentArg === Object(currentArg)) ?
                JSON.stringify(currentArg) : currentArg;
            fn.memoize || (fn.memoize = {});
        }
        return (hash in fn.memoize) ? fn.memoize[hash] :
            fn.memoize[hash] = fn.apply(this, args);
    };
}

// IE8 Shiv for checking for an array
function isArray(obj) {
    return Object.prototype.toString.call(obj) === '[object Array]';
}
