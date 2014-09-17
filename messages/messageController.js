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
            $location.url('/app/messages/compose');
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
            $location.url("/app/messages/thread?thread=" + thread);
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
                $scope.peopleDict = {};
                angular.forEach($scope.myPeople, function(person){
                    if (person.email == navState.userid)
                        $scope.peopleDict[person.email] = "me";
                    else
                        $scope.peopleDict[person.email] = person.name;
                });
                promise.resolve($scope.peopleDict);
            });
            return promise.promise;
        };

        $scope.getMessages = function(){
            SWBrijj.tblmm('mail.my_messages', 'thread_id', threadId).then(function(data){
                $scope.getPeopleNames().then(function(){
                    $scope.myThreads = data;
                    angular.forEach($scope.myThreads, function(thread){
                        thread.senderName = $scope.peopleDict[thread.sender];
                        if(!thread.senderName){
                            thread.senderName = thread.sender;
                        }
                        thread.members = JSON.parse(thread.members);
                        thread.recipients = [];
                        angular.forEach(thread.members, function(member){
                            if (member != thread.sender)
                                thread.recipients.push($scope.peopleDict[member]);
                        });
                        thread.recipientsString = thread.recipients.join(", ");
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
                $location.url('/app/messages/');
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
