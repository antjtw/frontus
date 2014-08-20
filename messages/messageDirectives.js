"use strict";

var mod = angular.module('messageDirectives', ['ui.select2', 'brijj', 'ui.filters', 'ui.bootstrap']);

mod.directive('composeMessage', function() {
    return {
        scope: false,
        // replace: true,
        // transclude: false,
        restrict: 'E',
        templateUrl: '/messages/partials/composeMessage.html',
        controller: ['$scope', '$rootScope', 'SWBrijj', 'navState',

        

        function($scope, $rootScope, SWBrijj, navState) {

            $scope.zombiemessage = function(){
                if(navState.role == "issuer" && ($rootScope.billing.currentPlan == "000" || $rootScope.billing.payment_token === null || !$rootScope.billing.payment_token)){
                    return "Please update your payment information to use this feature."
                }
                else{
                    return null
                }
            }
            // this returns everyone you have ever emailed. yay
            $scope.getPeople = function(){
                SWBrijj.tblm('global.investor_list', ['email']).then(function(data){
                    $scope.emailLists = data;          
                });
                

            };
            $scope.getPeople()

            // create the object for selct2
           $scope.myContacts = []
            $scope.groupsAndPeople = function(){
                function Contact(namex, details){
                    this.namex = namex;
                    this.details = []
                }

                SWBrijj.tblm('global.investor_list', ['email']).then(function(data){
                    $scope.myEmails = data;
                    angular.forEach($scope.myEmails, function(email){
                        $scope.myContacts.push(new Contact(email.email));
                        angular.forEach($scope.myContacts, function(ct){
                            if(ct.details.indexOf(ct.namex)== -1){
                                ct.details.push(ct.namex)
                            }
                            
                        });
                    });
                });
                // make this a promise later
                SWBrijj.tblm('account.ind_user_group', ['ind_group']).then(function(data){
                    var myGroups = data;
                    angular.forEach(myGroups, function(gr){
                        var b = JSON.parse(gr.ind_group);
                        $scope.myContacts.push(new Contact(b));
                        SWBrijj.tblm('account.my_user_groups', ['email', 'json_array_elements']).then(function(data){
                            var emailGroups = data;
                            angular.forEach(emailGroups, function(group){
                                angular.forEach($scope.myContacts, function(contact){
                                    if(JSON.parse(group.json_array_elements) == contact.namex){
                                        if(contact.details.indexOf(group.email)== -1){
                                            contact.details.push(group.email);
                                        };
                                    };
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

            $scope.resetMessage();
            $scope.composeopts = {
                backdropFade: true,
                dialogFade: true
            };

            

            $scope.triggerUpgradeMessages = $rootScope.triggerUpgradeMessages;
            
            $scope.howMany = function(){
                if(location.host == 'share.wave'){
                    console.log($scope.message.recipients + "i'm at sharewave!");
                }
            };

            $scope.createRecipients = function(){
                var recipients = []
                angular.forEach($scope.message.recipients, function(recip){
                    angular.forEach($scope.myContacts, function(contact){
                        if(recip === contact.namex){
                            for(i = 0; i < contact.details.length; i++){
                                // cannot send message to the same person more than once, ie if person is in group and listed, they will only get the email one time.
                                if(recipients.indexOf(contact.details[i])== -1 && contact.details[i].indexOf('@') > -1){
                                    recipients.push(contact.details[i]);
                                };
                                
                            };
                        };
                    })
                })
                return recipients
            }

            $scope.sendMessage = function(msg) {
                var category = 'company-message';
                var template = 'company-message.html';
                var newtext = msg.text.replace(/\n/g, "<br/>");
                var recipients = $scope.createRecipients();
                recipients.push(navState.userid)
                $scope.clicked = true;
                console.log($scope.navState.userid)
                SWBrijj.procm('mail.send_message',
                            JSON.stringify(recipients),
                            null,
                            msg.subject,
                            newtext,
                            null
                ).then(function(x) {
                    void(x);
                    $rootScope.billing.usage.direct_messages_monthly += recipients.length;
                    $rootScope.$emit("notification:success",
                        "Message sent!");
                    //this works but i don't know why for the root scope
                    $rootScope.$emit('new:message');
                    $scope.resetMessage();
                    $scope.clicked = false;
                }).except(function(err) {
                    void(err);
                    $rootScope.$emit("notification:fail",
                        "Oops, something went wrong.");
                    $scope.clicked = false;
                });
            };


            
            $scope.readyToSend = function(msg) {
                if ($scope.message.recipients.length===0
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
                $scope.messagetext=msg.text
                $scope.sendername = $rootScope.person.name;
                $scope.company = $rootScope.navState.name;
            };

            $scope.previewModalClose = function(){
                $scope.previewModal = false
            };

        }]
    };
});


mod.directive('messageFilter', function(){
    return {
        scope: {sent: "=", 
                page: "="},
        // replace: true,
        // transclude: false,
        restrict: 'E',
        templateUrl: '/messages/partials/messageFilter.html',
        controller: ['$scope', '$rootScope', 'SWBrijj', '$route', 

        function($scope, $rootScope, SWBrijj, $route) {

            $scope.whichPage = function(){
                console.log($scope.page);
                console.log("hellooo");
                $scope.page="sent"
            }


        }]
    };
});

mod.directive('sentMessages', function(){
    return {
        scope: {sents: "="},
        // replace: true,
        // transclude: false,
        restrict: 'E',
        templateUrl: '/messages/partials/sent.html',
        controller: ['$scope', '$rootScope', 'SWBrijj', '$route', 

        function($scope, $rootScope, SWBrijj, $route) {

           $scope.formatMsg = function(){
                console.log($scope.sents)
                // console.log($scope.)
           }
           $scope.formatMsg();

            $scope.showString = function(string){
                if(string.length > 50){
                    return string.slice(0, 50) + "..."
                }
                else{
                    return string
                }
           }


        }]
    };
});

mod.directive('replyMessage', function(){
    return {
        scope: {thread: "="},
        // replace: true,
        // transclude: false,
        restrict: 'E',
        templateUrl: '/messages/partials/replyMessage.html',
        controller: ['$scope', '$rootScope', 'SWBrijj', '$route', 

        function($scope, $rootScope, SWBrijj, $route) {

            $scope.showThread = function(){
                console.log($scope.thread)
                console.log("hehh")
            }
            $scope.showThread()

            

        }]
    };
});

mod.directive('threadInformation', function(){
    return {
        scope: {message: "="},
        // replace: true,
        // transclude: false,
        restrict: 'E',
        templateUrl: '/messages/partials/threadInformation.html',
        controller: ['$scope', '$rootScope', 'SWBrijj', '$route', 

        function($scope, $rootScope, SWBrijj, $route) {

            $scope.showMessage = function(){
                console.log($scope.message)
                console.log("i'm on the side")
            }
            $scope.showMessage()

            // $scope.formatMessage = function(){
            //     console.log($scope.message.time)
            //     console.log(typeof $scope.message.time
            //         )
            //     console.log(typeof JSON.parse($scope.message.time))
            // }
            // $scope.formatMessage();

        }]
    };
});


