//'use strict';

app.controller('InvestorDocumentViewController', ['$scope', '$location', '$route', '$rootScope', '$routeParams', '$timeout', 'SWBrijj', 'basics',
        'navState',
    function($scope, $location, $route, $rootScope, $routeParams, $timeout, SWBrijj, navState, basics) {
        // Switch to company view if the role is issuer
        /** @name $routeParams#doc
         * @type {string} */
        if (navState.role == 'issuer') {
            $location.path("/company-view");
            return;
        }

        SWBrijj.tblm('global.server_time').then(function(time) {
            $rootScope.servertime = time[0].fromnow;
        });

        // Set up event handlers
        $scope.$on('event:loginRequired', function() {
            document.location.href = '/login';
        });

        $scope.$on('event:brijjError', function(event, msg) {
            $rootScope.errorMessage = msg;
        });

        $scope.$on('event:reload', function(event) {
            void(event);
            $timeout(function() {
                $route.reload();
            }, 100);
        });

        $scope.$on('docViewerReady', function(event) {
            if ($scope.docId) $scope.getData();
            else if ($scope.templateKey) $scope.$broadcast('initTemplateView', $scope.templateKey, $scope.subId);
        });

        $scope.docId = parseInt($routeParams.doc, 10);
        $scope.templateKey = parseInt($routeParams.template, 10);
        $scope.subId = parseInt($routeParams.subid, 10);
        $scope.thisPage = $routeParams.page ? parseInt($routeParams.page, 10) : 1;
        $scope.library = "document.my_investor_library";
        $scope.pages = "document.my_investor_codex";
        $scope.tester = false;
        $scope.invq = true;
        $scope.pageQueryString = function() {
            return "id=" + $scope.docId + "&investor=" + $scope.invq;
        };
        $scope.processing = false;

        $scope.helpModalUp = function () {
            $scope.tourModal = true;
        };

        $scope.tourclose = function () {
            $scope.sideToggle = false;
            $scope.tourModal = false;
        };

        $scope.touropts = {
            backdropFade: true,
            dialogFade: true,
            dialogClass: 'helpModal modal'
        };

        $scope.signinggot = function () {
            SWBrijj.procm("account.update_user_settings", "knows_signing", "true").then(function(data) {
                void(data);
            });
        };

        $scope.initDocView = function() {
            $scope.$broadcast('initDocView', $scope.docId, $scope.invq, $scope.library, $scope.pageQueryString(), $scope.pages);
        };

        $scope.getData = function () {
            if ($scope.docId) {
                SWBrijj.tblm("document.my_investor_library", "doc_id", $scope.docId).then(function(data) {
                    if ($rootScope.navState.company != data.company) {
                        $location.path("/investor-list?");
                        return;
                    }
                    $scope.document = data;
                    if (data.signature_flow == 1 && !data.when_signed) {
                        document.location.href = "/documents/investor-view?template=" + data.template_id + "&subid=" + data.doc_id;
                    }

                    if ($scope.signable()) {
                        SWBrijj.tblm('account.user_settings', ["knows_signing"]).then(function(data) {
                            if (!data[0].knows_signing) {
                                $scope.helpModalUp();
                            }
                        });
                    }

                    $scope.initDocView();
                }).except(function(x) {
                    void(x);
                    $location.path("/investor-list?");
                });
            }
        };

        $scope.getData();

        $scope.signable = function() {
            return $scope.document && $scope.document.signature_deadline && !$scope.document.when_signed;
        };

        $scope.leave = function() {
            if ($rootScope.lastPage
                && ($rootScope.lastPage.indexOf("/register/") === -1)
                && ($rootScope.lastPage.indexOf("/login/") === -1)
                && ($rootScope.lastPage.indexOf("-view") === -1)) {
                $location.url($rootScope.lastPage);
            } else if ($scope.invq) {
                $location.url('/documents/investor-list');
            } else {
                $location.url('/documents/company-list');
            }
        };

        $scope.signDocument = function(doc) {
            $scope.processing = true;
            // before signing the document, I may need to save the existing annotations
            // In fact, I should send the existing annotations along with the signature request for a two-fer.

            var dce = angular.element(".docPanel").scope();
          SWBrijj.sign_document($scope.docId,dce.getNoteData(true)[0]).then(function(data) {
                doc.when_signed = data;
                $scope.$emit('refreshDocImage');
                $scope.$emit("notification:success", "Document signed");
                $scope.leave();
                //$location.path('/investor-list').search({});
            }).except(function(x) {
                console.log(x);
                $scope.$emit("notification:fail", "Oops, something went wrong.");
                $scope.processing = false;
            });
        };

        $scope.$on('finalizeAction', function(evt, data) {
            $scope.finalizeAction(data);
        });
        $scope.finalizeAction = function(data) {
            if (data[0] === 1) {
                $scope.finalizeDocument();
            } else if (data[0] === -1) {
                $scope.rejectCountersignature(data[1]);
            }
        };

        $scope.finalizeDocument = function() {
            $scope.processing = true;
            //var dce = angular.element(".docPanel").scope();
            SWBrijj.document_finalize($scope.docId).then(function(data) {
                $scope.$emit('refreshDocImage');
                $scope.$emit("notification:success", "Document approved");
                $scope.leave();
                //$location.path('/investor-list').search({});
            }).except(function(x) {
                console.log(x);
                $scope.$emit("notification:fail", "Oops, something went wrong.");
                $scope.processing = false;
            });
        };

        $scope.rejectCountersignature = function(msg) {
            $scope.processing = true;
            if (msg === "Explain the reason for rejecting this document.") {
                msg = "";
            }
            //var dce = angular.element(".docPanel").scope();
            SWBrijj.procm("document.reject_countersignature", $scope.docId, msg).then(function(data) {
                $scope.$emit("notification:success", "Document countersignature rejected.");
                void(data);
                $scope.leave();
                //$location.path('/company-list').search({});
            }).except(function(x) {
                void(x);
                $scope.$emit("notification:fail", "Oops, something went wrong.");
                $scope.processing = false;
            });
        };
    }
]);
