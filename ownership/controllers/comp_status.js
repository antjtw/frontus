var statusController = function ($scope, $rootScope, SWBrijj) {

    SWBrijj.tblm('ownership.lastupdated').then(function (time) {
        $scope.lastupdated = time[0].last_edited
    });

    SWBrijj.tblm("ownership.clean_company_access").then(function (data) {
        $scope.userStatus = data;
        for (var i = 0; i < $scope.userStatus.length; i++) {
            $scope.userStatus[i].shown = false;
        }
        SWBrijj.procm("ownership.get_company_activity").then(function (activities) {
            console.log(activities);
            angular.forEach($scope.userStatus, function (person) {
                angular.forEach(activities, function (activity) {
                    if (activity.email == person.email) {
                        var act = activity.activity;
                        var time = activity.event_time;
                        person[act] = time;
                    }
                });
            });
        });
        SWBrijj.tblm("ownership.user_tracker").then(function (logins) {
            angular.forEach($scope.userStatus, function (person) {
                angular.forEach(logins, function (login) {
                    if (login.email == person.email) {
                        person.lastlogin = login.logintime;
                    }
                });
            });
        })
    });

    // SWBrijj.procm("ownership.get_company_activity_cluster").then(function(data) {
    SWBrijj.tblm("ownership.company_activity_feed", ["name", "email", "activity", "event_time"]).then(function(data) {
        $scope.activity = data;
        $scope.shared_dates = [];
        for (var i = 0; i < $scope.activity.length; i++) {
            $scope.activity[i].timeAgo = moment($scope.activity[i].event_time).fromNow();
            if ($scope.activity[i].name == null || $scope.activity[i].name.length < 2)
                $scope.activity[i].name = $scope.activity[i].email;
            $scope.activity[i].link = "/company/profile/view?id=" + $scope.activity[i].email;
            if ($scope.activity[i].activity == "received") {
                $scope.activity[i].activity = "Shared with ";
                $scope.activity[i].icon = 'icon-redo';
                $scope.shared_dates.push(new Date($scope.activity[i].whendone));
            }
            else if ($scope.activity[i].activity == "viewed") {
                $scope.activity[i].activity = "Viewed by ";
                $scope.activity[i].icon = 'icon-view';
            }
        }
    });

    $scope.activityOrder = function(card) {
        return -card.event_time;
    };

    $scope.opendetails = function(selected) {
        $scope.userStatus.forEach(function(name) {
            if (selected == name.email)
                if (name.shown == true) {
                    name.shown = false;
                }
                else {
                    name.shown = true;
                }
            else {
                name.shown = false;
            }
        });
    };

    $scope.selectVisibility = function (value, person) {
        $scope.selectedI.level = value
    }

    $scope.changeVisibility = function (person) {
        SWBrijj.proc('ownership.update_investor_captable', person.email, person.level).then(function (data) {
            angular.forEach($scope.userStatus, function(peep) {
                if (peep.email == person.email) {
                    peep.level = person.level
                }
            })
            $rootScope.notification.show("success", "Changed ownership table access level");
        }).except(function(x) {
                $rootScope.notification.show("fail", "Something went wrong, please try again later.");
            });
    };

    // Modal for changing access type
    $scope.modalUp = function (person) {
        $scope.capAccess = true;
        $scope.selectedI = angular.copy(person);
    };

    $scope.close = function () {
        $scope.closeMsg = 'I was closed at: ' + new Date();
        $scope.capAccess = false;
    };

    $scope.shareopts = {
        backdropFade: true,
        dialogFade: true,
        dialogClass: 'modal'
    };

    // Alter already shared row's email address
    $scope.alterEmailModalUp = function (email) {
        $scope.capEditEmail = true;
        $scope.oldEmail = email;
        $scope.newEmail = angular.copy(email);
    };

    $scope.alterEmailModalClose = function () {
        $scope.closeMsg = 'I was closed at: ' + new Date();
        $scope.capEditEmail = false;
    };

    $scope.alterEmail = function() {
        if ($scope.newEmail != "") {
            SWBrijj.proc('ownership.update_email_share', $scope.newEmail, $scope.oldEmail).then(function (data) {
                console.log(data);
            });
        }
    };

    $scope.opts = {
        backdropFade: true,
        dialogFade: true
    };

};