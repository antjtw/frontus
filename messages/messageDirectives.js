"use strict";

var mod = angular.module('messageDirectives', ['ui.select2', 'brijj', 'ui.filters', 'ui.bootstrap']);

mod.directive('composeMessage', function() {
    return {
        scope: true,
        restrict: 'E',
        templateUrl: '/messages/partials/composeMessage.html',
        controller: ['$scope', '$rootScope', 'SWBrijj', 'navState', '$location', 'Message', '$window',
        function($scope, $rootScope, SWBrijj, navState, $location, Message, $window) {
            $scope.zombiemessage = function(){
                if(navState.role === "issuer" && ($rootScope.billing.currentPlan === "000" || $rootScope.billing.payment_token === null || !$rootScope.billing.payment_token)){
                    return "Please update your payment information to use this feature.";
                }
                else {
                    return null;
                }
            };

            $scope.emailLists = Message.getAllPeople();

            $scope.groupMessage = true;

            $scope.selectGroupMessage = function(){
                if($scope.groupMessage === false){
                    $scope.groupMessage = true;
                }
                else if($scope.groupMessage === true){
                    $scope.groupMessage = false;
                }
            };

            // create the object for selct2
            $scope.myContacts = [];
            $scope.groupsAndPeople = function(){
                function Contact(id, name){
                    this.id = id;
                    this.name = name;
                    this.details = [];
                }

                SWBrijj.tblm('global.investor_list', ['email', 'name']).then(function(data){
                    $scope.myEmails = data;
                    angular.forEach($scope.myEmails, function(email){
                        $scope.myContacts.push(new Contact(email.email, email.name));
                        angular.forEach($scope.myContacts, function(ct){
                            if(ct.details.indexOf(ct.id)== -1){
                                ct.details.push(ct.id);
                            }
                        });
                    });
                });
                // make this a promise later
                SWBrijj.tblm('account.ind_user_group', ['ind_group']).then(function(myGroups){
                    angular.forEach(myGroups, function(gr){
                        var b = JSON.parse(gr.ind_group);
                        $scope.myContacts.push(new Contact(b, b));
                        SWBrijj.tblm('account.my_user_groups', ['email', 'json_array_elements']).then(function(emailGroups){
                            angular.forEach(emailGroups, function(group){
                                angular.forEach($scope.myContacts, function(contact){
                                    if(JSON.parse(group.json_array_elements) === contact.name){
                                        if(contact.details.indexOf(group.email)=== -1){
                                            contact.details.push(group.email);
                                        }
                                    }
                                });
                            });
                        });
                    });
                });
            };
            $scope.groupsAndPeople();

            $scope.resetMessage = function() {
                $scope.message = {recipients: [],
                                  text:"",
                                  subject:""};
            };
            $window.addEventListener('beforeunload', function(event) {
                sessionStorage.setItem('composeMessage-message', angular.toJson($scope.message));
            });
            $scope.message = angular.fromJson(sessionStorage.getItem('composeMessage-message'));
            if (!$scope.message) {
                $scope.resetMessage();
            }
            $scope.composeopts = {
                backdropFade: true,
                dialogFade: true
            };



            $scope.triggerUpgradeMessages = $rootScope.triggerUpgradeMessages;

            $scope.createRecipients = function(){
                var recipients = [];
                angular.forEach($scope.message.recipients, function(recip){
                    angular.forEach($scope.myContacts, function(contact){
                        if(recip === contact.id){
                            for(var i = 0; i < contact.details.length; i++){
                                // cannot send message to the same person more than once, ie if person is in group and listed, they will only get the email one time.
                                if(recipients.indexOf(contact.details[i])=== -1 && contact.details[i].indexOf('@') > -1){
                                    recipients.push(contact.details[i]);
                                }
                                if(recipients.indexOf(navState.userid) > -1){
                                    recipients.splice(recipients.indexOf(navState.userid, 1));
                                }

                            }
                        }
                    });
                });
                return recipients;
            };

            $scope.send = function(msg) {
                if ($scope.groupMessage)
                    $scope.sendMessage(msg);
                else
                    $scope.sendBulkMessage(msg);
            };

            $scope.sendBulkMessage = function(msg) {
                var newtext = msg.text.replace(/\n/g, "<br/>");
                var recipients = $scope.createRecipients();
                $scope.clicked = true;
                SWBrijj.procm('mail.send_bulk_message',
                            JSON.stringify(recipients),
                            msg.subject,
                            newtext,
                            null
                ).then(function(x) {
                    void(x);
                    //$rootScope.billing.usage.direct_messages_monthly += recipients.length;
                    Message.refresh();
                    $rootScope.$emit("notification:success",
                        "Message sent!");
                    $rootScope.$emit('new:message');
                    $scope.clicked = false;
                    $location.url('/app/messages/');
                }).except(function(err) {
                    void(err);
                    $rootScope.$emit("notification:fail",
                        "Oops, something went wrong.");
                    $scope.clicked = false;
                });
            };

            $scope.sendMessage = function(msg) {
                var newtext = msg.text.replace(/\n/g, "<br/>");
                var recipients = $scope.createRecipients();
                recipients.push(navState.userid);
                $scope.clicked = true;
                SWBrijj.procm('mail.send_message',
                            JSON.stringify(recipients),
                            null,
                            msg.subject,
                            newtext,
                            null
                ).then(function(x) {
                    void(x);
                    //$rootScope.billing.usage.direct_messages_monthly += recipients.length;
                    Message.refresh();
                    $rootScope.$emit("notification:success",
                        "Message sent!");
                    $location.url('/app/messages/');
                    $scope.clicked = false;
                    // $route.reload();
                }).except(function(err) {
                    void(err);
                    $rootScope.$emit("notification:fail",
                        "Oops, something went wrong.");
                    $scope.clicked = false;
                });
            };



            $scope.readyToSend = function(msg) {
                if ($scope.message.recipients.length===0 ||
                    msg.subject==="" ||
                    msg.text==="") {
                    return false;
                }
                else {
                    return true;
                }
            };

            $scope.readyToPreview = function(msg){
                var text = msg.text;
                if(text ===""){
                    return false;
                }
                else{
                    return true;
                }
            };



            $scope.previewModalOpen = function(msg) {
                $scope.previewModal = true;
                $scope.subject = msg.subject;
                $scope.messagetext=msg.text;
                $scope.sendername = $rootScope.person.name;
                $scope.company = $rootScope.navState.name;
            };

            $scope.previewModalClose = function(){
                $scope.previewModal = false;
            };

        }]
    };
});


mod.directive('messageFilter', function(){
    return {
        scope: {page: "="},
        restrict: 'E',
        templateUrl: '/messages/partials/messageFilter.html',
        controller: ['$scope', '$rootScope', 'SWBrijj', '$route', 'Message',

        function($scope, $rootScope, SWBrijj, $route, Message) {
            $scope.allMessages = Message.getAllThreads();
            $scope.sents = Message.getSentMsgs();
            $scope.receives = Message.getReceivedMsgs();

            $scope.threadCount = function() {
                return $scope.allMessages.filter(function(val) {
                    return val.hasReplies == true;
                }).length;
            }
        }]
    };
});

// this is the information on the side of the page that is not currently implemented
mod.directive('threadInformation', function(){
    return {
        scope: {thread: "="},
        restrict: 'E',
        templateUrl: '/messages/partials/threadInformation.html',
        controller: ['$scope', '$rootScope', 'SWBrijj', '$route',

        function($scope, $rootScope, SWBrijj, $route) {
            $scope.$watch('thread', function(){
                $scope.showMessage();
            });

            $scope.showMessage = function(){
                $scope.myMessage = $scope.thread;
                angular.forEach($scope.myMessage, function(msg){
                    $scope.myTime = msg.time;
                    $scope.mySubject = msg.subject;
                });
            };
            $scope.showMessage();

        }]
    };
});

mod.directive('threadPeople', function(){
    return {
        scope: {threads: "=", investors: "="},
        restrict: 'E',
        templateUrl: '/messages/partials/threadPeople.html',
        controller: ['$scope', '$rootScope', 'SWBrijj', '$route', 'navState', '$q', '$location',

        function($scope, $rootScope, SWBrijj, $route, navState, $q, $location) {

            $scope.getPhotoUrl = function(sender){
                if(sender == navState.userid){
                    return '/photo/user?id=' + sender;
                }
                else if(sender !== navState.userid && $scope.investors.indexOf(sender) > - 1){
                    return '/photo/user?id=issuer:' + sender;
                }
                else if(sender !== navState.userid && $scope.investors.indexOf(sender) === - 1){
                     return '/photo/user?id=investor:' + sender;
                }
                else{
                    return '/img/ike.png';
                }
            };

            $scope.getArrayfromPostgres = function(array){
                var array1 = array.replace("{", "");
                var array2 = array1.replace("}", "");
                var array3 = array2.split(",");
                return array3;
            };

            $scope.$watch('threads', function(){
                if($scope.threads !== undefined){
                    $scope.myThread = $scope.threads[0];
                    $scope.members = $scope.myThread.members;
                    $scope.getNames($scope.members);
                }

            });
            function PersonName(name, email){
                this.namex = name;
                this.email = email;
            }

            $scope.msgPeople = [];
            $scope.getNames = function(array){
                SWBrijj.tblm('global.user_list', ['email', 'name']).then(function(data){
                    $scope.setLastLogins().then(function(){
                        var names = data;
                        for(var i = 0; i < array.length; i ++){
                            angular.forEach(names, function(ind){
                             if(array[i]== ind.email && ind.name !== null){
                                    $scope.msgPeople.push(new PersonName(ind.name, ind.email));
                                }
                                else if(array[i]== ind.email && ind.name=== null){
                                    $scope.msgPeople.push(new PersonName(ind.email, ind.email));
                                }

                            });
                        }
                        angular.forEach($scope.myLogins, function(lg){
                            angular.forEach($scope.msgPeople, function(person){
                                if(person.email == lg.email){
                                    person.login = lg.logintime;
                                }
                            });
                        });
                    });

                });
            };

            $scope.setLastLogins = function() {
                var promise = $q.defer();
                SWBrijj.tblm("global.user_tracker").then(function(logins) {
                    $scope.myLogins = logins;
                    promise.resolve($scope.myLogins);

                });
                return promise.promise;
            };

            $scope.goToPerson = function(person){
                var link;
                if(person.email == navState.userid){
                    link = '/app/account/profile';
                }
                else{
                    link = '/app/company/profile/view?id=' + encodeURIComponent(person.email);
                }
                $location.url(link);
            };
        }]
    };
});
