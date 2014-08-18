'use strict';

app.controller('MsgCtrl', ['$scope', '$rootScope', 'SWBrijj', 'navState', '$route', '$location',
    function($scope, $rootScope, SWBrijj, navState, $route, $location) {

        $scope.createInbox = function(){
            SWBrijj.tblm('mail.my_company_outbox', ['tox', 'message', 'subject', 'id']).then(function(data){
                $scope.sentMessages = data;

            })
        };
        $scope.createInbox();


        $scope.compose = false;
        $scope.toggleMain = function(){
            if($scope.compose == true){
                $scope.compose = false;
                console.log($scope.compose);
            }
            else{
                $scope.compose = true
                console.log($scope.compose)
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
                }
                angular.forEach(allSent, function(val){
                    if (!msgs.some(function(timestamp, idx, arr){
                         return timestamp.equals(val.when_requested);
                    })) 
                    {
                        msgs.push(val.when_requested);
                    };
                     
                });
                console.log(msgs)
                for(var i=0; i < msgs.length; i++){
                    $scope.sentMsgs.push(new sentMessage(msgs[i]))
                }
                console.log($scope.sentMsgs);
                angular.forEach($scope.sentMsgs, function(obj){
                    angular.forEach(allSent, function(sent){
                        if(sent.when_requested.equals(obj.timex)){
                            console.log("match!")
                            obj.subject = sent.subject
                            obj.recipients.push(sent.tox)
                        }
                        console.log(typeof sent.when_requested)
                        console.log(typeof obj.timex)
                    })
                })
                console.log($scope.sentMsgs)

                // angular.forEach(allSent, function(sent){
                //     for(var i = 0; i < msgs.length; i ++){
                //         if(sent.when_requested.equals(msgs[i])){
                //             console.log("match")
                //         }
                //     }
                //     // console.log(sent)
                // })
                // angular.forEach($scope.sentMessages, function(msg){
                //     angular.forEach(allSent, function(sent){
                //         if msg.timex == 
                //     })
                // })
                
              
            })
        }
        $scope.getSentMessages();

        


    }
]);