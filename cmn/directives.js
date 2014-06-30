var m = angular.module('commonDirectives', ['ui.select2', 'brijj']);

m.directive('verifyFileModal', function() {
    return {
        scope: true,
        restrict: 'E',
        replace: true,
        transclude: true,
        templateUrl: '/cmn/partials/verifyFileModal.html',
        controller: ['$scope', 'annals',
        function($scope, annals) {
            $scope.verifyModalOpen = function() {
                $scope.verifyFileModal = true;
            };
            $scope.verifyModalClose = function() {
                $scope.verifyFileModal = false;
            };
            $scope.setFiles = function(element) {
                $scope.$apply(function() {
                    $scope.files = [];
                    for (var i = 0; i < element.files.length; i++) {
                        annals.verify(element.files[i],
                                      $scope.verifyCallbackHandler);
                    }
                });
            };
            $scope.verifyCallbackHandler = function(res) {
                if (res) {
                    $scope.$emit('notification:success', 'I know this one!');
                } else {
                    $scope.$emit('notification:fail', 'WHAT IS THIS?!?');
                }
                $scope.verifyModalClose();
            };
        }]
    };
});
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
                    var array = []
                    var obj = {}
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

           $scope.newMessages = function(){
            SWBrijj.tblm('mail.msgstatus', ['our_id', 'event']).then(function(data){
                $scope.messageCount = data;
                // $scope.getFeed();
                var incrementer = 0;
                if($scope.msgstatus.length == $scope.messageCount.length && incrementer < 20){
                    $timeout($scope.newMessages, 2000)
                    incrementer += 1
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
                    console.log($scope.logins)              
                })
            }
            $scope.getLogins();


            $scope.getFeed = function(){
                SWBrijj.tblm('mail.msgstatus', ['our_id', 'event', 'event_time', 'tox', 'category', 'when_requested']).then(function(data){
                    console.log($scope.msgstatus)
                    $scope.msgstatus = data;
                    $scope.getNumber = $scope.msgstatus.length;
                    console.log($scope.getNumber)
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
                                    console.log($scope.logins)
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

            // var rr = getCSSRule('.for-r0ml');
            // if (rr) {
            //     rr.style.display="inline";
            // }

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
                    $rootsScope.$emit("notification:fail",
                        "Oops, something went wrong.");
                    $scope.clicked = false;
                });
            };

            $scope.readyToSend = function(msg) {
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
