
var app = angular.module('ProfileApp', ['ngResource', 'ui.bootstrap', 'ui.event']);

//this is used to assign the correct template and controller for each URL path
app.config(function($routeProvider, $locationProvider){
  $locationProvider.html5Mode(true).hashPrefix('');
  // $locationProvider.html5Mode(false).hashPrefix('!');

  $routeProvider.
      when('/', {controller:ContactCtrl, templateUrl:'contact.html'}).
      when('/view', {controller: ViewerCtrl, templateUrl:'viewer.html'}).
      // when('/social', {controller:SocialCtrl, templateUrl: 'social.html'}).
      // when('/password', {controller:PasswordCtrl, templateUrl: 'password.html'}).
      //when('/photo', {controller:PhotoCtrl, templateUrl: 'photo.html'}).
      otherwise({redirectTo:'/'});
});

app.controller("MainProfileController", function($scope, $location) {
    $scope.toPassword = function() { $location.path('password') };
    $scope.toContact = function() { $location.path('contact') };
    $scope.toSocial = function() { $location.path('social') };
    $scope.toPhoto = function() { $location.path('photo') };
    $scope.tab = function(x) { 
      var p = $location.path();  if (p == '/') p='contact';
      return p == x; };
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

function ContactCtrl($scope, $route, $rootScope) {

  $scope.pictureModalOpen = function () {
    $scope.pictureModal = true;
  };

  $scope.pictureModalClose = function () {
    $scope.closeMsg = 'I was closed at: ' + new Date();
    $scope.pictureModal = false;
  };

  $scope.passwordModalOpen = function () {
    $scope.passwordModal = true;
  };

  $scope.passwordModalClose = function () {
    $scope.closeMsg = 'I was closed at: ' + new Date();
    $scope.passwordModal = false;
  };

  $scope.opts = {
    backdropFade: true,
    dialogFade:true
  };

  $scope.contactSave = function () {
      SWBrijj.proc("account.contact_update", $scope.name, $scope.street, $scope.city, $scope.state, $scope.postalcode, $scope.country)
        .then(function (x) { 
          console.log("saved: "+x);
          $route.reload(); $scope.$apply();
          $rootScope.notification.show("success", "Your profile has been updated successfully.");
      }).except(function(x) {
          $rootScope.notification.show("fail", "There was an error updating your profile.");
      });
  };
  //noinspection JSUnresolvedVariable
  SWBrijj.tbl('account.profile').then(function(x) { initPage($scope, x) }).except(initFail);

}

function SocialCtrl($scope, $location) {  
  $scope.contactSave = function(){
     SWBrijj.proc("social_update", $scope.twitter, $scope.linkedin, $scope.google, $scope.dropbox, $scope.facebook).
        then(function(x) { alert("done: "+x); });
  }

  $scope.authTwitter = function() {
    SWBrijj.proc("oauth.twitter_authorize").then(function(x) { document.location.href=x[1][0]; });
  }
  $scope.authLinkedin = function() {
    SWBrijj.proc("oauth.linkedin_authorize").then(function(x) {
      document.location.href=x[1][0]; });
  }
  $scope.authDropbox = function() {
      SWBrijj.proc("oauth.dropbox_authorize").then(function(x) { document.location.href=x[1][0]; });
  }
  $scope.authGoogle = function() {
    SWBrijj.proc("oauth.google_authorize").then(function(x) { document.location.href=x[1][0]; });
  }
  $scope.authFacebook = function() {
    SWBrijj.proc("oauth.facebook_authorize").then(function(x) { document.location.href=x[1][0]; });
  }


    SWBrijj.tbl('account.profile').then(function(x) { initPage($scope, x) }).except(initFail);
    SWBrijj.procm('oauth.dropbox_list','')
      .then(function(x)  { $scope.dropboxFiles=x; $scope.$apply(); })
      .except( function(x) {} );

}

function ViewerCtrl($scope, $route, $rootScope, $routeParams) { 
  var userId = $routeParams.id;
  SWBrijj.tbl('account.company_investors').then(function(x) {
    for (var i = 1; i < x.length; i++) { //Can't use indexOf, Objects not supported
      if (x[i][0] == userId) {
        rowNumber = i;
      } //Get email
    }
    initPage($scope, x, rowNumber);
  }).except(initFail);

  //TODO: NEED TO ADD INFO TO EACH DOC
  $scope.docIds = [];
  SWBrijj.procm('document.get_investor_docs', userId).then(function(x) {
    for (var i = 0; i < x.length; i++) {
      $scope.docIds.push(x[i]["doc_id"]);
      SWBrijj.procm('document.get_i_docstatus', userId, x[i]["doc_id"]).then(function(x) {
        console.log(x);
      });
    }
  });
}

function PasswordCtrl($scope, $route, $rootScope) {
    $scope.currentPassword="";
    $scope.newPassword="";
    $scope.passwordConfirm="";
    
    $scope.validPasswordNot = function() { 
        return !($scope.currentPassword && !($scope.passwordMatchesNot() || $scope.regexPassword())); };
    
    $scope.regexPassword = function() {
        var newP = $scope.newPassword;
    	if (newP.match(/(?=.*?[a-z])(?=.*?[A-Z])(?=.*?[0-9]).{8,}/)) return "";
    	else if (newP.match(/(?=.*?[a-z])(?=.*?[A-Z]).{8,}/)) return "Missing a digit";
    	else if (newP.match(/(?=.*?[a-z])(?=.*?[0-9]).{8,}/)) return "Missing an uppercase letter";
    	else if (newP.match(/(?=.*?[0-9])(?=.*?[A-Z]).{8,}/)) return "Missing a lowercase letter";
    	else if (newP.length < 8) return "Must be at least eight characters";
    	else return "Must contain at least one lowercase letter, one uppercase letter, and one digit";
    };
    
    $scope.passwordMatchesNot = function() {
        return $scope.passwordConfirm != $scope.newPassword ; 
    };
    
    $scope.changePassword = function() {
        SWBrijj.proc("account.change_password", $scope.currentPassword, $scope.newPassword).then(function(x) {
            if (x[1][0]) { 
              $route.reload(); $scope.$apply();
              $rootScope.notification.show("success", "Your password has been updated successfully.");
              console.log("changed successfully");
            } else { 
              $route.reload(); $scope.$apply();
              $rootScope.notification.show("fail", "There was an error updating your password.");
              console.log("Oops.  Change failed");
            }
        }).except(function(x) {alert("Oops.  Change failed: "+x); });
    };
}

function PhotoCtrl($scope) {
    $scope.upload = function () {
        alert('heh');
    };
    
    SWBrijj.tbl('account.profile').then(function(x) { initPage($scope,x) }).except(initFail);
}

app.controller("FileDNDCtrl", function($scope, $element, $route, $location, $rootScope) {
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
        SWBrijj.uploadImage(fd).then(function(x) {
          $route.reload(); $scope.$apply();
          console.log(x);
          $rootScope.notification.show("green", "Your profile picture has been updated successfully.");
        }).except( function(x) { 
          $route.reload(); $scope.$apply();
          console.log(x);
          $rootScope.notification.show("fail", "There was an error updating your profile picture.");
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
  $scope.$apply();
}
	function initFail(x) {
		document.location.href='/login';
	}

	function updated(x) {}