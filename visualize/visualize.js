'use strict';

/* App Module */

var viz = angular
    .module('visualize', ['ui.bootstrap', 'ui.event', 'nav', 'brijj', 'vizServices'])

viz.config(function ($routeProvider, $locationProvider) {
    $locationProvider.html5Mode(true).hashPrefix('');

    $routeProvider.
        when('/waterfall', {templateUrl: 'pages/waterfall.html', controller: 'waterfallController'}).
        otherwise({redirectTo: '/waterfall' });
});