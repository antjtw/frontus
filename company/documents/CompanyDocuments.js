'use strict';

/* App Module */

var docviews = angular.module('documentviews', ['ui.bootstrap']);

docviews.config(function($routeProvider, $locationProvider) {
  $locationProvider.html5Mode(true).hashPrefix('');
    
  $routeProvider.
      when('/', {templateUrl: 'docuview.html',   controller: documentListController}).
      when('/:docName/view', {templateUrl: 'docuviewer.html', controller: documentViewController}).
	  when('/:docName/status', {templateUrl: 'docustatus.html', controller: documentStatusController}).
      otherwise({redirectTo: '/'});
});

docviews.directive('draggable', function() {
  return {
    restrict: 'A',
    link: function(scope, elm, attrs) {
      var options = scope.$eval(attrs.draggable); //allow options to be passed in
      $(elm).draggable(options);
    }
  };
});

/* Controllers */

var documentListController = function($scope) {
	SWBrijj.procm("get_companydocs").then(function(data) {
	$scope.documents = data;
	$scope.$apply();
	});
	
	$scope.docOrder = 'docname';
	
	$scope.setOrder = function(field) {
		if ($scope.docOrder == field) {
			$scope.docOrder = ('-' + field);
		}
		else {
			$scope.docOrder = field;
		}
	}
			
	$scope.delete = function(docname) {
	  console.log(docname.docname);
	  SWBrijj.procm("delete_document").then(docname.docname, function(data) {
		  console.log(data);
		  console.log(docname);
		  $scope.documents.forEach(function(docu) {				  
			if (docname === docu)
				$scope.documents.splice($scope.documents.indexOf(docname),1);
			});
		});				  
	};		
};

function documentViewController($scope, $routeParams) {
  $scope.docName = $routeParams.docName;
}

function documentStatusController($scope, $routeParams) {
  $scope.docName = $routeParams.docName;
  
  SWBrijj.procm("get_docdetail", $scope.docName).then(function(data) {
	$scope.document = data[0];
	$scope.$apply();
	});
}


/* Filters */

angular.module('documentviews').filter('fromNow', function() {
			return function(date) {
			  return moment(date).fromNow();
			}
		  });
		  
		  