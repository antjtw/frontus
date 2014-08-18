'use strict';

app.controller('MsgCtrl', ['$scope', '$rootScope', 'SWBrijj', 'navState', '$route', '$location',
    function($scope, $rootScope, SWBrijj, navState, $route, $location) {

        $scope.createInbox = function(){
            SWBrijj.tblm('mail.my_company_outbox', ['tox', 'message', 'subject', 'id']).then(function(data){
                $scope.sentMessages = data;

            })
        };
        $scope.createInbox();


        $scope.compose = false;
        $scope.toggleMain = function(){
            if($scope.compose == true){
                $scope.compose = false
                console.log($scope.compose)
            }
            else{
                $scope.compose = true
                console.log($scope.compose)
            };
        };

        


    }
]);