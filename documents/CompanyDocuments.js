'use strict';

/* App Module */
/* hack to set the cursor style -- gets around a webkit bug */
function setCursor(cursor) {
  if (document.body.style.cursor != cursor) {
    var wkch = document.createElement("div");
    wkch.style.overflow = "hidden";
    wkch.style.position = "absolute";
    wkch.style.left = "0px";
    wkch.style.top = "0px";
    wkch.style.width = "100%";
    wkch.style.height = "100%";
    var wkch2 = document.createElement("div");
    wkch2.style.width = "200%";
    wkch2.style.height = "200%";
    wkch.appendChild(wkch2);
    document.body.appendChild(wkch);
    document.body.style.cursor = cursor;
    wkch.scrollLeft = 1;
    wkch.scrollLeft = 0;
    document.body.removeChild(wkch);
  }
}

function calculateRedirect() {
  return readCookie('role') == 'issuer' ? '/company-list' : '/investor-list';
}

var docviews = angular.module('documentviews', ['documents', 'upload', 'ui.bootstrap', '$strap.directives','brijj', 'email']);

docviews.config(function($routeProvider, $locationProvider, $httpProvider) {
  $locationProvider.html5Mode(true).hashPrefix('');
  $routeProvider.
      when('/company-list', {templateUrl: 'companyList.html',   controller: CompanyDocumentListController}).
      when('/company-view', {templateUrl: 'companyViewer.html', controller: CompanyDocumentViewController}).
      when('/company-status', {templateUrl: 'companyStatus.html', controller: CompanyDocumentStatusController}).
      when('/investor-list', {templateUrl: 'investorList.html', controller: InvestorDocumentListController}).
      when('/investor-view', {templateUrl: 'investorViewer.html', controller: InvestorDocumentViewController}).
      otherwise({redirectTo: calculateRedirect() });
  $httpProvider.responseInterceptors.push('errorHttpInterceptor');
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

/*docviews.directive('modalupload', function($timeout) {
  return {
    restrict: 'EA',
    templateUrl: "modalUpload.html",
    link: function(scope, element, attrs) {
      scope.$watch('uploadModal', function(val, oldVal) {
        if (val) $timeout(function() {
        	scope.draginit(element);
        } ) ;
      }); },
    replace:true,
    priority: 20
  }
});
*/

docviews.directive('modalshare', function($timeout, SWBrijj) {
  return {
    restrict: 'EA',
    templateUrl: "modalShare.html",
    scope: false,
    link: function(scope, element, attrs) {
      // initalized recipients can go here.
      scope.nextRecip = "";
      scope.share = function(one, two) {
      	var sigdate = scope.signaturedate.toUTCString();
      	angular.forEach(scope.recipients, function(x) {
      		SWBrijj.procm("document.share_document", scope.selectedDoc, x.toLowerCase(), scope.messageText, Boolean(scope.signeeded), sigdate).then(function(data) {
			});
      	});
      };
    },
    replace:true,
    priority: 20
  }
});

docviews.factory('errorService', function() {
  return {
    errorMessage: null, setError: function(msg) {
      this.errorMessage = msg; },
    clear: function() { this.errorMessage = null;
    } };
});

docviews.factory('errorHttpInterceptor',
    function ($q, $location, $rootScope) { return function (promise) {
      return promise.then(function (response) {
        if (response.data[0]=='x') {
          var errm = eval(response.data.substr(2));
          if (errm.javaClassName == "net.r0kit.brijj.BrijjServlet$NotLoggedIn") {
            $rootScope.$broadcast('event:loginRequired');
            return response;
          }
          $rootScope.$broadcast('event:brijjError', errm.message);
          return response;
        } else
        return response;
      }, function (response) {
        if (response.status === 401) {
          $rootScope.$broadcast('event:loginRequired');
        } else if (response.status >= 400 && response.status < 500) {
          errorService.setError('Server was unable to find' +
              ' what you were looking for... Sorry!!');
        }
        return $q.reject(response); });
    }; });

docviews.run(function($rootScope, $document) {
  $document.on('click', function(event) { delete $rootScope.errorMessage; });
});
/************************************************************************************************
 ISSUER CONTROLLERS
 ************************************************************************************************/

function CompanyDocumentListController($scope, $modal, $location, $q, $rootScope, $route, $document, SWBrijj) {
  if ($rootScope.selected.role == 'investor') {
    // $location.path('/investor-list?'); // goes into a bottomless recursion ?
    document.location.href='/documents';  // this works
    // $location.path('/');
    return;
  }

  // Set up event handlers
  SWBrijj.defaultErrorHandler = function(errm) { $rootScope.$broadcast( errm.javaClassName == 'net.r0kit.brijj.BrijjServlet$NotLoggedIn'
        ? 'event:loginRequired' : 'event:brijjErrror', errm.message); };
  $scope.$on('event:loginRequired', function() { document.location.href='/login'; });
  $scope.$on('event:brijjError', function(event, msg) {$rootScope.errorMessage = msg; });

  // $scope.$on('$locationChangeSuccess', function(event) {delete $rootScope.errorMessage; });

  /* this investor list is used by the sharing email list drop-down */
	$scope.vInvestors = [];
	SWBrijj.tblm('global.investor_list', ['email', 'name']).then(function(data) {
		for (var i = 0; i < data.length; i++) $scope.vInvestors.push(data[i].email);
	});


	$scope.loadDocuments = function () {
    SWBrijj.tblm('document.my_company_library', ['doc_id', 'company', 'docname', 'last_updated', 'uploaded_by']).then(function (data) {
      $scope.documents = data;
      if ($scope.documents.length == 0) {
        $scope.noDocs = true;
      }
    });
  };
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
	
	$scope.files = [];
	$scope.setFiles = function (element) {
	  for (var i = 0; i < element.files.length; i++) {
	    $scope.files.push(element.files[i]);
      	$scope.$apply();
	  }
	  $scope.progressVisible = false;
	};

	function checkExtension(filename) {
		var extension = filename.substring(filename.lastIndexOf('.') + 1);
		var extensions = ['pdf', 'doc', 'docx'];
		return (extensions.indexOf(extension) > -1);
	}
	$scope.uploading = [];

	$scope.uploadDropbox = function() {
	  Dropbox.choose( { linkType: 'direct', multiselect: false, success: function(files) {
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
	  	$scope.progressVisible = false; $scope.files = [];
	  	}
	  })
	};
	$scope.uploadFile = function () {
	  var fd = new FormData();
	  if ($scope.files.length == 0) return $rootScope.notification.show("fail", "Please select a file to upload.");
	  for (var i = 0;i< $scope.files.length;i++) {
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
    return null;
	};

	var dots = document.getElementById('dots');

	setInterval(function() {
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

  /*
	window.onbeforeunload = function(event) {
		if ($scope.progressVisible)
			return 'There are uploads in progress. Leaving may result in some uploads not completing.';
    else
      return '';
	}
	*/

}

/*********************************************************************************************************************/

function CompanyDocumentViewController($scope, $routeParams, $route, $rootScope, $location, SWBrijj) {
  if ($rootScope.selected.role == 'investor') {
    $location.path('/investor-view');
    return;
  }

  // Set up event handlers
  SWBrijj.defaultErrorHandler = function(errm) { $rootScope.$broadcast( errm.javaClassName == 'net.r0kit.brijj.BrijjServlet$NotLoggedIn'
      ? 'event:loginRequired' : 'event:brijjErrror', errm.message); };
  $scope.$on('event:loginRequired', function() { document.location.href='/login'; });
  $scope.$on('event:brijjError', function(event, msg) {$rootScope.errorMessage = msg; });

  // $scope.$on('$locationChangeSuccess', function(event) {delete $rootScope.errorMessage; });

  var docKey = parseInt($routeParams.doc);
  $scope.urlInves = $routeParams.investor;
  $scope.docKey = docKey;
  $scope.invq = false;
  $scope.counterparty = !!$scope.urlInves;
  $scope.tester = $rootScope.userid.match(/sharewave.com$/);

  $scope.library = $scope.urlInves ? "document.my_counterparty_library" : "document.my_company_library";
  $scope.pages = $scope.urlInves ? "document.my_counterparty_codex" : "document.my_company_codex";

  $scope.docversions = [];

  SWBrijj.tblm("document.my_company_library", ['doc_id', 'company', 'docname', 'last_updated', 'uploaded_by', 'pages'], "doc_id", $scope.docKey).then(function(data) {
      $scope.document=data;
  }).except(function(x) { $location.path("/company-list?"); } );

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

	$scope.getOriginal = function () {
    $scope.invq = false;
    $scope.counterparty = false;
    $scope.currentDoc = $scope.document;
    $scope.docId = $scope.docKey;
    $scope.library = "document.my_company_library";
    $scope.pages = "document.my_company_codex";
    var z = $location.search();
    delete z['investor'];
    $location.search(z);
  };

  $scope.pageQueryString = function () {
    return  "id=" + $scope.docId + "&investor=" + $scope.invq + "&counterparty=" + $scope.counterparty;
  };
  $scope.fakeSign = function(cd) {
    SWBrijj.spoof_procm(cd.investor, cd.company, "document.sign_document", cd.doc_id, "[]").then(function (data) {
      cd.when_signed = data;
      $scope.$$childHead.init();
    }).except(function (x) {
          alert(x.message);
        });
  };

  $scope.renege = function (cd) {
    SWBrijj.procm("document.renege", cd.doc_id).then(function (data) {
      cd.when_confirmed = null;
      // window.location.reload();
      $route.reload();
    });
  };

  $scope.rejectSignature = function(cd) {
    SWBrijj.procm("document.reject_signature",cd.doc_id).then(function(data) {
      cd.when_signed = null;
      // $scope.$apply();
      $scope.$$childHead.init();
    })
  }

  }

/*******************************************************************************************************************/

function CompanyDocumentStatusController($scope, $routeParams, SWBrijj) {
  if ($rootScope.selected.role == 'investor') {
    $location.path('/investor-list');
    return;
  }

  // Set up event handlers
  SWBrijj.defaultErrorHandler = function(errm) { $rootScope.$broadcast( errm.javaClassName == 'net.r0kit.brijj.BrijjServlet$NotLoggedIn'
      ? 'event:loginRequired' : 'event:brijjErrror', errm.message); };
  $scope.$on('event:loginRequired', function() { document.location.href='/login'; });
  $scope.$on('event:brijjError', function(event, msg) {$rootScope.errorMessage = msg; });

  // $scope.$on('$locationChangeSuccess', function(event) {delete $rootScope.errorMessage; });

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

  $scope.rejectSignature = function (cd) {
    SWBrijj.procm("document.reject_signature", cd.doc_id).then(function (data) {
      cd.when_signed = null;
      //$scope.$apply();
      $scope.$$childHead.init();
    })
  };

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

/*************************************************************************************************
  INVESTOR CONTROLLERS
*************************************************************************************************/

function InvestorDocumentListController($scope, SWBrijj, $location, $rootScope) {
  if ($rootScope.selected.role == 'issuer') {
    $location.path("/company-list");
    return;
  }
  $scope.selectedCompany = $rootScope.selected.company;

  // Set up event handlers
  SWBrijj.defaultErrorHandler = function(errm) { $rootScope.$broadcast( errm.javaClassName == 'net.r0kit.brijj.BrijjServlet$NotLoggedIn'
      ? 'event:loginRequired' : 'event:brijjErrror', errm.message); };
  $scope.$on('event:loginRequired', function() { document.location.href='/login'; });
  $scope.$on('event:brijjError', function(event, msg) {$rootScope.errorMessage = msg; });

  // $scope.$on('$locationChangeSuccess', function(event) {delete $rootScope.errorMessage; });

  SWBrijj.tblm("document.this_investor_library").then(function (data) {
    $scope.documents = data;
  });

  $scope.docOrder = 'docname';

  $scope.setOrder = function (field) {
    $scope.docOrder = $scope.docOrder == field ? '-' + field : field;
  };

  $scope.searchFilter = function (obj) {
    var re = new RegExp($scope.query, 'i');
    return !$scope.query || re.test(obj.docname);
  };

  $scope.time = function (doc) {
    return doc.when_signed || doc.signature_deadline;
  };
}

/*************************************************************************************************/

function InvestorDocumentViewController($scope, $location, $route, $rootScope, $routeParams, $timeout, SWBrijj) {
  // Switch to company view if the role is issuer
  if ($rootScope.selected.role == 'issuer') { $location.path("/company-view"); return; }

  // Set up event handlers
  SWBrijj.defaultErrorHandler = function(errm) { $rootScope.$broadcast( errm.javaClassName == 'net.r0kit.brijj.BrijjServlet$NotLoggedIn'
      ? 'event:loginRequired' : 'event:brijjErrror', errm.message); };
  $scope.$on('event:loginRequired', function() { document.location.href='/login'; });
  $scope.$on('event:brijjError', function(event, msg) {$rootScope.errorMessage = msg; });

  $scope.$on('event:reload', function(event) { $timeout(function(){ $route.reload(); }, 100); });

  // $scope.$on('$locationChangeSuccess', function(event) {delete $rootScope.errorMessage; });

  $scope.init = function () {
    $scope.docId = parseInt($routeParams.doc);
    $scope.thisPage = $routeParams.page ? parseInt($routeParams.page) : 1 ;
    $scope.library = "document.my_investor_library";
    $scope.pages = "document.my_investor_codex";
    $scope.tester = $rootScope.userid.match(/sharewave.com$/);
    $scope.invq = true;
    $scope.confirmModalClose();
    SWBrijj.tblm("document.my_investor_library", "doc_id", $scope.docId).then(function (data) {
      if ($rootScope.selected.company != data.company)  { $location.path("/investor-list?"); return; }
      $scope.document = data;
    }).except(function(x) { $location.path("/investor-list?"); } );
  };

  $scope.confirmModalClose = function() {
    setCursor('default');
    $scope.processing = false;
    $scope.confirmModal = false;
  };
  $scope.pageQueryString = function () {
    return  "id=" + $scope.docId + "&investor=true";
  };

  $scope.signable = function() {
    return $scope.document &&  $scope.document.signature_deadline && !$scope.document.when_signed;
  };

  $scope.signDocument= function(doc) {
    if (!$scope.confirmSignature) return; // didn't sign it
    $scope.processing = true;
    setCursor('wait');
    // before signing the document, I may need to save the existing annotations
    // In fact, I should send the existing annotations along with the signature request for a two-fer.

    var dce = angular.element(".docPanel").scope();
    SWBrijj.procm("document.sign_document", doc.doc_id, dce.getNoteData()).then(function (data) {
      doc.when_signed = data;
      dce.removeAllNotes();
      $scope.confirmModalClose();
      // can't reload directly because of the modal -- need to pause for the modal to come down.
      $scope.$emit('event:reload');

    }).except(function (x) {
      $scope.confirmModalClose();
    });
  };
  $scope.unSign = function(cd) {
    SWBrijj.procm('document.unsign', cd.doc_id).then(function(data) {
      cd.when_signed = null;
      $route.reload();
    });
  };
}


/************************************************************
 *  Filters
 *  *********************************************************/

/* Filter to format the activity time */
angular.module('documentviews').filter('fromNow', function() {
			return function(date) {
			  return moment(date).fromNow();
			}
		  });

/* Filter to select the activity icon for document status */
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

/* Filter to format the activity description on document status */
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

