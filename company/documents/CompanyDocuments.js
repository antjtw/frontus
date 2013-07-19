'use strict';

/* App Module */

var docviews = angular.module('documentviews', ['documents','ui.bootstrap', '$strap.directives','brijj', 'email']);

docviews.config(function($routeProvider, $locationProvider) {
  $locationProvider.html5Mode(true).hashPrefix('');
  $routeProvider.
      when('/', {templateUrl: 'list.html',   controller: CompanyDocumentListController}).
      when('/view', {templateUrl: 'viewer.html', controller: CompanyDocumentViewController}).
	    when('/status', {templateUrl: 'status.html', controller: CompanyDocumentStatusController}).
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

docviews.directive('library', function() {
  return {
    restrict: 'A',
    link: function(scope, elm, attrs) {
       scope.listScrolls = function() {
         return elm[0].scrollHeight > elm[0].height;
       }
    }
  }
});

docviews.directive('modaldelete', function() {
  return {
    restrict: 'EA',
    templateUrl: "modalDelete.html",
    replace:true,
    priority: 20
  }
});

docviews.directive('modalupload', function($timeout) {
  return {
    restrict: 'EA',
    templateUrl: "modalUpload.html",
    link: function(scope, element, attrs) {
      scope.$watch('upModal', function(val, oldVal) {
        if (val) $timeout(function() {scope.draginit(element);} ) ;
      }); },
    replace:true,
    priority: 20
  }
});

docviews.directive('modalshare', function($timeout, SWBrijj) {
  return {
    restrict: 'EA',
    templateUrl: "modalShare.html",
    scope: false,
    link: function(scope, element, attrs) {
      // initalized recipients can go here.
      scope.nextRecip = "";
      scope.share = function(one, two) {
      	console.log(scope.signeeded);
      	var sigdate = scope.signaturedate.toUTCString();
      	angular.forEach(scope.recipients, function(x) {
      		SWBrijj.procm("document.share_document", scope.selectedDoc, x, scope.messageText, Boolean(scope.signeeded), sigdate).then(function(data) {
				console.log(data);
			});
      	});
       };
    },
    replace:true,
    priority: 20
  }
});

/* Controllers */

function CompanyDocumentListController($scope, $modal, $q, SWBrijj) {
	SWBrijj.tblm('document.my_company_library',[ 'doc_id','company','docname','last_updated','uploaded_by']).then(function(data) {
  	$scope.documents = data;
	}).except(function(err) { alert(err.message); });
	
	$scope.docOrder = 'docname';
	$scope.selectedDoc = 0;
  	$scope.recipients = [];
  	$scope.signaturedate = Date.now();

	$scope.setOrder = function(field) {	$scope.docOrder = ($scope.docOrder == field) ? '-' + field :  field; };

	$scope.searchFilter = function (obj) {
     var re = new RegExp($scope.query, 'i');
     return !$scope.query || re.test(obj.docname);
  };

  $scope.askShare = function(docid) {
  	$scope.selectedDoc = docid;
    var modalPromise = $modal({template: 'modalShare.html', modalClass: 'shareModal', persist: true, show: false, backdrop: 'static', scope: $scope});
    $q.when(modalPromise).then(function(eel) {
      // for some reason, at this point, the element has "200" inserted as a text node.
      var el = eel[0];
      // if (el.childNodes[0] == "200")
      el.removeChild(el.childNodes[0]);
      eel.modal('show');
    });
  };
};

function CompanyDocumentViewController($scope, $routeParams, $compile, SWBrijj) {
  var docKey = parseInt($routeParams.doc);
  $scope.docId = docKey;
  $scope.invq = false;
  $scope.library = "document.my_company_library";
  $scope.pages = "document.my_company_doc_length";
  $scope.docversions = []

  $scope.init = function () {
    SWBrijj.tblm("document.my_company_library", ['doc_id', 'company', 'docname', 'last_updated', 'uploaded_by', 'pages'], "doc_id", $scope.docId).then(function(data) {
      $scope.document=data;

    });

  };

  SWBrijj.procm("document.we_shared_doc", parseInt(docKey)).then(function(stuff) {
    	$scope.otherdocs = stuff;

    	angular.forEach($scope.otherdocs, function(doc) {
		  	if (doc.signature_deadline != null) {
		  		if (doc.when_signed != null) {
		  			doc.signed = 1;
		  		}
		  		$scope.docversions.push(doc);
		  	}
		});
    });


	$scope.share = function(message, email, sign) {
		 SWBrijj.procm("document.share_document", $scope.docId, email, message, Boolean(sign)).then(function(data) {
				console.log(data);
			});
		};

	$scope.pickInvestor = function(doc) {
		$scope.invq = true;
		$scope.docId = doc.doc_id;
	};

	$scope.getOriginal = function() {
		$scope.invq = false;
		$scope.docId = docKey;
	}
}


function CompanyDocumentStatusController($scope, $routeParams, SWBrijj) {
  var docId = parseInt($routeParams.doc);
  SWBrijj.tblm("document.my_company_library", ['doc_id', 'company', 'docname', 'last_updated', 'uploaded_by', 'pages'], "doc_id", docId).then(function(data) {
    $scope.document = data;
  });

//	$scope.page_title = data[0].docname;
// 	$scope.messageText = "Hi,\n Your signature is requested on " + $scope.document1.docname + ".";

	// A none too beautiful way of creating the activity table with only two database requests but quite a bit of client side action
	// SWBrijj.procm("document.get_doc_activity_cluster", parseInt(docId)).then(function(data) {
	// 	$scope.activity = data;
	// 	SWBrijj.procm("document.get_doc_activity", parseInt(docId)).then(function(person) {
	// 		$scope.activityDetail = person;
	// 		for (var ik = 0; ik < $scope.activity.length; ik++) {
	// 			if ($scope.activity[ik].count == 1) {
	// 				for (var j = 0; j < $scope.activityDetail.length; j++) {
	// 						if ($scope.activity[ik].when_sent.getTime() == $scope.activityDetail[j].when_sent.getTime()) {
	// 							if ($scope.activity[ik].activity == $scope.activityDetail[j].activity) {
	// 									$scope.activity[ik].namethem = $scope.activityDetail[j].sent_to;
	// 								}
	// 						}
	// 				}
	// 			}
	// 		}

	// 		$scope.activity.push({activity: "created", icon: "icon-star-empty", when_sent: $scope.document1.last_updated});
	// 		for (var i = 0; i < $scope.activity.length; i++) {
	// 		if ($scope.activity[i].activity == "shared") {
	// 			$scope.activity[i].activity = "shared with ";
	// 			$scope.activity[i].icon = "icon-edit";
	// 		}
	// 		else if ($scope.activity[i].activity == "viewed") {
	// 			$scope.activity[i].activity = "viewed by ";
	// 			$scope.activity[i].icon = "icon-eye-open";
	// 		}
	// 		else if ($scope.activity[i].activity == "reminder") {
	// 			$scope.activity[i].activity = "reminded ";
	// 			$scope.activity[i].icon = "icon-bullhorn";
	// 		}
	// 		else if ($scope.activity[i].activity == "signed") {
	// 			$scope.activity[i].activity = "signed by ";
	// 			$scope.activity[i].icon = "icon-ok-circle";
	// 		}
	// 		}

	// 		});
	// 	});

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
		$scope.page_title = newname;
		$scope.disableEditor();
		SWBrijj.procm("document.title_change", docId, newname).then(function(data) {
			console.log(data);
		});
	  };
	
  SWBrijj.procm("document.document_status", docId).then(function(data) {
  	console.log(data);
	$scope.userStatus = data;
	for (var i = 0; i < $scope.userStatus.length; i++) {
		$scope.userStatus[i].shown = false;
		$scope.userStatus[i].button = "icon-plus";
		if ($scope.userStatus[i].event == "revoked") {
			$scope.userStatus[i].rstatus = 1;
		}
		if ($scope.userStatus[i].event == "needsign") {
			$scope.userStatus[i].event = "needs signing";
		}
	}
	});
	
	$scope.activityOrder = function(card) {
	   if (card.activity == "created") {
		   return 0
	   }
	   else {
	   		return -card.when_sent
	   }
	};
	
	$scope.share = function(message, email, sign) {
		 SWBrijj.procm("document.share_document", docId, email, message, Boolean(sign)).then(function(data) {
				console.log(data);
			});
		};
	
	$scope.remind = function(message, email) {
		 SWBrijj.procm("document.remind_document", docId, email, message).then(function(data) {
				console.log(data);
			});
	};
	
	$scope.revokeUser = function (email) {
		SWBrijj.procm("document.document_revoke", docId, email).then(function(data) {
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
					SWBrijj.procm("document.get_I_docstatus", name.sent_to, docId).then(function(data) {
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
						if (data[5].loggedin != null) {
							console.log(data[5]);
							name.column5 = 2;
							name.reminder = data[5].loggedin;
						}
						else if (data[4].loggedin != null) {
							name.column5 = 1;
							name.reminder = data[4].loggedin;
						}
						else {
							name.column5 = 0;	
						}
						name.button = "icon-minus";
						name.shown = true;
						$scope.$apply();
					});
				}
		});
	};
	
		$scope.revoke = "";
		$scope.reminder = "";
		  
		  $scope.modalUp = function () {
			$scope.shouldBeOpen = true;
		  };
/*
		  $scope.close = function () {
			$scope.closeMsg = 'I was closed at: ' + new Date();
			$scope.shouldBeOpen = false;
		  };
  */
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
			dialogFade:true
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
			dialogFade:true
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
