
var app = angular.module('index', ['ngResource', 'ui.bootstrap', 'brijj']);

function CollapseLoginCtrl($scope) {
  $scope.isCollapsed = true;

} );

function HomeCtrl($scope) {
  $scope.ok = 1;
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


function Ctrl($scope) {
}
