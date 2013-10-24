
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

app.controller("MainProfileController", ['$scope','$location', function($scope, $location) {

} ] );

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
                // console.log(x);
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
                // console.log(x);
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
                // console.log("saved: "+x);
                $scope.$emit("notification:success", "Your company profile has been updated successfully.");
                $scope.namekey = $scope.name;
                $scope.companykey = $scope.company;
            }).except(function(x) {
                    void(x);
                    // console.log(x);
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
            // console.log(x);
            $scope.$emit("notification:success", "Company logo successfully updated");
        }).except( function(x) {
                void(x);
                // console.log(x);
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
                    if (person.email = admin.email) {
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
            // console.log(x);
            $scope.sort = 'name';
        });
    });

    $scope.setLastLogins = function() {
        SWBrijj.tblm("global.user_tracker").then(function (logins) {
            console.log(logins);
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
        var link;
        link = (person.name ? ((navState.userid != person.email) ? '/company/profile/view?id='+person.email : '/investor/profile/') : '');
        if (link) {
            document.location.href=link;
        }
    };

    // Admin Modal Functions

    $scope.adminModalOpen = function () {
        $scope.adminModal = true;
    };

    $scope.adminModalClose = function () {
        $scope.newEmail = "";
        $scope.closeMsg = 'I was closed at: ' + new Date();
        $scope.adminModal = false;
    };

    $scope.narrowopts = {
        backdropFade: true,
        dialogFade:true,
        dialogClass: 'narrowModal modal'
    };

    $scope.fieldCheck = function() {
        return !$scope.newEmail;
    };

    $scope.create_admin = function() {
        SWBrijj.proc('account.create_admin', $scope.newEmail.toLowerCase()).then(function(x) {
            void(x);
            $scope.$emit("notification:success", "Admin Created");
            $route.reload();
        }).except(function(x) {
                void(x);
                // console.log(x);
                $scope.$emit("notifcation:fail", "Something went wrong, please try again later.");
        });
    };
}]);

app.controller('ViewerCtrl', ['$scope','$rootScope','$routeParams', 'SWBrijj', 'navState',
    function($scope, $rootScope, $routeParams, SWBrijj, navState) {

        if (navState.role == 'investor') {
            document.location.href="/home";
            return;
        }

        var userId = $routeParams.id;

        SWBrijj.tblm('account.user', ['email']).then(function(x) { // Redirect to My Profile is viewing yourself
            if(x[0].email == userId)
                document.location.href="/investor/profile";
        });

        SWBrijj.tblm('global.user_list', 'email', userId).then(function(x) {

            if (!x.name) {
                history.back();
            }
            $scope.user = x;
        }).except(function(err) {
                void(err);
                history.back();
            });

        SWBrijj.tblmm('document.my_counterparty_library', 'investor', userId).then(function(x) {
            $scope.docs = x;
            SWBrijj.tblmm('ownership.company_access', ['email', 'level'], 'email', userId).then(function(access) {
                if (access[0]) {
                    $scope.level = access[0].level;
                }
            }).except(function(err) {
                    void(err);
                    $scope.level = false;
                });
        });

        $scope.activityOrder = function(card) {
            return -card.time;
        };

        SWBrijj.tblmm('global.get_company_activity', 'email', userId).then(function(stuff) {
            $scope.activity = stuff;
            // console.log($scope.activity);
        });

        $scope.changeVisibility = function (value) {
            // console.log(value);
            $scope.level = value;
            SWBrijj.proc('ownership.update_investor_captable', userId, $scope.level).then(function (data) {
                void(data);
                $scope.$emit("notification:success", "Successfully changed cap table visibility");
            });
        };

        $scope.opendetails = function(selected) {
            $scope.docs.forEach(function(name) {
                if (name === selected) name.shown = !name.shown;
                else name.shown = false;
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
    }
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
        else return "hunh?";
    }
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
            else return activity + " by "+person;
        }
        return "";
    }
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
