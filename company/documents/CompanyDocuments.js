'use strict';

/* App Module */

var docviews = angular.module('documentviews', ['ui.bootstrap']);

docviews.config(function($routeProvider, $locationProvider) {
  $locationProvider.html5Mode(true).hashPrefix('');
    
  $routeProvider.
      when('/', {templateUrl: 'docuview.html',   controller: documentListController}).
      when('/view', {templateUrl: 'docuviewer.html', controller: documentViewController}).
	  when('/status', {templateUrl: 'docustatus.html', controller: documentStatusController}).
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

docviews.directive('indstatus', function() {
  return {
	replace: true,
    transclude: true,
	scope: { title:'@indstatus' },
    template: '<p>{{title}}</p>',
  };
});

/* Controllers */

var documentListController = function($scope) {
	SWBrijj.procm("document.get_docmeta").then(function(data) {
	console.log(data)
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
	  SWBrijj.procm("document.delete_document", docname.docname).then(function(data) {
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
  var docId = $routeParams.doc;
  $scope.currentDoc = docId;

  SWBrijj.tblm("document.docinfo", parseInt(docId)).then(function(data) {
	$scope.documents = data[0];
	$scope.messageText = "Hi,\n Your signature is requested on " + $scope.documents.docname + "."
	$scope.$apply();
	});
	
  
  
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
	
	  $scope.share = function(message, email) {
		 SWBrijj.procm("document.share_document", parseInt(docId), email, message).then(function(data) {
				console.log(data);
			});
	};
}

function documentStatusController($scope, $routeParams) {
  var docId = $routeParams.doc;
  
  SWBrijj.procm("document.get_docdetail", parseInt(docId)).then(function(data) {
	$scope.document1 = data[0];
	$scope.page_title = data[0].docname;
	$scope.messageText = "Hi,\n Your signature is requested on " + $scope.document1.docname + "."
	console.log($scope.document1);
	SWBrijj.procm("document.get_doc_activity", parseInt(docId)).then(function(data) {
		$scope.activity = data;
		$scope.activity.push({activity: "created", icon: "icon-star-empty", whendone: $scope.document1.last_updated});
		for (var i = 0; i < $scope.activity.length; i++) {
		if ($scope.activity[i].activity == "shared") {
			$scope.activity[i].activity = "shared with"
			$scope.activity[i].icon = "icon-edit"
		}
		else if ($scope.activity[i].activity == "viewed") {
			$scope.activity[i].activity = "viewed by"
			$scope.activity[i].icon = "icon-eye-open"
		}
		else if ($scope.activity[i].activity == "reminder") {
			$scope.activity[i].activity = "reminded "
			$scope.activity[i].icon = "icon-bullhorn"
		}
		}
		$scope.$apply();
		});
	});
	
	  $scope.editorEnabled = false;
	  
	  $scope.enableEditor = function() {
		$scope.editorEnabled = true;
		$scope.editableTitle = $scope.page_title;
	  };
	  
	  $scope.disableEditor = function() {
		$scope.editorEnabled = false;
	  };
	  
	  $scope.save = function() {
		var newname = $scope.editableTitle;
		$scope.page_title = newname
		$scope.disableEditor();
		SWBrijj.procm("document.title_change", parseInt(docId), newname).then(function(data) {
			console.log(data);
		});
	  };
	
  SWBrijj.procm("document.document_status", parseInt(docId)).then(function(data) {
	$scope.userStatus = data;
	for (var i = 0; i < $scope.userStatus.length; i++) {
		$scope.userStatus[i].shown = false;
		$scope.userStatus[i].button = "icon-plus";
	}
	$scope.$apply();
	});
	
	
	$scope.activityOrder = function(card) {
	   if (card.activity == "created") {
		   return 0
	   }
	   else {
	   		return -card.whendone
	   }
	};
	
	$scope.share = function(message, email) {
		 SWBrijj.procm("document.share_document", parseInt(docId), email, message).then(function(data) {
				console.log(data);
			});
	};
	
	$scope.remind = function(message, email) {
		 SWBrijj.procm("document.remind_document", parseInt(docId), email, message).then(function(data) {
				console.log(data);
			});
	};
	
	$scope.revokeUser = function (email) {
		SWBrijj.procm("document.document_revoke", parseInt(docId), email).then(function(data) {
				console.log(data);
			});
	};
	
	$scope.opendetails = function(selected) {
		 $scope.userStatus.forEach(function(name) {		  
			if (selected == name.sent_to)
				if (name.shown == true) {
					name.shown = false;
					name.button = "icon-plus";
				}
				else {
					SWBrijj.procm("document.get_I_docstatus", name.sent_to).then(function(data) {
						name.whenshared = data[1].loggedin;
						if (data[0].loggedin != null) {
							name.lastlogin = data[0].loggedin;
						}
						else {
							name.lastlogin = 0;	
						}
						if (data[2].loggedin != null) {
							name.lastviewed = data[2].loggedin;
						}
						else {
							name.lastviewed = 0;	
						}
						if (data[3].loggedin != null) {
							name.signed = data[3].loggedin;
						}
						else {
							name.signed = 0;	
						}
						if (data[4].loggedin != null) {
							name.reminder = data[4].loggedin;
						}
						else {
							name.reminder = 0;	
						}
						name.button = "icon-minus";
						name.shown = true;
						$scope.$apply();
					});
				}
		});
	};
	
		$scope.revoke = ""
		$scope.reminder = ""
		  
		  $scope.modalUp = function () {
			$scope.shouldBeOpen = true;
		  };
		
		  $scope.close = function () {
			$scope.closeMsg = 'I was closed at: ' + new Date();
			$scope.shouldBeOpen = false;
		  };
		
		  $scope.opts = {
			backdropFade: true,
			dialogFade:true,
    		dialogClass: 'modal shareModal'
		  };
		  
		  $scope.revmodalUp = function(name) {
			$scope.revoke = name;
			$scope.revokeModal = true;
		  };
		
		  $scope.revclose = function () {
			$scope.revokeModal = false;
		  };
		
		  $scope.revopts = {
			backdropFade: true,
			dialogFade:true,
		  };
		  
		  $scope.remmodalUp = function(name) {
			$scope.reminder = name;
			$scope.remModal = true;
		  };
		
		  $scope.remclose = function () {
			$scope.remModal = false;
		  };
		
		  $scope.remopts = {
			backdropFade: true,
			dialogFade:true,
		  };
			
				
	function failed() {
		alert("failed")
		}
	
}

/* Services */


/* Filters */

angular.module('documentviews').filter('fromNow', function() {
			return function(date) {
			  return moment(date).fromNow();
			}
		  });
		  
		  