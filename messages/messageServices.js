'use strict';

var service = angular.module('commonServices');

var Messages = function() {
    this.allThreads = [];
};

service.service('Message', ['SWBrijj', 'navState', '$q', function(SWBrijj, navState, $q){

    var messages = new Messages();
    var allUsers = [];
    var allPeople = [];
    var allEmails = [];
    var allSentThreads = [];
    var allReceivedMsgs = [];
    var allMessages = [];

    SWBrijj.tblm('global.user_list', ['email', 'name']).then(function(info){
        angular.forEach(info, function(inf){
           allPeople.push(inf);
           if(allEmails.indexOf(inf.email)=== -1){
                allEmails.push(inf.email);
           }
        });
        //All of the messages and threads rely on allPeople, so fill in that
        //array and then call a function to start filling all msg arrays.
        fillMessages();
    });

    function fillMessages() {
        SWBrijj.tblm('mail.my_messages').then(function(msg){
            angular.forEach(msg, function(ms){
                allMessages.push(ms);
                ms.names = [];
                ms.membersArray = getArrayFromPostgres(ms.members);
                for(var i = 0; i < ms.membersArray.length; i ++)
                {
                    angular.forEach(allPeople, function(person){
                        if(person.email == ms.membersArray[i] && person.name !== null && ms.membersArray[i]!== navState.userid && person.name !=="" && ms.names.indexOf(person.name)==-1){
                            ms.names.push(person.name);
                        }
                        else if(ms.membersArray[i]== person.email && person.name === null && ms.membersArray[i]!== navState.userid){
                            ms.names.push(person.email);
                        }
                        else if(ms.membersArray[i]== person.email && person.email == navState.userid && ms.names.indexOf("me")== -1){
                            ms.names.push("me");
                        }
                        else if(allEmails.indexOf(ms.membersArray[i])== -1 && ms.names.indexOf(ms.membersArray[i])== -1){
                            ms.names.push(ms.membersArray[i]);
                        }
                        else if(ms.membersArray[i]==person.email && person.name ==="" && ms.names.indexOf(ms.membersArray[i])== -1){
                                ms.names.push(ms.membersArray[i]);
                        }
                    });
                }
                ms.nameString = ms.names.join(", ");
                if(ms.sender == navState.userid)
                {
                    allSentThreads.push(ms);
                }
                else
                {
                    allReceivedMsgs.push(ms);
                }
            });
        });

        SWBrijj.tblm('global.user_list', ['email', 'name']).then(function(data){
            angular.forEach(data, function(user){
                allUsers.push(user);

          });
        });

        var getArrayFromPostgres = function(array){
            var array1 = array.replace("{", "");
            var array2 = array1.replace("}", "");
            var array3 = array2.split(",");
            return array3;
        };


        SWBrijj.tblm('mail.my_threads', ['members', 'thread_id', 'subject', 'starts_like', 'count']).then(function(data){
            angular.forEach(data, function(thr){
                thr.names = [];
                thr.membersArray = getArrayFromPostgres(thr.members);
                messages.allThreads.push(thr);
            });
            SWBrijj.tblm('global.user_list', ['email', 'name']).then(function(info){
                angular.forEach(info, function(inf){
                   allPeople.push(inf);
                   if(allEmails.indexOf(inf.email)=== -1){
                        allEmails.push(inf.email);
                   }
                });
                angular.forEach(messages.allThreads, function(thread){
                    for(var i = 0; i < thread.membersArray.length; i ++){
                        angular.forEach(allPeople, function(person){
                            if(person.email == thread.membersArray[i] && person.name !== null && thread.membersArray[i]!== navState.userid && person.name !== ""){
                                thread.names.push(person.name);
                            }
                            else if(thread.membersArray[i]== person.email && person.name === undefined && thread.membersArray[i]!== navState.userid){
                                thread.names.push(person.email);
                            }
                            else if(thread.membersArray[i]== person.email && person.email == navState.userid && thread.names.indexOf("me")== -1){
                                thread.names.push("me");
                            }
                            else if(allEmails.indexOf(thread.membersArray[i])== -1 && thread.names.indexOf(thread.membersArray[i])== -1){
                                thread.names.push(thread.membersArray[i]);
                            }
                            else if(thread.membersArray[i]==person.email && person.name ==="" && thread.names.indexOf(thread.membersArray[i])== -1){
                                thread.names.push(thread.membersArray[i]);
                            }

                        });
                    }
                });
                angular.forEach(messages.allThreads, function(thr){
                    thr.nameString = thr.names.join(", ");
                });
                angular.forEach(messages.allThreads, function(thr){
                    thr.times = [];
                    angular.forEach(allMessages, function(all){
                        if(all.thread_id === thr.thread_id && thr.times.indexOf(all.time)== -1){
                            thr.times.push(all.time);
                            thr.timex = all.time;
                        }
                    });
                });
            });

        });
    }


    this.getReceivedMsgs = function(){
        return allReceivedMsgs;
    };

    this.getSentMsgs = function(){
        return allSentThreads;
    };

    this.getAllThreads = function(){
        return messages.allThreads;
    };

    this.getAllNames = function(){
        return allUsers;
    };

    this.getAllPeople = function(){
        return allPeople;
    };

    this.getAllEmails = function(){
        return allEmails;
    };

}]);
