var app = angular.module('index', ['ui.bootstrap', 'brijj', 'nav']);



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
  $scope.user = {};
  if ($routeParams.logout) {
    $scope.$emit('notification:success', 'You have successfully logged out');
    return;
  }

/*  if ($rootScope.isLoggedIn) {
    if ($rootScope.selected.isAdmin) { // If user does not belong in a company, the link will be the default homepage URL
      document.location.href='/home/company';
    } else {
      document.location.href='/home';
    }
  }*/

  $scope.fieldCheck = function() {
    return !($scope.user.email && $scope.user.name && $scope.user.company);
  };

  $scope.toggle = true;

  $scope.companyRequest = function () {
      SWBrijj.companyPreregister('', $scope.user.email, $scope.user.company, $scope.user.name).then(function (x) {
        void(x);
      }).except(function (x) {
        void(x);
      });
  };

  $scope.opts = {
    backdropFade: true,
    dialogFade:true,
    dialogClass: 'videoModal modal'
  };

  $scope.modalUp = function () {
    $scope.video = true;
  };
    
  $scope.close = function () {
    $scope.closeMsg = 'I was closed at: ' + new Date();
    $scope.video = false;
  };



}]);

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
