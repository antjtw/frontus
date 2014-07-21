var app = angular.module('index', ['ngRoute', 'ui.bootstrap', 'brijj', 'nav', 'registerDirective', 'duScroll']);



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

        $scope.register = function() {
            document.location.href = "/pricing/";
        };

        $scope.toggle = false;

    }]);

app.directive("scroll", function ($window) {
    return function(scope, element, attrs) {
        angular.element($window).bind("scroll", function() {
            if (this.pageYOffset >= ($( window ).height() - 80)) {
                scope.scrolled = true;
            } else {
                scope.scrolled = false;
            }
            scope.$apply();
        });
    };
});

