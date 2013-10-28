var statusController = function ($scope, $rootScope, SWBrijj, $location, navState) {

    if (navState.role == 'investor') {
        $location.path('/investor-captable');
        return;
    }

    SWBrijj.tblm('ownership.lastupdated').then(function (time) {
        $scope.lastupdated = time[0].last_edited;
    });

    SWBrijj.tblm('account.my_company_settings').then(function (x) {
        $scope.settings = x[0];
        $scope.settings.shortdate = $scope.settings.dateformat == 'MM/dd/yyyy' ? 'MM/dd/yy' : 'dd/MM/yy';
        $scope.settings.lowercasedate = $scope.settings.dateformat.toLowerCase();
    });

    SWBrijj.tblm("ownership.clean_company_access").then(function (data) {
        $scope.userStatus = data;
        for (var i = 0; i < $scope.userStatus.length; i++) {
            $scope.userStatus[i].shown = false;
            $scope.userStatus[i].name =  ($scope.userStatus[i].name) ? $scope.userStatus[i].name : $scope.userStatus[i].email;
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
                person.viewedbool = person.viewed ? "viewed" : "unviewed";
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

    SWBrijj.tblm("ownership.company_activity_feed").then(function (feed) {
        var originalfeed = feed;
        //Generate the groups for the activity feed
        $scope.eventGroups = [];
        var uniqueGroups = [];
        angular.forEach(originalfeed, function(event) {
            var timegroup = moment(event.event_time).fromNow();
            if (uniqueGroups.indexOf(timegroup) > -1) {
                console.log(uniqueGroups.indexOf(timegroup));
                $scope.eventGroups[uniqueGroups.indexOf(timegroup)].push(event);
            }
            else {
                $scope.eventGroups[$scope.eventGroups.length] = [];
                $scope.eventGroups[$scope.eventGroups.length-1].push(timegroup);
                $scope.eventGroups[$scope.eventGroups.length-1].push(event.event_time);
                $scope.eventGroups[$scope.eventGroups.length-1].push(event);
                uniqueGroups.push(timegroup);
            }
        });
    });

    $scope.activityOrder = function(card) {
        return -card.event_time;
    };

    $scope.peopleOrder = 'name'

    $scope.setOrder = function(field) {	$scope.peopleOrder = ($scope.peopleOrder == field) ? '-' + field :  field; };

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

    $scope.gotoPerson = function (person) {
        var link;
        link = (person.name ? ((navState.userid != person.email) ? '/company/profile/view?id='+person.email : '/investor/profile/') : '');
        if (link) {
            document.location.href=link;
        }
    };

    $scope.opts = {
        backdropFade: true,
        dialogFade: true
    };

};