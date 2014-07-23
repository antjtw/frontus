'use strict';

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
    // transaction_attributes is needed to set the annotation types for this document
    var transaction_attributes = null;
    var transaction_attributes_callback = null;
    SWBrijj.transaction_attributes().then(function(data) {
        var n1, n2, n3;
        for (n1 in data)
        {
            for (n2 in data[n1]['actions'])
            {
                for (n3 in data[n1]['actions'][n2]['fields'])
                {
                    var lbls = JSON.parse(data[n1]['actions'][n2]['fields'][n3]['labels']);
                    if (lbls[0] == null)
                    {
                        lbls = null;
                    }
                    else
                    {
                        data[n1]['actions'][n2]['fields'][n3]['typname'] = "enum";
                    }
                    data[n1]['actions'][n2]['fields'][n3]['labels'] = lbls;
                }
            }
        }
        transaction_attributes = data;
        // callback in case the a document tried to initalize before this call returned
        if (transaction_attributes_callback) {
            transaction_attributes_callback();
        }
    });
    var defaultTypes = [
        {name: "Text", display: "Text"},
        {name: "Signature", display: "Signature Text"},
        {name: "ImgSignature", display: "Signature Image"},
        {name: "investorName", display: "Name"},
        {name: "investorStreet", display: "Address"},
        {name: "investorState", display: "State"},
        {name: "investorPostalcode", display: "Zip code"},
        {name: "investorEmail", display: "Email"},
        {name: "signatureDate", display: "Date"},
    ];
    function updateAnnotationTypes(issue_type, transaction_type, type_list, db_types) {
        // transaction_attributes may not be defined yet (race condition on initialization)
        function reallyDo() {
            var viable_actions = transaction_attributes[issue_type].actions;
            var fields = viable_actions[transaction_type].fields;
            type_list.splice(defaultTypes.length, type_list.length); // remove anything past the defaultTypes
            var tmp_array = [];
            for (var field in fields) {
                var f = fields[field];
                tmp_array.push({name: f.name, display: f.display_name, required: f.required, typename: f.typname, labels: f.labels});
            }
            // add new types onto the end (in one action, without changing the reference, for performance reasons)
            var args = [type_list.length, 0].concat(tmp_array);
            Array.prototype.splice.apply(type_list, args);
            if (typeof(db_types) != undefined)
            {
                var prop;
                for (prop in db_types) { if (db_types.hasOwnProperty(prop)) { delete db_types[prop]; } }
                for (prop in fields) { if (fields.hasOwnProperty(prop)) {db_types[prop] = fields[prop];}}
            }
        }
        if (transaction_attributes) {
            reallyDo();
        } else {
            transaction_attributes_callback = reallyDo;
        }
    }

    /// Document object definition
    var Document = function() {
        this.annotations = [];
        this.annotation_types = angular.copy(defaultTypes);
        this.transaction_db_types = {};
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
            SWBrijj.document_investor_void(this.doc_id, 1, "").then(function(data) {
                promise.resolve(data);
            }).except(function(x) {
                promise.reject(x);
            });
            return promise.promise;
        },
        rejectVoid: function(msg) {
            var promise = $q.defer();
            if (!msg) {
                // prevent email from going out with {{message}} variable unsubstituted
                msg = "";
            }
            SWBrijj.document_investor_void(this.doc_id, 0, msg).then(function(data) {
                promise.resolve(data);
            }).except(function(x) {
                promise.reject(x);
            });
            return promise.promise;
        },
        setTransaction: function(issue) {
<<<<<<< HEAD
            console.log(issue);
            issue = mungeIssue(issue); // convert to future format
=======
>>>>>>> ee9e7b4696fde554f96b1d2220531d0f98296e7a
            this.issue = issue.issue;
            this.issue_type = issue.type;
            console.log(this.issue_type);
            var viable_actions = transaction_attributes[this.issue_type].actions;
            // documents can only create grants and purchases right now
            this.transaction_type = viable_actions.purchase ? "purchase" : "grant";
            SWBrijj.update("document.my_company_library", {issue: this.issue, "transaction_type": this.transaction_type}, {doc_id: this.doc_id}); // TODO: handle response / error
            updateAnnotationTypes(this.issue_type, this.transaction_type, this.annotation_types, this.transaction_db_types);
        },
        hasFilledAnnotation: function(annotType) {
            return this.annotations.some(function(annot) {
                return (annot.whattype == annotType) && (annot.filled(false, $rootScope.navState.role));
            });
        },
        annotable: function(role) {
            if (role == "investor")
                return this.investorCanAnnotate();
            else if (role == "issuer")
                //does not include if the document is being prepared
                return this.issuerCanAnnotate();
        },
        investorCanAnnotate: function() {
            return (!this.when_signed && this.signature_deadline && this.signature_flow===2);
        },
        issuerCanAnnotate: function() {//does not include if the document is being prepared
            return (!this.when_countersigned && this.when_signed && this.signature_flow===2);
        },
    };

    /// Document service definition
    // TODO: probably need to distinguish between originals and investor versions
    var docs = {};

    this.getDoc = function(doc_id) {
        if (doc_id === void(0)) {
            // we're probably uninitialized
            var d = new Document();
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
        if (oldDoc.issue_type) {
            updateAnnotationTypes(oldDoc.issue_type, oldDoc.transaction_type, oldDoc.annotation_types, oldDoc.transaction_db_types);
        }
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

var Annotation = function() {
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
    filled: function(signaturepresent, role, type_mappings, type_mappings2) {
        // signature present comes from the account
        if (type_mappings && type_mappings2 && (this.whattype in type_mappings2) && (type_mappings2[this.whattype]['typname'] in type_mappings))
        {
            return this.forRole(role) && type_mappings[type_mappings2[this.whattype]['typname']](this.val);
        }
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
        var doc_notes = doc_annotations[doc_id];
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
        var doc_notes = doc_annotations[doc_id];
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
