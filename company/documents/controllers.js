'use strict';

/* Controllers */

var documentListController = function($scope) {
	SWBrijj.procm("get_companydocs", function(data) {
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
	  SWBrijj.procm("delete_document", docname.docname, function(data) {
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
  
  SWBrijj.procm("get_docdetail", $scope.docName, function(data) {
	$scope.document = data[0];
	$scope.$apply();
	});
}
