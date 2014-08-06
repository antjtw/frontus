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

docs.service('ShareDocs', ["SWBrijj", "$q", "$rootScope", function(SWBrijj, $q, $rootScope) {
    this.emails = [];
    this.documents = [];
    this.message = "";

    this.prepCache = {}; // of the form {doc_id: {investor: bool, investor: bool}, doc_id {investor: bool...}...}

    this.upsertShareItem = function(item) {
        var updated = false;
        angular.forEach(this.documents, function(el) {
            if (el.doc_id == item.doc_id ||
                (!el.doc_id && !item.doc_id &&
                    el.template_id==item.template_id)) {
                el.signature_flow = item.signature_flow;
                updated = true;
            }
        });
        if (!updated) {
            var obj = {
                "doc_id": item.doc_id,
                "template_id": item.template_id,
                "signature_flow": item.signature_flow,
                "docname": item.docname
            };
            this.documents.push(obj);
            if (item.preps) {
                item.preps.forEach(function(prep_email) {
                    this.addEmail(prep_email);
                }, this);
            }
        }
        if (item.signature_flow > 0) {
            this.checkPreparedLists([item], this.emails);
        }
        return this.documents;
    };
    this.addEmail = function(email) {
        if (email.length > 0 && this.emails.indexOf(email) == -1) {
            this.emails.push(email);
            this.checkEmail(email);
        }
    }
    this.removeEmail = function(email) {
        var idx = this.emails.indexOf(email);
        if (idx != -1) {
            this.emails.splice(idx, 1);
        }
    }
    this.removeShareItem = function(item) {
        this.documents = this.documents.filter(function(el) {
            return !(item.doc_id==el.doc_id &&
                     item.template_id==el.template_id);
        });
    };
    this.updateShareType = function(doc, tp) {
        if (doc.template_id && tp > 0) {
            tp = 1;
        }
        doc.signature_flow = tp;
        this.upsertShareItem(doc);
    };

    this.docsReadyToShare = function() {
        if (this.documents.length===0) {
            return false;
        }
        angular.forEach(this.documents, function(doc) {
            if (doc.signature_flow < 0) {
                return false;
            }
        });
        if (!this.allPreparedCache()) {
            return false;
        }
        return true;
    };

    this.checkPrepared = function(doc, investor, ignore_cache) {
        var p = $q.defer();
        if (this.prepCache[doc.doc_id] === undefined) {
            this.prepCache[doc.doc_id] = {};
        }
        if (!ignore_cache && this.prepCache[doc.doc_id][investor] !== undefined) {
            p.resolve(this.prepCache[doc.doc_id][investor]);
        }
        var shares = this;
        SWBrijj.procm('document.is_prepared_person', doc.doc_id, investor).then(function(data) {
            var res = data[0].is_prepared_person;
            shares.prepCache[doc.doc_id][investor] = res;
            p.resolve(res);
        }).except(function(err) {
            p.reject(err);
        });
        return p.promise;
    };
    this.clearPrepCache = function(doc_id) {
        this.checkPreparedLists([{doc_id: doc_id}], this.emails, true); // clear the cache by fetching the new data
        return true;
    };
    this.checkPreparedLists = function(docs, investors, ignore_cache) {
        // for every document and every investor, check that is_prepared_person returns true;
        var check_defer = $q.defer();
        var promises = [];
        docs.forEach(function(doc) {
            if (doc.signature_flow > 0) { // only signable docs need checking
                investors.forEach(function(investor) {
                    promises.push(this.checkPrepared(doc, investor, ignore_cache));
                }, this);
            }
        }, this);
        $q.all(promises).then(function(results) {
            check_defer.resolve(results.every(function(res) {
                return res; // should already be a boolean
            }));
        }, function(err) {
            console.error(err);
            check_defer.reject(err);
        });
        return check_defer.promise;
    }
    this.checkEmail = function(investor) {
        return this.checkPreparedLists(this.documents, [investor]);
    };
    this.checkAllPrepared = function() {
        // does a force reload of all is_prepared data
        return this.checkPreparedLists(this.documents, this.emails, true);
    };
    this.allPreparedCache = function() {
        return this.documents.every(function(doc) {
            if (doc.signature_flow > 0) {
                return this.emails.every(function(inv) {
                    return this.prepCache[doc.doc_id][inv];
                }, this);
            } else {
                // if document isn't for share, we're good regardless
                return true;
            }
        }, this);
    };
    this.emailNotPreparedCache = function(email) {
        return this.documents.some(function(doc) {
            if (doc.signature_flow > 0) {
                return !this.prepCache[doc.doc_id][email];
            } else {
                return false;
            }
        }, this);
    };

    this.shareDocuments = function() {
        // TODO: confirm that documents haven't been shared before to the users listed
        var share_defer = $q.defer();
        angular.forEach(this.documents, function(doc) {
            if (doc.signature_flow === undefined || doc.signature_flow === null) {
                doc.signature_flow = 0;
            }
        });
        var share = this;
        this.checkAllPrepared().then(function(result) {
            if (result) {
                SWBrijj.document_multishare(
                    share.emails,
                    JSON.stringify(share.documents),
                    share.message,
                    "22 November 2113"
                ).then(function(data) {
                    $rootScope.$emit("notification:success", "Documents shared");
                    share_defer.resolve(data);
                    share.emails = [];
                    share.documents = [];
                    share.message = "";
                    //$route.reload(); // TODO: close share bar?
                }).except(function(err) {
                    console.error(err);
                    $rootScope.$emit("notification:fail", "Oops, something went wrong.");
                    share_defer.reject(err);
                });
            } else {
                $rootScope.$emit("notification:fail", "Please confirm all documents being shared are prepared for all recipients.");
                share_defer.reject("Not all documents prepared for all people");
            }
        });
        return share_defer.promise;
    };
}]);


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
                        if (!doc.preparedFor.some(function(prep) {
                            return prep.investor == inv;
                        })) {
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
                this.preparedFor = [];
                SWBrijj.tblmm('document.my_personal_preparations_view', 'doc_id', doc.doc_id).then(function(data) {
                    data.forEach(function(investor_prep) {
                        if (investor_prep.annotation_overrides) {
                            investor_prep.annotation_overrides = JSON.parse(investor_prep.annotation_overrides);
                        }
                        // add id and text fields to make select2 happy
                        investor_prep.display = Investor.getDisplay(investor_prep.investor);
                        doc.preparedFor.push(investor_prep);
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
                        if (investor_prep.annotation_overrides) {
                            investor_prep.annotation_overrides = JSON.parse(investor_prep.annotation_overrides);
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
                    doc.preparedFor.push({display: Investor.getDisplay(investor), investor: investor, doc_id: doc.doc_id, is_prepared: data[0].is_prepared_person});
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
                        investor_prep.annotation_overrides = notes;
                        investor_prep.is_prepared = result[0].update_preparation;
                        found = true;
                    }
                });
                ShareDocs.prepCache[doc.doc_id][investor] = result[0].update_preparation; // clear the cache in ShareDocs
                if (!found) {
                    // must have accidentally inserted instead of updating ...
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

// ANNOTATIONS
// TODO: should really have an annotation factory
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
    // [i][4] other -> investorfixed, whosign, whattype, required, and id

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
            this.pristine = true; // used to tell if value has changed since server load. mostly useful when preparing for an individual
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
        filled: function(signaturepresent, role) {
            // signature present comes from the account
            if (!this.forRole(role)) {
                return false;
            }
            var type = this.type_info.typename;
            if (["int8", "int4", "float8"].indexOf(type) != -1) {
                var num = Number(this.val);
                return (!isNaN(num) && this.val.length > 0);
            } else if (type == "enum") {
                return this.type_info.labels.indexOf(this.val) != -1;
            } else {
                return ((this.val && this.val.length > 0) ||
                        (this.whattype == "ImgSignature" && signaturepresent));
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

    this.createBlankAnnotation = function() {
        return new Annotation();
    };

    function generateAnnotationId() {
        // needs to return an id that's unique to this document
        return Date.now().toString() + "id" + Math.floor(Math.random()*100000);
    }

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

    this.setDocAnnotations = function(doc_id, annotations, annotation_types) {
        if (!doc_annotations[doc_id]) {
            doc_annotations[doc_id] = [];
        } else {
            // clear out any existing annotations
            doc_annotations[doc_id].splice(0, Number.MAX_VALUE);
        }
        annotations.forEach(function(annot) {
            var new_annot = (new Annotation()).parseFromJson(annot, annotation_types);
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
                investor_attributes.investorEmail = angular.copy(person.email);
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
                    annot.val = data;
                }
            }).except(function (x) {console.log(x);});
    };
}]);
