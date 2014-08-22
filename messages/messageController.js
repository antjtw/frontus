'use strict';

app.controller('MsgCtrl', ['$scope', '$rootScope', 'SWBrijj', 'navState', '$route', '$location',
    function($scope, $rootScope, SWBrijj, navState, $route, $location) {

        $scope.page = null
        $scope.togglePage = function(button){
            console.log("toggle page")
            if($scope.page !== button){
                $scope.page = button
                console.log($scope.page)
            }
            else if($scope.page == button){
                $scope.page = null
                console.log("hi")
            }
            else{
                $scope.page = null
                console.log("no button")
            };
          
        };

        $scope.showString = function(string){
            if(string.length > 50){
                return string.slice(0, 50) + "..."
            }
            else{
                return string
            };
        };

        $scope.getSentMessages = function(){
            var msgs = [];
            $scope.sentMsgs = [];
            SWBrijj.tblm('mail.msgstatus', ['our_id', 'event',  'tox', 'category', 'when_requested', 'subject']).then(function(data){
                var allSent = data;
                function sentMessage(timex, subject, recipients){
                    this.timex = timex;
                    this.subject = subject;
                    this.recipients = [];
                };
                angular.forEach(allSent, function(val){
                    if (!msgs.some(function(timestamp, idx, arr){
                         return timestamp.equals(val.when_requested);
                    })) 
                    {
                        msgs.push(val.when_requested);
                    };
                     
                });
                for(var i=0; i < msgs.length; i++){
                    $scope.sentMsgs.push(new sentMessage(msgs[i]))
                }
                angular.forEach($scope.sentMsgs, function(obj){
                    angular.forEach(allSent, function(sent){
                        if(sent.when_requested.equals(obj.timex)){
                            obj.subject = sent.subject
                            if(obj.recipients.indexOf(sent.tox)==-1){
                                obj.recipients.push(sent.tox);
                                obj.recipString = obj.recipients.join(", ");
                            }
                            
                        }
                    });
                });
            });
        };
        $scope.getSentMessages();

        $scope.myMessages = [];

        $scope.getMessageThreads = function(){
            SWBrijj.tblm('mail.my_messages', ['sender', 'message', 'time', 'subject', 'members', 'thread_id']).then(function(data){
                $scope.messageThreads = data;
                $scope.threadLength = $scope.messageThreads.length;
                angular.forEach($scope.messageThreads, function(thr){
                    console.log(navState.userid);
                    if(thr.sender !== navState.userid){
                        $scope.myMessages.push(thr);
                    };
                });
                angular.forEach($scope.myMessages, function(thread){
                    var members = thread.members.replace("{", "");
                    var members2 = members.replace("}", "");
                    var members3 = members2.replace(",", ",  ");
                    thread.members = members3;
                });
                console.log($scope.myMessages.length)
                $scope.inboxLength = $scope.myMessages.length
            });
        };
        $scope.getMessageThreads();



        $scope.getThread = function(elem){  
            $scope.myThread = elem;
            console.log(elem);
        };
        
    }
]);

app.controller('threadCtrl', ['$scope', '$rootScope', 'SWBrijj', 'navState', '$route', '$location', '$routeParams',
    function($scope, $rootScope, SWBrijj, navState, $route, $location, $routeParams) {
        console.log($routeParams.thread);
        var threadId = parseInt($routeParams.thread);

        $scope.getSenderCompany = function(){

        }

        $scope.getMessageThread = function(){
            console.log(typeof $routeParams.thread)
            console.log("hi")
            SWBrijj.tblmm('mail.my_messages', 'thread_id', threadId).then(function(data){
                $scope.myThreads = data
                console.log($scope.myThreads)
                angular.forEach($scope.myThreads, function(thread){
                    console.log(thread);
                    $scope.sentMessage = thread.message;
                    var members = thread.members.replace("{", "");
                    var members2 = members.replace("}", "");
                    var members3 = members2.replace(",", ", ");
                    $scope.threadMembers = members3;
                    $scope.sender = thread.sender;
                });
            });
        };
        $scope.getMessageThread();

        $scope.replyMessage = function(msg){
            console.log("i will respond to a message");
            console.log($scope.message.text)
            console.log($scope.threadMembers)
        };




        
    }
]);






