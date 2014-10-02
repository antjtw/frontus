'use strict';

var docs = angular.module('docServices');

// TODO: should really have an annotation factory
docs.service('Annotations', ['SWBrijj', '$rootScope', 'navState', 'User', function(SWBrijj, $rootScope, navState, User) {
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
    // [i][4] other -> investorfixed, whosign, whattype, required, and id

    var Annotation = function(doc) {
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
        this.whosign = "Issuer";
        this.whattype = "Text";
        this.required = true;
        this.id = generateAnnotationId();
        this.type_info = {
            name: "text",
            display: "Text"
        };
        this.pristine = false;

        var annot = this;
        $rootScope.$watch(function() {
            return annot.whattype;
        }, function(new_type, old_type) {
            if (new_type == "Signature") {
                annot.fontsize = 18;
                if (annot.position.size.height < 37) {
                    annot.position.size.height = 37;
                }
            }
            else {
                annot.fontsize = 14;
            }
            if (new_type == 'date' && this.val === "") {
                // an empty string causes oddities in the date picker
                annot.val = null;
            }

        });
        this.doc = doc;
    };

    Annotation.prototype = {
        // to and from JSON hear doesn't refer to actual json, just the intermediary (legacy) format used for transport
        parseFromJson: function(json, annotation_types) {
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
            this.id = json[4].id;
            if (!this.id) {
                this.id = generateAnnotationId();
            }
            this.updateTypeInfo(annotation_types);
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
            if (this.val !== null) {
                json.push([this.val]);
            } else {
                json.push([""]);
            }
            json.push([this.fontsize]);
            json.push({
                investorfixed: this.investorfixed,
                whosign: this.whosign,
                whattype: this.whattype,
                required: this.required,
                id: this.id
            });
            return json;
        },
        getValWithOverride: function(user) {
            if (user && this.doc.preparedFor && this.doc.preparedFor[user] &&
                 this.doc.preparedFor[user].overrides[this.id] &&
                 this.doc.preparedFor[user].overrides[this.id].length > 0) { // an override of "" won't be saved
                return this.doc.preparedFor[user].overrides[this.id];
            } else {
                return this.val;
            }
        },
        isInvalid: function(user) {
            // user is an optional parameter
            // 1) if it's empty and not required, return false (empty is fine)
            if (!this.required && this.isEmpty(user)) {
                return false;
            }
            // 2) check the annot.wouldBeInvalid to see if the field looks bad (always invalid, even if field unrequired)
            if (this.wouldBeInvalid(user)) {
                return true;
            }
            // 3) if it's required return true if value is empty, else return false (either not required, or filled with a saneish value)
            if (this.required && this.isEmpty(user)) {
                return true;
            } else {
                return false;
            }
        },
        wouldBeInvalid: function(user) {
            if (this.isEmpty(user)) {
                return false; // empty doesn't mean invalid
            }
            var value = this.getValWithOverride(user);
            // find any excuse (excepting emptiness) to mark this value as invalid
            var type = this.type_info.typename;
            if (["int8", "int4", "float8"].indexOf(type) != -1) {
                // TODO: handle currency symobols and commas
                var num = Number(value);
                return isNaN(num); // "" evaluates as 0, which is fine is it's not invalid
            } else if (type == "enum") {
                return this.type_info.labels.indexOf(value) == -1;
            } else if (type == "date") {
                var dateRE = /^\d{2}\/\d{2}\/\d{4}$/;
                if (!dateRE.test(value)) {
                    // doesn't look like a date format we like
                    return true;
                }
                var dateparts = value.split('/');
                dateparts[0] = Number(dateparts[0]);
                dateparts[1] = Number(dateparts[1]);
                dateparts[2] = Number(dateparts[2]);
                // TODO: pull the company date setting and validate against that
                if (dateparts[0] > 31 || dateparts[1] > 31) {
                    return true;
                }
                if (dateparts[0] > 12 && dateparts[1] > 12) {
                    // only [0] or [1] can be the day portion, so one must be <= 12
                    return true;
                }
                return false;
            }
            // we don't test text, signature, or imgsignature, as they can't be invalid.
            return false;
        },
        isEmpty: function(user) {
            var val = this.getValWithOverride(user);
            if (this.whattype == "ImgSignature") {
                if (val === "" || val == "Personal")
                    return !User.signaturePresent;
                return !this.type_info.labels || val === undefined || val === null || val.length === 0;
            } else {
                // all others (assume a base text type)
                return (val === undefined || val === null || val.length === 0);
            }
        },
        wouldBeValid: function(role, value) {
            // DEPRECATED
            // can be used to check override values
            // TODO: validate format of XX/XX/XXXX if type == "date"
            var type = this.type_info.typename;
            if (["int8", "int4", "float8"].indexOf(type) != -1) {
                var num = Number(value);
                return (!isNaN(num) && value.length > 0);
            } else if (type == "enum") {
                return this.type_info.labels.indexOf(value) != -1;
            } else {
                if (this.whattype == "ImgSignature")
                {
                    if (value === "" || value == "Personal")
                        return User.signaturePresent;
                    return this.type_info.labels && (this.type_info.labels.indexOf(value) != -1);
                }
                return (value && value.length > 0);
            }
        },
        filled: function(role, user) {
            // DEPRECATED
            if (!this.forRole(role)) {
                return false;
            }
            if (this.whattype != "ImgSignature" && user &&
                this.doc.preparedFor && this.doc.preparedFor[user] &&
                this.doc.preparedFor[user].overrides[this.id] &&
                this.doc.preparedFor[user].overrides[this.id].length > 0) {
                // there's an override value for this user, so use that instead
                return this.wouldBeValid(role, this.doc.preparedFor[user].overrides[this.id]);
            } else {
                return this.wouldBeValid(role, this.val);
            }
        },
        isCountersign: function() {
            return this.whosign == "Issuer" && (this.whattype == "Signature" || this.whattype == "ImgSignature");
        },
        forRole: function(role) {
            return ((this.whosign == "Issuer" && role == "issuer") ||
                    (this.whosign == "Investor" && role == "investor"));
        },
        updateTypeInfo: function(annotation_types) {
            // called when either whattype (via annotationController) or our doc annotation_types change
            var annot = this;
            this.type_info = annotation_types.filter(function(type) {
                return type.name == annot.whattype;
            })[0];
            if (!this.type_info) {
                this.type_info = {name: this.whattype, display: this.whattype}; // TODO: probably need better defaults
            }
            if (this.type_info.required) {
                this.required = true;
            }
        },
    };

    this.createBlankAnnotation = function(doc) {
        return new Annotation(doc);
    };

    function generateAnnotationId() {
        // needs to return an id that's unique to this document
        return Date.now().toString() + "id" + Math.floor(Math.random()*100000);
    }

    var doc_annotations = {};

    this.getDocAnnotations = function(doc) {
        // need doc since annotations can only exist within a document context
        if (!doc_annotations[doc.doc_id]) {
            doc_annotations[doc.doc_id] = [];
            var library;
            if (navState.role == 'investor') {
                library = "document.my_investor_library";
            } else {
                if (doc.original) { // if original has a value, we're looking at a version
                    library = "document.my_counterparty_library";
                } else {
                    library = "document.my_company_library";
                }
            }
            SWBrijj.tblm(library, "doc_id", doc.doc_id).then(function(data) {
                var annots = [];
                if (data.annotations) {
                    annots = annots.concat(JSON.parse(data.annotations));
                }
                if (data.iss_annotations) {
                    annots = annots.concat(JSON.parse(data.iss_annotations));
                }
                annots.forEach(function(annot) {
                    var new_annot = (new Annotation(doc)).parseFromJson(annot, doc.annotation_types);
                    doc_annotations[doc.doc_id].push(new_annot);
                });
            });
        }
        return doc_annotations[doc.doc_id];
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

    $rootScope.$watch('person', function(person) {
        if (person) {
            SWBrijj.tblm('smartdoc.my_profile').then(function(inv_attributes) {
                angular.forEach(inv_attributes, function(attr) {
                    investor_attributes[attr.attribute] = attr.answer;
                });
                investor_attributes.investorName = angular.copy(person.name);
                investor_attributes.investorState = angular.copy(person.state);
                investor_attributes.investorCountry = angular.copy(person.country);
                investor_attributes.investorStreet = angular.copy(person.street);
                investor_attributes.investorPhone = angular.copy(person.phone);
                investor_attributes.investorEmail = angular.copy(person.email);//might be wrong but doesn't matter because we don't support smartdocs now
                investor_attributes.investorPostalcode = angular.copy(person.postalcode);
                investor_attributes.signatureDate = moment(Date.today()).format($rootScope.settings.lowercasedate.toUpperCase());
            });
        }
    });
    this.investorAttribute = function(attribute) {
        return investor_attributes[attribute] || "";
    };

    this.ocrHighlighted = function(doc_id, annot) {
        if ((annot.type != 'highlight') || (annot.val !== ''))
            return;
        SWBrijj.document_OCR_segment(doc_id, annot.page, annot.position.coords.x, annot.position.coords.y,
            annot.position.size.width, annot.position.size.height, annot.position.docPanel.width).then(
            function (data) {
                if (annot.val === '')
                {
                    annot.val = data.trim();
                }
            }).except(function (x) {console.log(x);});
    };
}]);
