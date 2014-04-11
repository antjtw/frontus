var app = angular.module('index', ['ngRoute', 'ui.bootstrap', 'brijj', 'nav', 'registerDirective']);



app.config(function($routeProvider, $locationProvider){
    $locationProvider.html5Mode(true);

    $routeProvider.
        when('/', {controller: 'IndexCtrl', templateUrl: 'empty.js'});
}).run( function($rootScope, $location) {
        $rootScope.$on("$locationChangeStart", function(event, next){
            if (document.location.href != next) {
                document.location.href = next;
            }
        });
    });

app.controller('IndexCtrl', ['$scope','$rootScope','$route','$location', '$routeParams','SWBrijj',
    function($scope, $rootScope, $route, $location, $routeParams, SWBrijj) {
        if ($routeParams.logout) {
            $scope.$emit('notification:success', 'You have successfully logged out');
            return;
        }
        $scope.$on('update:companies', function(ev, companies) {
            if (companies.length > 0) {
                $scope.incompany = true;
            }
        });

        if ($routeParams.video) {
            $scope.modalUp();
        }

       $scope.registertoggle = false;

        var re = /^(([^<>()[\]\\.,;:\s@\"]+(\.[^<>()[\]\\.,;:\s@\"]+)*)|(\".+\"))@((\[[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\])|(([a-zA-Z\-0-9]+\.)+[a-zA-Z]{2,}))$/;
        $scope.fieldCheck = function(email) {
            return re.test(email);
        };

        /*  if ($rootScope.isLoggedIn) {
         if ($rootScope.selected.isAdmin) { // If user does not belong in a company, the link will be the default homepage URL
         document.location.href='/home/company';
         } else {
         document.location.href='/home';
         }
         }*/


        $scope.toggle = false;

        $scope.opts = {
            backdropFade: true,
            dialogFade:true,
            dialogClass: 'externalmodal modal'
        };

        $scope.tellFriendUp = function () {
            $scope.taf = {'yourname': "", 'sendEmail': "", 'customemessage': ""};
            $scope.tafModal = true;
        };

        $scope.friendClose = function () {
            $scope.tafModal = false;
        };

        $scope.tellafriend = function() {
            console.log($scope.taf.yourname);
            var cm = $scope.taf.custommessage ? $scope.taf.custommessage : "";
            SWBrijj.tellafriend($scope.taf.yourname, $scope.taf.sendEmail, cm).then(function(x) {
                void(x);
                $scope.$emit('notification:success', 'Invitation sent!');
            }).except(function (x) {
                    $scope.$emit('notification:fail', 'Oops. Something went wrong.');
                });
        }

    }]);

