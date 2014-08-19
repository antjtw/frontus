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
        


    }
]);