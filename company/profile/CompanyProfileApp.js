
var app = angular.module('CompanyProfileApp', ['ngResource', 'ui.bootstrap', 'ui.event']);

//this is used to assign the correct template and controller for each URL path
app.config(function($routeProvider, $locationProvider){
  $locationProvider.html5Mode(true).hashPrefix('');
  // $locationProvider.html5Mode(false).hashPrefix('!');

  $routeProvider.
      when('/', {controller:ContactCtrl, templateUrl:'contact.html'}).
      //when('/view', {controller: ViewerCtrl, templateUrl:'viewer.html'}).
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

function ContactCtrl($scope, $route, $rootScope) {
  
  $scope.pictureModalOpen = function () {
    $scope.pictureModal = true;
  };

  $scope.pictureModalClose = function () {
    $scope.closeMsg = 'I was closed at: ' + new Date();
    $scope.pictureModal = false;
  };

  $scope.opts = {
    backdropFade: true,
    dialogFade:true
  };

  $scope.contactSave = function () {
    SWBrijj.proc("account.company_update", $scope.name, $scope.overview, $scope.state, $scope.address, $scope.video).then(function (x) { 
        console.log("saved: "+x);
        $route.reload(); $scope.$apply();
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
        SWBrijj.uploadLogo(fd).then(function(x) {
          $route.reload(); $scope.$apply();
          console.log(x);
          $rootScope.notification.show("green", "Your company logo has been updated successfully.");
        }).except( function(x) { 
          $route.reload(); $scope.$apply();
          console.log(x);
          $rootScope.notification.show("fail", "There was an error updating your company logo.");
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