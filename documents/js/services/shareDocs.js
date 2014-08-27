'use strict';

var docs = angular.module('docServices');

docs.service('ShareDocs', ["SWBrijj", "$q", "$rootScope", "$window", function(SWBrijj, $q, $rootScope, $window) {
    // Session storage
    var sdref = this;
    $window.addEventListener('beforeunload', function(event) {
        sessionStorage.setItem('shareDocs-emails', angular.toJson(sdref.emails));
        sessionStorage.setItem('shareDocs-documents', angular.toJson(sdref.documents));
        sessionStorage.setItem('shareDocs-message', angular.toJson(sdref.message));
    });

    this.emails = angular.fromJson(sessionStorage.getItem('shareDocs-emails'));
    this.documents = angular.fromJson(sessionStorage.getItem('shareDocs-documents'));
    this.message = angular.fromJson(sessionStorage.getItem('shareDocs-message'));
    sessionStorage.removeItem('shareDocs-emails');
    sessionStorage.removeItem('shareDocs-documents');
    sessionStorage.removeItem('shareDocs-messages');

    if (this.emails === null) {
        this.emails = [];
    }
    if (this.documents === null) {
        this.documents = [];
    }
    if (this.message === null) {
        this.message = "";
    }
    this.prepCache = {}; // of the form {doc_id: {investor: bool, investor: bool}, doc_id {investor: bool...}...}

    this.upsertShareItem = function(item) {
        var updated = false;
        angular.forEach(this.documents, function(el) {
            if (el.doc_id == item.doc_id ||
                (!el.doc_id && !item.doc_id &&
                    el.template_id==item.template_id)) {
                updated = true;
            }
        });
        if (!updated) {
            var obj = {
                "doc_id": item.doc_id,
                "template_id": item.template_id,
                "docname": item.docname
            };
            this.documents.push(obj);
        }
        this.checkPreparedLists([item], this.emails);
        return this.documents;
    };
    this.addEmail = function(email) {
        if (email.length > 0 && this.emails.indexOf(email) == -1) {
            this.emails.push(email);
            this.checkEmail(email);
        }
    };
    this.removeEmail = function(email) {
        var idx = this.emails.indexOf(email);
        if (idx != -1) {
            this.emails.splice(idx, 1);
        }
    };
    this.removeShareItem = function(item) {
        this.documents = this.documents.filter(function(el) {
            return !(item.doc_id==el.doc_id &&
                     item.template_id==el.template_id);
        });
    };

    this.docsReadyToShare = function() {
        if (this.documents.length===0 || this.emails.length === 0) {
            return false;
        }
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
        SWBrijj.procm('document.is_prepared_person', doc.doc_id, investor).then(function(data) {
            var res = data[0].is_prepared_person;
            sdref.prepCache[doc.doc_id][investor] = res;
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
            investors.forEach(function(investor) {
                promises.push(this.checkPrepared(doc, investor, ignore_cache));
            }, this);
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
    };
    this.checkEmail = function(investor) {
        return this.checkPreparedLists(this.documents, [investor]);
    };
    this.checkAllPrepared = function() {
        // does a force reload of all is_prepared data
        return this.checkPreparedLists(this.documents, this.emails, true);
    };
    this.allPreparedCache = function() {
        return this.documents.every(function(doc) {
            return this.emails.every(function(inv) {
                return this.prepCache[doc.doc_id][inv];
            }, this);
        }, this);
    };
    this.emailNotPreparedCache = function(email) {
        return this.documents.some(function(doc) {
            return !this.prepCache[doc.doc_id][email];
        }, this);
    };

    this.shareDocuments = function() {
        // TODO: confirm that documents haven't been shared before to the users listed
        var share_defer = $q.defer();
        this.checkAllPrepared().then(function(result) {
            if (result) {
                SWBrijj.document_multishare(
                    sdref.emails.join(","),
                    JSON.stringify(sdref.documents),
                    sdref.message,
                    "22 November 2113"
                ).then(function(data) {
                    share_defer.resolve(data);
                    sdref.emails = [];
                    sdref.documents = [];
                    sdref.message = "";
                }).except(function(err) {
                    console.error(err);
                    share_defer.reject(err);
                });
            } else {
                share_defer.reject("Not all documents prepared for all people");
            }
        });
        return share_defer.promise;
    };

    this.checkAllPrepared(); // initialize cache
}]);
