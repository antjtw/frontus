'use strict';

app.controller('MsgCtrl', ['$scope', '$rootScope', 'SWBrijj', 'navState', '$route', '$location', '$q', 'Message', '$routeParams',
    function($scope, $rootScope, SWBrijj, navState, $route, $location, $q, Message, $routeParams) {

        $scope.page = null;
        $scope.myMessages = [];
        $scope.allThreads = Message.getAllThreads();
        $scope.myPeople = Message.getAllNames();
        $scope.allPeople = Message.getAllPeople();
        $scope.myRecs = Message.getAllMsgs();

        $scope.togglePage = function(button){
            if($scope.page !== button){
                $scope.page = button;
                $location.search('p', button);
            }
            else if($scope.page === button){
                $scope.page = null;
                $location.search('p', null);
            }
            else{
                $scope.page = null;
                $location.search('p', null);
            }

        };

        $scope.gotoCompose = function() {
            $location.url('/app/company/messages/compose');
        };

        $scope.sortBy = function(col) {
            console.log(col);
            if ($scope.sort == col) {
                $scope.sort = ('-' + col);
            } else {
                $scope.sort = col;
            }
        };

        $scope.showString = function(string){
            if(string == null){
                return "";
            }
            else if(string.length > 50){
                return string.slice(0, 50) + "...";
            }
            else {
                return string;
            }
        };

        $scope.gotoThread = function(thread) {
            $location.url("/app/company/messages/thread?thread=" + thread);
        };


        $scope.getThread = function(elem){
            $scope.myThread = elem;
        };

        if ($routeParams.p) {
            $scope.togglePage($routeParams.p);
        }
    }
]);

app.controller('threadCtrl', ['$scope', '$rootScope', 'SWBrijj', 'navState', '$route', '$location', '$routeParams', '$q',
    function($scope, $rootScope, SWBrijj, navState, $route, $location, $routeParams, $q) {
        console.log($routeParams.thread);
        var threadId = parseInt($routeParams.thread);

        $scope.myInvestors=[];
        $scope.isInvestor = function(){
            SWBrijj.tblm('account.company_issuers', ['email', 'name']).then(function(data){
                var myInvestors = data;
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
            return promise.promise;
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
                        if(th.senderName === undefined){
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

        $scope.message = {};
        $scope.replyMessage = function(msg){
            var msgInfo = $scope.myThreads[0];
            var recipients = JSON.parse(msgInfo.members);
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
                    return '/photo/user?id=' + sender;
                }
                else if(sender !== navState.userid && $scope.myInvestors.indexOf(sender) > - 1){
                    return '/photo/user?id=issuer:' + sender;
                }
                else if(sender !== navState.userid && $scope.myInvestors.indexOf(sender) === - 1){
                     return '/photo/user?id=investor:' + sender;
                }
                else{
                    return '/img/ike.png';
                }
            };


    }
]);
