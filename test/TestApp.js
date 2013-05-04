
var app = angular.module('TestApp', ['ngResource']);

//this is used to assign the correct template and controller for each URL path
app.config(function($routeProvider, $locationProvider){
  $locationProvider.html5Mode(true).hashPrefix('');
  // $locationProvider.html5Mode(false).hashPrefix('!');

  $routeProvider.
      when('/google', {controller:GoogleCtrl, templateUrl:'google.html'}).
      when('/dropbox', {controller:DropboxCtrl, templateUrl: 'dropbox.html'}).
      when('/linkedin', {controller:LinkedinCtrl, templateUrl: 'linkedin.html'}).
      when('/twitter', {controller:TwitterCtrl, templateUrl: 'twitter.html'}).
      when('/other', {controller:OtherCtrl, templateUrl: 'other.html'}).
      otherwise({redirectTo:'/other'});
});

app.controller("MainTestController", function($scope, $location) {
    $scope.toGoogle = function() { $location.path('google') };
    $scope.toDropbox = function() { $location.path('dropbox') };
    $scope.toLinkedin = function() { $location.path('linkedin') };
    $scope.toOther = function() { $location.path('other') };
    $scope.tab = function(x) { 
      var p = $location.path();  if (p == '/') p='google';
      return p == x; };
} );

function GoogleCtrl($scope) {
  $scope.googleList = function () {
      SWBrijj.procm("oauth.get_google_list", $scope.mimeType).then(function (x) { $scope.gfiles = x; $scope.$apply(); });
  };

	// I should check for google access
}

function TwitterCtrl($scope) {
  $scope.contactSave = function () {
      SWBrijj.proc("contact_update", $scope.name, $scope.street, $scope.city, $scope.state, $scope.postalcode, $scope.country)
        .then(function (x) { alert("saved: "+x);
      });
  };
  //noinspection JSUnresolvedVariable
    SWBrijj.proc('profile').then(function(x) { initPage($scope, x) }).except(initFail);
}

function DropboxCtrl($scope, $location) {  
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


    SWBrijj.proc('profile').then(function(x) { initPage($scope, x) }).except(initFail);
    SWBrijj.procm('oauth.dropbox_list','')
      .then(function(x)  { $scope.dropboxFiles=x; $scope.$apply(); })
      .except( function(x) {} );

}

function LinkedinCtrl($scope) {
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
        SWBrijj.proc("change_password", $scope.currentPassword, $scope.newPassword).then(function(x) {
            if (x[1][0]) alert("changed successfully");
            else alert("Oops.  Change failed");
        }).except(function(x) {alert("Oops.  Change failed: "+x); });
    };
}

function OtherCtrl($scope) {
    $scope.upload = function () {
        alert('heh');
    };
    
    SWBrijj.proc('profile').then(function(x) { initPage($scope,x) }).except(initFail);
}

app.controller("FileDNDCtrl", function($scope, $element) {
    var dropbox = $element[0].querySelector(".dropbox"); // $element seems to be an array of elements
    $scope.dropText = 'Drop files here...';
    $scope.files = [];
    
    $scope.fmtFileSize = function (file) {
        if (file.size > 1024 * 1024 * 1024) return parseFloat(file.size / 1024 / 1024 / 1024).toFixed(2) + " GB";
        else if (file.size > 1024 * 1024) return parseFloat(file.size / 1024 / 1024).toFixed(2) + " MB";
        else if (file.size > 1024) return parseFloat(file.size / 1024).toFixed(2) + " kB";
        else return file.size + " bytes";
    };

    // init event handlers
    function dragEnterLeave(evt) {
        evt.stopPropagation();
        evt.preventDefault();
        $scope.dropText = "Drop files here...";
        $scope.dropClass = "";
        $scope.$apply();
    }
    
    function dragOver(evt) {
        evt.stopPropagation();
        evt.preventDefault();
        var ok = evt.dataTransfer && evt.dataTransfer.types && evt.dataTransfer.types.contains('Files');
        $scope.dropText = ok ? 'Drop files here...' : 'Only files are allowed!';
        $scope.dropClass = ok ? 'over' : 'not-available';
        $scope.$apply();
    }
    
    function drop(evt) {
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
    }
    
    dropbox.addEventListener("dragenter", dragEnterLeave, false);
    dropbox.addEventListener("dragleave", dragEnterLeave, false);
    dropbox.addEventListener("dragover", dragOver, false);
    dropbox.addEventListener("drop", drop, false);

    $scope.setFiles = function(element) {
        $scope.files = [];
        for (var i = 0; i < element.files.length; i++) { $scope.files.push(element.files[i]); }
        $scope.progressVisible = false;
    };

    $scope.uploadFile = function() {
        var fd = new FormData();
        $scope.progressVisible = true;
        for (var i in $scope.files) fd.append("uploadedFile", $scope.files[i]);
        SWBrijj.uploadImage(fd).then(function(x) { console.log(x); }).except( function(x) { alert(x); });
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







function initPage($scope, x) {
  var y = x[0]; // the fieldnames
  var z = x[1]; // the values
  
  for(var i=0;i<y.length;i++) { if (z[i] !== null) { $scope[y[i]]=z[i]; } }
  $scope.$apply();
}

