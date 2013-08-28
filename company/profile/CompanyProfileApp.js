
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
    $scope.files = [];
    $scope.closeMsg = 'I was closed at: ' + new Date();
    $scope.pictureModal = false;
  };

  $scope.adminModalOpen = function () {
    $scope.adminModal = true;
  };

  $scope.adminModalClose = function () {
    $scope.newEmail = "";
    $scope.closeMsg = 'I was closed at: ' + new Date();
    $scope.adminModal = false;
  };

    $scope.fieldCheck = function() {
        if ($scope.newEmail) {
            return false;
        }
        else {
            return true;
        }
    };

  $scope.revokeModalOpen = function (email) {
    $scope.selectedToRevoke = email;
    $scope.revokeModal = true;
  };

  $scope.revokeModalClose = function () {
    $scope.closeMsg = 'I was closed at: ' + new Date();
    $scope.revokeModal = false;
  };

   $scope.narrowopts = {
        backdropFade: true,
        dialogFade:true,
        dialogClass: 'narrowModal modal'
   };

  $scope.opts = {
    backdropFade: true,
    dialogFade:true
  };

  $scope.create_admin = function() {
    SWBrijj.proc('account.create_admin', $scope.newEmail.toLowerCase()).then(function(x) {
      $rootScope.notification.show("success", "Invitation sent");
      $scope.get_issuers();
    }).except(function(x) {
      console.log(x);
      $rootScope.notification.show("fail", "Something went wrong, please try again later.");
    });
  };

  $scope.revokeAdmin = function() {
    SWBrijj.proc('account.revoke_admin', $scope.selectedToRevoke).then(function(x) {
      $rootScope.notification.show("success", "Privileges updated");
      $scope.get_issuers();
    }).except(function(x) {
      console.log(x);
      $rootScope.notification.show("fail", "Something went wrong, please try again later.");
    });
  }

  $scope.contactSave = function () {
    if ($scope.detectChanges != $scope.name + $scope.address + $scope.company) {
      $scope.detectChanges = $scope.name + $scope.address + $scope.company;
      if ($scope.name.replace(/[^a-z0-9]/gi,'').length < 2 || $scope.company.replace(/[^a-z0-9]/gi,'').length < 3) {
        $rootScope.notification.show("fail", "Please enter a valid company and domain name");
        $scope.name = $scope.namekey;
        $scope.company = $scope.companykey;
        return;
      }
      SWBrijj.proc("account.company_update", $scope.name, $scope.address, $scope.company).then(function (x) { 
          console.log("saved: "+x);
          $rootScope.select($scope.company);
          $rootScope.notification.show("success", "Your company profile has been updated successfully.");
          $scope.namekey = $scope.name;
          $scope.companykey = $scope.company;
      }).except(function(x) {
          console.log(x);
          $scope.namekey = $scope.name;
          $scope.companykey = $scope.company;
          $rootScope.notification.show("fail", "There was an error updating your company profile.");
      });
    }
  };

  $scope.get_issuers = function () {
    SWBrijj.tblm('account.company_issuers', ['email', 'name']).then(function(x) {
      $scope.admins = x;
      SWBrijj.tblm('account.profile', ['email']).then(function(me) {
        angular.forEach($scope.admins, function(admin) {
          if (admin.email == me[0].email)
            admin.hideLock = true;
          if (admin.name == null)
            admin.name = admin.email;
        });
      });
    }).except(initFail);
  }
  
  $scope.get_issuers();

  SWBrijj.tbl('account.my_company').then(function(x) { 
    initPage($scope, x);
    $scope.namekey = $scope.name;
    $scope.companykey = $scope.company;
    $scope.detectChanges = $scope.name + $scope.address + $scope.company;
    $scope.photoURL = '/photo/user?id=company:' + $scope.company;
  }).except(initFail);

  $scope.activity = [];
  SWBrijj.procm('global.get_company_activity').then(function(data) {
    var i = 0;
    angular.forEach(data, function(x) {
      x.timeAgo = moment(x.time).fromNow();
      if (x.type == 'account') {
        x.link = (x.count > 1) ? "/company/profile/people" : "/company/profile/view?id=" + x.item_id;
        if (x.activity == "addadmin") {
          x.activity = "Added ";
          x.target = + (x.count > 1) ? x.count + " administrators": "an administrator";
          x.icon = "icon-circle-plus";
        } else if (x.activity == "removeadmin") {
          x.activity = "Removed ";
          x.target = + (x.count > 1) ? x.count + " administrators": "an administrator";
          x.icon = "icon-circle-minus";
        } else if (x.activity == "addinvestor") {
          x.activity = "Added ";
          x.target = + (x.count > 1) ? x.count + " investors": "an investor";
          x.icon = "icon-circle-plus";
        } else if (x.activity == "removeinvestor") {
          x.activity = "Removed ";
          x.target = + (x.count > 1) ? x.count + " investors": "an investor";
          x.icon = "icon-circle-minus";
        }
      } else if (x.type == 'document') {
        x.link = "/documents/company-status?doc=" + x.item_id;
        SWBrijj.tblm('document.my_company_library', ['docname'], 'doc_id', parseInt(x.item_id)).then(function(res){
          x.target = res["docname"];
        }); 
        if (x.activity == "uploaded") {
          x.activity = "Uploaded ";
          x.icon = "icon-star";
        } else if (x.activity == "sent") {
          x.activity = "Shared ";
          x.icon = "icon-redo";
        }
      } else if (x.type == 'ownership') {
        x.link = "/company/ownership/";
        x.target = "Ownership table";
        if (x.activity == "shared") {
          x.activity = "Shared ";
          x.icon = "icon-redo";
        }
      }
    });
    $scope.activity = data;
    if ($scope.activity.length == 0) {
      $scope.noActivity = true;
    }
  });

  $scope.activityOrder = function(card) {
        return -card.time;
  };

  $scope.uploadFile = function() {
      $scope.photoURL = "/img/image-loader-140.png";
      var fd = new FormData();
      for (var i in $scope.files) fd.append("uploadedFile", $scope.files[i]);
      SWBrijj.uploadLogo(fd).then(function(x) {
        $scope.photoURL = '/photo/user?id=company:' + $scope.company;
        console.log(x);
        $rootScope.notification.show("green", "Company logo successfully updated");
      }).except( function(x) { 
        console.log(x);
        $rootScope.notification.show("fail", "Company logo change was unsuccessful, please try again.");
        $scope.photoURL = '/photo/user?id=company:' + $scope.company;
      });
  };

  $scope.setFiles = function(element) {
    $scope.files = [];
    for (var i = 0; i < element.files.length; i++) { 
      $scope.files.push(element.files[i]);
      $scope.$apply();
    }
  }
}

function PeopleCtrl($scope, $route, $rootScope, SWBrijj) {

  angular.element('body').click(function(x) {
    if (angular.element(x.target).is('i') || angular.element(x.target).is('popover')) {
      x.preventDefault();
      return;
    }
    hidePopover();
  });

  SWBrijj.tblm('global.combined_investor_list', ['email', 'name']).then(function (x) {
      $scope.people = x;
      SWBrijj.tblm('account.company_issuers', ['email', 'name']).then(function (admins) {
          var issuers = admins;
          angular.forEach(admins, function (admin) {
              admin.role = "issuer";
              $scope.people.push(admin);
          });
          SWBrijj.tblm('account.profile', ['email']).then(function (me) {
              angular.forEach($scope.people, function (person) {
                  if (person.email == me[0].email)
                      person.hideLock = true;
                  if (person.name == null)
                      person.name = person.email;
              });
          });
          console.log(x);
          $scope.sort = 'name';
      }).except(function (x) {
              console.log(x);
              initFail();
          }).except(function (x) {
              console.log(x);
              initFail();
            });
          });

      $scope.sortBy = function (col) {
          if ($scope.sort == col) {
              $scope.sort = ('-' + col);
          } else {
              $scope.sort = col;
          }
      }
  };

function ViewerCtrl($scope, $route, $rootScope, $routeParams, SWBrijj) { 
  var userId = $routeParams.id;
  var rowNumber;

  SWBrijj.tblm('account.user', ['email']).then(function(x) { // Redirect to My Profile is viewing yourself
    if(x[0].email == userId)
      document.location.href="/investor/profile";
  });

  SWBrijj.tblm('global.combined_investor_list', 'email', userId).then(function(x) {
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
      // SWBrijj.procm('document.document_status_by_investor', userId, x['doc_id']).then(function(z) {
        $scope.docs[i].event = z[0]['event'];
        $scope.docs[i].shown = false;
        $scope.docs[i].button = "icon-plus";
        if ($scope.docs[i].event == "needsign") $scope.docs[i].event = "needs signing";
        i++;
    });
  });

  $scope.activity = [];
  SWBrijj.procm('global.get_investor_activity', userId).then(function(data) {
    console.log(data);
    var i = 0;
    angular.forEach(data, function(x) {
      x.timeAgo = moment(x.time).fromNow();
      if (x.type == 'account') {
        x.link = "/company/profile/people";
        if (x.activity == "addadmin") {
          x.activity = "Added ";
          x.target = "as an administrator.";
          x.icon = "icon-circle-plus";
        } else if (x.activity == "removeadmin") {
          x.activity = "Removed ";
          x.target = "as an administrator";
          x.icon = "icon-circle-minus";
        } else if (x.activity == "addinvestor") {
          x.activity = "Added ";
          x.target = "as an investor";
          x.icon = "icon-circle-plus";
        } else if (x.activity == "removeinvestor") {
          x.activity = "Removed ";
          x.target = "as an investor";
          x.icon = "icon-circle-minus";
        }
      } else if (x.type == 'document') {
        x.link = "/documents/company-status?doc=" + x.item_id;
        SWBrijj.tblm('document.my_company_library', ['docname'], 'doc_id', parseInt(x.item_id)).then(function(res){
          x.target = res["docname"];
        }); 
        if (x.activity == "viewed") {
          x.activity = "Viewed ";
          x.icon = "icon-star";
        } else if (x.activity == "received") {
          x.activity = "Received ";
          x.icon = "icon-redo";
        }
      } else if (x.type == 'ownership') {
        x.link = "/company/ownership/";
        x.target = "Ownership table";
        if (x.activity == "shared") {
          x.activity = "Received ";
          x.icon = "icon-redo";
        }
      }
    });
    $scope.activity = data;
    if ($scope.activity.length == 0) {
      $scope.noActivity = true;
    }
  });

  $scope.activityOrder = function(card) {
    return -card.time;
  };

  SWBrijj.tblm('ownership.company_access', ['email', 'level'], 'email', userId).then(function(x) {
    $scope.level = x.level;
  }).except(function(err) {
    $scope.level = false;
  });

  $scope.changeVisibility = function (value) {
    console.log(value);
    $scope.level = value;
    SWBrijj.proc('ownership.update_investor_captable', userId, $scope.level).then(function (data) {
      $rootScope.notification.show("success", "Successfully changed cap table visibility")
    });
  };

  $scope.opendetails = function(selected) {
    $scope.docs.forEach(function(doc) {     
      if (selected == doc.doc_id)
        if (doc.shown == true) {
          doc.shown = false;
          doc.button = "icon-plus";
        } else {
          SWBrijj.procm("document.get_I_docstatus", userId, parseInt(selected)).then(function(data) {
            console.log(data);
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
            doc.button = "icon-minus";
            doc.shown = true;
          });
        }
    });
  };
}

function initPage($scope, x, row) {
  if(typeof(row)==='undefined') row = 1;
  var y = x[0]; // the fieldnames
  var z = x[row]; // the values

  
  for(var i=0;i<y.length;i++) { if (z[i] !== null) { $scope[y[i]]=z[i]; } }
}

function initFail(x) {
	return;
}

	function updated(x) {}