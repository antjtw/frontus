'use strict';

function DocumentVersionRowController($scope, SWBrijj, basics) {
    $scope.versionStatus = function(version) {
        if (version.last_event) {
            return (version.last_event.activity==='received' ? 'sent to ' : (version.last_event.activity === 'retracted' ? (version.last_event.activity + " from ") : (version.last_event.activity + " by "))) +
                (version.last_event.name || version.investor) +
                " " + moment(version.last_event.event_time).from(version.last_event.timenow) +
                (version.signature_flow===2 && version.last_event.activity==='signed' ? " (awaiting countersign)" : "");
        } else {
            return "";
        }
    };

    $scope.shortVersionStatus = function(version) {
        if (!version) return "";
        if ($scope.isVoided(version)) {
            return "Voided"
        }
        else if ($scope.isPendingVoid(version)) {
            return "Void requested by you"
        }
        else if (wasJustRejected(version) && lastEventByInvestor(version)) {
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
}
DocumentVersionRowController.$inject = ['$scope', 'SWBrijj', 'basics'];
