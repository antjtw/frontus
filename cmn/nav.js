
function getCSSRule(ruleName, deleteFlag) {               // Return requested style obejct
    ruleName=ruleName.toLowerCase();                       // Convert test string to lower case.
    if (document.styleSheets) {                            // If browser can play with stylesheets
        for (var i=0; i<document.styleSheets.length; i++) { // For each stylesheet
            var styleSheet=document.styleSheets[i];          // Get the current Stylesheet
            var ii=0;                                        // Initialize subCounter.
            var cssRule=false;                               // Initialize cssRule.
            do {                                             // For each rule in stylesheet
                if (styleSheet.cssRules) {                    // Browser uses cssRules?
                    cssRule = styleSheet.cssRules[ii];         // Yes --Mozilla Style
                } else {                                      // Browser usses rules?
                    cssRule = styleSheet.rules[ii];            // Yes IE style.
                }                                             // End IE check.
                if (cssRule)  {                               // If we found a rule...
                    if (cssRule.selectorText && cssRule.selectorText.toLowerCase()==ruleName) { //  match ruleName?
                        if (deleteFlag=='delete') {             // Yes.  Are we deleteing?
                            if (styleSheet.cssRules) {           // Yes, deleting...
                                styleSheet.deleteRule(ii);        // Delete rule, Moz Style
                            } else {                             // Still deleting.
                                styleSheet.removeRule(ii);        // Delete rule IE style.
                            }                                    // End IE check.
                            return true;                         // return true, class deleted.
                        } else {                                // found and not deleting.
                            return cssRule;                      // return the style object.
                        }                                       // End delete Check
                    }                                          // End found rule name
                }                                             // end found cssRule
                ii++;                                         // Increment sub-counter
            } while (cssRule);                                // end While loop
        }                                                   // end For loop
    }                                                      // end styleSheet ability check
    return false;                                          // we found NOTHING!
}                                                         // end getCSSRule



var navm = angular.module('nav', ['ui.bootstrap', 'angularPayments', 'commonServices'], function () {
});

navm.factory('navState', [function () {
    if (!document.sessionState) document.sessionState = {};
    return {
        company: document.sessionState.company,
        name: document.sessionState.name,
        role: document.sessionState.role,
        userid: document.sessionState.userid,
        userhash: document.sessionState.intercom,
        tester: document.sessionState.userid && document.sessionState.userid.match(/r0ml/|/r0bert/),
        path: undefined
    };
}]);

navm.directive('notifications', function() {
    return {
        restrict: 'A',
        require: '^notes',
        scope: {
            notes: '='
        },
        templateUrl: '/cmn/navnotifications.html',
        controller: ['$scope', function($scope) {

            $scope.oldestDate = function(note) {
                if (note.when_countersigned) {
                    return note.when_countersigned;
                }
                else if (note.when_signed) {
                    return note.when_signed;
                }
                else {
                    return note.when_shared;
                }
            };

            $scope.nameIfLong = function(name){
                if (name.length > 20){
                    return name;
                }

                else{
                    return null;
                }
            };



        }]
    };
});

/** @unused NavCtrl */
/* Not really, but referenced in angular attribute in .inc file */
navm.directive('navbar', function () {
    return {
        restrict: 'E',
        templateUrl: '/cmn/nav.html',
        controller: 'NavCtrl'
    };
});


navm.controller('NavCtrl',
                ['$scope', '$route', '$rootScope', 'SWBrijj', '$q', '$window',
                 'navState', '$location', '$filter', 'payments', 'logService',
    function($scope, $route, $rootScope, SWBrijj, $q, $window,
             navState, $location, $filter, payments, logService)
    {
        $scope.companies = [];

        if (location.host=='share.wave' || navState.tester) {
            var rr = getCSSRule('.for-r0ml');
            if (rr) {
                rr.style.display="inline";
            }
        }

        $('.new-nav').affix({
            offset: {top: 40}
        });

        $scope.$on('$routeChangeSuccess', function(current, previous) {
            if (navState.path != document.location.pathname) {
                navState.path = document.location.pathname;
                if ($scope.plan) {
                    Intercom('update', {company:  {'plan' : $filter('billingPlans')($scope.plan.plan)}});
                }

                var dataLayer = $window.dataLayer ? $window.dataLayer : [];
                dataLayer.push({
                    'event': 'pageview',
                    'virtualUrl': $location.path()
                });
            }
        });


        navigator.sayswho= (function(){
            var ua= navigator.userAgent, tem,
                M= ua.match(/(opera|chrome|safari|firefox|msie|trident(?=\/))\/?\s*([\d\.]+)/i) || [];
            if(/trident/i.test(M[1])){
                tem=  /\brv[ :]+(\d+(\.\d+)?)/g.exec(ua) || [];
                return 'IE '+(tem[1] || '');
            }
            M= M[2]? [M[1], M[2]]:[navigator.appName, navigator.appVersion, '-?'];
            if((tem= ua.match(/version\/([\.\d]+)/i))!= null) M[2]= tem[1];
            return M;
        })();
        var singleBarPages = ["/", "/team/", "/careers/", "/press/", "/privacy/", "/terms/", "/features/", "/pricing/", "/survey/"];
        navState.path = document.location.pathname;
        $scope.navState = navState;
        // Within a given angular app, if the path (controller) changes, record the old page.
        $scope.$on('$locationChangeStart', function(evt, newURL, oldURL) {
            // TODO: store and retrieve pageHistory
            if (!$rootScope.pageHistory) {
                $rootScope.pageHistory = [];
            }
            if (document.location.pathname.indexOf("/register/") === -1 &&
                document.location.pathname.indexOf("/login/") === -1) {
                $rootScope.pageHistory.push({pathname: document.location.pathname, search: document.location.search, hash: document.location.hash});
            }
        });
        $rootScope.leave = function(blacklist, default_url) {
            if (blacklist == undefined) {
                blacklist = ["-view"];
            }
            if (default_url == undefined) {
                if (navState.role == "investor") {
                    default_url = '/app/documents/investor-list';
                } else {
                    default_url = '/app/documents/company-list';
                }
            }
            function leave(blacklist, default_url, history) {
                if (!history || history.length === 0) {
                    return $location.url(default_url);
                }
                url = history.pop();
                if (blacklist.some(function(bad_pattern) {
                    return url.pathname.indexOf(bad_pattern) !== -1;
                })) {
                    return leave(blacklist, default_url, history);
                } else {
                    return $location.url(url.pathname + url.search + url.hash);
                }
            }
            return leave(blacklist, default_url, $rootScope.pageHistory);
        };
        $scope.noNav = singleBarPages.indexOf(navState.path) > -1;
        $scope.isCollapsed = true;
        $scope.isRegisterCollapsed = true;
        $scope.registertoggle = false;
        $rootScope.persistentNotification = false;
        if (navState.role=='issuer') {
            SWBrijj.tblm('account.my_company_payment_history').then(function(data) {
                var p = data.length > 0 && data[0];
                $scope.plan = p;
                if (p && p.plan != '000' && ((p.customer_id !== null && p.cc_token !== null) || (p.when_requested != null && p.when_attempted == null))) {
                    $rootScope.persistentNotification = false;
                    Intercom('update', {company:  {'plan' : $filter('billingPlans')(p.plan)}});
                } else {
                    $rootScope.persistentNotification = true;
                    if (p) {
                        if (p.status) {
                            $rootScope.paymentmessage = "We were unable to process your payment, please click here to update your card.";
                            Intercom('update', {company:  {'plan' : $filter('billingPlans')(p.plan) + " failed"}});
                        }
                        else {
                            $rootScope.paymentmessage = "Your account has been cancelled, please click here if you'd like to re-subscribe.";
                            Intercom('update', {company:  {'plan' : $filter('billingPlans')(p.plan)}});
                        }
                    }
                    else {
                        $rootScope.paymentmessage = "Our free period has come to a close, click here to select your plan.";
                    }
                }
            });
        }


        $scope.switch = function (nc) {
            /** @name SWBrijj#switch_company
             * @function
             * @param {string} company
             * @param {string} role
             */
            SWBrijj.switch_company(nc.company, nc.role).then(function (data) {
                sessionStorage.clear();
                document.location.href = nc.role=='issuer' ? '/app/home/company' : '/app/home/investor';
            });
        };

        $scope.gotoURL = function(url) {
            sessionStorage.clear();
            document.location.href = url;
        };
        $scope.gotoPage = function(page) {
            sessionStorage.clear();
            if (document.URL.indexOf("app") == -1) {
                document.location.href = page;
            } else {
                $location.url(page);
            }
        };
        $scope.persistentNavGoToPage = function(page) {
            _kmq.push(['record', 'Persistent Notification', {'Message': $rootScope.paymentmessage}]);
            $scope.gotoPage(page);
        };

        $scope.toggleSubmenu = function(tab) {
            if ($scope.navhover && $scope.submenu == tab) {
                $scope.navhover = !$scope.navhover;
            } else if ($scope.navhover && $scope.submenu != tab) {
                $scope.submenu = tab;
            } else {
                $scope.navhover = !$scope.navhover;
                $scope.submenu = tab;
            }
        };


        $scope.switchCandP = function (company, url) {
            if ($rootScope.navState.company != company.company || $rootScope.navState.role != company.role) {
                SWBrijj.switch_company(company.company, company.role).then(function (data) {
                    /* Not quite ready for prime time
                    navState.company = company.company;
                    navState.role = company.role;
                    navState.reasons = $scope.initReasons(company.reasons);
                    angular.forEach($scope.companies, function(comp) {
                        if (comp.company == company.company && comp.role == company.role) {
                            comp.current = true;
                        }
                        else {
                            comp.current = false;
                        }
                    }); */
                    $scope.gotoURL(url);
                });
            }
            else {
                $scope.gotoPage(url);
            }
        };
        $rootScope.homecollapsed = false;
        $scope.toggleLogin = function(type) {
            $rootScope.homecollapsed = !$rootScope.homecollapsed;
            if (type == "login") {
                $scope.isCollapsed = !$scope.isCollapsed;
                if (!$scope.isRegisterCollapsed) {
                    $scope.isRegisterCollapsed = !$scope.isRegisterCollapsed;
                }
            }
            else if (type == "register") {
                $scope.isRegisterCollapsed = !$scope.isRegisterCollapsed;
                if (!$scope.isCollapsed) {
                    $scope.isCollapsed = !$scope.isCollapsed;
                }
            }
        };
        // Take the string from the database and parse it into a useable dictionary
        $scope.initReasons = function(reasons) {
            var dictionary = {};
            var temp = reasons.substring(1, reasons.length-1).split(",");
            angular.forEach(temp, function(reason) {
                dictionary[reason] = true;
            });
            return dictionary;
        };

        $scope.initCompany = function(cmps) {
            $scope.companies = cmps;
            $scope.hasAdmin = false;
            $scope.hasInvest = false;
            angular.forEach(cmps, function(company) {
                if (company.role == 'issuer') {
                    $scope.hasAdmin = true;
                }
                else if (company.role == 'investor') {
                    $scope.hasInvest = true;
                }
                company.reasondic = $scope.initReasons(company.reasons);
            });
            $scope.$broadcast('update:companies', $scope.companies);
            if ( ! (cmps && cmps.length > 0) ) return; // no companies
            var thiscmp = cmps[0]; // pick the first one in case none are marked selected
            for (var i = 0; i < cmps.length; i++) {
                if (cmps[i].current) {
                    thiscmp = cmps[i];
                    break;
                }
            }
            if (thiscmp.current || thiscmp.role=='sheriff') {
                navState.company = thiscmp.company;
                navState.role = thiscmp.role;
                navState.name = thiscmp.name;
                navState.reasons = $scope.initReasons(thiscmp.reasons);
                if (navState.reasons.own)
                {
                    SWBrijj.procm('ownership.return_status').then(function (x) {
                        navState.level = x[0].return_status;
                    });
                }
                // We should take this out I think but need to double check this
                //$route.reload();
            } else {
                SWBrijj.switch_company(thiscmp.company, thiscmp.role).then(function (data) {
                    angular.forEach(data, function (comp) {
                        if (thiscmp.company == comp.company && comp.current === true) {
                            thiscmp.current = true;
                            navState.company = thiscmp.company;
                            navState.role = thiscmp.role;
                            navState.name = thiscmp.name;
                            navState.reasons = $scope.initReasons(thiscmp.reasons);
                            document.location.href = navState.role=='issuer' ? '/app/home/company' : '/app/home/investor';
                            return;
                        }
                    });
                });
            }
        };

        SWBrijj.tblm('global.my_companies').then(function (x) {
            $scope.initCompany(x);
            $scope.notifications();
        }).except(function (ignore) {
                void(ignore);
                $scope.navState={}; // Not sure why this is here but I don't want to rip it out without further examination (it doesn't seem to hurt!)
                $scope.navState.path = document.location.pathname;
            });

        SWBrijj.tblm('account.my_company_settings').then(function (x) {
            $rootScope.settings = x[0];
            $rootScope.settings.shortdate = $scope.settings.dateformat == 'MM/dd/yyyy' ? 'MM/dd/yy' : 'dd/MM/yy';
            $rootScope.settings.longdate = $scope.settings.dateformat == 'MM/dd/yyyy' ? 'MMMM  dd' : 'dd MMMM';
            $rootScope.settings.fulldate = $scope.settings.dateformat == 'MM/dd/yyyy' ? 'MMMM  dd y' : 'dd MMMM y';
            $rootScope.settings.dateandtime = $scope.settings.dateformat == 'MM/dd/yyyy' ? 'MMMM  dd y, h:mm a' : 'dd MMMM y, h:mm a';
            $rootScope.settings.lowercasedate = $scope.settings.dateformat.toLowerCase();
            $rootScope.settings.domain = window.location.host;
        });

        SWBrijj.tblm('account.profile').then(function(x) {
            $rootScope.person = x[0];
            if ($rootScope.navState.role == "issuer") {
                Intercom('update', {'name' : $rootScope.person.name});
            }
            $rootScope.userURL = '/photo/user?id=' + x[0].email;
            $scope.$broadcast("profile_loaded");
        });

        // Notification code
        $scope.notification = {visible: false};

        $rootScope.$on('notification:success', function (event, message, callback) {
            $scope.notiFn('success',message,callback);
        });

        $rootScope.$on('notification:fail', function (event, message, callback) {
            $scope.notiFn('fail',message,callback);
        });

        $rootScope.$on('dblog:updated', function(event, message) {
            angular.forEach(logService.log, function(item) {
                var x = item.method.substring(0, 4);
                var y = (x == "tblm" || x == "proc") ? ": " + JSON.parse(item.args)[0] : "";
                var evt = item.method + y;
                analytics.track(evt,
                                {label: navState.company,
                                 value: item.time,
                                 category: 'dblatency'},
                                {'All': false,
                                 'Google Analytics': true}
                                );
            });
            logService.clearLog();
        });

        $scope.notiFn = function(color, message, callback) {
            $scope.notification.color = color;
            $scope.notification.message = message;
            $scope.notification.style = "notification " + color;
            $scope.notification.visible = true;
            setTimeout(function () {
                $scope.notification.visible = false;
                $scope.$apply();
                if (callback) {
                    callback();
                }
            }, 3000);
        };

        // Login Function
        $scope.doLogin = function () {
            SWBrijj.login($scope.username.toLowerCase(), $scope.password).then(function (x) {
                if (x) {
                    document.location.href = x;
                } else {
                    document.location.href = "/login/?error=" + $scope.username;
                }
            }).except(function (x) {
                    void(x);
                    document.location.href = "/login/?error=" + x.message;
                });
        };

        $scope.doLogout = function() {
            SWBrijj.logout().then(function(x) {
                void(x);
                document.location.href='/?logout';
            });
        };

        $scope.gotohome = function() {
            if ($rootScope.companies.length == 0) {
                location.href = '/';
            }
            else {
                $location.url(navState.role=='issuer' ? '/app/home/company' : '/app/home/investor');
            }
        };

        $scope.version_compare = function(v1, v2) {
            var v1parts = v1.split('.');
            var v2parts = v2.split('.');

            for (var i = 0; i < v1parts.length; ++i) {
                if (v2parts.length == i) {
                    return true;
                }

                if (v1parts[i] == v2parts[i]) {
                    continue;
                }
                else if (v1parts[i] > v2parts[i]) {
                    return true;
                }
                else {
                    return false;
                }
            }

            if (v1parts.length != v2parts.length) {
                return false;
            }

            return true;
        };

        var re = /^(([^<>()[\]\\.,;:\s@\"]+(\.[^<>()[\]\\.,;:\s@\"]+)*)|(\".+\"))@((\[[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\])|(([a-zA-Z\-0-9]+\.)+[a-zA-Z]{2,}))$/;
        $scope.fieldCheck = function(email) {
            return email != undefined ? re.test(email) : false;
        };

        $scope.verifyPayment = function(status, response) {
            if (response.error) {
                $scope.$emit("notification:fail",
                             "Invalid credit card. Please try again.");
            } else {
                //save cc token
            }
        };
        $scope.companySelfRegister = function () {
            if ($scope.fieldCheck($scope.registeremail)) {
                SWBrijj.companySelfRegister($scope.registeremail.toLowerCase(), 'issuer').then(function(requested) {
                    $scope.registeremail = "";
                    $scope.registertoggle = true;
                    dataLayer.push({'event': 'signup_success'}); // for analytics
                    void(requested);
                }).except(function (x) {
                        if (x['message'].indexOf("ERROR: duplicate key value") !== -1) {
                            $scope.$emit("notification:fail", "This email address is already registered, try logging in.");
                        }
                        else {
                            $scope.$emit("notification:fail", "Oops, something went wrong.");
                        }
                    });
            }
            else { $scope.$emit("notification:fail", "Please enter a valid email"); }
        };

        $scope.oldSafari = function() {
            return (!(navigator.sayswho[0] == "Safari" && $scope.version_compare("537.43.58", navigator.sayswho[1])));
        };

        $scope.docStatus = function(doc) {
            if (doc.signature_deadline == null) return -1;
            else {
                if (doc.signature_flow === 0) return 0;
                else if (doc.when_signed == null) return 1;
                else if (doc.signature_flow===2 && doc.when_countersigned == null) return 2;
                else if (doc.when_finalized == null) return 3;
                else if (doc.when_void_requested != null && doc.when_void_accepted == null) return 5;
                else return 4;
            }
        };

        $scope.notifications = function() {
            if (window.location.hostname == "www.sharewave.com" || window.location.hostname == "sharewave.com") {
                //_kmq.push(['identify', $rootScope.navState.company]);
            }
            if ($rootScope.navState.role == "issuer") {
                if (window.location.hostname == "www.sharewave.com" || window.location.hostname == "sharewave.com") {
                    Intercom('boot', {email:$rootScope.navState.userid,
                                      user_hash: $rootScope.navState.userhash,
                                      app_id: "e89819d5ace278b2b2a340887135fa7bb33c4aaa",
                                      company: {id: $rootScope.navState.company,
                                                name: $rootScope.navState.name}
                                      }
                    );
                 //   _kmq.push(['set', {'role':'issuer', 'companyName':$rootScope.navState.name, 'emailId':$rootScope.navState.userid}]);
                    //analytics.identify($rootScope.navState.userid, {"company" : $rootScope.navState.company,"companyName" : $rootScope.navState.name , "role" : "issuer"});
                }
                window.analytics.identify($rootScope.navState.company, {"companyName": $rootScope.navState.name,
                                                                        "emailId": $rootScope.navState.userid,
                                                                        "role":"issuer"});

                // Get Notifications for docs
                SWBrijj.tblm('document.action_library').then(function (x) {
                    $scope.notes = x;
                    angular.forEach($scope.notes, function(note) {
                        note.signature_status = $scope.docStatus(note);
                    });
                    $scope.notes = $scope.actionablenotes($scope.notes, navState.role);
                });
            }

            else {
                if (window.location.hostname == "www.sharewave.com" || window.location.hostname == "sharewave.com") {
                   // _kmq.push(['set', {'role':'shareholder', 'companyName':$rootScope.navState.name, 'emailId': $rootScope.navState.userid}]);
                    analytics.identify($rootScope.navState.userid, {"company" : $rootScope.navState.company,"companyName" : $rootScope.navState.name , "role" : "shareholder"});
                }
                window.analytics.identify($rootScope.navState.company, {"companyName": $rootScope.navState.name,
                                                                        "emailId": $rootScope.navState.userid,
                                                                        "role":"shareholder"});
                SWBrijj.tblm('document.investor_action_library').then(function (x) {
                    $scope.notes = x;
                    angular.forEach($scope.notes, function(note) {
                        note.signature_status = $scope.docStatus(note);
                    });
                    $scope.notes = $scope.actionablenotes($scope.notes, navState.role);
                });
            }
        };


        $scope.actionablenotes = function(notes, type) {
            var notifications = [];
            angular.forEach(notes, function(note) {
                if (type == "issuer") {
                    if (note.signature_status == 2 || note.signature_status == 3) {
                        notifications.push(note);
                    }
                }
                else if (type == "investor") {
                    if (note.signature_status == 1 || note.signature_status == 3 || note.signature_status == -1 || note.signature_status == 5) {
                        notifications.push(note);
                    }
                }
            });
            return notifications;
        };

        $scope.pricingregister = function(args) {
            document.location.href = "/register/company-onestep?" + args;
        };

        $rootScope.billing = {};
        $rootScope.update_card = false;
        if (navState.role=='issuer') {
            payments.available_plans().then(function(x) {
                $rootScope.billing.plans = [];
                angular.forEach(x, function(p) {
                    $rootScope.billing.plans.push(p.plan);
                });
                $rootScope.billing.recommendedPlan
                    = "00" + Math.max(parseInt($rootScope.billing.plans, 10));
                if ($rootScope.billing.currentPlan !== '000') {
                    $rootScope.billing.plans.push('000');
                }
                $rootScope.get_usage_details();
            }).except(function(err) {
                console.log(err);
            });
        }
        $rootScope.get_usage_details = function() {
            payments.usage_details().then(function(x) {
                if (x.length === 0) {
                    $rootScope.get_hypothetical_usage_details(
                        $rootScope.billing.recommendedPlan);
                } else {
                    $rootScope.billing.usage = x[0];
                }
                $rootScope.get_payment_data();
            }).except(function(err) {
                console.log(err);
            });
        };
        $rootScope.get_hypothetical_usage_details = function(p) {
            payments.usage_grid(p)
            .then(function(x) {
                $rootScope.billing.usage = x;
            }).except(function(err) {
                console.log(err);
                $rootScope.billing.usage = null;
            });
        };
        $rootScope.set_usage_details = function(p, doc_limit,
                                            admin_limit, msg_limit) {
            $rootScope.billing.usage.plan = p;
            $rootScope.billing.usage.documents_total_limit = doc_limit;
            $rootScope.billing.usage.admins_total_limit = admin_limit;
            $rootScope.billing.usage.direct_messages_monthly_limit = msg_limit;
        };
        $rootScope.get_payment_data = function() {
            payments.my_data().then(function(data) {
                if (data.length > 0) {
                    $rootScope.billing.currentPlan =
                        $rootScope.selectedPlan = data[0].plan || '000';
                    $rootScope.billing.customer_id = data[0].customer_id;
                    $rootScope.billing.payment_token = data[0].cc_token;
                    $rootScope.billing.last_status = data[0].status;
                    $rootScope.load_invoices();
                    payments.get_customer($rootScope.billing.customer_id)
                    .then(function(x) {
                        if (x && x.length>0 && x!="invalid request") {
                            var rsp = JSON.parse(x);
                            if (rsp.discount) {
                                $rootScope.billing.discount =
                                    payments.format_discount(rsp.discount);
                            }
                            $rootScope.billing.current_card = rsp.cards.data[0];
                            if (rsp.subscriptions.count>0) {
                                $rootScope.billing.current_period_end = rsp.subscriptions.data[0].current_period_end;
                            }
                            $rootScope.billingLoaded = true;
                            $rootScope.$broadcast('billingLoaded');
                        } else {
                            $rootScope.billingLoaded = true;
                        }
                    });
                } else {
                    if (parseInt($rootScope.billing.recommendedPlan, 10) > 2) {
                        $rootScope.selectedPlan = $rootScope.billing.recommendedPlan;
                    } else {
                        $rootScope.selectedPlan = '002';
                    }
                    $rootScope.billingLoaded = true;
                    $rootScope.$broadcast('billingLoaded');
                }
            }).except(function(err) {
                void(err);
            });
        };
        $rootScope.nextInvoice = function() {
            if ($rootScope.billing && $rootScope.billing.next_invoice_received) {
                return $rootScope.billing.invoices &&
                    $rootScope.billing.invoices[$rootScope.billing.invoices.length-1];
            } else {
                return false;
            }
        };
        $rootScope.load_invoices = function() {
            payments.get_invoices($rootScope.billing.customer_id, 3)
            .then(function(x) {
                if (x && x.length>0 && x!="invalid request") {
                    var resp = JSON.parse(x);
                    if (!$rootScope.billing) {$rootScope.billing = {};}
                    $rootScope.billing.invoices = resp.data.filter(function(el) {
                        return el.amount>0;
                    }) || [];
                    if ($rootScope.billing.currentPlan!=="000") {
                        $scope.load_upcoming_invoice();
                    }
                } else {
                }
            });
        };
        $rootScope.load_upcoming_invoice = function() {
            payments.get_upcoming_invoice($rootScope.billing.customer_id)
            .then(function(x) {
                if (x && x.length>0 && x != "invalid request") {
                    var resp = JSON.parse(x);
                    if (!$rootScope.billing.next_invoice_received) {
                        //$rootScope.billing.invoices.push(resp);
                        $rootScope.billing.next_invoice_received = true;
                    }
                } else {
                }
            });
        };
        $rootScope.companyIsZombie = function() {
            return ($rootScope.billing.currentPlan == "000"
                || $rootScope.billing.payment_token === null
                || !$rootScope.billing.payment_token) && navState.role == "issuer";

        };


        $rootScope.zombiemessage = "Please update your payment information to use this feature.";
        $rootScope.triggerUpgradeDocuments = function(numNew) {
            if ($rootScope.billing && $rootScope.billing.usage) {
                var num = $rootScope.billing.usage.documents_total+numNew;
                var lim = $rootScope.billing.usage.documents_total_limit;
                return num > lim;
            } else {
                return null;
            }
        };
        $rootScope.triggerUpgradeAdmins = function(numNew) {
            if ($rootScope.billing && $rootScope.billing.usage) {
                var num = $rootScope.billing.usage.admins_total+numNew;
                var lim = $rootScope.billing.usage.admins_total_limit;
                return num > lim;
            } else {
                return null;
            }
        };
        $rootScope.triggerUpgradeMessages = function(numNew) {
            if ($rootScope.billing && $rootScope.billing.usage) {
                var num = $rootScope.billing.usage.direct_messages_monthly
                          + numNew.length;
                var lim = $rootScope.billing.usage.direct_messages_monthly_limit;
                if (numNew && numNew.length>1 && numNew[0].length>1) {
                    return num > lim;
                }
                return false;
            } else {
                return null;
            }
        };
        SWBrijj.procm('oauth.token_num').then(function(data) {
            $rootScope.access_token = data[0]['token_num'];
        });

        //I don't love this but it works, should probably make a directive.

        $rootScope.$watch('billingLoaded', function() {
            if ($scope.billingLoaded == true) {
                $scope.windowheight = $window.innerHeight;
            }
        });

        window.onresize = function() {
            $scope.windowheight = $window.innerHeight;
            $scope.$apply();
        };

        $scope.$watch('windowheight', function() {
            if ($rootScope.companyIsZombie()) {
                $scope.viewportheight = {'height': String($window.innerHeight - 150) + "px", 'overflow-y': 'hidden'};
                $scope.viewportheightnobar = {'height': String($window.innerHeight - 90) + "px", 'overflow-y': 'auto'};
                $scope.viewportactivity = {'height': String($window.innerHeight - 191) + "px", 'overflow-y': 'auto'};
            } else {
                $scope.viewportheight = {'height': String($window.innerHeight - 100) + "px", 'overflow-y': 'hidden'};
                $scope.viewportheightnobar = {'height': String($window.innerHeight - 40) + "px", 'overflow-y': 'auto'};
                $scope.viewportactivity = {'height': String($window.innerHeight - 141) + "px", 'overflow-y': 'auto'};
            }
        });

    }
]);


function caplength(word, length) {
    if (word) {
        if (word.length > length) {
            return word.substring(0, (length-1)) + "...";
        }
        else {
            return word;
        }
    }
}

navm.filter('caplength', function () {
    return function (word, length) {
        if (word) {
            if (word.length > length) {
                return word.substring(0, (length-1)) + "...";
            }
            else {
                return word;
            }
        }
    };
});
navm.filter('notifications', function () {
    return function (note) {
        var document = note.docname;
        var investor = note.investor;
        var url = "";
        if (note.signature_status == -1) {
            url = '/app/documents/investor-view?doc=' + note.doc_id;
            return "<a href=" + url + ">View " + document + "</a>"
        }
        else if (note.signature_status == 1) {
            if (note.template_id) {
                url = '/app/documents/investor-view?template=' + note.template_id + '&subid=' + note.doc_id;
            }
            else {
                url = '/app/documents/investor-view?doc=' + note.doc_id;
            }
            return "<a href=" + url + ">Sign " + document + "</a>"
        }
        else if (note.signature_status == 2) {
            url = '/app/documents/company-view?doc=' + note.original + "&investor=" + note.doc_id;
            return "<a href=" + url + ">Finalize " + document + "</a>"
        }
        else if (note.signature_status == 3 && note.signature_flow == 2) {
            url = '/app/documents/investor-view?doc=' + note.doc_id;
            return "<a href=" + url + ">Finalize " + document + "</a>"
        }
        else if (note.signature_status == 3 && note.signature_flow == 1) {
            url = '/app/documents/company-view?doc=' + note.original +"&page=1&investor=" + note.doc_id;
            return "<a href=" + url + ">Finalize " + document + "</a>"
        }
        else if (note.signature_status == 5 && note.signature_flow == 2) {
            url = '/app/documents/investor-view?doc=' + note.doc_id;
            return "<a href=" + url + ">Void " + document + "</a>"
        }
    };
});

/* Filter to select the activity icon for document status */
navm.filter('noteicon', function() {
    return function(activity) {
        if (activity == 1) return "doc-sign-yel";
        else if (activity == 2) return "doc-countersign-yel";
        else if (activity == 3) return "doc-final-yel";
        else if (activity == 5) return "doc-void-pending-yel";
        else if (activity == -1) return "doc-view-yel";
        else return "hunh?";
    }
});
