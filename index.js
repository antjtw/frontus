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
        $scope.register = function() {
            document.location.href = "/pricing/";
        };

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
        };

        $('[data-typer-targets]').typer();

        $scope.getpagetarget = function() {
            var currentValue = $('#targetcontent')[0].innerText;
            if ("I want to keep track of our investors".startsWith(currentValue)) {
                ga('send', 'event', 'homepage', 'hero-click', 'I want to keep track of our investors');
                document.location.href = '/features/cap';
            } else if ("I want to model our company value".startsWith(currentValue)) {
                ga('send', 'event', 'homepage', 'hero-click', 'I want to model our company value');
                document.location.href = '/features/cap';
            } else if ("I want to share documents securely".startsWith(currentValue)) {
                ga('send', 'event', 'homepage', 'hero-click', 'I want to share documents securely');
                document.location.href = '/features/doc';
            } else if ("I want to have documents e-signed".startsWith(currentValue)) {
                ga('send', 'event', 'homepage', 'hero-click', 'I want to have documents e-signed');
                document.location.href = '/features/doc';
            } else if ("I want to grant options hassle free".startsWith(currentValue)) {
                ga('send', 'event', 'homepage', 'hero-click', 'I want to grant options hassle free');
                document.location.href = '/features/#options';
            }
        }

    }]);

if (typeof String.prototype.startsWith != 'function') {
    // see below for better implementation!
    String.prototype.startsWith = function (str){
        return this.indexOf(str) == 0;
    };
}

