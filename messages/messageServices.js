'use strict';

var service = angular.module('commonServices');

service.service('Message', ['SWBrijj', 'navState', function(SWBrijj, navState){

    var allUsers = []
    SWBrijj.tblm('global.user_list').then(function(data){
     angular.forEach(data, function(user){
        allUsers.push(user);
      }); 
   }); 

  var allThreads = []
  SWBrijj.tblm('mail.my_threads', ['members', 'thread_id', 'subject', 'starts_like']).then(function(data){
    angular.forEach(data, function(thr){
      allThreads.push(thr);
    });
  });
  
  this.getAllThreads = function(){
    return allThreads;
  };

}]);

