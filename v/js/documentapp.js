'use strict';

/* App Module */

angular.module('documentviews', ['ui.bootstrap']).
  config(['$routeProvider', function($routeProvider) {
  $routeProvider.
      when('/documents', {templateUrl: 'v/partials/docuview.html',   controller: documentListController}).
      when('/documents/:docName/view', {templateUrl: 'v/partials/docuviewer.html', controller: documentViewController}).
	  when('/documents/:docName/status', {templateUrl: 'v/partials/docustatus.html', controller: documentStatusController}).
      otherwise({redirectTo: '/documents'});
}]);
