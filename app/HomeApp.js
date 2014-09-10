
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
        when('/app/ownership/company-trans', {
            controller: 'tranController',
            templateUrl: '/ownership/partials/comp-trans.html'
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

        // TODO: move to investor service
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
            $scope.statelist = ['Alabama', 'Alaska', 'Arizona', 'Arkansas', 'California', 'Colorado', 'Connecticut',
                                'Delaware', 'Florida', 'Georgia', 'Hawaii', 'Idaho', 'Illinois', 'Indiana', 'Iowa',
                                'Kansas', 'Kentucky', 'Louisiana', 'Maine', 'Maryland', 'Massachusetts', 'Michigan',
                                'Minnesota', 'Mississippi', 'Missouri', 'Montana', 'Nebraska', 'Nevada',
                                'New Hampshire', 'New Jersey', 'New Mexico', 'New York', 'North Carolina',
                                'North Dakota', 'Ohio', 'Oklahoma', 'Oregon', 'Pennsylvania', 'Rhode Island',
                                'South Carolina', 'South Dakota', 'Tennessee', 'Texas', 'Utah', 'Vermont', 'Virginia',
                                'Washington', 'West Virginia', 'Wisconsin', 'Wyoming'];
            $scope.currencies = ['United States Dollars (USD)', 'Pound Sterling (GBP)', 'Euro (EUR)'];
            $scope.dateformats = ['MM/DD/YYYY', 'DD/MM/YYYY'];
            $scope.flipped1 = false;
            $scope.flipped2 = false;
            $scope.donutlabel = "100%";
            $scope.default = "100%";
			$scope.ct = captable.getCapTable();
            $scope.totalIssued = 0;

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
                    $scope.totalIssued = captable.totalOwnershipUnits();
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

            $scope.generateSecurityGraph = function() {
                $scope.graphdata = [];
                var maxPercent = 0;
                var percent;
                console.log($scope.ct);
                angular.forEach($scope.ct.securities, function(security) {
                    percent = (((captable.securityTotalUnits(security) + captable.numUnissued(security, $scope.ct.securities)) /  captable.totalOwnershipUnits()) * 100);
                    $scope.graphdata.push([{'name': security.name, 'issued': captable.securityTotalUnits(security), 'amount': captable.securityTotalAmount(security)}, [{'name':security.name, 'percent':percent}, {'name':'whatever', 'percent':maxPercent}, {'name':'zero', 'percent': 0}]]);
                    maxPercent += percent;
                });
            };

            $scope.getOwnershipInfo = function() {
                $scope.generateSecurityGraph();

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
            };
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

        $scope.createVestingGraphs = function() {
            var investorName
            angular.forEach($scope.cti.investors, function(investor) {
                if (investor.email == $rootScope.navState.userid) {
                    investorName = investor.name
                }
            });

            $scope.vestedgraphdata = [];
            var transArray = [];
            var transIndex=-1;
            var transAttrs;
            var totalavailable = 0;
            var totalvested = 0;
            angular.forEach($scope.cti.transactions, function (tran) {
                transArray.push(tran.transaction);
            });
            angular.forEach($scope.cti.ledger_entries, function (entry) {
                transIndex=transArray.indexOf(entry.transaction);
                if (transIndex!=-1) {
                    transAttrs = $scope.cti.transactions[transIndex].attrs;
                    if (transAttrs.terms&&transAttrs.vestcliff&&transAttrs.vestfreq&&transAttrs.vestingbegins){
                        if (entry.investor==investorName){
                            totalavailable += parseFloat(entry.credit);
                            if ((new Date()-entry.effective_date) > 0) {
                                totalvested += parseFloat(entry.credit);
                            }
                            $scope.vestedgraphdata.push({'date':entry.effective_date, 'units':parseFloat(entry.credit).toFixed(0), 'month':(entry.effective_date.toString('MMM yy')), 'vested':(new Date()-entry.effective_date)})
                        }
                    }
                }
            });
            $scope.vesteddonut = [{'name':"vested", 'units': (totalvested), 'roundedunits': calculate.abrAmount(totalvested)}, {'name':"rest", 'units': (totalavailable-totalvested)}];
        };

        $scope.getOwnershipInfo = function() {
            $scope.ownersummary = {};
            $scope.rows = [];
            $scope.uniquerows = [];
            //$scope.createInvestorTile();
            // this is where robbie is working DANGER ZONE
            $scope.createVestingGraphs();
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
