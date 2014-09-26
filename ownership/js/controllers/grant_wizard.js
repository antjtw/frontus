'use strict';

app.controller('chooseGrantIssue',
    ["$scope", "grants", function($scope, grants){
        $scope.issue = grants.issue;
}]);

app.controller('docsGrantIssue',
    ["$scope", "captable", "grants", "SWBrijj", "$timeout", function($scope, captable, grants, SWBrijj, $timeout) {

        $scope.state = {evidenceQuery: "",
                        originalOnly: true};
        $scope.issue = grants.issue;

        $scope.handleDrop = function(item, bin) {
            $scope.issue[0].addSpecificEvidence(parseInt(item), String(bin), String(bin));
        };
        
        var mimetypes = ["application/pdf", // .pdf
                // microsoft office
                "application/msword", // .doc
                "application/vnd.openxmlformats-officedocument.wordprocessingml.document", // .docx
                "application/vnd.ms-powerpoint", // .ppt
                "application/vnd.openxmlformats-officedocument.presentationml.presentation", // .pptx
                // open office
                "application/vnd.oasis.opendocument.text", // .odt
                "application/vnd.oasis.opendocument.presentation", // .odp
                "application/vnd.oasis.opendocument.image", // .odi
                "image/png", // .png
                "image/tiff", // .tiff
                "image/jpeg", // .jpg
                "text/plain", // .txt
                "application/rtf" // .rtf
            ];
        $scope.setFiles = function(element, bin) {
            // called from outside of angular, so $apply it
            $scope.$apply(function() {
                $scope.files = [];
                $scope.fileError = "";
                if (element.files.length == 0)
                    return;
                if (element.files.length > 1)
                {
                    $scope.$emit("notification:fail", "Please select only 1 file to upload.");
                    return;
                }
                if (element.files[0].size > 20000000) {
                    $scope.fileError = "Please choose a smaller file";
                } else if (mimetypes.indexOf(element.files[0].type) == -1) {
                    $scope.$emit("notification:fail", "Sorry, this file type is not supported.");
                } else {
                    $scope.files.push(element.files[0]);
                }
                if ($scope.files.length > 0) {
                    $scope.uploadFile($scope.files, bin);
                }
            });
        };
        
        $scope.uploadFile = function(files, bin) {
            $scope.$on("upload:load", function(evt, arg) {
                void(evt);
                void(arg);
                $scope.$emit("notification:success", "Success! We're preparing your file.");
            });
            $scope.$on(
                "upload:error", function(evt, arg) {
                    $rootScope.errorMessage = arg;
                    $scope.$emit("notification:fail", "Oops, something went wrong. Please try again.");
                    console.log(arg);
                });
            $scope.$on(
                "upload:abort", function(evt, arg) {
                    $rootScope.errorMessage = arg;
                    console.log(evt);
                    console.log(arg);
                });
            var fd = new FormData();
            if (window.location.hostname == "www.sharewave.com" || window.location.hostname == " wave.com") {
                _kmq.push(['record', 'doc uploader']);
                analytics.track('doc uploader');
            }
            for (var i = 0; i < files.length; i++) {fd.append("uploadedFile", files[i]);}
            var upxhr = SWBrijj.uploadFile(fd);
            upxhr.then(function(x) {
                $scope.uploadprogress = x;
                /*for (var i = 0; i < files.length; i++) {
                    var newdocument = {
                        uploaded_by: $rootScope.person.user_id,
                        iss_annotations: null,
                        company: $rootScope.navState.company,
                        doc_id: x[i],
                        template_id: null,
                        annotations: null,
                        docname: files[i].name,
                        version_count: 0,
                        complete_count: 0,
                        archive_complete_count: 0,
                        archive_count: 0,
                        statusRatio: 0,
                        uploading: true,
                        type: "doc"
                    };
                    $scope.documents.push(newdocument);
                }*/
                $timeout(function(){$scope.checkReady(bin);}, 2000);

            }).except(function(x) {
                $scope.$emit("notification:fail", "Oops, something went wrong. Please try again.");
                $scope.files = [];
            });
        };
        
        $scope.checkReady = function(bin) {
            // Cap at 10 then say error
            var incrementer = 0;
            SWBrijj.tblm('document.my_company_library', ['upload_id', 'doc_id', 'pages']).then(function(data) {
                angular.forEach(data, function(doc) {
                    var index = $scope.uploadprogress.indexOf(doc.upload_id);
                    if (index != -1) {
                        if (doc.pages != null)
                        {
                            $scope.uploadprogress.splice(index, 1);
                            /*angular.forEach($scope.documents, function(document) {
                                //In theory this match might get the wrong document, but (and please feel free to do the math) it's very, very unlikely...
                                if (document.doc_id == doc.upload_id) {
                                    document.doc_id = doc.doc_id;
                                    document.uploading = false;
                                    document.pages = doc.pages;
                                    $rootScope.billing.usage.documents_total+=1;
                                }
                            });*/
                            $scope.handleDrop(doc.doc_id, bin);
                        }
                    }
                });
                if ($scope.uploadprogress.length !== 0 && incrementer < 30) {
                    incrementer += 1;
                    $timeout(function(){$scope.checkReady(bin);}, 2000);
                }
            }).except(function(data) {
                console.log(data);
            });
        };
}]);

app.controller('peopleGrantIssue',
    ["$scope", function($scope){

}]);

app.controller('reviewGrantIssue',
    ["$scope", function($scope){

}]);
