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
  
  	function drawImage(imageObj) { 
  
  		var stage = new Kinetic.Stage({
        container: 'canvas',
        width: 1024,
        height: 1000
      });
      var layer = new Kinetic.Layer();
      var group = new Kinetic.Group({
        draggable: true
      });
	  
	  var pageImg = new Kinetic.Image({
          image: imageObj,
          x: 0,
          y: 0,
          width: $scope.images.width,
          height: $scope.images.height,
          draggable: true
        });
		
		group.add(pageImg);
	

      group.on('mouseover', function() {
        document.body.style.cursor = 'pointer';
      });
      group.on('mouseout', function() {
        document.body.style.cursor = 'default';
      });

      layer.add(group);
      stage.add(layer);
	  
	  	};
		
	var imageObj = new Image();
  
  	imageObj.src = 'https://s3.amazonaws.com/s3.documentcloud.org/documents/19864/pages/goldman-sachs-internal-emails-p1-large.gif';
	var width = 1024;
	var scaling = (imageObj.height/imageObj.width)
	var height = (1024 * scaling)
  
  $scope.images = {"src":'https://s3.amazonaws.com/s3.documentcloud.org/documents/19864/pages/goldman-sachs-internal-emails-p1-large.gif', "baseWidth": width, "baseHeight":height, "width": width, "height":height}
  
  imageObj.onload = function() {
        drawImage(this);
      };
  
  $scope.zoomIn = function() {
     stage.clearRect(0, 0, canvas.width, canvas.height);
	 var newWidth = $scope.images.width * 1.2;
	 var newHeight = $scope.images.height * 1.2;
	 var newX = -((newWidth - $scope.images.baseWidth) / 2)
	 $scope.images.width = newWidth;
	 $scope.images.height = newHeight;
	 stage.drawImage(imageObj, newX, y, newWidth, newHeight);
  };
  
  $scope.zoomOut = function() {
	 stage.clearRect(0, 0, canvas.width, canvas.height);
	 var newWidth = $scope.images.width / 1.2;
	 var newHeight = $scope.images.height / 1.2;
	 var newX = -((newWidth - $scope.images.baseWidth) / 2)
	 $scope.images.width = newWidth;
	 $scope.images.height = newHeight;
	 stage.drawImage(imageObj, newX, y, newWidth, newHeight);
  };
}

function documentStatusController($scope, $routeParams) {
  $scope.docName = $routeParams.docName;
  
  SWBrijj.procm("get_docdetail", $scope.docName, function(data) {
	$scope.document = data[0];
	$scope.$apply();
	});
}
