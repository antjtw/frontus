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
	$scope.states = ['Alabama', 'Alaska', 'Arizona', 'Arkansas', 'California', 'Colorado', 'Connecticut', 'Delaware', 'Florida', 'Georgia', 'Hawaii', 'Idaho', 'Illinois', 'Indiana', 'Iowa', 'Kansas', 'Kentucky', 'Louisiana', 'Maine', 'Maryland', 'Massachusetts', 'Michigan', 'Minnesota', 'Mississippi', 'Missouri', 'Montana', 'Nebraska', 'Nevada', 'New Hampshire', 'New Jersey', 'New Mexico', 'New York', 'North Dakota', 'North Carolina', 'Ohio', 'Oklahoma', 'Oregon', 'Pennsylvania', 'Rhode Island', 'South Carolina', 'South Dakota', 'Tennessee', 'Texas', 'Utah', 'Vermont', 'Virginia', 'Washington', 'West Virginia', 'Wisconsin', 'Wyoming'];
	SWBrijj.tblm('document.my_company_library',[ 'doc_id','company','docname','last_updated','uploaded_by']).then(function(data) {
  	$scope.documents = data;
	}).except(function(err) { alert(err.message); });
	
	$scope.docOrder = 'docname';
	$scope.selectedDoc = 0;
  	$scope.recipients = [];
  	$scope.signaturedate = Date.today();

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


  // Upload functions. Should probably be re-extracted

  	$scope.dropText = 'Drop files here...';
	$scope.files = [];

	$scope.fmtFileSize = function (file) {
	  if (file.size > 1024 * 1024 * 1024) return parseFloat(file.size / 1024 / 1024 / 1024).toFixed(2) + " GB";
	  else if (file.size > 1024 * 1024) return parseFloat(file.size / 1024 / 1024).toFixed(2) + " MB";
	  else if (file.size > 1024) return parseFloat(file.size / 1024).toFixed(2) + " kB";
	  else return file.size + " bytes";
	};

	// init event handlers
	$scope.dragEnterLeave = function(evt) {
	  evt.stopPropagation();
	  evt.preventDefault();
	  $scope.dropText = "Drop files here...";
	  $scope.dropClass = "";
	  $scope.$apply();
	};

	$scope.dragOver = function(evt) {
	  evt.stopPropagation();
	  evt.preventDefault();
	  console.log(evt.dataTransfer.types);
	  var ok = evt.dataTransfer && evt.dataTransfer.types && evt.dataTransfer.types.some( function(x) { return x == 'Files'; } );
	  $scope.dropText = ok ? 'Drop files here...' : 'Only files are allowed!';
	  $scope.dropClass = ok ? 'over' : 'not-available';
	  $scope.$apply();
	};

	$scope.drop = function (evt) {
	  // console.log('drop evt:', JSON.parse(JSON.stringify(evt.dataTransfer)))
	  evt.stopPropagation();
	  evt.preventDefault();
	  $scope.dropText = 'Drop more files here...';
	  $scope.dropClass = '';
	  $scope.$apply();
	  var files = evt.dataTransfer.files;
	  if (files.length > 0) {
	    for (var i = 0; i < files.length; i++) {
	      $scope.files.push(files[i])
	    }
	  }
	  $scope.$apply();

	  // might as well go ahead and upload ( no point in getting a click
	  $scope.uploadFile();
	};

	$scope.draginit = function(elm) {
	  var element = angular.element(".dropbox");
	//      var element = elm.find('.dropbox');
	  if (!element) return;

	  /*      element.on("dragenter", dragEnterLeave)
	   .on("dragleave",dragEnterLeave)
	   .on("dragover",dragOver)
	   .on("drop",drop);
	   */
	  element = element[0];
	  element.addEventListener("dragenter", $scope.dragEnterLeave, false);
	  element.addEventListener("dragleave", $scope.dragEnterLeave, false);
	  element.addEventListener("dragover", $scope.dragOver, false);
	  element.addEventListener("drop", $scope.drop, false);
	};

	$scope.setFiles = function (element) {
	  $scope.files = [];
	  for (var i = 0; i < element.files.length; i++) {
	    $scope.files.push(element.files[i]);
	  }
	  $scope.progressVisible = false;
	};

	$scope.uploadDropbox = function() {
	  Dropbox.choose( { linkType: 'direct', multiselect: true, success: function(files) {
	    SWBrijj.uploadLink(files).then( function(x) { console.log(x);}) ;
	  }, cancel: function() { console.log('canceled'); }
	  })
	};
	$scope.uploadFile = function () {
	  var fd = new FormData();
	  $scope.progressVisible = true;
	  for (var i in $scope.files) fd.append("uploadedFile", $scope.files[i]);
	  SWBrijj.uploadFile(fd).then(function (x) {
	    console.log(x);
	  }).except(function (x) {
	        alert(x.message);
	      });
	  /*var xhr = new XMLHttpRequest()
	   xhr.upload.addEventListener("progress", uploadProgress, false);
	   xhr.addEventListener("load", uploadComplete, false);
	   xhr.addEventListener("error", uploadFailed, false);
	   xhr.addEventListener("abort", uploadCanceled, false);
	   xhr.open("POST", "/fileupload");
	   xhr.send(fd) */
	};

	function uploadProgress(evt) {
	  $scope.$apply(function () {
	    if (evt.lengthComputable) {
	      $scope.progress = Math.round(evt.loaded * 100 / evt.total)
	    } else {
	      $scope.progress = 'unable to compute'
	    }
	  })
	}

	function uploadComplete(evt) {
	  alert(evt.target.responseText)
	}

	function uploadFailed(evt) {
	  alert("There was an error attempting to upload the file.")
	}

	function uploadCanceled(evt) {
	  $scope.progressVisible = false;
	  $scope.$apply();
	  alert("The upload has been canceled by the user or the browser dropped the connection.")
	}


};

function CompanyDocumentViewController($scope, $routeParams, $compile, SWBrijj) {
  var docKey = parseInt($routeParams.doc);
  $scope.docId = docKey;
  $scope.docKey = docKey
  $scope.invq = false;
  $scope.countersign = true;
  $scope.finalized = false;
  $scope.library = "document.my_company_library";
  $scope.pages = "document.my_company_doc_length";
  $scope.docversions = []

  $scope.init = function () {

  };

  SWBrijj.tblm("document.my_company_library", ['doc_id', 'company', 'docname', 'last_updated', 'uploaded_by', 'pages'], "doc_id", $scope.docId).then(function(data) {
      $scope.document=data;

    });

  SWBrijj.procm("document.we_shared_doc", parseInt(docKey)).then(function(stuff) {
    	$scope.otherdocs = stuff;

    	angular.forEach($scope.otherdocs, function(doc) {
    		console.log(doc);
		  	if (doc.signature_deadline != null) {
		  		if (doc.when_signed == null) {
		  			doc.countersign = false;
		  		}

		  		else if (doc.when_confirmed != null) {
		  			doc.countersign = false;
		  		}
		  		else {
		  			doc.countersign = true;
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
		$scope.countersign = doc.countersign;
		$scope.finalized = false;
	};

	$scope.getOriginal = function() {
		$scope.invq = false;
		$scope.docId = docKey;
		$scope.countersign = true;
		$scope.finalized = false;
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
	SWBrijj.procm("document.get_doc_activity_cluster", parseInt(docId)).then(function(data) {
		$scope.activity = data;
		console.log('data', data);
		SWBrijj.procm("document.get_doc_activity", parseInt(docId)).then(function(person) {
			$scope.activityDetail = person;
			for (var ik = 0; ik < $scope.activity.length; ik++) {
				if ($scope.activity[ik].count == 1) {
					for (var j = 0; j < $scope.activityDetail.length; j++) {
							if (new Date($scope.activity[ik].event_time).getTime() == (new Date(($scope.activityDetail[j].event_time + '').substring(0, 15)).getTime())) {
								if ($scope.activity[ik].activity == $scope.activityDetail[j].activity) {
										$scope.activity[ik].namethem = $scope.activityDetail[j].person;
										$scope.activity[ik].event_time = $scope.activityDetail[j].event_time;
									}
							}
					}
				}
			}

			$scope.shared_dates = [];
			for (var i = 0; i < $scope.activity.length; i++) {
				if ($scope.activity[i].activity == "received") {
					$scope.activity[i].activity = "Shared with ";
					$scope.activity[i].icon = "icon-redo";
          			$scope.shared_dates.push(new Date($scope.activity[i].event_time));					
				}
				else if ($scope.activity[i].activity == "viewed") {
					$scope.activity[i].activity = "Viewed by ";
					$scope.activity[i].icon = "icon-view";
				}
				else if ($scope.activity[i].activity == "reminder") {
					$scope.activity[i].activity = "Reminded ";
					$scope.activity[i].icon = "icon-redo";
          			$scope.shared_dates.push(new Date($scope.activity[i].event_time));					
				}
				else if ($scope.activity[i].activity == "signed") {
					$scope.activity[i].activity = "Signed by ";
					$scope.activity[i].icon = "icon-pen";
				}
				else if ($scope.activity[i].activity == "uploaded") {
					$scope.activity[i].activity = "Uploaded by ";
					$scope.activity[i].icon = "icon-star";
				}
			}
      		$scope.lastsent = new Date(Math.max.apply(null,$scope.shared_dates)).getTime();
      		angular.forEach($scope.activity, function(x) { //Replace emails with names
		        if (x.namethem != null) {
		          SWBrijj.proc('account.get_investor_name', x.namethem, true).then(function(name) {
		            x.namethem = name[1][0];
		          });
		        }
	     	});

			});
		});

		$scope.activityOrder = function(card) {
		   if (card.activity == "Uploaded by ") {
			   return 0
		   }
		   else {
		   		return -card.event_time
		   }
		};

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
	$scope.userStatus = data;

	angular.forEach($scope.userStatus, function(person) {
		SWBrijj.proc('account.get_investor_name', person.sent_to, false).then(function(name) {
            person.name = name[1][0];
        });
		person.shown = false;
		person.button = "icon-plus";
		if (person.event == "revoked") {
			person.rstatus = 1;
		}
		if (person.event == "needsign") {
			person.event = "needs signing";
		}
	});
  });
	
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
						console.log(data);
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
						// if (data[5].loggedin != null) {
						// 	console.log(data[5]);
						// 	name.column5 = 2;
						// 	name.reminder = data[5].loggedin;
						// }
						// else if (data[4].loggedin != null) {
						// 	name.column5 = 1;
						// 	name.reminder = data[4].loggedin;
						// }
						// else {
						// 	name.column5 = 0;	
						// }
						name.button = "icon-minus";
						name.shown = true;
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
