'use strict';

app.controller('MsgCtrl', ['$scope', '$rootScope', 'SWBrijj', 'navState', '$route', '$location',
    function($scope, $rootScope, SWBrijj, navState, $route, $location) {

        if (navState.role == 'investor') {
            document.location.href = "/home";
            return;
        }
        $scope.sidebarPage = null;
        // $scope.hideRail = false;

        $scope.filterParam = {};
        $scope.oldRoles = [];
        


        angular.element('body').click(function(x) {
            if (angular.element(x.target).is('i') || angular.element(x.target).is('popover')) {
                x.preventDefault();
                return;
            }
            hidePopover();
        });

        $scope.isParam = function(person){
            if($scope.filterParam.param == person.role){
                return person.role
            }
            else if($scope.filterParam.param == undefined){
                return person
            }
            else if(person.groupsArray != undefined && person.groupsArray.indexOf($scope.filterParam.param) > -1){
                return person.groups;
            }
        }


        $scope.createPeople = function(){
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
                            else if(person.email != admin.email && person.role != 'issuer'){
                                person.role = "investor";
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
                        $scope.setLastLogins();
                        $scope.setGroups();
                        // $scope.setGroups();
                        // $scope.resetFilter();
                    });
                    $scope.sort = 'name';
                });
                $scope.allPeople = $scope.people;
            });

        };
        $scope.createPeople();



        $scope.resetFilter = function(){
            $scope.filterParam.param = undefined;
        }
        $scope.allGroups = function(){
            SWBrijj.tblm('account.my_user_groups', ['json_array_elements']).then(function(data){
                $scope.myGroups = data;
                console.log($scope.myGroups);
            });
        };

        $scope.setGroups = function(){
            SWBrijj.tblm('account.my_user_role', ["email", "groups"]).then(function(data){
                var groups = data;
                angular.forEach($scope.people, function(person){
                    angular.forEach(groups, function(group){
                        if(group.email == person.email && group.groups !== null){
                            // person.groups = JSON.parse(group.groups).sort().join(", ");
                            console.log(JSON.parse(group.groups));
                            var gr = JSON.parse(group.groups);
                            var grSorted = gr.sort(function(a, b){
                                if (a.toLowerCase() > b.toLowerCase()) return 1; 
                                 else if (a.toLowerCase() < b.toLowerCase()) return -1; 
                                else return 0
                            });
                            console.log(grSorted);
                            person.groups = grSorted.join(", ");
                            person.groupsArray = JSON.parse(group.groups);
                        };
                    });
                    
                });
            });
        }



        $scope.setLastLogins = function() {
            console.log($scope.people)
            SWBrijj.tblm("global.user_tracker").then(function(logins) {
                angular.forEach($scope.people, function(person) {
                    angular.forEach(logins, function(login) {
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

        $scope.sortBy = function(col) {
            if ($scope.sort == col) {
                $scope.sort = ('-' + col);
            } else {
                $scope.sort = col;
            }
        };

        
        $scope.gotoPerson = function(person) {
            if (!person.lastlogin) return;
            var link;
            link = (person.name ? ((navState.userid != person.email) ? '/app/company/profile/view?id=' + encodeURIComponent(person.email) : '/app/account/profile/') : '');
            if (link) {
                $location.url(link);
            }
        };

        $scope.loadPage = function(){
            // $scope.createPeople();
            $scope.setLastLogins();
            $scope.resetFilter();
        }
        $scope.loadPage();

        // Admin Modal Functions

        $scope.adminModalOpen = function() {
            $scope.newEmail = "";
            $scope.newName = "";
            $scope.newRole = false;
            $scope.adminModal = true;
        };


        $scope.sortRolesForAdd = function(people){
            angular.forEach(people, function(ind){
                if(ind.email === $scope.navState.userid){
                   console.log("you must stay where you are")
                }
                else if(ind.email !== $scope.navState.userid && $scope.oldRoles.indexOf(ind.role)=== -1){
                    $scope.oldRoles.push(ind.role)
                };
                
            });
        };

        $scope.addOrRemoveAdmin = function(people){
            $scope.sortRolesForAdd(people);
            if($scope.oldRoles.length === 1){
                $scope.addOrRemove = $scope.oldRoles[0];
            }
            else{
                $scope.addOrRemove = ""
            }
            $scope.oldRoles = [];
        };

       

        $scope.adminModalClose = function() {
            $scope.closeMsg = 'I was closed at: ' + new Date();
            $scope.adminModal = false;
        };


        $scope.removeAdminModalOpen = function(ppl) {
            $scope.selectedToRevokes = [];
            angular.forEach(ppl, function(ind){
                if(ind.email !== $scope.navState.userid && $scope.selectedToRevokes.indexOf(ind.email)== -1){ 
                    $scope.selectedToRevokes.push(ind.email);
                }
                else if($scope.navState.userid==ind.email){
                    console.log("error!")
                };
                
            });
            $scope.removeAdminModal = true;
        
        };


        $scope.removeAdminModalClose = function() {
            $scope.removeAdminModal = false;
            $scope.clearArray($scope.groupPeople);
            $scope.clearArray($scope.oldRoles);
        };

        $scope.removeAdminModalCancel = function(){
            $scope.removeAdminModal = false;
        }

        $scope.addAdminModalOpen = function(person) {
            $scope.selectedToAdds = [];
            angular.forEach(person, function(ind){
                if(ind.email !== $scope.navState.userid){
                    $scope.selectedToAdds.push(ind.email);
                };
            });
            $scope.addAdminModal = true;

        };


        $scope.addAdminModalClose = function() {
            $scope.addAdminModal = false;
            $scope.clearArray($scope.groupPeople);
            $scope.clearArray($scope.oldRoles);

        };

        $scope.addAdminModalCancel = function(){
            $scope.addAdminModal = false;
           
        }
        
        //want the email directive to bind to this property in the controller
        $scope.personIs = function(person){
            if($scope.sidebarPage=='email'){
                return $scope.messageData.recipients.indexOf(person.email) != -1;
            }
            else {
                return $scope.groupPeople.indexOf(person) != -1;
            };
            
        };



        $scope.clearRecipient = function(){
            while($scope.messageData.recipients.length > 0) {
                $scope.messageData.recipients.pop();
            };
        };
      
        // add person to dropdown on people page
        $scope.selectPerson = function(person){
            if($scope.sidebarPage == 'email'){
                if ($scope.messageData.recipients.indexOf(person.email)=== -1){
                 $scope.messageData.recipients.push(person.email);
                 
                 }

                else {
                    var toDelete = $scope.messageData.recipients.indexOf(person.email)
                    $scope.messageData.recipients.splice(toDelete, 1);
                 };   
                return $scope.messageData.recipients;
            }
            else {
                if($scope.groupPeople.indexOf(person)=== -1){
                    $scope.groupPeople.push(person);
                }
                else {
                    var toDelete = $scope.groupPeople.indexOf(person)
                    $scope.groupPeople.splice(toDelete, 1);
                };
            };
            
        };
        
        $scope.messageData = {};
        $scope.messageData.recipients = [];
        $scope.groupPeople = []


        $scope.narrowopts = {
            backdropFade: true,
            dialogFade: true,
            dialogClass: 'narrowModal modal'
        };


        $scope.revoke_admin = function() {
            angular.forEach($scope.selectedToRevokes, function(elem){
                SWBrijj.proc('account.revoke_admin', elem, navState.company).then(function(x) {
                    void(x);
                    $rootScope.billing.usage.admins_total -= 1;
                    $scope.$emit("notification:success", "Admin Removed");
                    // console.log()
                    // $route.reload();
                }).except(function(x) {
                    void(x);
                    $scope.$emit("notification:fail", "Something went wrong, please try again later.");
                });

            });
            $scope.createPeople();
            // $scope.oldRoles = [];
            
        };

        $scope.clearArray = function(array){
                while(array.length > 0){
                    array.pop();
                }
            }

        $scope.add_admin = function() {
            angular.forEach($scope.selectedToAdds, function(elem){
                 SWBrijj.proc('account.create_admin', elem.toLowerCase()).then(function(x) {
                    void(x);
                    $rootScope.billing.usage.admins_total += 1;
                    $scope.$emit("notification:success", "Admin Added");
                }).except(function(x) {
                    void(x);
                    $scope.$emit("notification:fail", "Something went wrong, please try again later.");
                });
            }); 
        $scope.createPeople();
        };

   

        // email sidebar
        $scope.toggleSide = function(button) {
            if(button == $scope.sidebarPage){
                $scope.sidebarPage = false;
            }
            else if(button){
                $scope.sidebarPage = button;
            }
            else if(button == undefined){
                $scope.sidebarPage = false;
            }
            else {
                $scope.sidebarPage = button;
                // opens sidebar with email
            };
        };
    }
]);