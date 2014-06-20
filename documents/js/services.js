
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

// DOCUMENTS
Document = function() {
};

Document.prototype = {
    pageAnnotated: function(pageNum) {
        return this.annotations.some(function(annot) {
            return annot.page == pageNum;
        });
    }
};

docs.service('Documents', ["Annotations", function(Annotations) {
    // TODO: probably need to distinguish between originals and investor versions
    var docs = {};

    this.getDoc = function(doc_id) {
        if (doc_id === void(0)) {
            // we're probably uninitialized
            d = new Document();
            return d;
        }
        if (!docs[doc_id]) {
            docs[doc_id] = new Document();
            docs[doc_id].doc_id = doc_id;
            docs[doc_id].annotations = Annotations.getDocAnnotations(doc_id);
        }
        return docs[doc_id];
    };

    this.setDoc = function(doc_id, doc) {
        var oldDoc = this.getDoc(doc_id);
        // we need to keep the object reference from the docs hash as we may have given to other controllers
        // extend will keep any other properties on it too. Copy might be better?
        var realPages = oldDoc.pages;
        angular.extend(oldDoc, doc);
        oldDoc.pages = realPages;
        oldDoc.annotations = Annotations.getDocAnnotations(doc_id); // refresh annotations (in case doc overwrote);
        return oldDoc;
    };
}]);

// ANNOTATIONS

Annotation = function() {
    this.position = {
        coords: {
            //x: 0,
            //y: 0,
        },
        size: {
            //width: 0,
            //height: 0
        },
        docPanel: {
            // width: 928, (.docViewer, see app.css)
            // height: 1201ish (calculated)
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
    // to and from JSON hear doesn't refer to actual json, just the intermediary (legacy) format used for transport
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
            },
            docPanel: {
                // we probably shouldn't trust these numbers
                // reset them based on current docpanel size,
                // and let user move annotations if needed
                width: json[0][3],
                height: json[0][4]
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
        return this;
    },
    toJson: function() {
        var json = [];
        var position = [];
        position.push(this.page);
        position.push([this.position.coords.x, this.position.coords.y, 0, 0]);
        position.push([0, 0, this.position.size.width, this.position.size.height]);
        position.push(this.position.docPanel.width); // document page width
        position.push(this.position.docPanel.height); // document page height
        json.push(position);
        json.push("text");
        json.push([this.val]);
        json.push([this.fontsize]);
        json.push({
            investorfixed: this.investorfixed,
            whosign: this.whosign,
            whattype: this.whattype,
            required: this.required
        });
        return json;
    },
    filled: function(signaturepresent, role) {
        // signature present comes from the account
        return (this.val && this.val.length > 0) ||
               (this.whattype == "ImgSignature" && signaturepresent &&
                   (this.whosign == "Issuer" && role == "issuer") ||
                   (this.whosign == "Investor" && role == "investor")
               );
    },
    isCountersign: function() {
        return this.whosign == "Issuer" && (this.whattype == "Signature" || this.whattype == "ImgSignature")
    },
};

docs.service('Annotations', function() {
    // TODO: group annotations as Doc > Page > annotation instead of Doc > annotation ?

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
    // [i][0][2][0] ? checkbox horizontal offset
    // [i][0][2][1] ? checkbox vertical offset
    // [i][0][2][2] width or horizontal offset
    // [i][0][2][3] height or vertical offset
    //
    // [i][0][3] 928 dp.clientWidth (docpanel width)
    //
    // [i][0][4] 1201 (usually) dp.clientHeight (docpanel height)
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
        // TODO
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
        // TODO
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

    this.getIssuerNotesForUpload = function(doc_id) {
        doc_notes = doc_annotations[doc_id];
        var notes = [];
        if (doc_notes) {
            angular.forEach(doc_notes, function (note) {
                if (note.whosign == "Issuer") {
                    notes.push(note.toJson());
                }
            });
        }
        return notes;
    };

    this.getInvestorNotesForUpload = function(doc_id) {
        doc_notes = doc_annotations[doc_id];
        var notes = [];
        if (doc_notes) {
            angular.forEach(doc_notes, function (note) {
                if (note.whosign == "Investor") {
                    notes.push(note.toJson());
                }
            });
        }
        return notes;
    };
});
