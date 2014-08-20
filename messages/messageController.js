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
            }
          
        }



        $scope.gotoMessage = function(){
            var link = '/messages/viewMessage.html'
            $location.url(link)
        }

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
                console.log($scope.sentMsgs)
            });
        };
        $scope.getSentMessages();

        $scope.getMessageThreads = function(){
            SWBrijj.tblm('mail.my_messages', ['sender', 'message', 'time', 'subject', 'members', 'thread_id']).then(function(data){
                console.log(data)
                $scope.messageThreads = data
                console.log($scope.messageThreads)
                $scope.threadLength = $scope.messageThreads.length
                console.log($scope.threadLength)
                angular.forEach($scope.messageThreads, function(thread){
                    var members = thread.members.replace("{", "")
                    var members2 = members.replace("}", "")
                    var members3 = members2.replace(",", ", ")
                    thread.members = members3
                })
            })
        }
        $scope.getMessageThreads();

        $scope.getThread = function(elem){  
            $scope.myThread = elem
            console.log(elem)

        }
        
    }
]);

app.controller('replyCtrl', ['$scope', '$rootScope', 'SWBrijj', 'navState', '$route', '$location',
    function($scope, $rootScope, SWBrijj, navState, $route, $location) {
        
    }
]);






