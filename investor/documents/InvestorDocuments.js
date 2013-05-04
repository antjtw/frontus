'use strict';

/* App Module */

var docviews = angular.module('documentviews', ['ui.bootstrap']);

docviews.config(function($routeProvider, $locationProvider) {
  $locationProvider.html5Mode(true).hashPrefix('');
    
  $routeProvider.
      when('/', {templateUrl: 'docuview.html',   controller: documentListController}).
      when('/view', {templateUrl: 'docuviewer.html', controller: documentViewController}).
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
	SWBrijj.procm("document.get_investordocs").then(function(data) {
	$scope.documents = data;
	console.log(data);
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
							 		
};

function documentViewController($scope, $routeParams) {
  var docId = $routeParams.doc;
  
  console.log("Outside Loop");
  $scope.init = function () {
  	  console.log("Happening");
	  SWBrijj.procm("document.get_docmetaI", docId).then(function(data) {
		$scope.documents = data[0];
		$scope.$apply();
		});
  };
  
  
  var imageObj = new Image();
  
  	imageObj.src = 'https://s3.amazonaws.com/s3.documentcloud.org/documents/19864/pages/goldman-sachs-internal-emails-p1-large.gif';
  
  imageObj.onload = function() {
	  	var width = 1024;
		var scaling = (imageObj.height/imageObj.width)
		var height = (1024 * scaling)
		var n = 26;
		$scope.images = []
		for(var i=1; i<n; i++) {
			$scope.images.push({"src": "", "pagenum": i});
		};
		$scope.images[0].src = "https://s3.amazonaws.com/s3.documentcloud.org/documents/19864/pages/goldman-sachs-internal-emails-p1-large.gif"
		$scope.currentPage = {"src": $scope.images[0].src, "pageNum": $scope.images[0].pagenum}
		$scope.images;
		$scope.$apply();
      };

	$scope.nextPage = function(value) {
		console.log(value);
		var pageRequired = parseInt(value) + 1;
		console.log(pageRequired);
		if ($scope.images[pageRequired-1].src == "") {
			$scope.images[pageRequired-1].src ='https://s3.amazonaws.com/s3.documentcloud.org/documents/19864/pages/goldman-sachs-internal-emails-p' +pageRequired + '-large.gif';
		}
		$scope.currentPage.src = ($scope.images[pageRequired-1].src)
		$scope.currentPage.pageNum = pageRequired;

	};

	$scope.previousPage = function(value) {
		var pageRequired = parseInt(value) - 1;
		if (pageRequired > 0) {
			if ($scope.images[pageRequired-1].src == "") {
				$scope.images[pageRequired-1].src ='https://s3.amazonaws.com/s3.documentcloud.org/documents/19864/pages/goldman-sachs-internal-emails-p' +pageRequired + '-large.gif';
			}
			$scope.currentPage.src = ($scope.images[pageRequired-1].src)
			$scope.currentPage.pageNum = pageRequired;
			}
	};

	$scope.jumpPage = function(value) {
		var pageRequired = value;
		if ($scope.images[pageRequired-1].src == "") {
			$scope.images[pageRequired-1].src ='https://s3.amazonaws.com/s3.documentcloud.org/documents/19864/pages/goldman-sachs-internal-emails-p' +pageRequired + '-large.gif';
		}
		$scope.currentPage.src = ($scope.images[pageRequired-1].src)
		$scope.currentPage.pageNum = pageRequired;

	};
}

/* Services */


/* Filters */

angular.module('documentviews').filter('fromNow', function() {
			return function(date) {
			  return moment(date).fromNow();
			}
		  });
		  
		  