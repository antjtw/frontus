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

/*
docviews.directive('draggable', function() {
  return {
    restrict: 'A',
    link: function(scope, elm, attrs) {
      var options = scope.$eval(attrs.draggable); //allow options to be passed in
      $(elm).draggable(options);
    }
  };
});
*/

/*
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
*/

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
        if (val) $timeout(function() {
        	// scope.draginit(element);
        } ) ;
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
      		SWBrijj.procm("document.share_document", scope.selectedDoc, x.toLowerCase(), scope.messageText, Boolean(scope.signeeded), sigdate).then(function(data) {
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

function CompanyDocumentListController($scope, $modal, $q, $rootScope, SWBrijj) {

/*	if ($rootScope.selected.isAdmin) {
        if ($rootScope.path.indexOf('/investor/') > -1) {
            document.location.href=$rootScope.path.replace("/investor/", "/company/");
        }
    } else {
        if ($rootScope.path.indexOf('/company/') > -1) {
            document.location.href=$rootScope.path.replace("/company/", "/investor/");
        }
    }*/

  /* this investor list is used by the sharing email list drop-down */
	$scope.vInvestors = []
	SWBrijj.tblm('account.company_investors', ['email', 'name']).then(function(data) {
		for (var i = 0; i < data.length; i++) $scope.vInvestors.push(data[i].email);
	});


	$scope.loadDocuments = function() {
		SWBrijj.tblm('document.my_company_library', ['doc_id','company','docname','last_updated','uploaded_by']).then(function(data) {
	  		$scope.documents = data;
	  		console.log(data);
			if ($scope.documents.length == 0) {
				$scope.noDocs = true;
			}
		}).except(function(err) { console.log(err.message); });
	}
	$scope.loadDocuments();

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
	  if (file == null) return;
	  if (file.size > 1024 * 1024 * 1024) return parseFloat(file.size / 1024 / 1024 / 1024).toFixed(2) + " GB";
	  else if (file.size > 1024 * 1024) return parseFloat(file.size / 1024 / 1024).toFixed(2) + " MB";
	  else if (file.size > 1024) return parseFloat(file.size / 1024).toFixed(2) + " kB";
	  else return file.size + " bytes";
	};

	// DRAG AND DROP BOX
	// // init event handlers
	// $scope.dragEnterLeave = function(evt) {
	//   evt.stopPropagation();
	//   evt.preventDefault();
	//   $scope.dropText = "Drop files here...";
	//   $scope.dropClass = "";
	//   $scope.$apply();
	// };

	// $scope.dragOver = function(evt) {
	//   evt.stopPropagation();
	//   evt.preventDefault();
	//   console.log(evt.dataTransfer.types);
	//   var ok = evt.dataTransfer && evt.dataTransfer.types && evt.dataTransfer.types.some( function(x) { return x == 'Files'; } );
	//   $scope.dropText = ok ? 'Drop files here...' : 'Only files are allowed!';
	//   $scope.dropClass = ok ? 'over' : 'not-available';
	//   $scope.$apply();
	// };

	// $scope.drop = function (evt) {
	//   // console.log('drop evt:', JSON.parse(JSON.stringify(evt.dataTransfer)))
	//   evt.stopPropagation();
	//   evt.preventDefault();
	//   $scope.dropText = 'Drop more files here...';
	//   $scope.dropClass = '';
	//   $scope.$apply();
	//   var files = evt.dataTransfer.files;
	//   if (files.length > 0) {
	//     for (var i = 0; i < files.length; i++) {
	//       $scope.files.push(files[i])
	//     }
	//   }
	//   $scope.$apply();

	//   // might as well go ahead and upload ( no point in getting a click
	//   $scope.uploadFile();
	// };

	// $scope.draginit = function(elm) {
	//   var element = angular.element(".dropbox");
	// //      var element = elm.find('.dropbox');
	//   if (!element) return;

	//   /*      element.on("dragenter", dragEnterLeave)
	//    .on("dragleave",dragEnterLeave)
	//    .on("dragover",dragOver)
	//    .on("drop",drop);
	//    */
	//   element = element[0];
	//   element.addEventListener("dragenter", $scope.dragEnterLeave, false);
	//   element.addEventListener("dragleave", $scope.dragEnterLeave, false);
	//   element.addEventListener("dragover", $scope.dragOver, false);
	//   element.addEventListener("drop", $scope.drop, false);
	// };
	
	$scope.files = [];
	$scope.setFiles = function (element) {
	  for (var i = 0; i < element.files.length; i++) {
	    $scope.files.push(element.files[i]);
      	$scope.$apply();
	  }
	  $scope.progressVisible = false;
	};

	function checkExtension(filename) {
		var extension = filename.substring(filename.lastIndexOf('.') +1 )
		var extensions = ['pdf', 'doc', 'docx'];
		return (extensions.indexOf(extension) > -1);
	}
	$scope.uploading = [];

	$scope.uploadDropbox = function() {
	  Dropbox.choose( { linkType: 'direct', multiselect: false, success: function(files) {
	  	console.log(files);
		if (!checkExtension(files[0].name)) {
			return $rootScope.notification.show("fail", "This file type is not allowed.");
		}
	 	$scope.progressVisible = true; $scope.noDocs = false;
	  	$scope.uploading.docname = files[0].name.substring(0, files[0].name.lastIndexOf('.')); // Get name and trim extension
	  	$scope.$apply(); 
	    SWBrijj.uploadLink(files).then( function(x) {
			$scope.progressVisible = false; $scope.files = [];
			$scope.loadDocuments();
			$rootScope.notification.show("success", "Your document has been uploaded.");
	    });
	  }, cancel: function() { 
	  	console.log('canceled');
	  	$scope.progressVisible = false; $scope.files = [];
	  	}
	  })
	};
	$scope.uploadFile = function () {
	  var fd = new FormData();
	  if ($scope.files.length == 0) return $rootScope.notification.show("fail", "Please select a file to upload.");
	  for (var i in $scope.files) {
	  	if (!checkExtension($scope.files[i].name)) {
			$scope.files = [];
			return $rootScope.notification.show("fail", "This file type is not allowed.");
		}
	  	$scope.progressVisible = true; $scope.noDocs = false;
	  	fd.append("uploadedFile", $scope.files[i]);
	  	$scope.uploading.docname = $scope.files[i].name.substring(0, $scope.files[i].name.lastIndexOf('.')); // Get name and trim extension
	  }
	  SWBrijj.uploadFile(fd).then(function (x) {
	    $scope.progressVisible = false; $scope.files = [];
		$scope.loadDocuments();
		$rootScope.notification.show("success", "Your document has been uploaded.");
	  }).except(function (x) {
	  	$scope.progressVisible = false; $scope.files = [];
	  	$rootScope.notification.show("fail", "There was an error uploading your document.");
	  });
	  /*var xhr = new XMLHttpRequest()
	   xhr.upload.addEventListener("progress", uploadProgress, false);
	   xhr.addEventListener("load", uploadComplete, false);
	   xhr.addEventListener("error", uploadFailed, false);
	   xhr.addEventListener("abort", uploadCanceled, false);
	   xhr.open("POST", "/fileupload");
	   xhr.send(fd) */
	};

	var dots = document.getElementById('dots');

	var int = setInterval(function() {
	    if ((dots.innerHTML += '.').length == 4) 
	        dots.innerHTML = '';
	}, 333);

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

	window.onbeforeunload = function() {
		if ($scope.progressVisible)
			return 'There are uploads in progress. Leaving may result in some uploads not completing.';
	}

}



function CompanyDocumentViewController($scope, $routeParams, $location, $compile, SWBrijj) {
  var docKey = parseInt($routeParams.doc);
  $scope.urlInves = $routeParams.investor;
  $scope.docKey = docKey
  $scope.invq = false;
  $scope.counterparty = !!$scope.urlInves;

  $scope.library = $scope.urlInves ? "document.my_counterparty_library" : "document.my_company_library";
  $scope.pages = $scope.urlInves ? "document.my_counterparty_codex" : "document.my_company_codex";

  $scope.docversions = []

  SWBrijj.tblm("document.my_company_library", ['doc_id', 'company', 'docname', 'last_updated', 'uploaded_by', 'pages'], "doc_id", $scope.docKey).then(function(data) {
      $scope.document=data;
  });

  SWBrijj.tblmm("document.my_counterparty_library", "original", $scope.docKey).then(function(data) {
     $scope.docversions = data;
    if ($scope.counterparty) {
      for(var i = 0;i<data.length;i++) {
        var doc = data[i];
        if (doc.investor == $scope.urlInves) { $scope.pickInvestor(doc); break; }
      }
    } else {
      $scope.getOriginal();
    }
  });

	$scope.share = function(message, email, sign) {
		 SWBrijj.procm("document.share_document", $scope.docId, email.toLowerCase(), message, Boolean(sign)).then(function(data) {
				console.log(data);
			});
		};

	$scope.pickInvestor = function(doc) {
		$scope.invq = false;
    $scope.counterparty = true;
    $scope.currentDoc = doc;
		$scope.docId = doc.doc_id;
    $scope.library = "document.my_counterparty_library";
    $scope.pages = "document.my_counterparty_codex";
    var z = $location.search();
    z['investor']=doc.investor;
    $location.search(z);
	};

	$scope.getOriginal = function() {
		$scope.invq = false;
    $scope.counterparty = false;
    $scope.currentDoc = $scope.document;
		$scope.docId = $scope.docKey;
    $scope.library = "document.my_company_library";
    $scope.pages = "document.my_company_codex";
    var z = $location.search();
    delete z['investor'];
    $location.search(z);
	}

  $scope.pageQueryString = function() {
    return  "id="+$scope.docId+"&investor="+$scope.invq+"&counterparty="+$scope.counterparty;
  }
  $scope.fakeSign = function(cd) {
    SWBrijj.spoof_procm(cd.investor, "document.sign_document", cd.doc_id).then(function (data) {
      cd.when_signed = data;
      $scope.$$childHead.init();
    }).except(function (x) {
          alert(x.message);
        });
  };

  $scope.renege = function(cd) {
    SWBrijj.procm("document.renege", cd.doc_id).then(function(data) {
       cd.when_confirmed = null;
      window.location.reload();
    });
  }

  $scope.rejectSignature = function(cd) {
    SWBrijj.procm("document.reject_signature",cd.doc_id).then(function(data) {
      cd.when_signed = null;
      // $scope.$apply();
      $scope.$$childHead.init();
    })
  }

  }


function CompanyDocumentStatusController($scope, $routeParams, SWBrijj) {
  var docId = parseInt($routeParams.doc);
  SWBrijj.tblm("document.my_company_library", ['doc_id', 'company', 'docname', 'last_updated', 'uploaded_by', 'pages'], "doc_id", docId).then(function(data) {
    $scope.document = data;
  });

  SWBrijj.tblmm("document.my_counterparty_library", "original", docId).then(function(data) {
    $scope.docversions = data;
  });


  // A none too beautiful way of creating the activity table with only two database requests but quite a bit of client side action
	SWBrijj.tblmm("document.company_activity", "original", docId).then(function(data) {
		$scope.activity = data;
		console.log('data', data);
		/*SWBrijj.procm("document.get_doc_activity", parseInt(docId)).then(function(person) {
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
      		$scope.lastsent = new Date(Math.max.apply(null,$scope.shared_dates)).getTime();
      		angular.forEach($scope.activity, function(x) { //Replace emails with names
		        if (x.namethem != null) {
		          SWBrijj.proc('account.get_investor_name', x.namethem, true).then(function(name) {
		            	x.namethem = name[1][0];
		          });
		        }
	     	});

			});
     */
    });

/*  SWBrijj.procm("document.document_status", docId).then(function(data) {
    $scope.userStatus = data;

    angular.forEach($scope.userStatus, function(person) {
      SWBrijj.proc('account.get_investor_name', person.sent_to, false).then(function(name) {
        person.name = name[1][0];
      });
      person.shown = false;
      person.button = "icon-plus";
      if (person.event == "revoked") person.rstatus = 1;
      if (person.event == "needsign") person.event = "needs signing";
    });
  });
  */

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

  $scope.rejectSignature = function(cd) {
    SWBrijj.procm("document.reject_signature",cd.doc_id).then(function(data) {
      cd.when_signed = null;
      //$scope.$apply();
      $scope.$$childHead.init();
    })
  }

  $scope.share = function(message, email, sign) {
		 SWBrijj.procm("document.share_document", docId, email.toLowerCase(), message, Boolean(sign)).then(function(data) {
				console.log(data);
			});
		};
	
	$scope.remind = function(message, email) {
		 SWBrijj.procm("document.remind_document", docId, email.toLowerCase(), message).then(function(data) {
				console.log(data);
			});
	};
	
	$scope.showStatusDetail = function(person) {
		 $scope.docversions.forEach(function(name) {
       if (name === person) name.shown = !name.shown;
       else name.shown = false;
     });
	};
	
		$scope.reminder = "";

		  $scope.opts = {
			backdropFade: true,
			dialogFade:true,
    		dialogClass: 'modal shareModal'
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

angular.module('documentviews').filter('icon', function() {
   return function(activity) {
     if (activity == "received") return "icon-redo";
     else if (activity == "viewed") return "icon-view";
     else if (activity == "reminder") return "icon-redo";
     else if (activity == "signed") return "icon-pen";
     else if (activity == "uploaded") return "icon-star";
     else return "hunh?";
     }
});



angular.module('documentviews').filter('description', function() {
  return function(ac) {
    var activity = ac.activity;
    var person = ac.name;
    if (activity == "sent") return "Sent to "+person;
    else if (activity == "viewed") return "Viewed by "+person;
    else if (activity == "reminder") return "Reminded "+person;
    else if (activity == "signed") return "Signed by "+person;
    else if (activity == "uploaded") return "Uploaded by "+person;
    else if (activity == "received") return "";
    else if (activity == "rejected") return "Rejected by "+person;
    else if (activity == "countersigned") return "Countersigned by "+person;
    else return activity + " by "+person;
  }
});

