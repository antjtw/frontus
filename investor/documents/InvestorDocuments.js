'use strict';

/* App Module */
var docviews = angular.module('documentviews', ['documents','ui.bootstrap','brijj']);

docviews.config(function($routeProvider, $locationProvider) {
  $locationProvider.html5Mode(true).hashPrefix('');
    
  $routeProvider.
      when('/', {templateUrl: 'docuview.html',   controller: InvestorDocumentListController}).
      when('/view', {templateUrl: 'docuviewer.html', controller: InvestorDocumentViewController}).
      otherwise({redirectTo: '/'});
});

/*docviews.directive('draggable', function() {
  return {
    restrict: 'A',
    link: function(scope, elm, attrs) {
      var options = scope.$eval(attrs.draggable); //allow options to be passed in
      $(elm).draggable(options);
    }
  };
});
*/

docviews.filter('fromNow', function() {
  return function(date) {
    var d = moment(date);
    if (d) return d.fromNow();
  }
});


/* Controllers */

function InvestorDocumentListController($scope, SWBrijj) {
	SWBrijj.tblm("document.my_investor_library").then(function(data) {
	$scope.documents = data;
	});
	
	$scope.docOrder = 'docname';
	
	$scope.setOrder = function(field) {
	  $scope.docOrder = $scope.docOrder == field ? '-' + field : field;
	};

	$scope.searchFilter = function (obj) {
     var re = new RegExp($scope.query, 'i');
     return !$scope.query || re.test(obj.docname);
  };

  $scope.time = function(doc) {
    return doc.when_signed || doc.signature_deadline;
  }
							 		
}

function InvestorDocumentViewController($scope, $routeParams, $compile, SWBrijj) {
  $scope.docId = parseInt($routeParams.doc);

  $scope.init = function () {
    SWBrijj.tblm("document.my_investor_library", "doc_id", $scope.docId).then(function(data) {
      $scope.docname=data.docname;
    });

  };
}
