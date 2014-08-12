'use strict';

var docs = angular.module('docServices');

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
                    share.emails.join(","),
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
