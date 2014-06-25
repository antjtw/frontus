var m = angular.module('commonDirectives', ['ui.select2', 'brijj']);

m.directive('messageSide', function(){
    return {
        scope: false,
        // replace: true,
        // transclude: false,
        restrict: 'E',
        templateUrl: '/cmn/partials/messageSide.html',
        controller: ['$scope', '$rootScope', 'SWBrijj', '$route',

        function($scope, $rootScope, SWBrijj, $route) {
            
            $scope.getPeople = function(){
                SWBrijj.tblm('global.user_list', ['email', 'name']).then(function(data){
                    $scope.people = data
                    console.log($scope.people.length);
                    console.log($scope.people)
                    var array = []
                    var obj = {}
                    angular.forEach($scope.people, function(info){
                        array.push(obj[info.email] = info.name)
                        if(info.name == ""){
                            array.push(obj[info.email]= null)
                        }
                    }) 
                    $scope.peopleDict = obj
                    console.log($scope.peopleDict)
                    console.log($scope.peopleDict['ariel+3@sharewave.com'])
                    $scope.getLogs();
                });               
            };
            $scope.getPeople();

            $scope.$watch('peopleDict', function(newdata, olddata){
                if(newdata){
                    $scope.getLogs();
                }        
            });


            $scope.getLogs = function(){
                SWBrijj.tblmm('mail.sentstatus', ['event', 'tox', 'subject', 'senderemail', 'when_requested', 'category', 'our_id', 'event_time'], 'category', 'company-message').then(function(data){
                    $scope.msgstatus = data
                    function Message(time, event, tox, category, to_names, our_id, event_time){
                        this.time = time
                        this.event = []
                        this.tox = []
                        this.category = category
                        this.to_names = []
                        this.unique_names = []
                        this.our_id = []
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
                                myEvents[i].tox.push(value.tox);
                                myEvents[i].event.push(value.event);
                                myEvents[i].our_id.push(value.our_id);
                                if($scope.peopleDict[value.tox]==null){
                                    myEvents[i].to_names.push(value.tox)
                                }
                                else {
                                    myEvents[i].to_names.push($scope.peopleDict[value.tox])
                                }
                                myEvents[i].event_time.push(value.event_time)
                                                             
                            }
                        }
                    })

                    $scope.message_data = myEvents;                   
                    $scope.myEvents = $scope.message_data.length         
                    console.log($scope.message_data);
                    angular.forEach($scope.message_data, function(items){
                        console.log(items.to_names)
                    })
                    console.log(typeof $scope.myEvents)

                }).except(function(data){
                    console.log("error");
                })
            }
        
            
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
                console.log("this makes someone an admin or not");
            };

            var re = /^(([^<>()[\]\\.,;:\s@\"]+(\.[^<>()[\]\\.,;:\s@\"]+)*)|(\".+\"))@((\[[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\])|(([a-zA-Z\-0-9]+\.)+[a-zA-Z]{2,}))$/;
            $scope.fieldCheck = function() {
                return re.test($scope.newEmail);
                console.log($scope.newEmail)

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
                console.log($scope.messagetext);
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
