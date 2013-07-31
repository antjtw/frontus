angular.module('index', ['ui.bootstrap', 'brijj']);



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

function IndexCtrl($scope, $rootScope, $route, $routeParams) {
    if ($routeParams.logout == 1) {
        $rootScope.notification.show('success', 'You have successfully logged out');     
    }
}

function CarouselCtrl($scope) {
  $scope.myInterval = 'false';
  $scope.slides = [
    {"image": "/img/cap-slide-ownership.png",
    "headline": "Ownership",
     "text": "Build a more powerful cap table by adding dates and terms for every entry"},
    {"image": "/img/cap-slide-grants.png",
     "headline": "Options & Grants",
     "text": "Track the progression of outstanding grants & options"},
    {"image": "/img/cap-slide-status.png",
    "headline": "Status",
     "text": "Keep record of who's viewed and exported your data"}
    ];        
}

function test($scope) {

$scope.toggle = true;
}
