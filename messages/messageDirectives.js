"use strict";

var mod = angular.module('messageDirectives', ['ui.select2', 'brijj', 'ui.filters', 'ui.bootstrap']);

mod.directive('composeMessage', function() {
    return {
        scope: false,
        // replace: true,
        // transclude: false,
        restrict: 'E',
        templateUrl: '/messages/partials/composeMessage.html',
        controller: ['$scope', '$rootScope', 'SWBrijj', 'navState', '$location',

        

        function($scope, $rootScope, SWBrijj, navState, $location) {

            $scope.zombiemessage = function(){
                if(navState.role == "issuer" && ($rootScope.billing.currentPlan == "000" || $rootScope.billing.payment_token === null || !$rootScope.billing.payment_token)){
                    return "Please update your payment information to use this feature."
                }
                else{
                    return null
                }
            };
            // this returns everyone you have ever emailed. yay
            $scope.getPeople = function(){
                SWBrijj.tblm('global.investor_list', ['email']).then(function(data){
                    $scope.emailLists = data;          
                });
                

            };
            $scope.getPeople()

            $scope.groupMessage = false
            $scope.selectGroupMessage = function(){
                if($scope.groupMessage == false){
                    $scope.groupMessage = true;
                }
                else if($scope.groupMessage == true){
                    $scope.groupMessage = false;
                };
            };

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
                            };
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
                                if(recipients.indexOf(navState.userid) > -1){
                                    recipients.splice(indexOf(navState.userid, 1));
                                }
                                
                            };
                        };
                    })
                })
                return recipients
            }

            $scope.sendBulkMessage = function(msg) {
                var category = 'company-message';
                var template = 'company-message.html';
                var newtext = msg.text.replace(/\n/g, "<br/>");
                var recipients = $scope.createRecipients();
                console.log(recipients);
                $scope.clicked = true;
                SWBrijj.procm('mail.send_bulk_message',
                            JSON.stringify(recipients),
                            msg.subject,
                            newtext,
                            null
                ).then(function(x) {
                    void(x);
                    $rootScope.billing.usage.direct_messages_monthly += recipients.length;
                  
                    $rootScope.$emit("notification:success",
                        "Message sent!");
                    $rootScope.$emit('new:message');
                    // $scope.resetMessage();
                    $scope.clicked = false;
                    $location.url('/app/company/messages/');
                }).except(function(err) {
                    void(err);
                    $rootScope.$emit("notification:fail",
                        "Oops, something went wrong.");
                    $scope.clicked = false;
                });
            };

            $scope.sendMessage = function(msg) {
                var category = 'company-message';
                var template = 'company-message.html';
                var newtext = msg.text.replace(/\n/g, "<br/>");
                var recipients = $scope.createRecipients();
                recipients.push(navState.userid)
                $scope.clicked = true;
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
                    $location.url('/app/company/messages/');
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
                page: "=",
                inbox: "=",
                ilength: "="},
        // replace: true,
        // transclude: false,
        restrict: 'E',
        templateUrl: '/messages/partials/messageFilter.html',
        controller: ['$scope', '$rootScope', 'SWBrijj', '$route', 

        function($scope, $rootScope, SWBrijj, $route) {

            $scope.whichPage = function(){
                console.log($scope.page);
                $scope.page="sent"
            };


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

            $scope.showString = function(string){
                if(string.length > 70){
                    return string.slice(0, 70) + "...";
                }
                else{
                    return string;
                }
            };




            $scope.getArrayfromPosgres = function(array){
                var array1 = array.replace("{", "");
                var array2 = array1.replace("}", "");
                var array3 = array2.split(",");
                return array3;
            }

            $scope.formatSents = function(){
                angular.forEach($scope.sents, function(msg){
                    msg.members = $scope.getArrayfromPosgres(msg.members).join(", ")
                });
            };
            $scope.formatSents();
        }]
    };
});


// this is the information on the side of the page that is not currently implemented
mod.directive('threadInformation', function(){
    return {
        scope: {thread: "="},
        // replace: true,
        // transclude: false,
        restrict: 'E',
        templateUrl: '/messages/partials/threadInformation.html',
        controller: ['$scope', '$rootScope', 'SWBrijj', '$route', 

        function($scope, $rootScope, SWBrijj, $route) {

            console.log($scope.thread);
            $scope.$watch('thread', function(){
                console.log($scope.thread);
                $scope.showMessage();
            });

            $scope.showMessage = function(){
                $scope.myMessage = $scope.thread
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
        // replace: true,
        // transclude: false,
        restrict: 'E',
        templateUrl: '/messages/partials/threadPeople.html',
        controller: ['$scope', '$rootScope', 'SWBrijj', '$route', 'navState',

        function($scope, $rootScope, SWBrijj, $route, navState) {

            $scope.getPhotoUrl = function(sender){
                if(sender == navState.userid){
                    return '/photo/user?id=company:' + navState.company;
                }
                else if(sender !== navState.userid && $scope.investors.indexOf(sender) > - 1){
                    return '/photo/user?id=issuer:' + sender;
                }
                else if(sender !== navState.userid && $scope.investors.indexOf(sender) === - 1){
                     return '/photo/user?id=investor:' + sender;
                }
                else{
                    return '/img/ike.png';
                };
            };

            $scope.getArrayfromPostgres = function(array){
                var array1 = array.replace("{", "");
                var array2 = array1.replace("}", "");
                var array3 = array2.split(",");
                return array3;
            };

            $scope.$watch('threads', function(){
                if($scope.threads !== undefined){
                    $scope.myThread = $scope.threads[0]
                    var members = $scope.myThread.members;
                    $scope.members = $scope.getArrayfromPostgres(members);
                    $scope.getNames($scope.members);
                }
                
            })
            function personName(name, email){
                this.namex = name;
                this.email = email;
            };

            $scope.msgPeople = [];
            $scope.getNames = function(array){
                SWBrijj.tblm('global.user_list', ['email', 'name']).then(function(data){
                    var names = data;
                    angular.forEach(names, function(ind){
                        for(var i = 0; i < array.length; i ++){
                            if(array[i]== ind.email && ind.name !== null){
                                $scope.msgPeople.push(new personName(ind.name, ind.email))
                            }
                            else if(array[i]== ind.email && ind.name== null){
                                $scope.msgPeople.push(new personName(ind.email, ind.email));
                            }
                        }
                        
                    });          
                });  
            };

           

          

           

        }]
    };
});


