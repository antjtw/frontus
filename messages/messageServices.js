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
    var peopleDict = {};

    SWBrijj.tblm('global.user_list', ['email', 'name']).then(function(info){
        angular.forEach(info, function(inf){
            allUsers.push(inf);
            allPeople.push(inf);
            allEmails.push(inf.email);
            if (inf.email == navState.userid)
                peopleDict[inf.email] = "me";
            else
                peopleDict[inf.email] = inf.name;
        });
        //All of the messages and threads rely on allPeople, so fill in that
        //array and then call a function to start filling all msg arrays.
        fillMessages();
    });

    function fillMessages() {
        SWBrijj.tblm('mail.my_messages').then(function(msg){
            angular.forEach(msg, function(ms){
                ms.time = new Date(ms.time);
                ms.names = [];
                ms.membersArray = JSON.parse(ms.members);
                for(var i = 0; i < ms.membersArray.length; i ++)
                {
                    var n = peopleDict[ms.membersArray[i]];
                    if (!n)
                        n = "";
                    ms.names.push(n);
                }
                ms.nameString = ms.names.join(", ");
                allMessages.push(ms);
                if(ms.sender == navState.userid)
                {
                    allSentThreads.push(ms);
                }
                else
                {
                    allReceivedMsgs.push(ms);
                }
            });
            fillThreads();
        });
    }
    
    function fillThreads() {
        SWBrijj.tblm('mail.my_threads', ['members', 'thread_id', 'subject', 'starts_like', 'count']).then(function(data){
            angular.forEach(data, function(thr){
                thr.names = [];
                thr.membersArray = JSON.parse(thr.members);
                for(var i = 0; i < thr.membersArray.length; i ++)
                {
                    var n = peopleDict[thr.membersArray[i]];
                    if (!n)
                        n = "";
                    thr.names.push(n);
                }
                thr.nameString = thr.names.join(", ");
                thr.maxTime = null;
                thr.times = [];
                angular.forEach(allMessages, function(all){
                    if(all.thread_id === thr.thread_id && thr.times.indexOf(all.time)== -1){
                        thr.times.push(all.time);
                        if (!thr.maxTime || thr.maxTime < all.time)
                            thr.maxTime = all.time
                    }
                });
                messages.allThreads.push(thr);
            });
        });
    }


    this.getReceivedMsgs = function(){
        return allReceivedMsgs;
    };

    this.getSentMsgs = function(){
        return allSentThreads;
    };

    this.getAllMsgs = function() {
        return allMessages;
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
