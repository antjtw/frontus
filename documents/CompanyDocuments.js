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

var docviews = angular.module('documentviews', ['documents', 'upload', 'ui.bootstrap', '$strap.directives','brijj', 'ui.bootstrap.progressbar', 'email'],
    function($routeProvider, $locationProvider, $httpProvider) {
  $locationProvider.html5Mode(true).hashPrefix('');
  $routeProvider.
      when('/company-list', {templateUrl: 'companyList.html',   controller: 'CompanyDocumentListController'}).
      when('/company-view', {templateUrl: 'companyViewer.html', controller: 'CompanyDocumentViewController'}).
      when('/company-status', {templateUrl: 'companyStatus.html', controller: 'CompanyDocumentStatusController'}).
      when('/investor-list', {templateUrl: 'investorList.html', controller: 'InvestorDocumentListController'}).
      when('/investor-view', {templateUrl: 'investorViewer.html', controller: 'InvestorDocumentViewController'}).
      otherwise({redirectTo: calculateRedirect() });
  $httpProvider.responseInterceptors.push('errorHttpInterceptor');
});

docviews.directive('library', function() {
  return {
    restrict: 'A',
    link: function(scope, elm, attrs) {
      void(attrs);
      scope.listScrolls = function() {
        return elm[0].scrollHeight > elm[0].height;
      }
    }
  }
});

docviews.directive('modalshare', function($timeout, SWBrijj) {
  return {
    restrict: 'EA',
    templateUrl: "modalShare.html",
    scope: false,
    link: function(scope, element, attrs) {
      void(attrs);
      void(element);
      // initalized recipients can go here.
      scope.nextRecip = "";
      scope.share = function() {
      	var sigdate = scope.signaturedate.toUTCString();
        /** @name scope#messageText
         * @type {string} */
        /** @name scope#signeeded
         * @type {boolean} */
        /** @name scope#confirmSignature
         * @type {boolean} */
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
    function ($q, $location, $rootScope, errorService) { return function (promise) {
      return promise.then(function (response) {
        if (response.data[0]=='x') {
          /** @type { {javaClassName: string, message: string } }*/
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
  $document.on('click', function(event) { void(event); delete $rootScope.errorMessage; });

  $rootScope.$on('$routeChangeError', function(x, y) { console.log(x); console.log(y); });
});
/************************************************************************************************
 ISSUER CONTROLLERS
 ************************************************************************************************/

docviews.controller('CompanyDocumentListController', ['$scope','$modal','$q', '$rootScope', '$route', 'SWBrijj',
    function($scope, $modal, $q, $rootScope, $route, SWBrijj) {
  if ($rootScope.selected.role == 'investor') {
    // $location.path('/investor-list?'); // goes into a bottomless recursion ?
    document.location.href='/documents';  // this works
    // $location.path('/');
    return;
  }

  // Set up event handlers
  SWBrijj.defaultErrorHandler = function(errm) {
    //noinspection JSValidateTypes
    $rootScope.$broadcast( errm.javaClassName == 'net.r0kit.brijj.BrijjServlet$NotLoggedIn' ?
        'event:loginRequired' : 'event:brijjErrror', errm.message); };
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
    /** @name obj#docname
     * @type { string} */
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

  $scope.delete = function(docid) {
    SWBrijj.procm("document.delete",docid).then(function(x) {
      var i = x[0].delete;
      $rootScope.errorMessage = i == 1 ? "Document deleted" : i+" documents deleted";
      $route.reload();
    });
  };

    // Document Upload pieces
    // Modal Up and Down Functions

    $scope.documentUploadOpen = function () {
        $scope.files = [];
        $scope.showProgress = false;
        $scope.showProcessing = false;
        $scope.documentUploadModal = true;
    };

    $scope.documentUploadClose = function () {
        $scope.documentUploadModal = false;
    };

    $scope.narrowopts = {
        backdropFade: true,
        dialogFade:true,
        dialogClass: 'narrowModal modal'
    };

    // File manipulation

    var mimetypes = ["application/pdf"];

    $scope.setFiles = function(element) {
        $scope.files = [];
        $scope.fileError = ""
        for (var i = 0; i < element.files.length; i++) {
            for(var j = 0;j<mimetypes.length;j++) {
                console.log(element.files[i].size)
                if (element.files[i].size > 20000000) {
                    $scope.fileError = "Please choose a smaller file";
                }
                else if (element.files[i].type != mimetypes[j]) {
                    $scope.fileError = "Please choose a pdf"
                }
                else {
                    $scope.files.push(element.files[i]);
                }
                $scope.$apply();
            }
        }
    };

    $scope.uploadFile = function (files) {
        $scope.$on("upload:progress", function(evt, arg) {
            $scope.loadProgress = 100 * (arg.loaded / arg.total);
            $scope.showProgress=true;
            $scope.$apply();
        });
        $scope.$on("upload:load", function(evt, arg) {
            void(evt);
            void(arg);
            $rootScope.showProgress = false;
            $rootScope.showProcessing = true;
            $scope.$apply();
        });
        $scope.$on(
            "upload:error", function(evt, arg) {
                $rootScope.errorMessage = arg;
                $scope.showProgress=false;
                $scope.documentUploadClose();
                $scope.$apply();
                console.log(arg); });
        $scope.$on(
            "upload:abort", function(evt, arg) {
                $rootScope.errorMessage = arg;
                $scope.showProgress=false;
                $scope.$apply();
                console.log(evt); console.log(arg); });
        var fd = new FormData();
        for (var i=0;i<files.length;i++) fd.append("uploadedFile", files[i]);
        var upxhr = SWBrijj.uploadFile(fd);
        upxhr.then(function(x) {
          void(x);
            $scope.dropText = moreDocs;
            $scope.showProgress = false;
            $scope.showProcessing = false;
            $scope.documentUploadModal = false;
            $rootScope.errorMessage = '';
            $scope.$apply();
            $route.reload();
        }).except(function(x) {
                $scope.fileError = "Oops, something went wrong. Please try again.";
                $scope.files = [];
                $scope.dropText = moreDocs;
                $scope.showProgress=false;
                $scope.$apply();
            });
    };

    $scope.gotoDoc = function (docid) {
        console.log("here");
        var link = "/documents/company-view?doc=" + docid;
        console.log(link);
        document.location.href=link;
    };
    }]);

/*********************************************************************************************************************/

docviews.controller('CompanyDocumentViewController', ['$scope','$routeParams','$route','$rootScope','$timeout','$location','SWBrijj',
    function($scope, $routeParams, $route, $rootScope, $timeout, $location, SWBrijj) {
  if ($rootScope.selected.role == 'investor') {
    $location.path('/investor-view');
    return;
  }

  // Set up event handlers
  SWBrijj.defaultErrorHandler = function(errm) { //noinspection JSValidateTypes
    $rootScope.$broadcast( errm.javaClassName == 'net.r0kit.brijj.BrijjServlet$NotLoggedIn'
      ? 'event:loginRequired' : 'event:brijjErrror', errm.message); };
  $scope.$on('event:loginRequired', function() { document.location.href='/login'; });
  $scope.$on('event:brijjError', function(event, msg) {$rootScope.errorMessage = msg; });

  $scope.$on('event:reload', function(event) { void(event); $timeout(function(){ $route.reload(); }, 100); });

  // $scope.$on('$locationChangeSuccess', function(event) {delete $rootScope.errorMessage; });

  var docKey = parseInt($routeParams.doc);
  $scope.urlInves = $routeParams.investor;
  $scope.docKey = docKey;
  $scope.invq = false;
  $scope.counterparty = !!$scope.urlInves;
  $scope.tester = $rootScope.userid.match(/sharewave.com$/);
  $scope.signeeded = "No";
  $scope.messageText = "Hi, Please take a look at this document"

  // For Email sharing
  $scope.recipients = [];
  /* this investor list is used by the sharing email list drop-down */
  $scope.vInvestors = [];
  SWBrijj.tblm('global.investor_list', ['email', 'name']).then(function(data) {
    for (var i = 0; i < data.length; i++) $scope.vInvestors.push(data[i].email);
  });

  $scope.library = $scope.urlInves ? "document.my_counterparty_library" : "document.my_company_library";
  $scope.pages = $scope.urlInves ? "document.my_counterparty_codex" : "document.my_company_codex";

  $scope.docversions = [];

  SWBrijj.tblm("document.my_company_library", ['doc_id', 'company', 'docname', 'last_updated', 'uploaded_by', 'pages'], "doc_id", $scope.docKey).then(function(data) {
      $scope.document=data;
  }).except(function(x) { void(x); $location.path("/company-list?"); } );

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

	$scope.pickInvestor = function(doc) {
    if (!$scope.counterparty) {
      console.log('saving note data: (CompanyDocuments (348)');
      angular.element(".docPanel").scope().saveNoteData();
    }
		$scope.invq = false;
    $scope.counterparty = true;
    $scope.currentDoc = doc;
    /** @name doc#doc_id
     * @type {number} */
    /** @name doc#signature_deadline
      * @type {Date} */
 		$scope.docId = doc.doc_id;
    $scope.library = "document.my_counterparty_library";
    $scope.pages = "document.my_counterparty_codex";
    $scope.modifiedPages = [];

    SWBrijj.tblmm("document.my_counterparty_codex", ["page", "annotated"], "doc_id", doc.doc_id).then(function(x) {
       for(var i=0;i< x.length;i++){
         if (x[i].annotated) $scope.modifiedPages.push(x[i].page);
       }
      $scope.modifiedPages.sort( function(a,b) { return a>b; });
    });

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
    /** @name SWBrijj#spoof_procm
     * @function
     * @param {string} investor
     * @param {string} company
     * @param {string} procname
     * @param {...*}
     */
    SWBrijj.spoof_procm(cd.investor, cd.company, "document.sign_document", cd.doc_id, "[]").then(function (data) {
      cd.when_signed = data;
      $route.reload();
    });
  };

  $scope.retract = function(cd) {
    SWBrijj.procm('document.retract_share', cd.doc_id).then(function (data) {
      void(data);
      $scope.getOriginal();
      $route.reload();
    })
  };

  $scope.renege = function (cd) {
    SWBrijj.procm("document.renege", cd.doc_id).then(function (data) {
      void(data);
      cd.when_confirmed = null;
      $route.reload();
    });
  };

  $scope.rejectSignature = function(cd) {
    SWBrijj.procm("document.reject_signature",cd.doc_id).then(function(data) {
      void(data);
      cd.when_signed = null;
      $route.reload();
    })
  };

  $scope.confirmModalClose = function() {
    setCursor('default');
    $scope.processing = false;
    $scope.confirmModal = false;
  };

  $scope.countersignDocument= function(doc) {
    if (!$scope.confirmSignature) return; // didn't sign it
    $scope.processing = true;
    setCursor('wait');
    // before signing the document, I may need to save the existing annotations
    // In fact, I should send the existing annotations along with the signature request for a two-fer.

    var dce = angular.element(".docPanel").scope();
    SWBrijj.procm("document.countersign", doc.doc_id, dce.getNoteData()).then(function (data) {
      doc.when_signed = data;
      dce.removeAllNotes();
      $scope.confirmModalClose();
      // can't reload directly because of the modal -- need to pause for the modal to come down.
      $scope.$emit('event:reload');

    }).except(function (x) {
          void(x);
          $scope.confirmModalClose();
        });
  };

  $scope.shareWith = function(doc, cp, msg, sig, dline) {
    SWBrijj.procm("document.share_document", doc.doc_id, cp.toLowerCase(), msg, Boolean(sig), dline).
        then(function(data) { void(data); $route.reload(); });
  };

  // Sharing modal functions

  $scope.ShareDocOpen = function () {
        $scope.shareDocModal = true;
  };

  $scope.shareDocClose = function () {
        $scope.shareDocModal = false;
  };

  $scope.changeSig = function(value) {
       $scope.signeeded = value;
      if (value == "Yes") {
          $scope.messageText = "Hi, Your signature is requested on " + $scope.document.docname;
      }
      else {
          $scope.messageText = "Hi, Please take a look at this document";
      }
  }

  $scope.share = function(message, email, sign) {
      sign = (sign == "Yes") ? true : false;
      console.log(sign);
      if (sign) {
          console.log("here");
          var date = Date.parse('22 November 2113');
      }
      else {
          date = null;
      }
      SWBrijj.procm("document.share_document", $scope.docId, email.toLowerCase(), message, Boolean(sign), date).then(function(data) {
          console.log(data);
          $scope.signeeded = "No"
          $route.reload();
      });
  };


  }]);

/*******************************************************************************************************************/

docviews.controller('CompanyDocumentStatusController', ['$scope','$routeParams','$rootScope','$location', 'SWBrijj',
  function($scope, $routeParams, $rootScope, $location, SWBrijj) {
  if ($rootScope.selected.role == 'investor') {
    $location.path('/investor-list');
    return;
  }

  // Set up event handlers
  SWBrijj.defaultErrorHandler = function(errm) {
    //noinspection JSValidateTypes
    $rootScope.$broadcast('net.r0kit.brijj.BrijjServlet$NotLoggedIn' == errm.javaClassName ?
        'event:loginRequired' : 'event:brijjErrror', errm.message); };
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
      void(data);
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
	
}]);

/*************************************************************************************************
  INVESTOR CONTROLLERS
*************************************************************************************************/

docviews.controller('InvestorDocumentListController',['$scope','SWBrijj','$location','$rootScope',
  function($scope, SWBrijj, $location, $rootScope) {
  if ($rootScope.selected.role == 'issuer') {
    $location.path("/company-list");
    return;
  }
  $scope.selectedCompany = $rootScope.selected.company;

  // Set up event handlers
  SWBrijj.defaultErrorHandler = function(errm) { //noinspection JSValidateTypes
    $rootScope.$broadcast( errm.javaClassName == 'net.r0kit.brijj.BrijjServlet$NotLoggedIn'
      ? "event:loginRequired" : "event:brijjErrror", errm.message); };
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
}]);

/*************************************************************************************************/

docviews.controller('InvestorDocumentViewController',['$scope','$location','$route','$rootScope','$routeParams','$timeout','SWBrijj',
  function($scope, $location, $route, $rootScope, $routeParams, $timeout, SWBrijj) {
  // Switch to company view if the role is issuer
    /** @name $routeParams#doc
     * @type {string} */
  if ($rootScope.selected.role == 'issuer') { $location.path("/company-view"); return; }

  // Set up event handlers
  SWBrijj.defaultErrorHandler = function(errm) { //noinspection JSValidateTypes
    $rootScope.$broadcast( errm.javaClassName == 'net.r0kit.brijj.BrijjServlet$NotLoggedIn'
      ? 'event:loginRequired' : 'event:brijjErrror', errm.message); };
  $scope.$on('event:loginRequired', function() { document.location.href='/login'; });
  $scope.$on('event:brijjError', function(event, msg) {$rootScope.errorMessage = msg; });

  $scope.$on('event:reload', function(event) { void(event); $timeout(function(){ $route.reload(); }, 100); });

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
    }).except(function(x) { void(x); $location.path("/investor-list?"); } );
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
          void(x);
      $scope.confirmModalClose();
    });
  };
  $scope.unSign = function(cd) {
    SWBrijj.procm('document.unsign', cd.doc_id).then(function(data) {
      void(data);
      cd.when_signed = null;
      $route.reload();
    });
  };
}]);


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
     if (activity == "sent") return "icon-email";
     else if (activity == "viewed") return "icon-view";
     else if (activity == "reminder") return "icon-redo";
     else if (activity == "signed") return "icon-pen";
     else if (activity == "uploaded") return "icon-star";
     else if (activity == "rejected") return "icon-circle-delete";
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

angular.module('documentviews').filter('fileLength', function () {
  return function (word) {
    if (word) {
      if (word.length > 21) {
        return word.substring(0, 20) + "..";
      }
      else {
        return word;
      }
    }
    return '';
  };
});

angular.module('documentviews').filter('lengthLimiter', function () {
    return function (word) {
        if (word) {
            if (word.length > 58) {
                return word.substring(0, 57) + "...";
            }
            else {
                return word;
            }
        }
        return '';
    };
});

angular.module('documentviews').filter('nameoremail', function () {
    return function (person) {
        var word = ""
        if (person.name) {
            word = person.name;
        }
        else {
            word = person.investor;
        }
        if (word.length > 24) {
            return word.substring(0, 23) + "...";
        }
        else {
            return word;
        }
    };
});

