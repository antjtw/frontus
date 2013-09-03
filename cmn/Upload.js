var upload = angular.module('upload', ['ui.bootstrap', 'ui.utils', 'ui.bootstrap.progressbar', 'brijj']);

var upmsg = "Add documents by dropping here";
var moreDocs = 'Add more documents';

var mimetypes = ["application/pdf"];

// upload.directive('backImg', function(){

upload.directive('uploadmodal', function ($timeout) {
  return {
    restrict: 'EA',
    templateUrl: '/cmn/upload.html',
    controller: UploadController,
    replace: true,
    link: function (scope, element, attr) {
      scope.draginit(element);
      // This is how I would do it if it were modal
      /*scope.$watch('uploadModal', function (val, oldVal) {
        if (val) $timeout(function () {
          scope.draginit(element);
        })
      })
      */
    }
  }
});

function UploadController($scope, $rootScope, $route, SWBrijj) {
  $scope.dropText = upmsg;

  $scope.uploadModalClose = function () {
    $scope.uploadModal = false;
  };

  $scope.fmtFileSize = function (file) {
    if (file.size > 1024 * 1024 * 1024) return parseFloat(file.size / 1024 / 1024 / 1024).toFixed(2) + " GB";
    else if (file.size > 1024 * 1024) return parseFloat(file.size / 1024 / 1024).toFixed(2) + " MB";
    else if (file.size > 1024) return parseFloat(file.size / 1024).toFixed(2) + " kB";
    else return file.size + " bytes";
  };

// init event handlers
  $scope.dragLeave = function(evt) {
    evt.stopPropagation();
    evt.preventDefault();
    $scope.dropClass= '';
    $scope.dropText = upmsg;
    $scope.$apply();
  }

  /*$scope.dragEnter = function (evt) {
    evt.stopPropagation();
    evt.preventDefault();
    $scope.dropText = upmsg;
    $scope.dropClass = 'over';
    $scope.$apply();
  };
  */

  $scope.hasUploadable = function(items) {
    for (var i = 0; i < items.length; i++) {
      if (items[i].kind == 'file') {
        for(var j = 0;j<mimetypes.length; j++) { if (items[i].type == mimetypes[j]) return true; }
      }
    }
    return false;
  };

  $scope.dragOver = function (evt) {
    evt.stopPropagation();
    evt.preventDefault();
    var ok = evt.dataTransfer && evt.dataTransfer.types && $scope.hasUploadable(evt.dataTransfer.items);
    $scope.dropText = ok ? upmsg :  'Documents must be in PDF or MS Word format';
    if (!ok) $rootScope.errorMessage = 'Documents must be in PDF or MS Word format';
    $scope.dropClass = ok ? 'over' : 'not-available';
    $scope.$apply();
  };
  $scope.dragEnter = $scope.dragOver;

  $scope.drop = function (evt) {
    // console.log('drop evt:', JSON.parse(JSON.stringify(evt.dataTransfer)))
    evt.stopPropagation();
    evt.preventDefault();
    $scope.dropClass = '';
    $scope.$apply();
    var files = evt.dataTransfer.files;
    var flsx = [];
    for (var i = 0; i < files.length; i++) {
      for(var j = 0;j<mimetypes.length;j++) {
        if (files[i].type == mimetypes[j]) flsx.push(files[i]);
      }
    }

    if (flsx.length == 0)  { $rootScope.errorMessage = "No valid documents dropped for uploading"; $scope.$apply(); return; }

    // might as well go ahead and upload ( no point in getting a click
    // for now, wait for the extra click to upload
    $scope.uploadFile(flsx);
  };

  $scope.draginit = function (elm) {
    var element = angular.element(".drop-target");
//      var element = elm.find('.dropbox');
    if (!element) return;

    /*      element.on("dragenter", dragEnterLeave)
     .on("dragleave",dragEnterLeave)
     .on("dragover",dragOver)
     .on("drop",drop);
     */
    element = element[0];
    element.addEventListener("dragenter", $scope.dragEnter, false);
    element.addEventListener("dragleave", $scope.dragLeave, false);
    element.addEventListener("dragover", $scope.dragOver, false);
    element.addEventListener("drop", $scope.drop, false);
  };

/*  $scope.setFiles = function (element) {
    $scope.files = [];
    for (var i = 0; i < element.files.length; i++) {
      $scope.files.push(element.files[i]);
    }
    $scope.progressVisible = false;
  };
  */

  /*
  $scope.uploadDropbox = function () {
    Dropbox.choose({ linkType: 'direct', multiselect: true, success: function (files) {
      SWBrijj.uploadLink(files).then(function (x) {
        console.log(x);
      });
    }, cancel: function () {
      console.log('canceled');
    }
    })
  };
  */

  $scope.uploadFile = function (files) {
    $scope.$on("upload:progress", function(evt, arg) {
      $scope.loadProgress = 100 * (arg.loaded / arg.total);
      $scope.showProgress=true;
      $scope.$apply();
    });
    $scope.$on("upload:load", function(evt, arg) {
        // $route.reload();
        // $scope.$apply();
      $rootScope.errorMessage = "processing document conversion...";
      $scope.$apply();
    });
    $scope.$on(
        "upload:error", function(evt, arg) {
          $rootScope.errorMessage = arg;
          $scope.showProgress=false;
          $scope.$apply();
          console.log(arg); });
    $scope.$on(
        "upload:abort", function(evt, arg) {
          $rootScope.errorMessage = arg;
          $scope.showProgress=false;
          $scope.$apply();
          console.log(evt); console.log(arg); });

    var fd = new FormData();
    for (var i in files) fd.append("uploadedFile", files[i]);
    var upxhr = SWBrijj.uploadFile(fd);
    upxhr.then(function(x) {
      $scope.dropText = moreDocs;
      $scope.showProgress=false;
      $rootScope.errorMessage = '';
      $route.reload();
      $scope.$apply();
    }).except(function(x) {
          $scope.dropText = moreDocs;
          $scope.showProgress=false;
          $scope.$apply();
        });

    // the race condition is that these events should be set before I do the xhr.send
    // otherwise, they might complete (or error out) before I add the eventlistener

//    upx.addEventListener("progress", uploadProgress, false);
//    upx.addEventListener("load", uploadComplete, false);
//    upx.addEventListener("error", uploadFailed, false);
//    upx.addEventListener("abort", uploadCanceled, false);

    // there is also loadstart  and loadend
  }
}

/*
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
  */


