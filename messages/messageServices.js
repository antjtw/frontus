'use strict';

var service = angular.module('commonServices');

service.service('Message', ['SWBrijj', 'navState', '$q', function(SWBrijj, navState, $q){

    var allUsers = []
 
    var promise = $q.defer();
    SWBrijj.tblm('global.user_list', ['email', 'name']).then(function(data){
        angular.forEach(data, function(user){
            allUsers.push(user);
      }); 
   }); 

  var allThreads = []
  var getArrayFromPostgres = function(array){
    var array1 = array.replace("{", "");
    var array2 = array1.replace("}", "");
    var array3 = array2.split(",");
    return array3;
  };

  var allPeople = [];
  var testArray = [];

  SWBrijj.tblm('mail.my_threads', ['members', 'thread_id', 'subject', 'starts_like']).then(function(data){
    angular.forEach(data, function(thr){
        thr.names = [];
        thr.membersArray = getArrayFromPostgres(thr.members)
        allThreads.push(thr);
    });
    SWBrijj.tblm('global.user_list', ['email', 'name']).then(function(info){
        angular.forEach(info, function(inf){
           allPeople.push(inf);
        });
        angular.forEach(allThreads, function(thread){
        for(var i = 0; i < thread.membersArray.length; i ++){
            testArray.push(thread.membersArray[i]);
            angular.forEach(allPeople, function(person){
                if(person.email == thread.membersArray[i] && person.name !== null){
                    thread.names.push(person.name);
                }

            })
        }
    })
    });
    




  });

  var myMsgs = []

  
  this.getAllThreads = function(){
    return allThreads;
  };

  var allMessages = [];
  this.getAllNames = function(){
    return allUsers;
  }

  this.getAllPeople = function(){
    return allPeople;
  }

  this.getTestArray = function(){
    return testArray;
  }

}]);

