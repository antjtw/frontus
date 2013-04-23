'use strict';

/* App Module */

var docviews = angular.module('documentviews', ['ui.bootstrap'])

docviews.config(['$routeProvider', function($routeProvider) {
  $routeProvider.
      when('/documents', {templateUrl: 'v/partials/docuview.html',   controller: documentListController}).
      when('/documents/:docName/view', {templateUrl: 'v/partials/docuviewer.html', controller: documentViewController}).
	  when('/documents/:docName/status', {templateUrl: 'v/partials/docustatus.html', controller: documentStatusController}).
      otherwise({redirectTo: '/documents'});
}]);

docviews.directive('draggable', function() {
  return {
    restrict: 'A',
    link: function(scope, elm, attrs) {
      var options = scope.$eval(attrs.draggable); //allow options to be passed in
      $(elm).draggable(options);
    }
  };
});