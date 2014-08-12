'use strict';

DocumentVersionRowController.$inject = ['$scope', '$rootScope', 'SWBrijj', 'basics', '$location', '$route'];
function DocumentVersionRowController($scope, $rootScope, SWBrijj, basics, $location, $route) {
    $scope.versionStatus = function(version) {
        if (version.last_event_activity) {
            return (version.last_event_activity==='received' ? 'sent to ' : (version.last_event_activity === 'retracted' ? (version.last_event_activity + " from ") : (version.last_event_activity + " by "))) +
                (version.last_event_name) +
                " " + moment(version.last_event_time).from($rootScope.servertime) +
                (version.signature_flow===2 && version.last_event_activity==='signed' ? " (awaiting countersign)" : "");
        } else {
            return "";
        }
    };

    $scope.modals.uploadedSignedDocs = [];

    $scope.myEmails = [];
    // this returns everyone you have ever emailed. yay
    $scope.getPeople = function(){
        SWBrijj.tblm('global.investor_list', ['email']).then(function(data){
            $scope.emailList = data;
            angular.forEach($scope.emailList, function(value, key){
                $scope.myEmails.push(value['email']);
            });
            return $scope.myEmails;
        });
        // $scope.myEmails = array
    };
    $scope.getPeople()

    $scope.buttondisabled = false;

    $scope.docRecipients = function(version, email){
        // $scope.buttondisabled = true
        $scope.buttondisabled = true
        SWBrijj.tblmm('document.my_counterpart_document_library_view', 'original', version.original).then(function(data){
                $scope.myLibrary = data
                var alreadySent = []

                angular.forEach($scope.myLibrary, function(name){
                   alreadySent.push(name.investor)
                });
                if(alreadySent.indexOf(email[0]) > -1){
                     $scope.$emit('notification:fail', 'You have already shared this');
                     $route.reload();
                    // $scope.buttondisabled = false;
                }
                else{
                    $scope.reShare(version, email);
                }
        });
    };

    $scope.reShare = function(version, email){
        SWBrijj.document_resend_to(email[0], version.doc_id).then(function(data){
            // console.log(data)
            $route.reload();
            $scope.$emit('notification:success', 'Document reshared');
        }).except(function(data){
            console.log("failed")
            $rootScope.$emit('notification:fail', 'Something went wrong');
            // $scope.buttondisabled = false
        })

    };



    $scope.select2Options = {
        'multiple': true,
        'simple_tags': true,
        maximumSelectionSize: 1,
        'tags': $scope.myEmails,
        'tokenSeparators': [",", " "],
        'placeholder': 'Enter an email address & press enter'
    };


    $scope.shortVersionStatus = function(version) {
        if (!version) return "";
        if ($scope.modals.uploadedSignedDocs.indexOf(version.doc_id) > -1) {
            return "Uploading . . ."
        } else if ($scope.isVoided(version)) {
            return "Voided"
        } else if(version.sendgrid_event == 'dropped' || version.sendgrid_event =='bounce' || version.sendgrid_event =='deferred'){
            version.sendgrid_event ='bounce'
            return 'Bounced Share'
        } else if(version.sendgrid_event =='processed'){
            return 'doc processed'
        } else if ($scope.isPendingVoid(version)) {
            return "Void requested by you"
        } else if (wasJustRejected(version) && lastEventByInvestor(version)) {
            return "Rejected by recipient";
        } else if (wasJustRejected(version) &&
                   !lastEventByInvestor(version)) {
            return "Rejected by you";
        } else if ($scope.isPendingSignature(version)){
            return "Sent for Signature";
        } else if ($scope.isPendingCountersignature(version)){
            return "Review and Sign";
        } else if ($scope.isPendingInvestorFinalization(version)) {
            return "Signed and Sent for Approval";
        } else if ($scope.isPendingIssuerFinalization(version)) {
            return "Awaiting Your Approval";
        } else if ($scope.isCompleteRetracted(version)) {
            return "Retracted";
        } else if ($scope.isCompleteSigned(version)){
            return "Completed";
        } else if ($scope.isPendingView(version)){
            return "Unviewed";
        } else if ($scope.isCompleteViewed(version)){
            return "Viewed";
        } else {
            return "Sent";
        }

    };

    function lastEventByInvestor(doc) {
        return doc.investor == doc.last_event.person;
    };

    function wasJustRejected(doc) {
        return doc.last_event && doc.last_event.activity == 'rejected';
    };

    $scope.isPendingView = function(version) {
        return version.signature_flow===0 && !version.last_viewed;
        console.log('test')
    };
    $scope.isPendingSignature = function(version) {
        return version.signature_flow>0 && !version.when_signed && !version.when_retracted;
    };

    $scope.isPendingCountersignature = function(version) {
        return version.when_signed && !version.when_countersigned && !version.when_retracted && version.signature_flow===2;
    };

    $scope.isPendingInvestorFinalization = function(version) {
        return (version.signature_flow===2 && version.when_signed && version.when_countersigned && !version.when_finalized && !version.when_retracted);
    };
    $scope.isPendingIssuerFinalization = function(version) {
        return (version.signature_flow===1 && version.when_signed && !version.when_finalized && !version.when_retracted);
    };

    $scope.isVoided = function(version) {
        return version.signature_flow > 0 && version.when_void_accepted && version.when_void_requested;
    };

    $scope.isPendingVoid = function(version) {
        return version.signature_flow > 0 && !version.when_void_accepted && version.when_void_requested;
    };
    $scope.isCompleteSigned = function(version) {
        return basics.isCompleteSigned(version);
    };
    $scope.isCompleteViewed = function(version) {
        return basics.isCompleteViewed(version);
    };
    $scope.isCompleteVoided = function(version) {
        return basics.isCompleteVoided(version);
    };
    $scope.isCompleteRetracted = function(version) {
        return version.when_retracted;
    };

    $scope.versionIsComplete = function(version) {
        return $scope.isCompleteSigned(version)
            || $scope.isCompleteViewed(version)
            || $scope.isCompleteRetracted(version);
    };

    // dropdown actions and misc. buttons
    $scope.viewInvestorCopy = function(version) {
        $location.url("/app/documents/company-view?doc=" + version.original + "&page=1" + "&investor=" + version.doc_id);
    };

    $scope.viewStatus = function(version) {
        $location.url("/app/documents/company-status?doc=" + version.original);
    };

    // $scope.remind = function(doc_id, user_email) {
        /*
          SWBrijj.procm("document.remind", version.doc_id, version.investor).then(function(data) {
          $scope.emit('event:remind');
          });
        */
    // };

    $scope.switchSignatureFlow = function(version, sigflow) {
        SWBrijj.procm("document.update_signature_flow", version.doc_id, sigflow).then(function(x) {
            void(x);
            version.when_signed = null;
            version.when_countersigned = null;
            version.signature_flow = sigflow;
            $scope.$emit("notification:success", "Document switched to view only.");
        }).except(function(err) {
            console.log(err);
            $scope.$emit("notification:fail", "Oops, something went wrong.");
        });
    };

    $scope.archiveDoc = function(version) {
        SWBrijj.procm("document.change_archive_state", version.doc_id, "true").then(function(data) {
            void(data);
            version.doc.archive_count += 1;
            if ($scope.versionIsComplete(version)) {
                version.doc.archive_complete_count += 1;
            }
            version.archived = true;
            $scope.$emit("notification:success", "Document archived.");
        }).except(function(x) {
            void(x);
            $scope.$emit("notification:fail", "Document archive failed.");
        });
    };

    $scope.unarchiveDoc = function(version) {
        SWBrijj.procm("document.change_archive_state", version.doc_id, "false").then(function(data) {
            void(data);
            version.doc.archive_count -= 1;
            if ($scope.versionIsComplete(version)) {
                version.doc.archive_complete_count -= 1;
            }
            version.archived = false;
            $scope.$emit("notification:success", "Document unarchived.");
        }).except(function(x) {
            void(x);
            $scope.$emit("notification:fail", "Document unarchive failed.");
        });
    };

    $scope.versionIsFinalized = function(version) {
            return basics.isCompleteSigned(version)
                || basics.isCompleteVoided(version);
        };

    $scope.exportVersionToPdf = function(version) {
        $scope.$emit("notification:success", "Export in progress.");
        SWBrijj.genInvestorPdf('sharewave-'+version.doc_id+'-'+version.investor+'.pdf', 'application/pdf', version.doc_id, true, !$scope.versionIsFinalized(version)).then(function(url) {
            document.location.href = url;
        }).except(function(x) {
            console.log(x);
            $scope.$emit("notification:fail", "Oops, something went wrong.");
        });
    };

}
