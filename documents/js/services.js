
var docs = angular.module('docServices', []);

// Captable functions for basic mathematics. Should be expanded by peeling some of the reusable pieces out of the controller.
docs.service('basics', function () {

    this.eventRank = function (ev) {
        // signed or rejected can come either before or after each other depending on chronological ordering.
        // ambiguity is resolve in $scope.compareEvents
        switch (ev.activity) {
            case "retracted":
                return 10;
            case "void accepted":
                return 9;
            case "void rejected":
                return 9;
            case "void requested":
                return 8;
            case "finalized":
                return 7;
            case "countersigned":
                return 6;
            case "signed":
            case "rejected":
                return 4;
            case "viewed":
                return 3;
            case "received":
                return 2;
            case "uploaded":
                return 1;
            default:
                return 0;
        }
    };

    this.isCompleteSigned = function(version) {
        return version.signature_flow>0 && version.when_finalized;
    };

    this.isCompleteViewed = function(version) {
        return version.signature_flow===0 && version.last_viewed;
    };

    this.isCompleteVoided = function(version) {
        return version.signature_flow > 0 && version.when_void_accepted && version.when_void_requested;
    };


});

docs.service('Annotations', function() {
    // TODO: group annotations as Doc > Page > annotation instead of Doc > annotation ?
    var doc_annotations = {};

    this.hasUnfilled = function(page) {
        var unfilled = false;
        for (var i = 0; i < $scope.notes.length; i++) {
            var n = $scope.notes[i][0];
            if (angular.element(n).scope().page == page) {
                var contents = n.querySelector("textarea");
                if (angular.element(n).scope().$$nextSibling.whattype == 'ImgSignature') {
                    if (!$scope.signaturepresent &&
                        ((angular.element(n).scope().$$nextSibling.whosign == 'Investor' && $rootScope.navState.role == 'investor') ||
                         (angular.element(n).scope().$$nextSibling.whosign == 'Issuer' && $rootScope.navState.role == 'issuer'))) {
                        unfilled = true;
                    }
                }
                else if (angular.element(n).scope().$$nextSibling.required && contents.value.length === 0) {
                    if ((angular.element(n).scope().$$nextSibling.whosign == 'Investor' && $rootScope.navState.role == 'investor') ||
                        (angular.element(n).scope().$$nextSibling.whosign == 'Issuer' && $rootScope.navState.role == 'issuer')) {
                        unfilled = true;
                    }
                }
            }
        }
        return unfilled;
    };

    this.allFilled = function(page) {
        var allfilled = true;
        var some = false;
        for (var i = 0; i < $scope.notes.length; i++) {
            var n = $scope.notes[i][0];
            if (angular.element(n).scope().page == page) {
                var contents = n.querySelector("textarea");
                if (angular.element(n).scope().$$nextSibling.whattype == 'ImgSignature') {
                    if ($scope.signaturepresent &&
                        ((angular.element(n).scope().$$nextSibling.whosign == 'Investor' && $rootScope.navState.role == 'investor') ||
                         (angular.element(n).scope().$$nextSibling.whosign == 'Issuer' && $rootScope.navState.role == 'issuer'))) {
                        some = true;
                        allfilled = false;
                    }
                }
                else if (angular.element(n).scope().$$nextSibling.required && contents.value.length !== 0) {
                    if ((angular.element(n).scope().$$nextSibling.whosign == 'Investor' && $rootScope.navState.role == 'investor') ||
                        (angular.element(n).scope().$$nextSibling.whosign == 'Issuer' && $rootScope.navState.role == 'issuer')) {
                        allfilled = false;
                        some = true;
                    }
                }
            }
        }
        return some && !allfilled;
    };

    this.getDocAnnotations = function(doc_id) {
        if (!doc_annotations.doc_id) {
            doc_annotations.doc_id = [];
        }
        return doc_annotations.doc_id
    }
});
