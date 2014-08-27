'use strict';

app.controller('DocumentPrepareController',
    ['$scope', '$routeParams', 'Documents', 'SWBrijj', 'Investor', 'ShareDocs', 'navState', '$window', '$location', '$rootScope', '$route',
    function($scope, $routeParams, Documents, SWBrijj, Investor, ShareDocs, navState, $window, $location, $rootScope, $route) {
        $scope.doc_arr = [];
        ShareDocs.documents.forEach(function(sharedoc) {
            var doc = Documents.getOriginal(sharedoc.doc_id);
            doc.getPreparedFor(ShareDocs.emails); // fetch preparation information (if needed)
            $scope.doc_arr.push(doc);
        });

        // give view access to services
        $scope.ShareDocs = ShareDocs;
        $scope.Investor = Investor;

        $scope.state = {};
        if ($routeParams.bulk) {
            $scope.state.bulkPrep = true;
        } else {
            $scope.state.bulkPrep = false;
        }
        $scope.$watch('state.bulkPrep', function(bulkPrep, old_bulkPrep) {
            if (bulkPrep != old_bulkPrep) { // only on change, not initial
                if (bulkPrep) {
                    $location.search('bulk', true).replace();
                } else {
                    $location.search('bulk', null).replace();
                }
            }
        });

        $scope.bulkPrepable = function(annotation) {
            if (!annotation.forRole(navState.role) || annotation.whattype == "ImgSignature" || annotation.type == "highlight") {
                return false;
            } else {
                return true;
            }
        };

        $scope.shareDocuments = function() {
            $scope.processing = true;
            ShareDocs.shareDocuments().then(function(result) {
                if ($scope.doc_arr.some(function(doc) {
                    return doc.issue && !doc.hasSignatureAnnotations() && !doc.hasInvestorAnnotations();
                })) {
                    $rootScope.$emit("notification:success", "Documents shared & transactions generating");
                } else {
                    $rootScope.$emit("notification:success", "Documents shared");
                }
                $location.url("/app/documents/company-list");
            }).catch(function(err) {
                if (err == "Not all documents prepared for all people") {
                    $rootScope.$emit("notification:fail", "Please confirm all documents being shared are prepared for all recipients.");
                } else {
                    $rootScope.$emit("notification:fail", "Oops, something went wrong.");
                }
            }).finally(function(result) {
                $scope.processing = false;
            });
        };

        $scope.encodeURIComponent = encodeURIComponent;

        /* Save the overrides when navigating away */
        function saveOverrides() {
            if ($routeParams.bulk) { // don't save if we aren't in bulkPrep mode
                // TODO: this could get really slow, optimize the calls
                $scope.doc_arr.forEach(function(doc) {
                    ShareDocs.emails.forEach(function(investor) {
                        doc.savePreparation(investor);
                    });
                });
            }
        }
        $window.addEventListener('beforeunload', function(event) {
            saveOverrides();
        });
        $scope.$on('$locationChangeStart', function(event, newUrl, oldUrl) {
            if (newUrl.match(/login([?]|$)/)) {
                // don't save note data if I'm being redirected to log in
                return;
            }
            if (newUrl.substring(0, newUrl.indexOf('?')) == oldUrl.substring(0, oldUrl.indexOf('?'))) {
                // don't save if it's just a change in search
                return;
            }
            saveOverrides();
        });

        $scope.already_shared = {};
        $scope.$watch('ShareDocs.documents', function(docs) {
            // we want to reinitialize this everytime the page loads, just incase something changed
            if (docs && docs.length > 0) {
                docs.forEach(function(d) {
                    $scope.already_shared[d.doc_id] = {};
                    SWBrijj.tblmm('document.shared_with', 'original', d.doc_id).then(function(res) {
                        res.forEach(function(share) {
                            if ((!$scope.already_shared[d.doc_id][share.investor]) ||
                                $scope.already_shared[d.doc_id][share.investor].when_shared < share.when_shared) {
                                $scope.already_shared[d.doc_id][share.investor] = share;
                            }
                        });
                    });
                });
            }
        });

        $scope.docsReadyToShare = function() {
            if (!ShareDocs.docsReadyToShare()) {
                return false;
            }
            if ($scope.doc_arr.some(function(doc) {
                return ShareDocs.emails.some(function(email) {
                    return doc.hasInvalidAnnotation(email);
                });
            })) {
                return false;
            }
            return true;
        };
    }]
);
