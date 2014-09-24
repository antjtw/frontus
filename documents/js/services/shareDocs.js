'use strict';

var docs = angular.module('docServices');

docs.factory('DocShareFactory', ["SWBrijj", "Investor", "$q", function(SWBrijj, Investor, $q) {
    var DocShare = function() {
        // this.emails is really a list of user_ids, not emails
        this.emails = [];
        this.documents = [];
        this.message = "";

        this.prepCache = {}; // of the form {doc_id: {investor: bool, investor: bool}, doc_id {investor: bool...}...}
    };
    DocShare.prototype = {
        save: function(name) {
            sessionStorage.setItem(name + '-emails', angular.toJson(this.emails));
            sessionStorage.setItem(name + '-documents', angular.toJson(this.documents));
            sessionStorage.setItem(name + '-message', angular.toJson(this.message));
        },
        restore: function(name) {
            this.emails = angular.fromJson(sessionStorage.getItem(name + '-emails'));
            this.documents = angular.fromJson(sessionStorage.getItem(name + '-documents'));
            this.message = angular.fromJson(sessionStorage.getItem(name + '-message'));
            sessionStorage.removeItem(name + '-emails');
            sessionStorage.removeItem(name + '-documents');
            sessionStorage.removeItem(name + '-messages');
            if (this.emails === null) {
                this.emails = [];
            }
            if (this.documents === null) {
                this.documents = [];
            }
            if (this.message === null) {
                this.message = "";
            }
        },
        upsertShareItem: function(item) {
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
        },
        addEmail: function(email) {
            var sdref = this;
            if (email.length > 0 && this.emails.indexOf(email) == -1) {
                this.emails.push(email);
                this.checkEmail(email);
                if (!Investor.displays[email]) {
                    // this isn't an email we recognize off hand
                    Investor.getInvestorId(email).then(function(user_id) {
                        if (user_id != email) {
                            sdref.removeEmail(email);
                            sdref.addEmail(user_id); // recurses, but with the right info this time
                        }
                    });
                }
            }
        },
        removeEmail: function(email) {
            var idx = this.emails.indexOf(email);
            if (idx != -1) {
                this.emails.splice(idx, 1);
            }
        },
        removeShareItem: function(item) {
            this.documents = this.documents.filter(function(el) {
                return !(item.doc_id==el.doc_id &&
                         item.template_id==el.template_id);
            });
        },
        docsReadyToShare: function() {
            if (this.documents.length===0 || this.emails.length === 0) {
                return false;
            }
            if (!this.allPreparedCache()) {
                return false;
            }
            return true;
        },
        checkPrepared: function(doc, investor, ignore_cache) {
            var sdref = this;
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
        },
        clearPrepCache: function(doc_id) {
            this.checkPreparedLists([{doc_id: doc_id}], this.emails, true); // clear the cache by fetching the new data
            return true;
        },
        checkPreparedLists: function(docs, investors, ignore_cache) {
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
        },
        checkEmail: function(investor) {
            return this.checkPreparedLists(this.documents, [investor]);
        },
        checkAllPrepared: function() {
            // does a force reload of all is_prepared data
            return this.checkPreparedLists(this.documents, this.emails, true);
        },
        allPreparedCache: function() {
            return this.documents.every(function(doc) {
                return this.emails.every(function(inv) {
                    return this.prepCache[doc.doc_id][inv];
                }, this);
            }, this);
        },
        emailNotPreparedCache: function(email) {
            return this.documents.some(function(doc) {
                return !this.prepCache[doc.doc_id][email];
            }, this);
        },
        shareDocuments: function() {
            var share_defer = $q.defer();
            var sdref = this;
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
        },
    };
    return DocShare;
}]);

docs.service('ShareDocs', ["$window", "DocShareFactory", function($window, DocShareFactory) {
    // Session storage
    var ds = new DocShareFactory();
    $window.addEventListener('beforeunload', function(event) {
        ds.save('shareDocs');
    });

    ds.restore('shareDocs');

    this.emails = ds.emails;
    this.documents = ds.documents;
    this.message = ds.message;
    this.prepCache = ds.prepCache;

    this.upsertShareItem = function(doc) {
        return ds.upsertShareItem(doc);
    };
    this.addEmail = function(email) {
        return ds.addEmail(email);
    };
    this.removeEmail = function(email) {
        return ds.removeEmail(email);
    };
    this.removeShareItem = function(doc) {
        return ds.removeShareItem(doc);
    };
    this.docsReadyToShare = function() {
        return ds.docsReadyToShare();
    };

    ds.checkAllPrepared(); // initialize cache
}]);
