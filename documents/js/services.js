
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

docs.service('Documents', ["Annotations", "SWBrijj", "$q", "$rootScope", function(Annotations, SWBrijj, $q, $rootScope) {
    /// Document object definition
    Document = function() {
        this.annotations = [];
    };

    Document.prototype = {
        pageAnnotated: function(pageNum) {
            return this.annotations.some(function(annot) {
                return annot.page == pageNum;
            });
        },
        signable: function() {
            return this.signature_flow > 0 && !this.when_signed;
        },
        countersignable: function(role) {
            // TODO: remove role check (should happen in caller)
            return role == "issuer" && this.signature_flow===2 && this.when_signed && !this.when_countersigned;
        },
        finalizable: function() {
            // signature_flow 2 is no longer finalizeable, as sign / countersign takes care of it
            return this.signature_flow===1 && this.when_signed && !this.when_finalized;
        },
        voidable: function() {
            return this.signature_flow > 0 && this.when_finalized && this.when_void_requested && !this.when_void_accepted;
        },
        removeAllNotes: function() {
            this.annotations.splice(0);
        },
        rejectSignature: function(msg) {
            // TODO: convert aBrijj.js to use the promise / $q library directly so we can just chain the promises
            var promise = $q.defer();
            if (!msg) {
                // prevent email from going out with {{message}} variable unsubstituted
                msg = "";
            }
            SWBrijj.procm("document.reject_signature", this.doc_id, msg).then(function(data) {
                promise.resolve(data);
            }).except(function(x) {
                promise.reject(x);
            });
            return promise.promise;
        },
        sign: function() {
            var promise = $q.defer();
            // before signing the document, I may need to save the existing annotations
            // In fact, I should send the existing annotations along with the signature request for a two-fer.

            var d = this;
            SWBrijj.sign_document(this.doc_id, JSON.stringify(Annotations.getInvestorNotesForUpload(this.doc_id))).then(function(data) {
                d.when_signed = data;
                promise.resolve(data);
            }).except(function(x) {
                promise.reject(x);
            });
            return promise.promise;
        },
        countersign: function() {
            var promise = $q.defer();
            // TODO: Annotations.getIssuerNotesForUpload seems a little when we're inside the document
            // TODO: shouldn't send notes for countersign, should just use DB version
            var d = this;
            SWBrijj.document_countersign(this.doc_id, JSON.stringify(Annotations.getIssuerNotesForUpload(this.doc_id))).then(function(data) {
                d.removeAllNotes();
                promise.resolve(data);
            }).except(function(x) {
                promise.reject(x);
            });
            return promise.promise;
        },
        finalize: function() {
            var promise = $q.defer();
            SWBrijj.document_issuer_finalize(this.doc_id).then(function(data) {
                $rootScope.billing.usage.documents_total += 1;
                promise.resolve(data);
            }).except(function(x) {
                promise.reject(x);
            });
            return promise.promise;
        },
        void: function() {
            var promise = $q.defer();
            SWBrijj.document_investor_void($scope.doc_id, 1, "").then(function(data) {
                promise.resolve(data);
            }).except(function(x) {
                promise.rejecdt(x);
            });
            return promise.promise;
        },
        rejectVoid: function(msg) {
            var promise = $q.defer();
            if (!msg) {
                // prevent email from going out with {{message}} variable unsubstituted
                msg = "";
            }
            SWBrijj.document_investor_void(this.doc_id, 0, message).then(function(data) {
                promise.resolve(data);
            }).except(function(x) {
                promise.rejecdt(x);
            });
            return promise.promise;
        },
    };

    /// Document service definition
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
        if (oldDoc.tags) {
            try {
                oldDoc.tags = JSON.parse(oldDoc.tags);
            } catch (e) {
                console.log("error while parsing JSON");
                console.log(oldDoc.tags);
                oldDoc.tags = [];
            }
        } else {
            oldDoc.tags = [];
        }
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
        json.push(this.type);
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
        return (this.forRole(role) &&
                ((this.val && this.val.length > 0) ||
                 (this.whattype == "ImgSignature" && signaturepresent)));
    },
    isCountersign: function() {
        return this.whosign == "Issuer" && (this.whattype == "Signature" || this.whattype == "ImgSignature");
    },
    forRole: function(role) {
        return ((this.whosign == "Issuer" && role == "issuer") ||
                (this.whosign == "Investor" && role == "investor"));
    },
};

docs.service('Annotations', ['SWBrijj', '$rootScope', function(SWBrijj, $rootScope) {
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

    this.getDocAnnotations = function(doc_id) {
        if (doc_id === void(0)) {
            return [];
        }
        if (!doc_annotations[doc_id]) {
            doc_annotations[doc_id] = [];
        }
        return doc_annotations[doc_id];
    };

    this.setDocAnnotations = function(doc_id, annotations) {
        if (!doc_annotations[doc_id]) {
            doc_annotations[doc_id] = [];
        } else {
            // clear out any existing annotations
            // TODO: should check for dupes and update instead
            doc_annotations[doc_id].splice(0, Number.MAX_VALUE);
        }
        annotations.forEach(function(annot) {
            var new_annot = (new Annotation()).parseFromJson(annot);
            doc_annotations[doc_id].push(new_annot);
        });
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

    // Fetch the investor attributes
    var investor_attributes = {};
    var attributelabels = {};

    $rootScope.$watch('person', function(person) {
        if (person) {
            SWBrijj.tblm('smartdoc.my_profile').then(function(inv_attributes) {
                angular.forEach(inv_attributes, function(attr) {
                    investor_attributes[attr.attribute] = attr.answer;
                    attributelabels[attr.attribute] = attr.label;
                });
                investor_attributes.investorName = angular.copy(person.name);
                investor_attributes.investorState = angular.copy(person.state);
                investor_attributes.investorCountry = angular.copy(person.country);
                investor_attributes.investorStreet = angular.copy(person.street);
                investor_attributes.investorPhone = angular.copy(person.phone);
                investor_attributes.investorEmail = angular.copy(person.email);
                investor_attributes.investorPostalcode = angular.copy(person.postalcode);
                investor_attributes.signatureDate = moment(Date.today()).format($rootScope.settings.lowercasedate.toUpperCase());
            });
        }
        attributelabels.investorName = "Name";
        attributelabels.investorState = "State";
        attributelabels.investorCountry = "Country";
        attributelabels.investorStreet = "Address";
        attributelabels.investorPhone = "Phone";
        attributelabels.investorEmail = "Email";
        attributelabels.investorPostalcode = "Zip code";
        attributelabels.signatureDate = "Date";
        attributelabels.ImgSignature = "Signature Image";
        attributelabels.Signature = "Signature Text";
    });
    this.attributeLabel = function(attribute) {
        return attributelabels[attribute] || attribute;
    };
    this.investorAttribute = function(attribute) {
        return investor_attributes[attribute] || "";
    };
    
    this.ocrHighlighted = function(doc_id, annot) {
        if ((annot.type != 'highlight') || (annot.val != ''))
            return;
        SWBrijj.document_OCR_segment(doc_id, annot.page, annot.position.coords.x, annot.position.coords.y, 
            annot.position.size.width, annot.position.size.height, annot.position.docPanel.width).then(
            function (data) {
                if (annot.val == '')
                {
                    annot.val = data;
                    //$document.getElementById('highlightContents').value = data;
                }
            }).except(function (x) {console.log(x);});
    };
}]);
