
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



var navm = angular.module('nav', ['ui.bootstrap'], function () {
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

        }]
    }
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

navm.directive('verticalnav', function () {
    return {
        restrict: 'E',
        templateUrl: '/cmn/verticalnav.html',
        controller: 'NavCtrl'
    };
});

navm.controller('NavCtrl', ['$scope', '$route', '$rootScope', 'SWBrijj', '$q', 'navState',
    function ($scope, $route, $rootScope, SWBrijj, $q, navState) {

        $scope.companies = [];

        if (location.host=='share.wave' || navState.tester) {
            var rr = getCSSRule('.for-r0ml');
            if (rr) {
                rr.style.display="inline";
            }
        }

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

        var singleBarPages = ["/", "/team/", "/careers/", "/press/", "/privacy/", "/terms/", "/features/"];
        navState.path = document.location.pathname;
        $scope.navState = navState;
        // Within a given angular app, if the path (controller) changes, record the old page.
        $scope.$on('$locationChangeStart', function(evt, newURL, oldURL) {
            if (newURL.indexOf(document.location.pathname)==-1) {
                if (document.location.pathname.indexOf("/login/") != -1 || document.location.pathname.indexOf("view") != -1) {
                    $scope.lastPage = "/documents/";
                } else {
                    $scope.lastPage = document.location.href;
                }
            }
        });
        // On each NavCtrl load (new angular app), if the referrer is of the same domain, record the old page.
        if (document.referrer.indexOf(location.host)!=-1) {
            $scope.lastPage = document.referrer;
        }
        $scope.noNav = singleBarPages.indexOf(navState.path) > -1;
        $scope.isCollapsed = true;
        $scope.isRegisterCollapsed = true;
        $scope.registertoggle = false;

        $scope.switch = function (nc) {
            /** @name SWBrijj#switch_company
             * @function
             * @param {string} company
             * @param {string} role
             */
            SWBrijj.switch_company(nc.company, nc.role).then(function (data) {
                document.location.href = nc.role=='issuer' ? '/home/company' : '/home/investor';
            });
        };


        $scope.gotoURL = function(url) {
            document.location.href = url;
        }
        $scope.switchCandP = function (company, url) {
            if ($rootScope.navState.company != company.company || $rootScope.navState.role != company.role) {
                SWBrijj.switch_company(company.company, company.role).then(function (data) {
                    $scope.gotoURL(url);
                });
            }
            else {
                $scope.gotoURL(url);
            }

        }
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
                            document.location.href = navState.role=='issuer' ? '/home/company' : '/home/investor';
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
            $rootScope.settings.lowercasedate = $scope.settings.dateformat.toLowerCase();
        });

        SWBrijj.tblm('account.profile').then(function(x) {
            $rootScope.person = x[0];
            if ($rootScope.navState.role == "issuer") {
                Intercom('update', {'name' : $rootScope.person.name});
            }
            $rootScope.userURL = '/photo/user?id=' + x[0].email;
        });

        // Notification code
        $scope.notification = {visible: false};

        $rootScope.$on('notification:success', function (event, message, callback) {
            $scope.notiFn('success',message,callback);
        });

        $rootScope.$on('notification:fail', function (event, message, callback) {
            $scope.notiFn('fail',message,callback);
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

        $scope.gotohome = function() {
            if ($rootScope.companies.length == 0) {
                location.href = '/';
            }
            else {
                location.href = navState.role=='issuer' ? '/home/company' : '/home/investor';
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
                else return 4;
            }
        };

        $scope.notifications = function() {
            if (window.location.hostname == "www.sharewave.com" || window.location.hostname == "sharewave.com") {
                _kmq.push(['identify', $rootScope.navState.userid]);
            }
            if ($rootScope.navState.role == "issuer") {
                if (window.location.hostname == "www.sharewave.com" || window.location.hostname == "sharewave.com") {
                    Intercom('boot', {email:$rootScope.navState.userid, user_hash: $rootScope.navState.userhash,  app_id: "e89819d5ace278b2b2a340887135fa7bb33c4aaa", company:{id: $rootScope.navState.company, name: $rootScope.navState.name}});
                    _kmq.push(['set', {'role':'issuer'}]);
                }

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
                    _kmq.push(['set', {'role':'shareholder'}]);
                }
                SWBrijj.tblm('document.investor_action_library').then(function (x) {
                    $scope.notes = x;
                    angular.forEach($scope.notes, function(note) {
                        note.signature_status = $scope.docStatus(note);
                    });
                    $scope.notes = $scope.actionablenotes($scope.notes, navState.role);
                });
            }
        }

        $scope.actionablenotes = function(notes, type) {
            var notifications = [];
            angular.forEach(notes, function(note) {
                if (type == "issuer") {
                    if (note.signature_status == 2 || note.signature_status == 3) {
                        notifications.push(note);
                    }
                }
                else if (type == "investor") {
                    if (note.signature_status == 1 || note.signature_status == 3 || note.signature_status == -1) {
                        notifications.push(note);
                    }
                }
            });
            return notifications
        };

        var idleTime = 0;

        function timerIncrement() {
            if ($rootScope.navState.userid) {
                idleTime = idleTime + 1;
            }
            if (idleTime > 28) { // 1 minutes
                document.location.href = "/login/logout?timeout";
            }
        }

        $(document).ready(function () {
            //Increment the idle time counter every minute.
            var idleInterval = setInterval(timerIncrement, 60000); // 1 minute

            //Zero the idle timer on mouse movement.
            $(this).mousemove(function (e) {
                idleTime = 0;
            });
            $(this).keypress(function (e) {
                idleTime = 0;
            });
        });

    }]);


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
            url = '/documents/investor-view?doc=' + note.doc_id;
            return "View <a href=" + url + ">" + caplength(document, 20) + "</a>"
        }
        else if (note.signature_status == 1) {
            if (note.template_id) {
                url = '/documents/investor-view?template=' + note.template_id + '&subid=' + note.doc_id;
            }
            else {
                url = '/documents/investor-view?doc=' + note.doc_id;
            }
            return "Review and sign <a href=" + url + ">" + caplength(document, 20) + "</a>"
        }
        else if (note.signature_status == 2) {
            url = '/documents/company-view?doc=' + note.original + "&investor=" + note.doc_id;
            return "Review and sign <a href=" + url + ">" + caplength(document, 20) + "</a>"
        }
        else if (note.signature_status == 3 && note.signature_flow == 2) {
            url = '/documents/investor-view?doc=' + note.doc_id;
            return "Review and Finalize <a href=" + url + ">" + caplength(document, 20) + "</a>"
        }
        else if (note.signature_status == 3 && note.signature_flow == 1) {
            url = '/documents/company-view?doc=' + note.original +"&page=1&investor=" + note.doc_id;
            return "Review and Finalize <a href=" + url + ">" + caplength(document, 20) + "</a>"
        }
    };
});

/* Filter to select the activity icon for document status */
navm.filter('noteicon', function() {
    return function(activity) {
        if (activity == 1) return "doc-sign-yel";
        else if (activity == 2) return "doc-countersign-yel";
        else if (activity == 3) return "doc-final-yel";
        else if (activity == -1) return "doc-view-yel";
        else return "hunh?";
    }
});
