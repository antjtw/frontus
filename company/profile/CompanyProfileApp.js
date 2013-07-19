
var app = angular.module('CompanyProfileApp', ['ngResource', 'ui.bootstrap', 'ui.event', 'brijj']);

//this is used to assign the correct template and controller for each URL path
app.config(function($routeProvider, $locationProvider){
  $locationProvider.html5Mode(true).hashPrefix('');
  // $locationProvider.html5Mode(false).hashPrefix('!');

  $routeProvider.
      when('/', {controller:ContactCtrl, templateUrl:'contact.html'}).
      when('/people', {controller:PeopleCtrl, templateUrl:'people.html'}).
      when('/view', {controller: ViewerCtrl, templateUrl:'viewer.html'}).
      otherwise({redirectTo:'/'});
});

app.controller("MainProfileController", function($scope, $location) {

} );

function hidePopover() {
  angular.element('.popover').hide();
}

function ContactCtrl($scope, $route, $rootScope, SWBrijj) {
  
  $scope.pictureModalOpen = function () {
    $scope.pictureModal = true;
  };

  $scope.pictureModalClose = function () {
    $scope.closeMsg = 'I was closed at: ' + new Date();
    $scope.pictureModal = false;
  };

  $scope.adminModalOpen = function () {
    $scope.adminModal = true;
  };

  $scope.adminModalClose = function () {
    $scope.closeMsg = 'I was closed at: ' + new Date();
    $scope.adminModal = false;
  };

  $scope.revokeModalOpen = function (email) {
    $scope.selectedToRevoke = email;
    $scope.revokeModal = true;
  };

  $scope.revokeModalClose = function () {
    $scope.closeMsg = 'I was closed at: ' + new Date();
    $scope.revokeModal = false;
  };

  $scope.opts = {
    backdropFade: true,
    dialogFade:true
  };

  $scope.create_admin = function() {
    SWBrijj.proc('account.create_admin', $scope.newEmail, $scope.newName).then(function(x) {
      $route.reload();
      $rootScope.notification.show("success", "Invitation sent");
    }).except(function(x) {
      console.log(x);
      $rootScope.notification.show("fail", "Something went wrong, please try again later.");
    });
  };

  $scope.revokeAdmin = function() {
    SWBrijj.proc('account.revoke_admin', $scope.selectedToRevoke).then(function(x) {
      $route.reload();
      $rootScope.notification.show("success", "Privileges updated");
    }).except(function(x) {
      console.log(x);
      $rootScope.notification.show("fail", "Something went wrong, please try again later.");
    });
  }

  $scope.contactSave = function () {
    if ($scope.name.replace(/[^a-z0-9]/gi,'').length < 2) {
      $rootScope.notification.show("fail", "Please enter a company name more than 2 letters in length");
      return;
    } 
    SWBrijj.proc("account.company_update", $scope.name, $scope.overview, $scope.state, $scope.address, $scope.video).then(function (x) { 
        console.log("saved: "+x);
        $route.reload();
        $rootScope.notification.show("success", "Your company profile has been updated successfully.");
    }).except(function(x) {
        console.log(x);
        $rootScope.notification.show("fail", "There was an error updating your company profile.");
    });
  };

  SWBrijj.tblm('account.company_issuers').then(function(x) {
    $scope.admins = x;
  }).except(initFail);

  SWBrijj.tbl('account.my_company').then(function(x) { initPage($scope, x) }).except(initFail);

  // $scope.activity = [];
  // SWBrijj.procm('global.get_company_activity').then(function(data) {
  //   var i = 0;
  //   console.log('data', data);
  //   angular.forEach(data, function(x) {
  //     SWBrijj.procm('document.get_docdetail', x['doc_id']).then(function(y) {
  //       console.log('y', y)
  //       $scope.activity.push({activity: x['activity'], icon: null, when_sent: x['when_sent'], docname: y[0]['docname'], doc_id: x['doc_id']});
  //       if ($scope.activity[i].activity == "sent") {
  //         $scope.activity[i].activity = "Shared ";
  //         $scope.activity[i].icon = "icon-redo";
  //       }
  //       else if ($scope.activity[i].activity == "reminder") {
  //         $scope.activity[i].activity = "Reminded ";
  //         $scope.activity[i].icon = "icon-redo";
  //       }
  //       else if ($scope.activity[i].activity == "uploaded") {
  //         $scope.activity[i].activity = "Uploaded ";
  //         $scope.activity[i].icon = "icon-star";
  //       }
  //       i++;
  //     });
  //   });
  // });

  $scope.activity = [];
  SWBrijj.procm('global.get_company_activity').then(function(data) {
    var i = 0;
    console.log('data', data);
    angular.forEach(data, function(x) {
      if (x.type == 'account') {

      } else if (x.type == 'document') {

      } else if (x.type == 'ownership') {
        
      }
    });
  });

  $scope.activityOrder = function(card) {
     if (card.activity == "created") {
       return 0;
     } else {
        return -card.when_sent;
     }
  };

}

function PeopleCtrl($scope, $route, $rootScope, SWBrijj) {

  angular.element('body').click(function(x) {
    if (angular.element(x.target).is('i') || angular.element(x.target).is('popover')) {
      x.preventDefault();
      return;
    }
    hidePopover();
  });

  SWBrijj.tblm('account.company_investors', ['email', 'name', 'role']).then(function(x) {
    $scope.people = x;
    $scope.sort = 'name';
  }).except(function(x) {
    console.log(x);
    initFail();
  });

  $scope.sortBy = function(col) {
      if ($scope.sort == col) {
        $scope.sort = ('-' + col);
      } else {
        $scope.sort = col;
      }
    }
}

function ViewerCtrl($scope, $route, $rootScope, $routeParams, SWBrijj) { 
  var userId = $routeParams.id;
  var rowNumber;
  SWBrijj.tblm('account.company_investors', 'email', userId).then(function(x) {
    if (!x.name) {
      history.back();
    }
    $scope.user = x;
  }).except(function(err) {
    history.back();
  });

  SWBrijj.procm('document.get_investor_docs', userId).then(function(x) {
    $scope.docs = x;
    var i = 0;
    angular.forEach($scope.docs, function(x) {
      SWBrijj.procm('document.get_docdetail', x['doc_id']).then(function(y) {
        SWBrijj.procm('document.document_status_by_investor', x['doc_id'], userId).then(function(z) {
          $scope.docs[i].docname = y[0]["docname"];
          $scope.docs[i].event = z[0]['event'];
          $scope.docs[i].shown = false;
          $scope.docs[i].button = "icon-plus";
          if ($scope.docs[i].event == "revoked") {
            $scope.docs[i].rstatus = 1;
          };
          if ($scope.docs[i].event == "needsign") {
            $scope.docs[i].event = "needs signing";
          };
          i++;
          $scope.$apply();
        });
      });
    });
    //console.log($scope.docs);
  });

  $scope.activity = [];
  SWBrijj.procm('document.get_investor_activity', userId).then(function(data) {
    var i = 0;
    angular.forEach(data, function(x) {
      console.log(x);
      SWBrijj.procm('document.get_docdetail', x['doc_id']).then(function(y) {
        $scope.activity.push({activity: x['activity'], icon: null, when_sent: x['when_sent'], docname: y[0]['docname'], doc_id: x['doc_id']});
        if ($scope.activity[i].activity == "shared") {
          $scope.activity[i].activity = "Shared ";
          $scope.activity[i].icon = "icon-edit";
        }
        else if ($scope.activity[i].activity == "viewed") {
          $scope.activity[i].activity = "Viewed ";
          $scope.activity[i].icon = "icon-eye-open";
        }
        else if ($scope.activity[i].activity == "reminder") {
          $scope.activity[i].activity = "Reminded  ";
          $scope.activity[i].icon = "icon-bullhorn";
        }
        else if ($scope.activity[i].activity == "signed") {
          $scope.activity[i].activity = "Signed ";
          $scope.activity[i].icon = "icon-ok-circle";
        }
        i++;
      });
    });
  });

  $scope.activityOrder = function(card) {
     if (card.activity == "created") {
       return 0;
     } else {
        return -card.when_sent;
     }
  };

  $scope.opendetails = function(selected) {
    $scope.docs.forEach(function(doc) {     
      if (selected == doc.doc_id)
        if (doc.shown == true) {
          doc.shown = false;
          doc.button = "icon-plus";
        } else {
          SWBrijj.procm("document.get_I_docstatus", userId, parseInt(selected)).then(function(data) {
            doc.whenshared = data[1].loggedin;
            if (data[0].loggedin != null) {
              doc.lastlogin = data[0].loggedin;
            }
            else {
              doc.lastlogin = 0; 
            }
            if (data[2].loggedin != null) {
              doc.lastviewed = data[2].loggedin;
            }
            else {
              doc.lastviewed = 0;  
            }
            if (data[3].loggedin != null) {
              doc.signed = data[3].loggedin;
            }
            else {
              doc.signed = 0;  
            }
            if (data[5].loggedin != null) {
              console.log(data[5])
              doc.column5 = 2
              doc.reminder = data[5].loggedin;
            }
            else if (data[4].loggedin != null) {
              doc.column5 = 1
              doc.reminder = data[4].loggedin;
            }
            else {
              doc.column5 = 0; 
            }
            doc.button = "icon-minus";
            doc.shown = true;
            $scope.$apply();
          });
        }
    });
  };
}

app.controller("FileDNDCtrl", function($scope, $element, $route, $location, $rootScope, SWBrijj) {
    var dropbox = $element[0].querySelector(".dropbox"); // $element seems to be an array of elements
    $scope.dropText = 'Drop files here...';
    $scope.files = [];
    
    $scope.fmtFileSize = function (file) {
        if (file.size > 1024 * 1024 * 1024) return parseFloat(file.size / 1024 / 1024 / 1024).toFixed(2) + " GB";
        else if (file.size > 1024 * 1024) return parseFloat(file.size / 1024 / 1024).toFixed(2) + " MB";
        else if (file.size > 1024) return parseFloat(file.size / 1024).toFixed(2) + " kB";
        else return file.size + " bytes";
    };

    $scope.setFiles = function(element) {
        $scope.files = [];
        for (var i = 0; i < element.files.length; i++) { $scope.files.push(element.files[i]); }
        $scope.progressVisible = false;
    };

    $scope.uploadFile = function() {
        var fd = new FormData();
        $scope.progressVisible = true;
        for (var i in $scope.files) fd.append("uploadedFile", $scope.files[i]);
        SWBrijj.uploadLogo(fd).then(function(x) {
          $route.reload(); $scope.$apply();
          console.log(x);
          $rootScope.notification.show("green", "Company logo successfully updated");
        }).except( function(x) { 
          $route.reload(); $scope.$apply();
          console.log(x);
          $rootScope.notification.show("fail", "Company logo change was unsuccessful, please try again.");
        });
    };

    function uploadProgress(evt) {
        $scope.$apply(function(){
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
}
);

function initPage($scope, x, row) {
  if(typeof(row)==='undefined') row = 1;
  var y = x[0]; // the fieldnames
  var z = x[row]; // the values
  
  for(var i=0;i<y.length;i++) { if (z[i] !== null) { $scope[y[i]]=z[i]; } }
}

function initFail(x) {
	document.location.href='/login';
}

	function updated(x) {}