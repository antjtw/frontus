angular.module('index', ['ui.bootstrap', 'brijj']);

function CarouselCtrl($scope) {
  $scope.myInterval = 'false';
  $scope.slides = [
    {"image": "/img/cap-slide-grants.png",
    "headline": "Ownership",
     "text": "Build a more powerful cap table by adding dates and terms for every entry"},
    {"image": "/img/cap-slide-ownership.png",
     "headline": "Options & Grants",
     "text": "Track the progression of outstanding grants & options"},
    {"image": "/img/cap-slide-status.png",
    "headline": "Status",
     "text": "Keep record of who's viewed and exported your data"}
    ];        
}
