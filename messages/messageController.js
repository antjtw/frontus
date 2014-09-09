'use strict';

app.controller('MsgCtrl', ['$scope', '$rootScope', 'SWBrijj', 'navState', '$route', '$location', '$q', 'Message',
    function($scope, $rootScope, SWBrijj, navState, $route, $location, $q, Message) {

        $scope.page = null;
        $scope.myMessages = [];
        $scope.allThreads = Message.getAllThreads();
        $scope.myPeople = Message.getAllNames();
        $scope.allPeople = Message.getAllPeople();


        $scope.togglePage = function(button){
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
            if(string == null){
                return ""
            }
            else if(string.length > 50){
                return string.slice(0, 50) + "...";
            }
            else {
                return string;
            }
        };




        $scope.getThread = function(elem){  
            $scope.myThread = elem;
        };
        
    }
]);

app.controller('threadCtrl', ['$scope', '$rootScope', 'SWBrijj', 'navState', '$route', '$location', '$routeParams', '$q',
    function($scope, $rootScope, SWBrijj, navState, $route, $location, $routeParams, $q) {
        console.log($routeParams.thread);
        var threadId = parseInt($routeParams.thread);

        $scope.myInvestors=[]
        $scope.isInvestor = function(){
            SWBrijj.tblm('account.company_issuers', ['email', 'name']).then(function(data){
                var myInvestors = data
                angular.forEach(myInvestors, function(inv){
                    $scope.myInvestors.push(inv.email);
                });
                return $scope.myInvestors;
            });
        };
        
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
                            if(thread.sender === ppl.email){
                                thread.senderName = ppl.name;
                            }
                        });
                    });
                    angular.forEach($scope.myThreads, function(th){
                        if(th.senderName == undefined){
                            th.senderName = th.sender;
                        }
                    });
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




        $scope.getArrayfromPosgres = function(array){
            var array1 = array.replace("{", "");
            var array2 = array1.replace("}", "");
            var array3 = array2.split(",");
            return array3;
        }

        $scope.message = {};
        $scope.replyMessage = function(msg){
            var msgInfo = $scope.myThreads[0]
            var recipients = $scope.getArrayfromPosgres(msgInfo.members);
            var category = 'company-message';
            var template = 'company-message.html';
            var newtext = msg.text.replace(/\n/g, "<br/>");
            SWBrijj.procm('mail.send_message',
                null,
                msgInfo.thread_id,
                'Re: ' + msgInfo.subject,
                newtext,
                null               
            ).then(function(x) {
                void(x);
                $rootScope.billing.usage.direct_messages_monthly += recipients.length;
                $location.url('/app/company/messages/');
                $scope.clicked = false;
            }).except(function(err) {
                void(err);
                $rootScope.$emit("notification:fail",
                    "Oops, something went wrong.");
                $scope.clicked = false;
            });

        };

         $scope.getPhotoUrl = function(sender){
                if(sender == navState.userid){
                    return '/photo/user?id=company:' + navState.company;
                }
                else if(sender !== navState.userid && $scope.myInvestors.indexOf(sender) > - 1){
                    return '/photo/user?id=issuer:' + sender;
                }
                else if(sender !== navState.userid && $scope.myInvestors.indexOf(sender) === - 1){
                     return '/photo/user?id=investor:' + sender;
                }
                else{
                    return '/img/ike.png';
                };
            };
       
    
    }
]);









