
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

Annotation = function() {
    this.position = {
        coords: {
            //x: 0,
            //y: 0,
        },
        size: {
            //width: 0,
            //height: 0
        }
    };
    this.type = "text";
    this.val = '';
    this.fontsize = 12;
    this.whosign = "Investor";
    this.whattype = "Text";
    this.required = true;
};

Annotation.prototype = {
    parseFromJson: function(json) {
        this.page = json[0][0];
        this.position = {
            coords: {
                x: json[0][1][0],
                y: json[0][1][1]
            },
            size: {
                width: json[0][2][2],
                height: json[0][2][3]
            }
        };
        this.type = json[1];
        this.val = json[2][0];
        this.fontsize = json[3][0];
        this.investorfixed = json[4].investorfixed;
        this.whosign = json[4].whosign;
        // TODO: grab attributelabels logic from documentView.js
        this.whattype = json[4].whattype;
        this.required = json[4].required;

        this.original = json; // just in case we need it
        return this;
    },
    filled: function(signaturepresent, role) {
        // signature present comes from the account
        return (this.val && this.val.length > 0) ||
               (this.whattype == "ImgSignature" && signaturepresent &&
                   (this.whosign == "Issuer" && role == "issuer") ||
                   (this.whosign == "Investor" && role == "investor")
               );
    },
};

docs.service('Annotations', function() {
    // TODO: group annotations as Doc > Page > annotation instead of Doc > annotation ?
    // TODO: save / unmunge logic

    // data structure contents
    // aa -> [annot0...annotn-1]
    // [i] annoti -> [position, type, value, style]
    //
    // [i][0] position -> [page, coords, size, 700, 956]
    //
    // [i][0][0] page -> 0...n-1
    //
    // [i][0][1] coords (bds) -> [x, y, _, _]
    // [i][0][1][0] x
    // [i][0][1][1] y
    // [i][0][1][2] ?
    // [i][0][1][3] ?
    //
    // [i][0][2] size (ibds) -> [_, _, width, height]
    // [i][0][2][0] ?
    // [i][0][2][1] ?
    // [i][0][2][2] width or horizontal offset
    // [i][0][2][3] height or vertical offset
    //
    // [i][0][3] 700 dp.clientWidth
    //
    // [i][0][4] 956 dp.clientHeight
    //
    // [i][1] type -> check or text or canvas (only text seems usable now)
    //
    // [i][2] value -> n/a or string or series of lines ([_, x0, y0, x1, y1])
    //
    // [i][3] style -> font size -- anything else?
    //
    // [i][4] other -> investorfixed, whosign, whattype, and required


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
        if (doc_id === void(0)) {
            console.log("fetching undefined annotations");
            return [];
        }
        if (!doc_annotations[doc_id]) {
            console.log("fetched empty doc annotations.");
            doc_annotations[doc_id] = [];
        }
        return doc_annotations[doc_id];
    };

    this.setDocAnnotations = function(doc_id, annotations) {
        if (doc_annotations[doc_id]) {
            // if the array exists, make sure we return the same array reference so all copies update (meaning, modify, don't replace the object)
            doc_annotations[doc_id].splice(0, Number.MAX_VALUE);
            annotations.forEach(function(annot) {
                doc_annotations[doc_id].push((new Annotation()).parseFromJson(annot));
            });
        } else {
            doc_annotations[doc_id] = annotations;
        }
        return doc_annotations[doc_id];
    };
});
