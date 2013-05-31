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
	};

	$scope.searchFilter = function (obj) {
        var re = new RegExp($scope.query, 'i');
        return !$scope.query || re.test(obj.docname);
    };
							 		
};

function documentViewController($scope, $routeParams) {
  var docId = $routeParams.doc;
  $scope.currentDoc = docId;
  $scope.signable = "";
  
  $scope.init = function () {
	  SWBrijj.procm("document.get_docmetaI",  parseInt(docId)).then(function(data) {
		$scope.documents = data[0];
		$scope.$apply();
		SWBrijj.proc("document.get_docstatus", parseInt(docId)).then(function(data) {
			console.log(data[1][0]);
			if (data[1][0] == "needsign") {
				$scope.signable = 0;
			}
			else {
				$scope.signable = 2;	
			}

			});

		});
		
  };
  
  
  var imageObj = new Image();
  
  imageObj.src = "/photo/docpg?id="+docId+"&page=1";

  $scope.doclength = 1;
  
  imageObj.onload = function() {
  		SWBrijj.procm("document.get_doclength", parseInt(docId)).then(function(data) {
	  		console.log(data);
			$scope.doclength = data[0];
			console.log($scope.doclength);
			var width = 1024;
			var scaling = (imageObj.height/imageObj.width)
			var height = (1024 * scaling)
			var n = $scope.doclength.get_doclength + 1;
			console.log(n);
			$scope.images = []
			for(var i=1; i<n; i++) {
				$scope.images.push({"src": "", "pagenum": i});
			};
			$scope.images[0].src = imageObj.src;
			$scope.currentPage = {"src": $scope.images[0].src, "pageNum": $scope.images[0].pagenum}
			$scope.images;
			$scope.$apply();
		});
      };

	$scope.nextPage = function(value) {
		console.log(value);
		var pageRequired = parseInt(value) + 1;
		console.log(pageRequired);
		if ($scope.images[pageRequired-1].src == "") {
			$scope.images[pageRequired-1].src ='/photo/docpg?id='+$scope.currentDoc+'&page=' +pageRequired;
		}
		$scope.currentPage.src = ($scope.images[pageRequired-1].src)
		$scope.currentPage.pageNum = pageRequired;

	};

	$scope.previousPage = function(value) {
		var pageRequired = parseInt(value) - 1;
		if (pageRequired > 0) {
			if ($scope.images[pageRequired-1].src == "") {
				$scope.images[pageRequired-1].src ='/photo/docpg?id=' +$scope.currentDoc+'&page='+pageRequired;
			}
			$scope.currentPage.src = ($scope.images[pageRequired-1].src)
			$scope.currentPage.pageNum = pageRequired;
			}
	};

	$scope.jumpPage = function(value) {
		var pageRequired = value;
		if ($scope.images[pageRequired-1].src == "") {
			$scope.images[pageRequired-1].src ='/photo/docpg?id='+$scope.currentDoc+'&page=' +pageRequired;
		}
		$scope.currentPage.src = ($scope.images[pageRequired-1].src)
		$scope.currentPage.pageNum = pageRequired;

	};

	$scope.submitSign = function(sig) {
		if (sig == false || sig == undefined) {
			alert("Need to click the box");
		}
		if (sig == true) {
			SWBrijj.procm("document.sign_document", parseInt(docId)).then(function(data) {
				$scope.signable = 1;
				$scope.$apply();
			});
		}
	};

}

/* Services */


/* Filters */

angular.module('documentviews').filter('fromNow', function() {
			return function(date) {
			  return moment(date).fromNow();
			}
		  });
		  
		  