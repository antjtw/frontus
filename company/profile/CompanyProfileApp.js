
var app = angular.module('CompanyProfileApp', ['ngResource', 'ui.bootstrap', 'ui.event', 'brijj']);

//this is used to assign the correct template and controller for each URL path
app.config(function($routeProvider, $locationProvider){
  $locationProvider.html5Mode(true).hashPrefix('');
  // $locationProvider.html5Mode(false).hashPrefix('!');

  $routeProvider.
      when('/', {controller:ContactCtrl, templateUrl:'contact.html'}).
      when('/people', {controller:PeopleCtrl, templateUrl:'people.html'}).
      otherwise({redirectTo:'/'});
});

app.controller("MainProfileController", function($scope, $location) {

} );

app.run(function($rootScope) {
  $rootScope.notification = {};
  $rootScope.notification.color = "success";
  $rootScope.notification.visible = false;
  $rootScope.notification.message = "Notification Message";

  $rootScope.notification.show = function (color, message) {
    $rootScope.notification.visible = true;
    $rootScope.notification.color = color;
    $rootScope.notification.message = message;
    setTimeout(function() { $rootScope.notification.visible = false; $rootScope.$apply(); }, 5000);
  };
});

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

  $scope.opts = {
    backdropFade: true,
    dialogFade:true
  };

  $scope.create_admin = function() {
    SWBrijj.proc('account.create_admin', $scope.newEmail, $scope.newName).then(function(x) {
      $route.reload();
        $rootScope.notification.show("success", "An admin has been created successfully.");
    }).except(function(x) {
        console.log(x);
        $rootScope.notification.show("fail", "There was an error adding an admin.");
    });
  };

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
    console.log(x);
    $scope.admins = x;
  }).except(initFail);

  SWBrijj.tbl('account.my_company').then(function(x) { initPage($scope, x) }).except(initFail);

  $scope.activity = [];
  SWBrijj.tblm('document.activity_feed').then(function(data) {
    var i = 0;
    angular.forEach(data, function(x) {
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
          $scope.activity[i].activity = "Reminded ";
          $scope.activity[i].icon = "icon-bullhorn";
        }
        else if ($scope.activity[i].activity == "signed") {
          $scope.activity[i].activity = "Signed ";
          $scope.activity[i].icon = "icon-ok-circle";
        }
        i++;
        $scope.$apply();
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

}

function PeopleCtrl($scope, $route, $rootScope, SWBrijj) {

  SWBrijj.tblm('account.company_investors', ['email', 'name', 'role']).then(function(x) {
    $scope.people = x;
    $scope.sort = 'name';
  }).except(initFail);

  $scope.sortBy = function(col) {
      if ($scope.sort == col) {
        $scope.sort = ('-' + col);
      } else {
        $scope.sort = col;
      }
    }
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
          $rootScope.notification.show("green", "Your company logo has been updated successfully.");
        }).except( function(x) { 
          $route.reload(); $scope.$apply();
          console.log(x);
          $rootScope.notification.show("fail", "There was an error updating your company logo.");
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