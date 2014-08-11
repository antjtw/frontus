'use strict';

var docs = angular.module('docServices');

// TODO: should really have a document factory
docs.service('Documents', ["Annotations", "SWBrijj", "$q", "$rootScope", "Investor", "ShareDocs", function(Annotations, SWBrijj, $q, $rootScope, Investor, ShareDocs) {
    // transaction_attributes is needed to set the annotation types for this document
    var transaction_attributes = null;
    var transaction_attributes_callback = null;
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
    function updateAnnotationTypes(issue_type, transaction_type, type_list) {
        // transaction_attributes may not be defined yet (race condition on initialization)
        function reallyDo() {
            if (issue_type) {
                var viable_actions = transaction_attributes[issue_type].actions;
                var fields = viable_actions[transaction_type].fields;
            } else {
                fields = [];
            }
            type_list.splice(defaultTypes.length, type_list.length); // remove anything past the defaultTypes
            var tmp_array = [];
            for (var field in fields) {
                var f = fields[field];
                tmp_array.push({name: f.name, display: f.display_name, required: f.required, typename: f.typname, labels: f.labels});
            }
            // add new types onto the end (in one action, without changing the reference, for performance reasons)
            var args = [type_list.length, 0].concat(tmp_array);
            Array.prototype.splice.apply(type_list, args);
            // TODO: remove duplicate types, favoring the transaction type
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
            this.issue = issue.issue;
            this.issue_type = issue.type;
            var viable_actions = transaction_attributes[this.issue_type].actions;
            // documents can only create grants and purchases right now
            this.transaction_type = viable_actions.purchase ? "purchase" : "grant";
            SWBrijj.update("document.my_company_library", {issue: this.issue, "transaction_type": this.transaction_type}, {doc_id: this.doc_id}); // TODO: handle response / error
            updateAnnotationTypes(this.issue_type, this.transaction_type, this.annotation_types);
            this.annotations.forEach(function(annot) {
                annot.updateTypeInfo(this.annotation_types);
            }, this);
        },
        unsetTransaction: function() {
            this.issue = null;
            this.issue_type = null;
            this.transaction_type = null;
            SWBrijj.update("document.my_company_library", {issue: this.issue, "transaction_type": this.transaction_type}, {doc_id: this.doc_id}); // TODO: handle response / error
            updateAnnotationTypes(this.issue_type, this.transaction_type, this.annotation_types);
            this.annotations.forEach(function(annot) {
                annot.updateTypeInfo(this.annotation_types);
            });
        },
        hasOtherPartyAnnotation: function(annotType) {
            return this.annotations.some(function(annot) {
                return (annot.whattype == annotType) && !annot.forRole($rootScope.navState.role);
            });
        },
        hasFilledAnnotation: function(annotType) {
            return this.annotations.some(function(annot) {
                return (annot.whattype == annotType) && (annot.filled(false, $rootScope.navState.role));
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
            return num
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
        dropdownDisplay: function(type) {
            if (type.required) {
                return type.display + " (Required)";
            } else {
                return type.display;
            }
        },
        annotationOrder: function(type) {
            if (type.display == "Text") {
                return 0;
            }
            else if (type.required) {
                return 0 + type.display;
            } else if (type.required === false) {
                return 1 + type.display;
            } else {
                return 2 + type.display;
            }
        },
        annotable: function(role) {
            if (role == "investor")
                return this.investorCanAnnotate();
            else if (role == "issuer")
                //does not include if the document is being prepared
                return this.issuerCanAnnotate();
        },
        investorCanAnnotate: function() {
            // always false? Can issuer annotate a document with a signature_deadline (has been shared)?
            return (!this.when_signed && this.signature_deadline && this.signature_flow===2);
        },
        issuerCanAnnotate: function() {//does not include if the document is being prepared
            return (!this.when_countersigned && this.when_signed && this.signature_flow===2);
        },
        getPreparedFor: function(defaultList) {
            var doc = this;
            function mergeDefaultList(defaultList){
                if (defaultList) {
                    var origLength = doc.preparedFor.length;
                    defaultList.forEach(function(inv) {
                        if (!doc.preparedFor.keys().indexOf(inv) === -1) {
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
                SWBrijj.tblmm('document.my_personal_preparations_view', 'doc_id', doc.doc_id).then(function(data) {
                    data.forEach(function(investor_prep) {
                        investor_prep.override_hash = {};
                        if (investor_prep.annotation_overrides) {
                            var annotation_overrides = JSON.parse(investor_prep.annotation_overrides);
                            annotation_overrides.forEach(function(override) {
                                investor_prep.override_hash[override.id] = override;
                            });
                        }
                        // add id and text fields to make select2 happy
                        investor_prep.display = Investor.getDisplay(investor_prep.investor);
                        doc.preparedFor[investor_prep.investor] = investor_prep;
                    });
                    mergeDefaultList(defaultList);
                });
            } else {
                mergeDefaultList(defaultList);
            }
            return this.preparedFor;
        },
        clearPreparedForCache: function() {
            // TODO: should consolidate the 2 calls to document.my_personal_preparations_view into a function
            if (this.preparedFor) {
                var doc = this;
                SWBrijj.tblmm('document.my_personal_preparations_view', 'doc_id', doc.doc_id).then(function(data) {
                    doc.preparedFor = [];
                    data.forEach(function(investor_prep) {
                        investor_prep.override_hash = {};
                        if (investor_prep.annotation_overrides) {
                            var annotation_overrides = JSON.parse(investor_prep.annotation_overrides);
                            annotation_overrides.forEach(function(override) {
                                investor_prep.override_hash[override.id] = override;
                            });
                        }
                        // add id and text fields to make select2 happy
                        investor_prep.display = Investor.getDisplay(investor_prep.investor);
                        doc.preparedFor.push(investor_prep);
                    });
                });
            }
        },
        addPreparedFor: function(investor) {
            var doc = this;
            SWBrijj.insert('document.my_personal_preparations', {doc_id: this.doc_id, investor: investor}).then(function(result) {
                SWBrijj.procm('document.is_prepared_person', doc.doc_id, investor).then(function(data) {
                    doc.preparedFor[investor] = {display: Investor.getDisplay(investor), investor: investor, doc_id: doc.doc_id, is_prepared: data[0].is_prepared_person, override_hash: {}};
                }).except(function(error) {
                    $rootScope.$emit("notification:fail", "Oops, something went wrong.");
                });
            }).except(function(error) {
                $rootScope.$emit("notification:fail", "Oops, something went wrong.");
            });
        },
        updatePreparedFor: function(old_investor, new_investor) {
            var doc = this;
            SWBrijj.update('document.my_personal_preparations', {investor: new_investor}, {doc_id: this.doc_id, investor: old_investor}).then(function(result){
                doc.preparedFor.forEach(function(investor_prep) {
                    if (investor_prep.investor == old_investor) {
                        investor_prep.investor = new_investor;
                        // TODO: ensure investor_prep.display.text is right (might need investor name)
                    }
                });
            }).except(function(error) {
                doc.preparedFor.forEach(function(investor_prep) {
                    if (investor_prep.investor == old_investor) {
                        investor_prep.display = Investor.getDisplay(old_investor);
                    }
                });
                $rootScope.$emit("notification:fail", "Oops, something went wrong.");
            });
        },
        deletePreparedFor: function(old_investor) {
            var doc = this;
            SWBrijj.delete_one('document.my_personal_preparations', {doc_id: this.doc_id, investor: old_investor}).then(function(result) {
                doc.preparedFor.forEach(function(investor_prep, idx, arr) {
                    if (investor_prep.investor == old_investor) {
                        arr.splice(idx, 1);
                    }
                });
            }).except(function(error) {
                doc.preparedFor.forEach(function(investor_prep) {
                    if (investor_prep.investor == old_investor) {
                        investor_prep.display = Investor.getDisplay(old_investor);
                    }
                });
                $rootScope.$emit("notification:fail", "Oops, something went wrong.");
            });
        },
        savePreparation: function(investor) {
            // TODO: use override_hash instead of annotation_overrides
            var notes = [];
            angular.forEach(this.annotations, function(note) {
                if (note.whosign == "Issuer" && !note.pristine) {
                    notes.push({id: note.id, val: note.val});
                }
            });
            var doc = this;
            SWBrijj.procm('document.update_preparation', this.doc_id, investor, JSON.stringify(notes)).then(function(result) {
                // data stored, got back is_prepared, so update preparedFor with that and the overrides
                var found = false;
                doc.preparedFor.forEach(function(investor_prep, idx, arr) {
                    if (investor_prep.investor == investor) {
                        //investor_prep.annotation_overrides = notes; // should already be updated, should be pulling from in above check to send data
                        investor_prep.is_prepared = result[0].update_preparation;
                        found = true;
                    }
                });
                if (!ShareDocs.prepCache[doc.doc_id]) {
                    ShareDocs.prepCache[doc.doc_id] = {};
                }
                ShareDocs.prepCache[doc.doc_id][investor] = result[0].update_preparation; // clear the cache in ShareDocs
                if (!found) {
                    // must have accidentally inserted instead of updating ...
                    // TODO: if override_hash must already exist, how did we get here?
                    doc.preparedFor.push(
                        {display: Investor.getDisplay(investor),
                         investor: investor,
                         doc_id: doc.doc_id,
                         annotation_overrides: notes,
                         is_prepared: result[0].update_preparation});
                }
            }).except(function(error) {
                $rootScope.$emit("notification:fail", "Oops, something went wrong while saving");
            });
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
            docs[doc_id].annotations = Annotations.getDocAnnotations(docs[doc_id]);
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
            updateAnnotationTypes(oldDoc.issue_type, oldDoc.transaction_type, oldDoc.annotation_types);
            oldDoc.annotations.forEach(function(annot) {
                annot.updateTypeInfo(oldDoc.annotation_types);
            });
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
