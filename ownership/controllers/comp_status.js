var statusController = function ($scope, $rootScope, SWBrijj, $location, navState) {

    if (navState.role == 'investor') {
        $location.path('/investor-captable');
        return;
    }

    SWBrijj.tblm('ownership.lastupdated').then(function (time) {
        $scope.lastupdated = time[0].last_edited;
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
                        var time;
                      time = activity.event_time;
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

    $scope.activityOrder = function(card) {
        return -card.event_time;
    };

    $scope.opendetails = function(selected) {
        $scope.userStatus.forEach(function(name) {
            if (selected == name.email) {
                name.shown = name.shown != true;
            } else {
                name.shown = false;
            }
        });
    };

    $scope.selectVisibility = function (value, person) {
        $scope.selectedI.level = value
    };

    $scope.changeVisibility = function (person) {
        SWBrijj.proc('ownership.update_investor_captable', person.email, person.level).then(function (data) {
          void(data);
            angular.forEach($scope.userStatus, function(peep) {
                if (peep.email == person.email) {
                    peep.level = person.level
                }
            });
            $scope.$emit("notification:success", "Changed ownership table access level");
        }).except(function(x) {
              void(x);
                $scope.$emit("notification:fail", "Something went wrong, please try again later.");
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
        if ($scope.newEmail != $scope.oldEmail) {
            SWBrijj.proc('ownership.update_email_share', $scope.newEmail, $scope.oldEmail).then(function (data) {
              void(data);
                // console.log(data);
                $scope.$emit("notification:success", "Successfully Updated Email");
            }).except(function(x) {
                  void(x);
                    $scope.$emit("notification:fail", "Something went wrong, please try again later.");
                });
        }
        else if ($scope.newEmail == $scope.oldEmail) {
            SWBrijj.proc('ownership.reshare', $scope.oldEmail).then(function (data) {
              void(data);
                $scope.$emit("notification:success", "Successfully resent");
            }).except(function(x) {
                  void(x);
                    $scope.$emit("notification:fail", "Something went wrong, please try again later.");
                });
        }
    };

    $scope.opts = {
        backdropFade: true,
        dialogFade: true
    };

};