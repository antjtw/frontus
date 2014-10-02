'use strict';

var docs = angular.module('docServices');

// TODO: should really have a document factory
docs.service('Documents', ["Annotations", "SWBrijj", "$q", "$rootScope", "Investor", "ShareDocs", "navState", "$timeout",
                           function(Annotations, SWBrijj, $q, $rootScope, Investor, ShareDocs, navState, $timeout) {
    // transaction_attributes is needed to set the annotation types for this document
    var transaction_attributes = null;
    var transaction_attributes_callbacks = [];
    SWBrijj.transaction_attributes().then(function(data) {
        var issue_type, action_type, field_key;
        for (issue_type in data)
        {
            var issue = data[issue_type];
            for (action_type in issue.actions)
            {
                var action = issue.actions[action_type];
                for (field_key in action.fields)
                {
                    if (action_type != "issue certificate") {
                        if (['physical', 'security', 'security_type', 'investor'].indexOf(field_key) !== -1) {
                            delete action.fields[field_key];
                            continue;
                        }
                    } // TODO: filter certificate transaction for "issue certificate" ?
                    var field = action.fields[field_key];
                    var lbls = JSON.parse(field.labels);
                    // Set up enums
                    if (lbls === null || lbls[0] === null)
                    {
                        lbls = null;
                    }
                    else
                    {
                        field.typname = "enum";
                    }
                    // Set up bools, fake them as enums for now
                    if (field.typname == "bool") {
                        field.typname = "enum";
                        lbls = ["True", "False"];
                    }
                    field.labels = lbls;
                }
            }
        }
        transaction_attributes = data;
        // callback in case the a document tried to initalize before this call returned
        if (transaction_attributes_callbacks.length > 0) {
            transaction_attributes_callbacks.forEach(function(callback) {
                callback();
            });
            transaction_attributes_callbacks = [];
        }
    });
    var defaultTypes = [
        {name: "Text", display: "Text"},
        {name: "Signature", display: "Signature Text"},
        {name: "investorName", display: "Name"},
        {name: "investorStreet", display: "Address"},
        {name: "investorState", display: "State"},
        {name: "investorPostalcode", display: "Zip code"},
        {name: "investorEmail", display: "Email"},
        {name: "signatureDate", display: "Date"},
    ];
    var variableDefaultTypes = [
        {name: "ImgSignature", display: "Signature Image"}
    ];
    function updateAvailableSignatures()
    {
        SWBrijj.tblm('account.my_company_signatures', ['label']).then(function(data) {
            if (data.length === 0)
                return;
            for (var t in variableDefaultTypes)
            {
                if (variableDefaultTypes[t].name == "ImgSignature")
                {
                    variableDefaultTypes[t].typename = "enum";
                    variableDefaultTypes[t].labels = ["Personal"];
                    for (var l in data)
                    {
                        variableDefaultTypes[t].labels.push(data[l].label);
                    }
                    break;
                }
            }
        });
    }
    if (navState.role == 'issuer') {
        updateAvailableSignatures();
    }
    function updateAnnotationTypes(issue_type, transaction_type, type_list, annotation_list) {
        // transaction_attributes may not be defined yet (race condition on initialization)
        function reallyDo() {
            var fields = [];
            if (issue_type) {
                var viable_actions = transaction_attributes[issue_type].actions;
                fields = viable_actions[transaction_type].fields;
            }
            if (transaction_type != "issue certificate") {
                type_list.splice(defaultTypes.length, type_list.length); // remove anything past the defaultTypes
            } else {
                type_list.splice(0); // no default annotation types for certificates
            }
            for (var t in variableDefaultTypes)
            {
                type_list.push(variableDefaultTypes[t]);
            }
            var tmp_array = [];
            for (var field in fields) {
                var f = fields[field];
                tmp_array.push({name: f.name, display: f.display_name, required: f.required, typename: f.typname, labels: f.labels});
            }
            if (tmp_array.length > 0 && transaction_type != "issue certificate") {
                // only add effective date if we're definitely in a transaction
                var display = "Effective Date";
                if ((issue_type == "Equity Common"    && transaction_type == "grant") ||
                    (issue_type == "Equity"           && transaction_type == "grant") ||
                    (issue_type == "Debt"             && transaction_type == "purchase") ||
                    (issue_type == "Convertible Debt" && transaction_type == "purchase") ||
                    (issue_type == "Safe"             && transaction_type == "grant")) {
                    display = "investment date";
                } else if ((issue_type == "Option"    && transaction_type == "grant") ||
                           (issue_type == "Warrant"   && transaction_type == "grant")) {
                    display = "grant date";
                }
                tmp_array.push({name: 'effective_date', display: display, required: true, typename: 'date'});
            }
            // add new types onto the end (in one action, without changing the reference, for performance reasons)
            var args = [type_list.length, 0].concat(tmp_array);
            Array.prototype.splice.apply(type_list, args);
            // TODO: remove duplicate types, favoring the transaction type
            annotation_list.forEach(function(annot) {
                annot.updateTypeInfo(type_list);
            });
        }
        if (transaction_attributes) {
            reallyDo();
        } else {
            transaction_attributes_callbacks.push(reallyDo);
        }
    }

    /// Document object definition
    var Document = function() {
        this.annotations = [];
        this.annotation_types = angular.copy(defaultTypes);
        for (var t in variableDefaultTypes)
        {
            this.annotation_types.push(variableDefaultTypes[t]);
        }

        var doc = this;
        $rootScope.$watch(function() {
            return doc.annotation_types;
        }, function(new_attrs) {
            doc.annotations.forEach(function(annot) {
                annot.updateTypeInfo(new_attrs);
            });
        });
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
            var d = this;
            // send the annotations with the signature, so that it's signed exactly as the user sees it now
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
            var d = this;
            SWBrijj.document_countersign(this.doc_id).then(function(data) {
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
            this.issue = issue.name;
            this.issue_type = issue.attrs.security_type;
            var viable_actions = transaction_attributes[this.issue_type].actions;
            // documents can only create grants and purchases right now
            this.transaction_type = viable_actions.purchase ? "purchase" : "grant";
            SWBrijj.update("document.my_company_library", {issue: this.issue, "transaction_type": this.transaction_type}, {doc_id: this.doc_id}); // TODO: handle response / error
            updateAnnotationTypes(this.issue_type, this.transaction_type, this.annotation_types, this.annotations);
        },
        unsetTransaction: function() {
            this.issue = null;
            this.issue_type = null;
            this.transaction_type = null;
            SWBrijj.update("document.my_company_library", {issue: this.issue, "transaction_type": this.transaction_type}, {doc_id: this.doc_id}); // TODO: handle response / error
            updateAnnotationTypes(this.issue_type, this.transaction_type, this.annotation_types, this.annotations);
        },
        hasOtherPartyAnnotation: function(annotType) {
            return this.annotations.some(function(annot) {
                return (annot.whattype == annotType) && !annot.forRole($rootScope.navState.role);
            });
        },
        hasFilledAnnotation: function(annotType, prepareFor) {
            return this.annotations.some(function(annot) {
                return (annot.whattype == annotType) && (!annot.isInvalid(prepareFor));
            });
        },
        hasAnnotationType: function(annotType) {
            return this.annotations.some(function(annot) {
                return (annot.whattype == annotType);
            });
        },
        numFieldsRequired: function() {
            var num = 0;
            angular.forEach(this.annotation_types, function(annot) {
                num += annot.required ? 1 : 0;
            });
            return num;
        },
        numFieldsComplete: function() {
            var num = 0;
            var annotations = this.annotations;
            angular.forEach(this.annotation_types, function(types) {
                if (types.required) {
                    angular.forEach(annotations, function(annot) {
                        if (annot.whattype == types.name) {
                            num += 1;
                        }
                    });
                }
            });
            return num;
        },
        numAnnotations: function(role) {
            var num = 0;
            angular.forEach(this.annotations, function(annot) {
                num += annot.required && annot.forRole(role) ? 1 : 0;
            });
            return num;
        },
        numAnnotationsComplete: function(role, prepareFor) {
            var num = 0;
            angular.forEach(this.annotations, function(annot) {
                num += annot.required && annot.forRole(role) && !annot.isInvalid(prepareFor) ? 1 : 0;
            });
            return num;
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
            // always false? Can issuer annotate a document that has been signed?
            return (!this.when_countersigned && this.when_signed && this.signature_flow===2);
        },
        hasAnnotations: function() {
            return this.annotations.length > 0;
        },
        hasIssuerAnnotations: function() {
            return this.annotations.some(function(annot) {
                return annot.whosign == 'Issuer';
            });
        },
        hasInvestorAnnotations: function() {
            return this.annotations.some(function(annot) {
                return annot.whosign == 'Investor';
            });
        },
        hasInvalidAnnotation: function(user) {
            return this.annotations.some(function(annot) {
                if (annot.forRole($rootScope.navState.role)) {
                    return annot.wouldBeInvalid(user);
                } else {
                    // only current role ever matters for validity
                    return false;
                }
            });
        },
        hasSignatureAnnotations: function() {
            return this.annotations.some(function(annot) {
                return annot.whatttype == 'Signature' || annot.whattype == 'ImgSignature';
            });
        },
        validTransaction: function() {
            if (this.annotations.some(function(annot) {
                return (annot.forRole('issuer') && (annot.whattype == 'ImgSignature') && (annot.isInvalid()));
            })) {
                return false;
            }
            if (!this.issue) {
                // no issue == no transaction == valid
                return true;
            }
            return this.annotation_types.every(function(annot_type) {
                if (annot_type.required) {
                    if (!this.hasAnnotationType(annot_type.name)) {
                        return false;
                    }
                }
                return true;
            }, this);
        },
        getPreparedFor: function(defaultList) {
            var doc = this;
            function mergeDefaultList(defaultList){
                if (defaultList) {
                    var origLength = doc.preparedFor.length;
                    defaultList.forEach(function(inv) {
                        if (!doc.preparedFor[inv]) {
                            doc.addPreparedFor(inv);
                        }
                    });
                    if (doc.preparedFor.length != origLength) {
                        $rootScope.$emit("notification:success", "We've automatically added the investors you were sharing to.");
                    }
                }
            }
            // defaultList is a list to use if there's no preps yet.
            if (!this.preparedFor) {
                this.preparedFor = {};
                this.preparedForLoading = true;
                SWBrijj.tblmm('document.my_personal_preparations_view', 'doc_id', doc.doc_id).then(function(data) {
                    data.forEach(function(investor_prep) {
                        investor_prep.overrides = {};
                        if (investor_prep.annotation_overrides) {
                            var annotation_overrides = JSON.parse(investor_prep.annotation_overrides);
                            annotation_overrides.forEach(function(override) {
                                investor_prep.overrides[override.id] = override.val;
                            });
                        }
                        // add id and text fields to make select2 happy
                        investor_prep.display = Investor.getDisplay(investor_prep.investor);
                        doc.preparedFor[investor_prep.investor] = investor_prep;
                    });
                    doc.preparedForLoading = false;
                    mergeDefaultList(defaultList);
                });
            } else if (!this.preparedForLoading) {
                mergeDefaultList(defaultList);
            }
            return this.preparedFor;
        },
        clearPreparedForCache: function() {
            // TODO: should consolidate the 2 calls to document.my_personal_preparations_view into a function
            if (this.preparedFor) {
                var doc = this;
                SWBrijj.tblmm('document.my_personal_preparations_view', 'doc_id', doc.doc_id).then(function(data) {
                    doc.preparedFor = {};
                    data.forEach(function(investor_prep) {
                        investor_prep.overrides = {};
                        if (investor_prep.annotation_overrides) {
                            var annotation_overrides = JSON.parse(investor_prep.annotation_overrides);
                            annotation_overrides.forEach(function(override) {
                                investor_prep.overrides[override.id] = override.val;
                            });
                        }
                        // add id and text fields to make select2 happy
                        investor_prep.display = Investor.getDisplay(investor_prep.investor);
                        doc.preparedFor[investor_prep.investor] = investor_prep;
                    });
                });
            }
        },
        addPreparedFor: function(investor) {
            if (investor === "") {
                return;
            }
            var doc = this;
            var hash = {display: Investor.getDisplay(investor), investor: investor, doc_id: doc.doc_id, is_prepared: false, overrides: {}};
            SWBrijj.insert('document.my_personal_preparations', {doc_id: this.doc_id, investor: investor}).then(function(result) {
                SWBrijj.procm('document.is_prepared_person', doc.doc_id, investor).then(function(data) {
                    hash.is_prepared = data[0].is_prepared_person;
                    if (!doc.preparedFor[investor]) {
                        doc.preparedFor[investor] = hash;
                    } // if it's already set, just fail silently as something more canonical hopefully overwrote
                }).except(function(error) {
                    delete doc.preparedFor[investor];
                    $rootScope.$emit("notification:fail", "Oops, something went wrong.");
                });
            }).except(function(error) {
                delete doc.preparedFor[investor];
                $rootScope.$emit("notification:fail", "Oops, something went wrong.");
            });
            return hash;
        },
        updatePreparedFor: function(old_investor, new_investor) {
            var doc = this;
            SWBrijj.update('document.my_personal_preparations', {investor: new_investor}, {doc_id: this.doc_id, investor: old_investor}).then(function(result){
                doc.preparedFor[new_investor] = doc.preparedFor[old_investor];
                delete doc.preparedFor[old_investor];
                doc.preparedFor[new_investor].investor = new_investor;
                doc.preparedFor[new_investor].display = Investor.getDisplay(new_investor);
            }).except(function(error) {
                doc.preparedFor[old_investor].display = Investor.getDisplay(old_investor);
                $rootScope.$emit("notification:fail", "Oops, something went wrong.");
            });
        },
        deletePreparedFor: function(old_investor) {
            var doc = this;
            SWBrijj.delete_one('document.my_personal_preparations', {doc_id: this.doc_id, investor: old_investor}).then(function(result) {
                delete doc.preparedFor[old_investor];
            }).except(function(error) {
                doc.preparedFor[old_investor].display = Investor.getDisplay(old_investor);
                $rootScope.$emit("notification:fail", "Oops, something went wrong.");
            });
        },
        savePreparation: function(investor) {
            var doc = this;
            $timeout(function() {
                var notes = [];
                doc.annotations.forEach(function(note) {
                    if (note.whosign == "Issuer" && doc.preparedFor && doc.preparedFor[investor]) {
                        // don't save the override if it's empty or equal to the base value
                        if (doc.preparedFor[investor].overrides[note.id] &&
                            doc.preparedFor[investor].overrides[note.id] !== "" &&
                            doc.preparedFor[investor].overrides[note.id] != note.val) {
                                notes.push({id: note.id, val: doc.preparedFor[investor].overrides[note.id]});
                        }
                    }
                });
                SWBrijj.procm('document.update_preparation', doc.doc_id, investor, JSON.stringify(notes)).then(function(result) {
                    // data stored, got back is_prepared, so update preparedFor with that and the overrides
                    doc.preparedFor[investor].is_prepared = result[0].update_preparation;
                    if (!ShareDocs.prepCache[doc.doc_id]) {
                        ShareDocs.prepCache[doc.doc_id] = {};
                    }
                    ShareDocs.prepCache[doc.doc_id][investor] = result[0].update_preparation; // clear the cache in ShareDocs
                }).except(function(error) {
                    $rootScope.$emit("notification:fail", "Oops, something went wrong while saving");
                });
            }, 100); // TODO: 100 ms seems like enough time to let bs-datepicker actually change the data. Figure out why it doesn't just work without this
        }
    };

    /// Document service definition
    // TODO: need to distinguish between originals and investor versions
    var docs = {};

    this.getDoc = function(doc_id) {
        if (doc_id === void(0)) {
            // we're probably uninitialized
            // TODO: fetch the actual document
            var d = new Document();
            return d;
        }
        if (!docs[doc_id]) {
            docs[doc_id] = new Document();
            docs[doc_id].doc_id = doc_id;
            docs[doc_id].annotations = []; // don't call getDocAnnotations until we know more about the doc (original / version)
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
        oldDoc.annotations = Annotations.getDocAnnotations(oldDoc); // refresh annotations (in case doc overwrote);
        if (oldDoc.issue_type) {

            updateAnnotationTypes(oldDoc.issue_type, oldDoc.transaction_type, oldDoc.annotation_types, oldDoc.annotations);
        }
        if (oldDoc.tags) {
            try {
                oldDoc.tags = JSON.parse(oldDoc.tags);
            } catch (e) {
                console.warn("error while parsing JSON");
                console.log(oldDoc.tags);
                oldDoc.tags = [];
            }
        } else {
            oldDoc.tags = [];
        }
        return oldDoc;
    };

    var getOriginalPromise = $q.defer();
    this.getOriginal = function(doc_id) {
        if (!docs[doc_id]) {
            var docServ = this;
            SWBrijj.tblm("document.my_company_library", "doc_id", doc_id).then(function(data) {
                docServ.setDoc(doc_id, data);
                getOriginalPromise.resolve();
            });
        }
        return this.getDoc(doc_id);
    };
    this.returnOriginalwithPromise = function(doc_id) {
        this.getOriginal(doc_id);
        return getOriginalPromise.promise;
    }
}]);
