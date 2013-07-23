var upload = angular.module('upload', ['ui.bootstrap','ui.utils', 'brijj']);

// upload.directive('backImg', function(){




$scope.dropText = 'Drop files here...';
$scope.files = [];

$scope.fmtFileSize = function (file) {
  if (file.size > 1024 * 1024 * 1024) return parseFloat(file.size / 1024 / 1024 / 1024).toFixed(2) + " GB";
  else if (file.size > 1024 * 1024) return parseFloat(file.size / 1024 / 1024).toFixed(2) + " MB";
  else if (file.size > 1024) return parseFloat(file.size / 1024).toFixed(2) + " kB";
  else return file.size + " bytes";
};

// init event handlers
$scope.dragEnterLeave = function(evt) {
  evt.stopPropagation();
  evt.preventDefault();
  $scope.dropText = "Drop files here...";
  $scope.dropClass = "";
  $scope.$apply();
};

$scope.dragOver = function(evt) {
  evt.stopPropagation();
  evt.preventDefault();
  console.log(evt.dataTransfer.types);
  var ok = evt.dataTransfer && evt.dataTransfer.types && evt.dataTransfer.types.some( function(x) { return x == 'Files'; } );
  $scope.dropText = ok ? 'Drop files here...' : 'Only files are allowed!';
  $scope.dropClass = ok ? 'over' : 'not-available';
  $scope.$apply();
};

$scope.drop = function (evt) {
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

  // might as well go ahead and upload ( no point in getting a click
  $scope.uploadFile();
};

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

$scope.setFiles = function (element) {
  $scope.files = [];
  for (var i = 0; i < element.files.length; i++) {
    $scope.files.push(element.files[i]);
  }
  $scope.progressVisible = false;
};

$scope.uploadDropbox = function() {
  Dropbox.choose( { linkType: 'direct', multiselect: true, success: function(files) {
    SWBrijj.uploadLink(files).then( function(x) { console.log(x);}) ;
  }, cancel: function() { console.log('canceled'); }
  })
};
$scope.uploadFile = function () {
  var fd = new FormData();
  $scope.progressVisible = true;
  for (var i in $scope.files) fd.append("uploadedFile", $scope.files[i]);
  SWBrijj.uploadFile(fd).then(function (x) {
    console.log(x);
  }).except(function (x) {
        alert(x.message);
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



