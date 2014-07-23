var m = angular.module('commonDirectives', ['ui.select2', 'brijj', 'ui.filters']);

m.directive('groupPeople', function(){
    return {
        scope: {people: "=people"},
        restrict: 'E',
        templateUrl:'/cmn/partials/groupPeople.html',
        controller: ['$scope', '$rootScope', 'SWBrijj', '$route', '$routeParams', '$location', 
        function($scope, $rootScope, SWBrijj, $route, $routeParams, $location){

            $scope.unChecked = [];
            // var newGroup = [];
            $scope.groupName = "";
            $scope.manyGroup = [];
            $scope.selectedGroup = [];
            var newGroups = [];
            $scope.groupData = [];
            console.log($scope.people);


            $scope.updateGroup = function(array, json){
                SWBrijj.procm('account.multi_update_groups', array, json).then(function(x){
                   console.log("success!");
                }).except(function(x){
                    console.log("failed to add group");
                });
            };


       
            
            function indGroup(group){
                this.group = group;
            };

            $scope.parseGroups = function(){
            console.log($scope.people);             
              SWBrijj.tblm('account.my_user_groups', ['email', 'json_array_elements']).then(function(data){
                    $scope.myUserGroups = data;
                    console.log($scope.myUserGroups);
                    angular.forEach($scope.myUserGroups, function(info){
                        var a = info.json_array_elements;
                        var b = JSON.parse(a);
                        $scope.groupData.push(new indGroup(b));
                    });
                });
            };
            $scope.parseGroups();

            $scope.personInfo = function(person){
                angular.forEach(person, function(info){
                    SWBrijj.tblmm('account.my_user_role', "email", info.email).then(function(data){
                        $scope.myInfo = data;
                    });
                });;
                return $scope.myInfo;
            };
            $scope.personInfo($scope.people);



            $scope.preSelectGroup = function(person){
                console.log("preselecting");
                if(person.length==0){
                    $scope.selectedGroup = [];
                }
                else{
                    angular.forEach(person, function(info){
                    if(info.groups != undefined){
                        SWBrijj.tblmm('account.my_user_role', 'email', info.email).then(function(data){
                            $scope.myGroups = data;
                            angular.forEach($scope.myGroups, function(role){
                                var preGroup = JSON.parse(role.groups);
                                for(i = 0; i < preGroup.length; i++){
                                    if($scope.selectedGroup.indexOf(preGroup[i])=== -1){
                                        console.log("to add");
                                        $scope.selectedGroup.push(preGroup[i]);
                                    }
                                };
                            });                           
                        });
                    };
                }); 
                }
                return $scope.selectedGroup;
            }
            $scope.preSelectGroup($scope.people);

            $scope.updateSelected = function(person){
                var allGroups = [];
                if(person.length==0){
                    // $scope.selectedGroup = [];
                }
                else{
                    angular.forEach(person, function(ind){
                        console.log(ind.groups);
                        var smGroup = ind.groups.split(", ");
                        for(i =0; i < smGroup.length; i++){
                            if(allGroups.indexOf(smGroup[i]) == -1){
                                allGroups.push(smGroup[i]);
                            }
                        }
                        // add groups
                        for(y = 0; y < allGroups.length; y++){
                            if($scope.selectedGroup.indexOf(allGroups[y]) == -1){
                                console.log(allGroups[y]);
                                console.log($scope.selectedGroup);
                                $scope.selectedGroup.push(allGroups[y]);
                            }
                            console.log($scope.selectedGroup);

                        }


                        // }

                        // for(l = 0; l < allGroups.length; l++){
                            // if($scope.unChecked.indexOf(allGroups[i]) != -1){
                            //     console.log("unchecked")
                            //     console.log(allGroups[i]);
                            //     var toDelete = allGroups.indexOf(allGroups[i]);
                            //     allGroups.splice(toDelete, 1)
                            //     console.log(allGroups);
                            // }
                            // if($scope.selectedGroup.indexOf(allGroups[i])== -1){
                            //     console.log(allGroups[i]);
                            //     console.log("to add");
                            //     $scope.selectedGroup.push(allGroups[i]);
                            // }
                        // }
                        // console.log($scope.unChecked);
                        // console.log(smGroup);
                        // console.log(allGroups);
                      
                    })
                }

                return $scope.selectedGroup;

            }
  

            $scope.$watch('people', function(){
                // $scope.preSelectGroup($scope.people);
                $scope.updateSelected($scope.people);
                console.log("people changed");
                console.log($scope.people);     
            }, true);
            


            $scope.groupIs = function(group){
                return $scope.selectedGroup.indexOf(group) != -1;
                console.log($scope.selectedGroup);
            };

           

            $scope.selectGroup = function(group){
                if($scope.selectedGroup.indexOf(group)=== -1){
                    $scope.selectedGroup.push(group);
                    // oldGroups.push(group);
                }
                else {
                    var toDelete = $scope.selectedGroup.indexOf(group);
                    $scope.selectedGroup.splice(toDelete, 1);
                    // console.log($scope.unChecked);
                    if($scope.unChecked.indexOf(group)==-1){
                        $scope.unChecked.push(group);
                    }
                };
                console.log($scope.unChecked);
                return $scope.selectedGroup;
            };

            $scope.readyToAdd = function(){
                if($scope.selectedGroup.length == 0 || $scope.groupName.length == 0){
                    return false;
                }
                else {
                    return false
                };
                
            };






            $scope.createGroups = function(person){
                console.log(person);
                console.log($scope.selectedGroup);
                angular.forEach(person, function(info){
                    SWBrijj.tblmm('account.my_user_role', "email", info.email).then(function(data){
                        var myInfo = data;
                        var myRole = [];
                        var bigArray = []
                        console.log(myInfo);
                        angular.forEach(myInfo, function(info){
                            console.log(info.groups);
                            myRole.push(info.email, info.role);
                            bigArray.push(myRole);
                            if(info.groups != null){
                                var personGroups = JSON.parse(info.groups);
                            }
                            else{
                                var personGroups = []
                            }
                            if($scope.unChecked.length > 0){
                                console.log($scope.unChecked);
                                console.log($scope.selectedGroup);
                                for(var i = 0; i < $scope.unChecked.length; i++){
                                    console.log($scope.unChecked[i]);
                                    if(personGroups.indexOf($scope.unChecked[i]) > -1){
                                        var toDelete = personGroups.indexOf($scope.unChecked[i]);
                                        personGroups.splice(toDelete, 1);                                        
                                        console.log("to delete");
                                    };
                                };
                            };
                            if($scope.selectedGroup.length > 0){
                                console.log(personGroups);
                                for(var i = 0; i < $scope.selectedGroup.length; i++){
                                    if(personGroups.indexOf($scope.selectedGroup[i]) == -1){
                                        personGroups.push($scope.selectedGroup[i]);
                                    };
                                };
                            };
                            if($scope.groupName.length > 0){
                                console.log($scope.groupName)
                                if(personGroups.indexOf($scope.groupName)== -1){
                                    personGroups.push($scope.groupName);
                                }
                            }
                            console.log(personGroups);
                            $scope.updateGroup(JSON.stringify(bigArray), JSON.stringify(personGroups));

                        });
                            
                    });
                });
                $scope.$emit("notification:success", "Group Changed");
                $route.reload();               
            };

            


            $scope.showUserRoles = function(){
                SWBrijj.tblm('account.my_user_role', ['email', 'role', 'groups']).then(function(data){
                    $scope.myUserRoles = data;
                    console.log($scope.myUserRoles);
                });
            };

            
        }]
    }
})
m.directive('peopleFilter', function(){
    return {
        scope: {people: '='},
        restrict: 'E',
        templateUrl:'/cmn/partials/peopleFilter.html',
        controller: ['$scope', '$rootScope', 'SWBrijj', '$route', '$routeParams', '$location', '$timeout', '$q',
        function($scope, $rootScope, SWBrijj, $route, $routeParams, $location, $timeout, $q){

            $scope.getContacts = function(){
                var promise = $q.defer();
                SWBrijj.tblm('global.user_list', ['email', 'name']).then(function(data){
                    $scope.myContacts = data;
                    promise.resolve($scope.myContacts);
                    console.log($scope.myContacts);
                });
                return promise.promise
            };
            // $scope.getContacts();
            // thing is scope.mycontacts because that is what the promise resolves
            $scope.getUserRoles = function(){
                SWBrijj.tblm('account.company_issuers', ['email', 'name']).then(function(data){
                    $scope.getContacts().then(function(){
                        $scope.myRoles = data;
                        $scope.myAdmins = $scope.myRoles.length 
                        $scope.myShareholders = $scope.myContacts.length - $scope.myAdmins
                        console.log($scope.myRoles);
                    });
                   
                });
            };
            $scope.getUserRoles()

            $scope.myGroups = [];
            function groupInfo(groupName, count){
                this.groupName = groupName;
                this.count = 0;
            }

            // $scope.getUserGroups = function(){
            //     SWBrijj.tblm('account.my_user_groups', ['json_array_elements']).then(function(data){
            //         $scope.myElements = data;
            //         angular.forEach($scope.myElements, function(elem){
            //             if($scope.myGroups.groupName)
            //             console.log(JSON.parse(elem.json_array_elements));
            //             myGroups.push(JSON.parse(elem.json_array_elements));
            //         })
            //         console.log($scope.myElements);

            //     });
            // };
            // $scope.getUserGroups();




        }]
    }
})

m.directive('messageSide', function(){
    return {
        scope: false,
        restrict: 'E',
        templateUrl: '/cmn/partials/messageSide.html',
        controller: ['$scope', '$rootScope', 'SWBrijj', '$route', '$routeParams', '$location', '$timeout',

        function($scope, $rootScope, SWBrijj, $route, $routeParams, $location, $timeout) {
            
            $scope.getPeople = function(){
                SWBrijj.tblm('global.user_list', ['email', 'name']).then(function(data){
                    $scope.people = data
                    var array = [];
                    var obj = {};
                    angular.forEach($scope.people, function(info){
                        array.push(obj[info.email] = info.name)
                        if(info.name == ""){
                            array.push(obj[info.email]= null)
                        }
                    }) 
                    $scope.peopleDict = obj  
                    $scope.getFeed();
              
                });               
            };
            $scope.getPeople();

            $scope.$watch('peopleDict', function(newdata, olddata){
                if(newdata){
                    $scope.getLogs();
                }        
            });

           $scope.poll = 0;

           $scope.newMessages = function(){
            SWBrijj.tblm('mail.msgstatus', ['our_id', 'event']).then(function(data){
                $scope.messageCount = data;
                // $scope.getFeed();
                var incrementer = 0
                if($scope.msgstatus.length == $scope.messageCount.length && $scope.poll < 5){
                    $timeout($scope.newMessages, 2000)
                    $scope.poll += 1
                }
                else {
                    $scope.getFeed();
                }

            }).except(function(data){
                console.log('error')
            })
           }

            $rootScope.$on('new:message', function(x){
                console.log(x);
                console.log("test")
                $scope.newMessages();

                // setTimeout($scope.newMessages, 5500);
            })


            $scope.gotoPerson = function(person) {
                if (!person.lastlogin) return;
                var link;
                link = (person.name ? ((navState.userid != person.email) ? '/app/company/profile/view?id=' + person.email : '/app/account/profile/') : '');
                if (link) {
                $location.url(link);
                }
            };

            $scope.getLogins = function(){
                SWBrijj.tblm('global.user_tracker').then(function(data){
                    $scope.logins = data              
                })
            }
            $scope.getLogins();


            $scope.getFeed = function(){
                SWBrijj.tblm('mail.msgstatus', ['our_id', 'event', 'event_time', 'tox', 'category', 'when_requested']).then(function(data){
                    console.log($scope.msgstatus)
                    $scope.msgstatus = data;
                    $scope.getNumber = $scope.msgstatus.length;
                    $scope.getLogs();
                    $scope.getLogins();

                }).except(function(data){
                    console.log("error");
                });
            }
 

            $scope.getLogs = function(){
                // $scope.getLogins();
                function Message(time, event, tox, to_names, our_id, foo){
                    this.time = time
                    this.event = []
                    this.tox = []
                    this.to_names = []
                    this.our_id = []
                    this.foo = []
                }

                function indEvent(our_id, email, event, array, event_time){
                    this.our_id = our_id
                    this.email = email
                    this.event = event
                    this.array = []
                    this.event_time = []
                }

                var msgdata = []
                angular.forEach($scope.msgstatus, function(value){
                    if (!msgdata.some(function(timestamp, idx, arr){
                         return timestamp.equals(value.when_requested);
                    })) {
                        msgdata.push(value.when_requested);
                    }
                     
                });
                var myEvents = []
                for (var i = 0; i < msgdata.length; i++){
                   myEvents.push(new Message(msgdata[i]))
                }           
                angular.forEach($scope.msgstatus, function(value){
                    for (var i = 0; i < myEvents.length; i++){
                        if(value.when_requested.equals(myEvents[i].time)) {
                            myEvents[i].category = value.category;
                            var idxtox = myEvents[i].tox.indexOf(value.tox)
                            if(idxtox == -1){
                                myEvents[i].tox.push(value.tox);
                            } 
                            myEvents[i].event.push(value.event)
                            if($scope.peopleDict[value.tox]==null){
                                myEvents[i].to_names.push(value.tox)
                            }
                            else {
                                myEvents[i].to_names.push($scope.peopleDict[value.tox])
                            }
                            var idx = myEvents[i].our_id.indexOf(value.our_id)
                                if(idx == -1){
                                    myEvents[i].our_id.push(value.our_id)
                                    myEvents[i].foo.push(new indEvent(value.our_id, value.tox));
                                }
                                angular.forEach(myEvents[i].foo, function(myThings){
                                    myThings[value.event_time] = value.event;
                                    if(myThings.our_id == value.our_id){
                                        myThings.array.push({
                                            time: value.event_time,
                                            event: value.event,
                                        })
                                        myThings.event_time.push(value.event_time)
                                        var newEvent = myThings.event_time.sort()
                                        var lastEvent = newEvent[newEvent.length -1];
                                        myThings.timestamp = lastEvent;
                                        myThings.event = myThings[lastEvent];
                                        if(myThings.event == 'open'){
                                            myThings.event = 'opened'
                                        }
                                        if($scope.peopleDict[myThings.email]==null){
                                            myThings.personName = myThings.email;
                                        }
                                        else {
                                            myThings.personName = $scope.peopleDict[myThings.email]
                                        }
                                    }
                                })
                                angular.forEach($scope.logins, function(login){
                                    if(login.email == value.tox){
                                        myEvents[i].foo.forEach(function(elem){
                                            elem.login = login.logintime;
                                        })
                                    }
                                })


                            }
                        }
                    $scope.message_data = myEvents;        
                });
               
            };


            $scope.gotoPerson = function(person) {
                if(person.login == undefined){
                    $scope.hasLink = false;
                  
                }
                else{
                    var link = '/app/company/profile/view?id=' + person.email 
                    $location.url(link);
                }
                      
            };    
            
        }]
    };
});
m.directive('addPerson', function(){
    return {
        scope: false,
        // replace: true,
        // transclude: false,
        restrict: 'E',
        templateUrl: '/cmn/partials/addPerson.html',
        controller: ['$scope', '$rootScope', 'SWBrijj', '$route', 

        function($scope, $rootScope, SWBrijj, $route) {

            $scope.createPerson = function() {
                if ($scope.newRole) {
                    SWBrijj.proc('account.create_admin', $scope.newEmail.toLowerCase()).then(function(x) {
                        void(x);
                        $rootScope.billing.usage.admins_total += 1;
                        $rootScope.$emit("notification:success", "Admin Added");
                       
                        $route.reload();
                    }).except(function(x) {
                        void(x);
                        $rootScope.$emit("notification:fail", "Something went wrong, please try again later.");
                    });
                } else {
                    SWBrijj.proc('account.create_investor', $scope.newEmail.toLowerCase(), $scope.newName).then(function(x) {
                        void(x);        
                        $rootScope.$emit("notification:success", "Investor Added");        
                        $route.reload();
                    }).except(function(x) {
                        void(x);
                        $rootScope.$emit("notification:fail", "Something went wrong, please try again later.");
                    });
                }
                $scope.newEmail = "";
            };

            $scope.resetAdmin = function() {
                $scope.newEmail = "";
                $scope.newName = "";
                $scope.newRole = false;
            };

            
            $scope.toggleRole = function() {
                $scope.newRole = !$scope.newRole;
                
            };

            var re = /^(([^<>()[\]\\.,;:\s@\"]+(\.[^<>()[\]\\.,;:\s@\"]+)*)|(\".+\"))@((\[[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\])|(([a-zA-Z\-0-9]+\.)+[a-zA-Z]{2,}))$/;
            $scope.fieldCheck = function() {
                return re.test($scope.newEmail);

            };

        }]
    };
});

m.directive('composeMessage', function() {
    return {
        scope: {recipients: "="},
        // replace: true,
        // transclude: false,
        restrict: 'E',
        templateUrl: '/cmn/partials/composeMessage.html',
        controller: ['$scope', '$rootScope', 'SWBrijj',

        

        function($scope, $rootScope, SWBrijj) {

            $scope.resetMessage = function() {
                $scope.message = {recipients:[],
                                  text:"",
                                  subject:""};
                $scope.recipients = []
            };
            $scope.resetMessage();
            $scope.composeopts = {
                backdropFade: true,
                dialogFade: true
            };

            $scope.triggerUpgradeMessages = $rootScope.triggerUpgradeMessages;
            
            $scope.howMany = function (){
                if(location.host == 'share.wave'){
                    console.log($scope.recipients + "i'm at sharewave!");
                }
            };


            $scope.sendMessage = function(msg) {
                var category = 'company-message';
                var template = 'company-message.html';
                var newtext = msg.text.replace(/\n/g, "<br/>");
                var recipients = $scope.recipients;
                $scope.clicked = true;
                SWBrijj.procm('mail.send_message',
                              JSON.stringify(recipients),
                              category,
                              template,
                              msg.subject,
                              newtext
                ).then(function(x) {
                    void(x);
                    $rootScope.billing.usage.direct_messages_monthly += recipients.length;
              
                    $rootScope.$emit("notification:success",
                        "Message sent!");
                    //this works but i don't know why for the root scope
                    $rootScope.$emit('new:message');
                    $scope.resetMessage();
                    $scope.recipients = [];
                    $scope.clicked = false;

                }).except(function(err) {
                    void(err);
                    $rootScope.$emit("notification:fail",
                        "Oops, something went wrong.");
                    $scope.clicked = false;
                });
            };


            
            $scope.readyToSend = function(msg) {
                // console.log($scope.recipients)
                if ($scope.recipients.length===0
                    || msg.subject===""
                    || msg.text==="") {
                    return false;
                }
                else {
                    return true;
                }
            };

            $scope.readyToPreview = function(msg){
                var text = msg.text
                if(text ===""){
                    return false;
                }
                else{
                    return true;
                }
            }

          

            $scope.previewModalOpen = function(msg) {
                $scope.previewModal = true;
                $scope.subject = msg.subject;
                // var message = msg.text.replace(new RegExp( "\n", "g" ),"<br>");
                // var re = /<br *\/?>/gi;
                // $scope.messagetext = message.replace(re, '\n')
                $scope.messagetext=msg.text
                $scope.sendername = $rootScope.person.name;
                $scope.company = $rootScope.navState.name;
            };

            $scope.previewModalClose = function(){
                $scope.previewModal = false
            };

        }]
    };
});

m.directive('paymentPlanSelector', function() {
    return {
        scope: false,
        replace: true,
        restrict: 'E',
        templateUrl: '/cmn/partials/paymentPlanSelector.html',
        controller: ['$scope', '$rootScope', '$routeParams',
        function($scope, $rootScope, $routeParams) {

            if ($routeParams.plan) {
                $rootScope.selectedPlan = $routeParams.plan;
            }
            $rootScope.$watch('selectedPlan', function(){
                $scope.selectedPlan = $rootScope.selectedPlan;
            });

            $scope.selectPlan = function(p) {
                if ($rootScope.selectedPlan == p) {
                    $rootScope.selectedPlan = null;
                } else {
                    if ($rootScope.billing) {
                        if ($rootScope.billing.plans.indexOf(p)!==-1) {
                            $rootScope.selectedPlan = p;
                        } else {
                            console.log(p);
                        }
                    } else {
                        $rootScope.selectedPlan = p;
                    }
                }
            };
        }]
    };
});

m.directive('meter', function() {
    return {
        scope: {cur: '=',
                tot: '='},
        replace: true,
        restrict: 'E',
        templateUrl: '/cmn/partials/meter.html',
        controller: ['$scope', function($scope) {
            $scope.meterStyle = {};
            $scope.updateMeter = function() {
                $scope.meterStyle = {"width":
                                     ($scope.cur/$scope.tot)*100 + "%"};
                if ($scope.cur/$scope.tot > 1) {
                    $scope.meterStyle["background-color"] = "#E74C3C";
                }
            };
            $scope.$watch('cur', $scope.updateMeter);
            $scope.$watch('tot', $scope.updateMeter);
        }]
    };
});

m.directive('docMiniViewer', function() {
    return {
        scope: {docid: "="},
        restrict: 'E',
        templateUrl: '/cmn/partials/docMiniViewer.html',
        controller: ['$scope', 'SWBrijj',
            function($scope, SWBrijj) {


                $scope.opts = {
                    backdropFade: true,
                    dialogFade: true,
                    dialogClass: 'dmvModal modal'
                };

                $scope.openmodal = function () {
                    $scope.docMiniViewer = true;
                };

                $scope.closemodal = function () {
                    $scope.docMiniViewer = false;
                    $scope.docid = undefined;
                };

                $scope.getPages = function () {
                    while ($scope.lastpage <= parseInt($scope.document.pages) && $scope.lastpage < $scope.currentblock) {
                        if ($scope.docid[0] == "investor") {
                            $scope.pages.push("/photo/docpg?id=" + $scope.docid[1] + "&investor=false&counterparty=true&page=" + ($scope.lastpage) + "");
                        } else {
                            $scope.pages.push("/photo/docpg?id=" + $scope.docid[1] + "&investor=false&counterparty=false&page=" + ($scope.lastpage) + "");
                        }
                        $scope.lastpage += 1
                    }
                };

                $scope.loadPages = function() {
                    $scope.currentblock = $scope.lastpage + 3;
                    if (!$scope.document.pages) {
                        SWBrijj.tblm('document.my_company_library', 'doc_id', $scope.document.original).then(function(data) {
                            $scope.document.pages = data.pages
                            $scope.getPages();
                        });
                    } else {
                        $scope.getPages();
                    }

                };

                $scope.$watch('docid', function() {
                    if ($scope.docid && $scope.docid[1]) {
                        $scope.lastpage = 1;
                        if ($scope.docid[0] == "issuer") {
                            SWBrijj.tblm('document.my_company_library', 'doc_id', $scope.docid[1]).then(function(data) {
                                $scope.document = data;
                                $scope.pages = [];
                                $scope.openmodal();
                            });
                        } else if ($scope.docid[0] == "investor") {
                            SWBrijj.tblm('document.my_counterparty_library', 'doc_id', $scope.docid[1]).then(function(data) {
                                $scope.document = data;
                                $scope.pages = [];
                                $scope.openmodal();
                            });
                        }

                    }
                });
            }]
    };
});
