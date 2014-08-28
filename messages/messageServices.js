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
    var array3 = array2.split(", ");
    return array3;
  };

  SWBrijj.tblm('mail.my_threads', ['members', 'thread_id', 'subject', 'starts_like']).then(function(data){
    angular.forEach(data, function(thr){
        thr.membersArray = getArrayFromPostgres(thr.members)
        allThreads.push(thr);
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

}]);

