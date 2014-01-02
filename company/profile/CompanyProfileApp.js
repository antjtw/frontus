
var app = angular.module('CompanyProfileApp', ['ngResource', 'ui.bootstrap', 'ui.event', 'nav', 'brijj'], function($routeProvider, $locationProvider) {
//this is used to assign the correct template and controller for each URL path
    $locationProvider.html5Mode(true).hashPrefix('');
    // $locationProvider.html5Mode(false).hashPrefix('!');

    $routeProvider.
        when('/', {controller: 'ContactCtrl', templateUrl:'contact.html'}).
        when('/people', {controller: 'PeopleCtrl', templateUrl:'people.html'}).
        when('/view', {controller: 'ViewerCtrl', templateUrl:'viewer.html'}).
        otherwise({redirectTo:'/'});
});

function hidePopover() {
    angular.element('.popover').hide();
}

app.controller('ContactCtrl', ['$scope','$rootScope','SWBrijj', 'navState', function($scope, $rootScope, SWBrijj, navState) {
    if (navState.role == 'investor') {
        document.location.href="/home";
        return;
    }

    $scope.pictureModalOpen = function () {
        $scope.pictureModal = true;
    };

    $scope.pictureModalClose = function () {
        $scope.files = [];
        $scope.closeMsg = 'I was closed at: ' + new Date();
        $scope.pictureModal = false;
    };

    $scope.adminModalOpen = function () {
        $scope.adminModal = true;
    };

    $scope.adminModalClose = function () {
        $scope.newEmail = "";
        $scope.closeMsg = 'I was closed at: ' + new Date();
        $scope.adminModal = false;
    };

    $scope.fieldCheck = function() {
        return !$scope.newEmail;
    };

    $scope.revokeModalOpen = function (email) {
        $scope.selectedToRevoke = email;
        $scope.revokeModal = true;
    };

    $scope.revokeModalClose = function () {
        $scope.closeMsg = 'I was closed at: ' + new Date();
        $scope.revokeModal = false;
    };

    $scope.narrowopts = {
        backdropFade: true,
        dialogFade:true,
        dialogClass: 'narrowModal modal'
    };

    $scope.opts = {
        backdropFade: true,
        dialogFade:true
    };

    $scope.create_admin = function() {
        SWBrijj.proc('account.create_admin', $scope.newEmail.toLowerCase()).then(function(x) {
            void(x);
            $scope.$emit("notification:success", "Invitation sent");
            $scope.get_issuers();
        }).except(function(x) {
                void(x);
                $scope.$emit("notifcation:fail", "Something went wrong, please try again later.");
            });
    };

    $scope.revokeAdmin = function () {
        SWBrijj.proc('account.revoke_admin', $scope.selectedToRevoke).then(function (x) {
            void(x);
            $scope.$emit("notification:success", "Privileges updated");
            $scope.get_issuers();
        }).except(function (x) {
                void(x);
                $scope.$emit("notification:fail", "Something went wrong, please try again later.");
            });
    };

    $scope.contactSave = function () {
        /** @name $scope#address
         * @type {string}
         */
        if ($scope.detectChanges != $scope.name + $scope.address + $scope.company) {
            $scope.detectChanges = $scope.name + $scope.address + $scope.company;
            if ($scope.name.replace(/[^a-z0-9]/gi,'').length < 2 || $scope.company.replace(/[^a-z0-9]/gi,'').length < 3) {
                $scope.$emit("notification:fail", "Please enter a valid company and domain name");
                $scope.name = $scope.namekey;
                $scope.company = $scope.companykey;
                return;
            }
            SWBrijj.proc("account.company_update", $scope.name, $scope.address, $scope.company).then(function (x) {
                void(x);
                $scope.$emit("notification:success", "Your company profile has been updated successfully.");
                $scope.namekey = $scope.name;
                $scope.companykey = $scope.company;
            }).except(function(x) {
                    void(x);
                    $scope.namekey = $scope.name;
                    $scope.companykey = $scope.company;
                    $scope.$emit("notification:fail", "There was an error updating your company profile.");
                });
        }
    };

    $scope.get_issuers = function () {
        SWBrijj.tblm('account.company_issuers', ['email', 'name']).then(function (x) {
            $scope.admins = x;
            SWBrijj.tblm('account.profile', ['email']).then(function (me) {
                angular.forEach($scope.admins, function (admin) {
                    if (admin.email == me[0].email)
                        admin.hideLock = true;
                    if (admin.name == null)
                        admin.name = admin.email;
                });
            });
        }).except(initFail);
    };

    $scope.get_issuers();

    SWBrijj.tbl('account.my_company').then(function(x) {
        initPage($scope, x);
        $scope.namekey = $scope.name;
        $scope.companykey = $scope.company;
        $scope.detectChanges = $scope.name + $scope.address + $scope.company;
        $scope.photoURL = '/photo/user?id=company:' + $scope.company;
    }).except(initFail);

    /** @name x#item_id
     * @type {int}
     */
    $scope.activity = [];
    SWBrijj.tblm('global.get_company_activity').then(function(data) {
        $scope.activity = data;
        if ($scope.activity.length == 0) {
            $scope.noActivity = true;
        }
    });

    $scope.activityOrder = function(card) {
        return -card.time;
    };

    $scope.uploadFile = function() {
        $scope.photoURL = "/img/image-loader-140.gif";
        var fd = new FormData();
        for (var i=0;i<$scope.files.length;i++) fd.append("uploadedFile", $scope.files[i]);
        SWBrijj.uploadLogo(fd).then(function(x) {
            void(x);
            $scope.photoURL = '/photo/user?id=company:' + $scope.company;
            $scope.$emit("notification:success", "Company logo successfully updated");
        }).except( function(x) {
                void(x);
                $scope.$emit("notification:fail", "Company logo change was unsuccessful, please try again.");
                $scope.photoURL = '/photo/user?id=company:' + $scope.company;
            });
    };

    $scope.setFiles = function(element) {
        $scope.files = [];
        for (var i = 0; i < element.files.length; i++) {
            $scope.files.push(element.files[i]);
            $scope.$apply();
        }
    }
}]);

app.controller('PeopleCtrl', ['$scope','$rootScope','SWBrijj', 'navState', '$route', function($scope, $rootScope, SWBrijj, navState, $route) {

    if (navState.role == 'investor') {
        document.location.href="/home";
        return;
    }

    angular.element('body').click(function(x) {
        if (angular.element(x.target).is('i') || angular.element(x.target).is('popover')) {
            x.preventDefault();
            return;
        }
        hidePopover();
    });

    SWBrijj.tblm('global.user_list', ['email', 'name']).then(function (x) {
        $scope.people = x;
        SWBrijj.tblm('account.company_issuers', ['email', 'name']).then(function (admins) {
            angular.forEach(admins, function (admin) {
                angular.forEach($scope.people, function(person) {
                    if (person.email == admin.email) {
                        person.role = "issuer";
                    }
                });
            });
            SWBrijj.tblm('account.profile', ['email']).then(function (me) {
                angular.forEach($scope.people, function (person) {
                    if (person.email == me[0].email)
                        person.hideLock = true;
                    if (!person.name) {
                        person.name = person.email;
                    }

                });
                $scope.setLastLogins();
            });
            $scope.sort = 'name';
        });
    });

    $scope.setLastLogins = function() {
        SWBrijj.tblm("global.user_tracker").then(function (logins) {
            angular.forEach($scope.people, function (person) {
                angular.forEach(logins, function (login) {
                    if (login.email === person.email) {
                        person.lastlogin = login.logintime;
                    }
                });
            });
        });
    };

    $scope.formatLastLogin = function(lastlogin) {
        return lastlogin ? "Last Login " + moment(lastlogin).fromNow() : "Never Logged In";
    };

    $scope.sortBy = function (col) {
        if ($scope.sort == col) {
            $scope.sort = ('-' + col);
        } else {
            $scope.sort = col;
        }
    };

    $scope.gotoPerson = function (person) {
        if (!person.lastlogin) return;
        var link;
        link = (person.name ? ((navState.userid != person.email) ? '/company/profile/view?id='+person.email : '/investor/profile/') : '');
        if (link) {
            document.location.href=link;
        }
    };

    // Admin Modal Functions

    $scope.adminModalOpen = function () {
        $scope.newEmail = "";
        $scope.newName = "";
        $scope.newRole = false;
        $scope.adminModal = true;
    };

    $scope.adminModalClose = function () {
        $scope.closeMsg = 'I was closed at: ' + new Date();
        $scope.adminModal = false;
    };

    $scope.toggleRole = function() {
        $scope.newRole = !$scope.newRole;
    };

    $scope.removeAdminModalOpen = function(email) {
        $scope.selectedToRevoke = email;
        $scope.removeAdminModal = true;
    };

    $scope.removeAdminModalClose = function() {
        $scope.removeAdminModal = false;
    };

    $scope.addAdminModalOpen = function(email) {
        $scope.selectedToAdd = email;
        $scope.addAdminModal = true;
    };

    $scope.addAdminModalClose = function() {
        $scope.addAdminModal = false;
    };

    $scope.narrowopts = {
        backdropFade: true,
        dialogFade:true,
        dialogClass: 'narrowModal modal'
    };

    $scope.profileopts = {
        backdropFade: true,
        dialogFade:true,
        dialogClass: 'profile-modal wideModal modal'
    };

    var re = /^(([^<>()[\]\\.,;:\s@\"]+(\.[^<>()[\]\\.,;:\s@\"]+)*)|(\".+\"))@((\[[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\])|(([a-zA-Z\-0-9]+\.)+[a-zA-Z]{2,}))$/;
    $scope.fieldCheck = function() {
        return re.test($scope.newEmail);
    };

    $scope.create_person = function() {
        if ($scope.newRole) {
            SWBrijj.proc('account.create_admin', $scope.newEmail.toLowerCase()).then(function(x) {
                void(x);
                $scope.$emit("notification:success", "Admin Added");
                $route.reload();
            }).except(function(x) {
                    void(x);
                    $scope.$emit("notification:fail", "Something went wrong, please try again later.");
                });
        }
        else {
            SWBrijj.proc('account.create_investor', $scope.newEmail.toLowerCase(), $scope.newName).then(function(x) {
                void(x);
                $scope.$emit("notification:success", "Investor Added");
                $route.reload();
            }).except(function(x) {
                    void(x);
                    $scope.$emit("notification:fail", "Something went wrong, please try again later.");
                });
        }
        $scope.newEmail = "";
    };
    $scope.revoke_admin = function () {
        SWBrijj.proc('account.revoke_admin', $scope.selectedToRevoke, navState.company).then(function (x) {
            void(x);
            $scope.$emit("notification:success", "Admin Removed");
            $route.reload();
        }).except(function (x) {
                void(x);
                $scope.$emit("notification:fail", "Something went wrong, please try again later.");
        });
        $scope.selectedToRevoke = "";
    };

    $scope.add_admin = function () {
        SWBrijj.proc('account.create_admin', $scope.selectedToAdd.toLowerCase()).then(function(x) {
            void(x);
            $scope.$emit("notification:success", "Admin Added");
            $route.reload();
        }).except(function(x) {
                void(x);
                $scope.$emit("notification:fail", "Something went wrong, please try again later.");
            });
    };
}]);

app.controller('ViewerCtrl', ['$scope','$rootScope', '$location', '$routeParams', 'SWBrijj', 'navState',
    function($scope, $rootScope, $location, $routeParams, SWBrijj, navState) {

        if (navState.role == 'investor') {
            document.location.href="/home";
            return;
        }

        var userId = $routeParams.id;
        $scope.docOrder = 'statusRank';

        SWBrijj.tblm('account.user', ['email']).then(function(x) { // Redirect to My Profile if viewing yourself
            if(x[0].email == userId)
                document.location.href="/investor/profile";
        });

        SWBrijj.tblm('global.user_list', 'email', userId).then(function(x) {
            if (!x.name) {
                history.back();
            }
            $scope.user = x;
            SWBrijj.tblm('account.company_investors', 'email', userId).then(function(x) {
                $scope.user.address1 = x.street;
                $scope.user.address2 = (x.city && x.state && x.postalcode) ? x.city + ", " + x.state + " " + x.postalcode + " " + x.country : null;
            });
            $scope.getCounterpartyLibrary();
        }).except(function(err) {
                void(err);
                history.back();
        });

        $scope.getCounterpartyLibrary = function() {
            SWBrijj.tblmm('document.my_counterparty_library', 'investor', $scope.user.email).then(function(data) {
                $scope.docs = data;
                $scope.getDocumentActivity();
                $scope.getCompanyActivity();
                $scope.getCompanyAccess();
            }).except(function(err) {
                console.log(err);
            });
        };

        $scope.getCompanyActivity = function() {
            SWBrijj.tblmm('global.get_company_activity', 'email', $scope.user.email).then(function(feed) {
                var originalfeed = feed;
                $scope.eventGroups = [];
                var uniqueGroups = [];
                angular.forEach(originalfeed, function(ev) {
                    if (ev.activity != 'sent') {
                        var timegroup = moment(ev.time).from(ev.timenow);
                        if (uniqueGroups.indexOf(timegroup) > -1) {
                            $scope.eventGroups[uniqueGroups.indexOf(timegroup)].push(ev);
                        } else {
                            $scope.eventGroups[$scope.eventGroups.length] = [];
                            $scope.eventGroups[$scope.eventGroups.length-1].push(timegroup);
                            $scope.eventGroups[$scope.eventGroups.length-1].push(ev.time);
                            $scope.eventGroups[$scope.eventGroups.length-1].push(ev);
                            uniqueGroups.push(timegroup);
                        }
                    }
                });
            }).except(function(err) {
                console.log(err);
            });
        };
        $scope.getDocumentActivity = function() {
            SWBrijj.tblmm("document.company_activity", "person", $scope.user.email).then(function(data) {
                $scope.setDocsLastEvent(data);
            }).except(function(err) {
                console.log(err);
            });
        };
        $scope.setDocsLastEvent = function(activityfeed) {
            angular.forEach($scope.docs, function(doc) {
                var version_activity = activityfeed.filter(function(el) {return el.doc_id===doc.doc_id;});
                doc.last_event = version_activity.sort($scope.compareEvents)[0];
                if (doc.last_event.activity==='finalized') {doc.last_event.activity='approved';}
                $scope.setStatusRank(doc);
            });
        };

        $scope.getCompanyAccess = function() {
            SWBrijj.tblmm('ownership.company_access', ['email', 'level'], 'email', userId).then(function(access) {
                if (access[0]) {
                    $scope.level = access[0].level;
                } else {
                    $scope.level = 'No View';
                }
            }).except(function(err) {
                    void(err);
                    $scope.level = false;
            });
        };
        $scope.setStatusRank = function(version) {
            version.statusRank = $scope.eventRank(version.last_event);
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
        $scope.setOrder = function(field) {
            $scope.docOrder = ($scope.docOrder == field) ? '-' + field : field;
        };
        $scope.viewInvestorCopy = function(version) {
            document.location.href = ("/documents/company-view?doc=" + version.original + "&page=1" + "&investor=" + version.investor);
        };
        $scope.viewVersionStatus = function(version) {
            document.location.href = "/documents/company-status?doc=" + version.original;
        };

        $scope.activityOrder = function(card) {
            return -card.time;
        };

        SWBrijj.tblmm('global.get_company_activity', 'email', userId).then(function(data) {
            $scope.activity = data;
        });
        $scope.shortStatus = function(version) {
            if (!version) return "";
            if ($scope.wasJustRejected(version) && $scope.lastEventByInvestor(version)) {
                return "Rejected by recipient";
            } else if ($scope.wasJustRejected(version) &&
                       !$scope.lastEventByInvestor(version)) {
                return "Rejected by you";
            } else if ($scope.isPendingSignature(version)){
                return "Sent for Signature";
            } else if ($scope.isPendingCountersignature(version)){
                return "Review and Sign";
            } else if ($scope.isPendingFinalization(version)) {
                return "Signed and Sent for Approval";
            } else if ($scope.isCompleteSigned(version)){
                return "Completed";
            } else if ($scope.isPendingView(version)){
                return "Unviewed";
            } else if ($scope.isCompleteViewed(version)){
                return "Viewed";
            } else {
                return "Sent";
            }
        };
        $scope.lastEventByInvestor = function(doc) {
            return doc.last_event.person == navState.userid;
        };

        $scope.wasJustRejected = function(doc) {
            return doc.last_event && doc.last_event.activity == 'rejected';
        };

        $scope.isPendingFinalization = function(doc) {
            return doc.when_countersigned && !doc.when_finalized;
        };

        $scope.isPendingCountersignature = function(doc) {
            return doc.when_signed && !doc.when_countersigned;
        };

        $scope.isPendingSignature = function(doc) {
            return doc.signature_deadline && !doc.when_signed;
        };

        $scope.isPendingView = function(doc) {
            return !doc.signature_deadline && !doc.last_viewed;
        };
        $scope.isCompleteSigned = function(version) {
            return version.signature_deadline && version.when_finalized;
        };
        $scope.isCompleteViewed = function(version) {
            return !version.signature_deadline && version.last_viewed;
        };

        $scope.docIsComplete = function(doc) {
            return  $scope.isCompleteSigned(doc) || $scope.isCompleteViewed(doc);
        };
        $scope.momentFromNow = function(date) {
            return moment(date).from($rootScope.servertime);
        };

        $scope.changeVisibility = function (value) {
            $scope.level = value;
            SWBrijj.proc('ownership.update_investor_captable', userId, $scope.level).then(function (data) {
                void(data);
                $scope.$emit("notification:success", "Successfully changed cap table visibility");
            });
        };

    }]);

app.filter('fileLength', function () {
    return function (word) {
        if (word) {
            if (word.length > 25) {
                return word.substring(0, 24) + "..";
            }
            else {
                return word;
            }
        }
        return word;
    };
});

app.filter('fromNow', function() {
    return function(date) {
        return moment(date).fromNow();
    };
});
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
app.filter('investordescription', function() {
    return function(ac) {
        var activity = ac.activity;
        var person;
        if (ac.name) {
            person = ac.name;
        }
        else {
            person = ac.email;
        }
        var type = ac.type;
        if (type == "ownership") {
            if (activity == "received") return "Capitalization Table sent to " + person;
            else if (activity == "viewed") return "Capitalization Table viewed by "+person;
            else return "Something with Capitalization Table";
        }
        else {
            var document = ac.docname;
            if (activity == "sent") return "";
            else if (activity == "viewed") return document + " viewed by "+person;
            else if (activity == "reminder") return "Reminded "+person + " about " +document;
            else if (activity == "edited") return document + " edited by "+person;
            else if (activity == "signed") return document + " signed by "+person;
            else if (activity == "uploaded") return document + " uploaded by "+person;
            else if (activity == "transcoded") return document + " uploaded by "+person;
            else if (activity == "received") return document + " sent to "+person;
            else if (activity == "rejected") return "Signature on " +document + " rejected by "+person;
            else if (activity == "countersigned") return document + " countersigned by "+person;
            else if (activity == "finalized") return document + " approved by " + person;
            else return activity + " by "+person;
        }
    };
});

/* Filter to select the activity icon for document status */
app.filter('icon', function() {
    return function(activity) {
        if (activity == "sent") return "icon-email";
        else if (activity == "received") return "icon-email";
        else if (activity == "viewed") return "icon-view";
        else if (activity == "reminder") return "icon-redo";
        else if (activity == "edited") return "icon-pencil";
        else if (activity == "rejected") return "icon-circle-delete";
        else if (activity == "signed") return "icon-pen";
        else if (activity == "uploaded") return "icon-star";
        else if (activity == "countersigned") return "icon-countersign";
        else if (activity == "finalized") return "icon-lock";
        else return "hunh?";
    };
});


app.filter('description', function() {
    return function(ac) {
        var activity = ac.activity;
        var person;
        if (ac.name) {
            person = ac.name;
        }
        else {
            person = ac.email;
        }
        var type = ac.type;
        if (type == "ownership") {
            if (activity == "received") return "Ownership Table sent to " + person;
            else if (activity == "viewed") return "Ownership Table viewed by "+person;
        }
        else {
            var document = ac.docname;
            if (activity == "sent") return document + " sent to "+person;
            else if (activity == "viewed") return document + " viewed by "+person;
            else if (activity == "reminder") return "Reminded "+person + " about " +document;
            else if (activity == "edited") return "Edited by "+person;
            else if (activity == "signed") return document + " signed by "+person;
            else if (activity == "uploaded") return document + " uploaded by "+person;
            else if (activity == "received") return document + " sent to "+person;
            else if (activity == "rejected") return "Signature on " +document + " rejected by "+person;
            else if (activity == "countersigned") return document + " countersigned by "+person;
            else if (activity == "finalized") return document + " approved by " + person;
            else return activity + " by "+person;
        }
        return "";
    };
});

/**
 *
 * @param $scope
 * @param x
 * @param {number} [row]
 */
function initPage($scope, x, row) {
    if(typeof(row)==='undefined') row = 1;
    var y = x[0]; // the fieldnames
    var z = x[row]; // the values


    for(var i=0;i<y.length;i++) { if (z[i] !== null) { $scope[y[i]]=z[i]; } }
}

function initFail() {}
function updated(x) {}
