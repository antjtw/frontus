//'use strict';

app.controller('CompanyDocumentViewController', ['$scope', '$routeParams', '$route', '$rootScope', '$timeout', '$location', 'SWBrijj', 'basics',
        'navState', 'Annotations',
    function($scope, $routeParams, $route, $rootScope, $timeout, $location, SWBrijj, navState, basics, Annotations) {
        if ($routeParams.page) {
            $scope.currentPage = parseInt($routeParams.page, 10);
        } else if (!$scope.currentPage) {
            $scope.currentPage = 1;
        }

        if (navState.role == 'investor') {
            $location.path('/investor-view');
            return;
        }

        $scope.toggleSide = false;

        SWBrijj.tblm('global.server_time').then(function(time) {
            $rootScope.servertime = time[0].fromnow;
        });

        // Set up event handlers
        $scope.$on('event:loginRequired', function() {
            document.location.href = '/login';
        });
        /*
        Don't really want this as it overrides even the ones that are caught and handled properly
        $scope.$on('event:brijjError', function(event, msg) {
            $scope.$emit("notification:fail", msg);//"Oops, something went wrong.");
        }); */

        $scope.$on('event:reload', function(event) {
            void(event);
            $timeout(function() {
                $route.reload();
            }, 100);
        });

        $scope.$on('docViewerReady', function(event) {
            if ($scope.docId) $scope.getData();//{$route.reload();}
            else if ($scope.templateKey) $scope.$broadcast('initTemplateView', $scope.templateKey, $scope.subId);
        });

        $scope.helpModalUp = function () {
            $scope.tourModal = true;
        };

        $scope.tourclose = function () {
            $scope.hideSharebar = false;
            $scope.tourModal = false;
            $scope.checkProcessing();
        };

        $scope.sharinggot = function () {
            SWBrijj.procm("account.update_user_settings", "knows_sharing", "true").then(function(data) {
                void(data);
            });
        };

        $scope.touropts = {
            backdropFade: true,
            dialogFade: true,
            dialogClass: 'helpModal modal'
        };

        $scope.processedopts = {
            backdropFade: true,
            dialogFade: true,
            dialogClass: 'processedImageModal modal',
            backdropClick: false,
            backdrop: 'static'
        };

        $scope.docKey = parseInt($routeParams.doc, 10);
        $scope.templateKey = parseInt($routeParams.template, 10);
        $scope.subId = parseInt($routeParams.subid, 10);
        $scope.urlInves = $routeParams.investor;
        $scope.prepare = ($routeParams.prepare==='true') ? true : false;
        $scope.invq = false;
        $scope.counterparty = !! $scope.urlInves;
        $scope.tester = false;
        $scope.signeeded = "No";

        $scope.library = $scope.urlInves ? "document.my_counterparty_library" : "document.my_company_library";
        $scope.pages = $scope.urlInves ? "document.my_counterparty_codex" : "document.my_company_codex";

        if ($scope.prepare) {
            SWBrijj.tblm('account.user_settings', ["knows_sharing"]).then(function(data) {
                if (!data[0].knows_sharing) {
                    $scope.helpModalUp();
                    $scope.imageProcessedModal = false;
                }
            });
        }

        $scope.getData = function() {
            var flag = !isNaN(parseInt($scope.urlInves));
            if ($scope.docKey || flag) {
                var field = "original";
                var tempdocid = $scope.docKey;
                if (flag) {
                    field = "doc_id";
                    tempdocid = parseInt($scope.urlInves);
                }
                SWBrijj.tblmm("document.my_counterparty_library", field, tempdocid).then(function(data) {
                    if ($scope.counterparty) {
                        if (flag) {
                            $scope.version = data[0];
                            $scope.getVersion(data[0]);
                            return;
                        }
                        else {
                            for (var i = 0; i < data.length; i++) {
                                var doc = data[i];
                                if (doc.investor == $scope.urlInves) {
                                    $scope.version = doc;
                                    $scope.getVersion(doc);
                                    return;
                                }
                            }
                        }
                    } else {
                        $scope.getOriginal();
                    }
                });
            }
        };

        $scope.getData();

        $scope.getVersion = function(doc) {
            /** @name doc#doc_id
             * @type {number} */
            /** @name doc#signature_deadline
             * @type {Date} */
            $scope.docId = doc.doc_id;
            $scope.library = "document.my_counterparty_library";
            $scope.pages = "document.my_counterparty_codex";

            var z = $location.search();
            z.investor = doc.investor;
            z.page = 1;
            $location.search(z);
            $scope.initDocView();
        };

        $scope.getOriginal = function() {
            $scope.counterparty = false;
            $scope.docId = $scope.docKey;
            $scope.library = "document.my_company_library";
            $scope.pages = "document.my_company_codex";
            var z = $location.search();
            delete z['investor'];
            z.page = 1;
            $location.search(z);
            $scope.initDocView();

            $scope.checkProcessing();
        };

        $scope.checkProcessing = function() {
            if ($scope.tourModal)
                return; //don't step on other modal's toes
            SWBrijj.tblm("document.my_company_library", ["processing_approved"], "doc_id", $scope.docId).then(function (data)
            {
                var approved = data.processing_approved;
                if (!approved)
                {
                    $scope.imageProcessedModal = true;
                    $scope.getProcessedPage();
                }
            });
        }

        $scope.initDocView = function() {
            $scope.$broadcast('initDocView', $scope.docId, $scope.invq, $scope.library, $scope.pageQueryString(), $scope.pages);
        };

        $scope.processedClose = function(erase) {
            $scope.imageProcessedModal = false;
            if (erase)
            {
                SWBrijj.procm("document.undo_processing", $scope.docId).then(function(data)
                {
                    $scope.$broadcast('refreshDocImage');
                }).except(function(data)
                {
                    console.log(data);
                });
            }
            else
            {
                SWBrijj.procm("document.approve_processing", $scope.docId).then(function(data)
                {;}).except(function(data)
                {
                    console.log(data);
                });
            }
        };

        $scope.pageQueryString = function() {
            return "id=" + $scope.docId + "&investor=" + $scope.invq + "&counterparty=" + $scope.counterparty;
        };

        $scope.getProcessedPage = function() {
            SWBrijj.procm("document.get_first_processed", $scope.docId).then(function(data) {
                var d = data[0].get_first_processed;
                if (!d)
                {
                    $scope.processedClose(false);
                }
                else
                {
                    $scope.pageForModal = d;
                    $scope.setProcessedImages();
                }
            });
        };

        $scope.setProcessedImages = function() {
            var original = document.getElementById("processedModalOriginalImage");
            var adjusted = document.getElementById("processedModalAdjustedImage");
            original.src = "/photo/docpg?" + $scope.pageQueryString() + "&page=" + $scope.pageForModal + "&thumb=true&original=true";
            original.width = 115;
            adjusted.src = "/photo/docpg?" + $scope.pageQueryString() + "&page=" + $scope.pageForModal + "&thumb=true";
            adjusted.width = "115";
        };

        $scope.fakeSign = function(cd) {
            /** @name SWBrijj#spoof_procm
             * @function
             * @param {string} investor
             * @param {string} company
             * @param {string} procname
             * @param {...*}
             */
            SWBrijj.spoof_procm(cd.investor, cd.company, "investor", "document.sign_document", cd.doc_id, "[]").then(function(data) {
                cd.when_signed = data;
                $route.reload();
            });
        };

        $scope.loadDocumentActivity = function() {
            SWBrijj.tblmm("document.company_activity", "doc_id", $scope.version.doc_id).then(function(data) {
                $scope.version.last_event = data.sort($scope.compareEvents)[0];
                var versionViews = data.filter(function(el) {return el.person===$scope.version.investor && el.activity==='viewed';});
                $scope.version.last_viewed = versionViews.length > 0 ? versionViews[0].event_time : null;
            });
        };

        $scope.$on("reqVersionStatus", function(event, doc_id) {
            $scope.$broadcast("retVersionStatus", $scope.versionStatus($scope.version));
        });

        $scope.versionStatus = function(version) {
            if (version && version.last_event) {
                return "" + version.last_event.activity +
                       " by " + (version.last_event.name || version.investor) +
                       " " + moment(version.last_event.event_time).from($rootScope.servertime);
            } else {
                return "";
            }
        };

        $scope.compareEvents = function(a, b) {
              var initRank = $scope.eventRank(b) - $scope.eventRank(a);
              return initRank === 0 ? (b.event_time - a.event_time) : initRank;
        };

        $scope.setVersionStatusRank = function(version) {
            version.statusRank = $scope.eventRank(version.last_event);
        };

        $scope.eventRank = function (ev) {
            return basics.eventRank(ev);
        };

        $scope.leave = function() {
            if ($rootScope.lastPage
                && ($rootScope.lastPage.indexOf("/register/") === -1)
                && ($rootScope.lastPage.indexOf("/login/") === -1)
                && ($rootScope.lastPage.indexOf("-view") === -1)) {
                if ($rootScope.lastPage.indexOf("company-status") !== -1) {
                    $rootScope.lastPage = $rootScope.lastPage + "?doc=" + $scope.docId;
                }
                $location.url($rootScope.lastPage);
            } else if ($scope.invq) {
                $location.url('/documents/investor-list');
            } else {
                $location.url('/documents/company-list');
            }
        };
        $scope.$on('countersignAction', function(evt, data) {
            $scope.countersignAction(data);
        });
        $scope.countersignAction = function(data) {
            if (data[0] === 1) {
                $scope.countersignDocument();
            } else if (data[0] === -1) {
                $scope.rejectSignature(data[1]);
            }
        };

        $scope.countersignDocument = function() {
            $scope.processing = true;
            var dce = angular.element(".docPanel").scope();
            SWBrijj.document_countersign( $scope.docId, JSON.stringify(Annotations.getIssuerNotesForUpload($scope.docId))).then(function(data) {
                dce.removeAllNotes();
                // can't reload directly because of the modal -- need to pause for the modal to come down.
                $scope.$emit('refreshDocImage');
                $scope.$emit("notification:success", "Document countersigned");
                $scope.leave();
                //$location.path('/company-list').search({});
            }).except(function(x) {
                console.log(x);
                $scope.processing = false;
                $scope.$emit("notification:fail", "Oops, something went wrong.");
            });
        };

        $scope.$on('finalizeAction', function(evt, data) {
            $scope.finalizeAction(data);
        });
        $scope.finalizeAction = function(data) {
            if (data[0] === 1) {
                $scope.finalizeDocument();
            } else if (data[0] === -1) {
                $scope.rejectSignature(data[1]);
            }
        };
        $scope.finalizeDocument = function() {
            $scope.processing = true;
            SWBrijj.document_issuer_finalize($scope.docId).then(function(data) {
                $rootScope.billing.usage.documents_total += 1;
                $scope.$emit('refreshDocImage');
                $scope.$emit("notification:success", "Document approved");
                $scope.leave();
                //$location.path('/company-list').search({});
            }).except(function(x) {
                console.log(x);
                $scope.$emit("notification:fail", "Oops, something went wrong.");
                $scope.processing = false;
            });
        };
        $scope.rejectSignature = function(msg) {
            $scope.processing = true;
            if (msg === "Explain the reason for rejecting this document.") {
                msg = "";
            }
            SWBrijj.procm("document.reject_signature", $scope.docId, msg).then(function(data) {
                void(data);
                $scope.$emit("notification:success", "Document signature rejected.");
                $scope.$broadcast('rejectSignature');
                $scope.leave();
                //$location.path('/company-list').search({});
            }).except(function(x) {
                void(x);
                $scope.$emit("notification:fail", "Oops, something went wrong.");
            });
        };

        $scope.remind = function(doc_id, user_email) {
            /* TODO
            SWBrijj.procm("document.remind", version.doc_id, version.investor).then(function(data) {
                $scope.emit('event:remind');
            });
            */
        };

        $scope.drawTime = function() {
            return $scope.$$childTail.isAnnotable && $scope.$$childTail.lib && ((!$scope.$$childTail.lib.when_shared && $rootScope.navState.role == "issuer") || (!$scope.$$childTail.lib.when_signed && $rootScope.navState.role == "investor"));
        };

        $scope.tabs = [{title: "Annotations", content: "<annotation-list doc-id='docId'></annotation-list>"}]; // TODO: "content" key doesn't work with directives
        $scope.activeTab = {};
    }
]);
