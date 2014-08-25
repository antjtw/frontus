'use strict';

app.controller('MsgCtrl', ['$scope', '$rootScope', 'SWBrijj', 'navState', '$route', '$location',
    function($scope, $rootScope, SWBrijj, navState, $route, $location) {

        $scope.page = null;
        $scope.myMessages = [];
        $scope.togglePage = function(button){
            console.log("toggle page")
            if($scope.page !== button){
                $scope.page = button;
            }
            else if($scope.page === button){
                $scope.page = null;
            }
            else{
                $scope.page = null;
            }
          
        };

        $scope.showString = function(string){
            if(string.length > 50){
                return string.slice(0, 50) + "...";
            }
            else{
                return string;
            }
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
                }
                angular.forEach(allSent, function(val){
                    if (!msgs.some(function(timestamp, idx, arr){
                         return timestamp.equals(val.when_requested);
                    })) 
                    {
                        msgs.push(val.when_requested);
                    }
                     
                });
                for(var i=0; i < msgs.length; i++){
                    $scope.sentMsgs.push(new sentMessage(msgs[i]))
                }
                angular.forEach($scope.sentMsgs, function(obj){
                    angular.forEach(allSent, function(sent){
                        if(sent.when_requested.equals(obj.timex)){
                            obj.subject = sent.subject;
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

        $scope.getMessageThreads = function(){
            SWBrijj.tblm('mail.my_messages', ['sender', 'message', 'time', 'subject', 'members', 'thread_id']).then(function(data){
                $scope.messageThreads = data;
                $scope.threadLength = $scope.messageThreads.length;
                angular.forEach($scope.messageThreads, function(thr){
                    if(thr.sender !== navState.userid){
                        $scope.myMessages.push(thr);
                    };
                });
                angular.forEach($scope.myMessages, function(thread){
                    var members = thread.members.replace("{", "");
                    var members2 = members.replace("}", "");
                    var array = members2.split(",");
                    if(array.indexOf(navState.userid) > -1){
                        array[array.indexOf(navState.userid)] = "me"
                    }
                    thread.members = array.join(", ");
                });
                $scope.inboxLength = $scope.myMessages.length
            });
        };
        $scope.getMessageThreads();



        $scope.getThread = function(elem){  
            $scope.myThread = elem;
        };
        
    }
]);

app.controller('threadCtrl', ['$scope', '$rootScope', 'SWBrijj', 'navState', '$route', '$location', '$routeParams', '$q',
    function($scope, $rootScope, SWBrijj, navState, $route, $location, $routeParams, $q) {
        console.log($routeParams.thread);
        var threadId = parseInt($routeParams.thread);



        $scope.getPeopleNames = function(){
            var promise = $q.defer();
            SWBrijj.tblm('global.user_list', ['email', 'name']).then(function(data){
                $scope.myPeople = data;
                promise.resolve($scope.myPeople);             
            });  
            return promise.promise             
        };

        $scope.getMessages = function(){
            SWBrijj.tblmm('mail.my_messages', 'thread_id', threadId).then(function(data){
                $scope.getPeopleNames().then(function(){
                    $scope.myThreads = data;
                    angular.forEach($scope.myThreads, function(thread){
                        angular.forEach($scope.myPeople, function(ppl){
                            console.log(ppl.name);
                            if(thread.sender === ppl.email){
                                if(ppl.name == null){
                                    thread.senderName = ppl.email;
                                }
                                else if(ppl.name !== null){
                                    thread.senderName = ppl.name;
                                }
                            };
                        });
                    });
                    console.log($scope.myThreads)
                });
            });
        };
        $scope.getMessages();

        $scope.readyToSend = function(msg){
            if(msg.text ===""){
                return false;
            }
            else{
                return true;
            }
        };

        $scope.message = {};
        $scope.replyMessage = function(msg){
            console.log("i will respond to a message");
            console.log($scope.message.text);
            console.log($scope.threadMembers);
            console.log($routeParams.thread);
        };

        $scope.getPhotoUrl = function(sender){
            if(sender == navState.userid){
                return '/photo/user?id=company:' + navState.company;
            }
            else if(sender !== navState.userid){
                return '/img/ike.png';
                    }
            else{
                return '/img/ike.png';
            };
        };
        $scope.getPhotoUrl();
    
    }
]);






