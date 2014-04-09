app.controller('CompContactCtrl',
        ['$scope', '$rootScope', 'SWBrijj', 'navState',
         'payments', '$route', '$filter',
    function($scope, $rootScope, SWBrijj, navState,
             payments, $route, $filter) {
        if (navState.role == 'investor') {
            document.location.href = "/home";
            return;
        }
        $scope.statelist = ['Alabama', 'Alaska', 'Arizona', 'Arkansas', 'California', 'Colorado', 'Connecticut', 'Delaware', 'Florida', 'Georgia', 'Hawaii', 'Idaho', 'Illinois', 'Indiana', 'Iowa', 'Kansas', 'Kentucky', 'Louisiana', 'Maine', 'Maryland', 'Massachusetts', 'Michigan', 'Minnesota', 'Mississippi', 'Missouri', 'Montana', 'Nebraska', 'Nevada', 'New Hampshire', 'New Jersey', 'New Mexico', 'New York', 'North Carolina', 'North Dakota', 'Ohio', 'Oklahoma', 'Oregon', 'Pennsylvania', 'Rhode Island', 'South Carolina', 'South Dakota', 'Tennessee', 'Texas', 'Utah', 'Vermont', 'Virginia', 'Washington', 'West Virginia', 'Wisconsin', 'Wyoming'];
        $scope.currencies = ['United States Dollars (USD)', 'Pound Sterling (GBP)', 'Euro (EUR)'];
        $scope.dateformats = ['MM/DD/YYYY', 'DD/MM/YYYY'];
        $scope.address1 = function() {
            return $scope.address;
        };
        $scope.address2 = function() {
            if ($scope.city && $scope.state && $scope.zipcode) {
                return $scope.city + ", " + $scope.state + " " + $scope.zipcode;
            } else if ($scope.city || $scope.state) {
                return ($scope.city || "") + ($scope.state || "") + " " + ($scope.zipcode || "");
            } else if ($scope.zipcode) {
                return $scope.zipcode;
            } else {
                return null;
            }
        };
        $scope.usagetips = {documents_total: "What is this about documents?",
                            admins_total: "What is this about admins?",
                            direct_messages_monthly: "What is this about limits?"};

        $scope.pictureModalOpen = function() {
            $scope.pictureModal = true;
        };

        $scope.pictureModalClose = function() {
            $scope.files = [];
            $scope.closeMsg = 'I was closed at: ' + new Date();
            $scope.pictureModal = false;
        };
        $scope.profileModalOpen = function() {
            $scope.profileModal = true;
            $scope.editcompany = {
                'name': angular.copy($scope.name),
                'address': angular.copy($scope.address),
                'city': angular.copy($scope.city),
                'state': angular.copy($scope.state),
                'zipcode': angular.copy($scope.zipcode)
            };
        };

        $scope.profileModalClose = function() {
            $scope.profileModal = false;
            $scope.editcompany = null;
        };

        $scope.profileopts = {
            backdropFade: true,
            dialogFade: true,
            dialogClass: 'profile-modal wideModal modal'
        };
        $scope.paymentopts = {
            backdropFade: true,
            dialogFade: true,
            dialogClass: 'payment-modal modal'
        };

        $scope.profileUpdate = function(editcompany) {
            SWBrijj.proc("account.company_update",
                         editcompany.name, editcompany.address,
                         editcompany.city, editcompany.state,
                         editcompany.zipcode
            ).then(function(x) {
                void(x);
                if ($scope.files) {
                    $scope.uploadFile();
                }
                $scope.$emit("notification:success", "Company profile successfully updated.");
                $scope.name = editcompany.name;
                $scope.address = editcompany.address;
                $scope.city = editcompany.city;
                $scope.state = editcompany.state;
                $scope.zipcode = editcompany.zipcode;
            }).except(function(x) {
                void(x);
                $scope.$emit("notification:fail", "There was an error updating your company profile.");
            });
        };
        $scope.settingModalOpen = function() {
            $scope.settingModal = true;
            $scope.editcompany = {'currency': angular.copy($scope.currency),
                                  'longcurrency': angular.copy($scope.longcurrency),
                                  'dateformat': angular.copy($scope.dateformat)};
        };

        $scope.settingModalClose = function() {
            $scope.settingModal = false;
            $scope.editcompany = null;
        };

        $scope.setCurrency = function(currency) {
            $scope.editcompany.longcurrency = currency;
            $scope.editcompany.currency = currency.match(/\(...\)/)[0].substring(1, 4);
        };

        $scope.setDateFormat = function(dateformat) {
            $scope.editcompany.dateformat = dateformat;
        };

        $scope.saveSettings = function(company) {
            var dateformat = company.dateformat == 'MM/DD/YYYY' ? 'MM/dd/yyyy' : 'dd/MM/yyyy';
            SWBrijj.proc("account.company_settings_update", company.currency, dateformat).then(function(x) {
                void(x);
                $scope.$emit("notification:success", "Company settings successfully updated.");
                $scope.longcurrency = company.longcurrency;
                $scope.currency = company.currency;
                $scope.dateformat = company.dateformat;
            }).except(function(x) {
                void(x);
                $scope.$emit("notification:fail", "There was an error updating your company settings.");
            });
        };

        $scope.narrowopts = {
            backdropFade: true,
            dialogFade: true,
            dialogClass: 'narrowModal modal'
        };

        SWBrijj.tbl('account.my_company').then(function(x) {
            initPage($scope, x);
            $scope.namekey = $scope.name;
            $scope.companykey = $scope.company;
            $scope.dateformat = ($scope.dateformat == 'MM/dd/yyyy') ? 'MM/DD/YYYY' : 'DD/MM/YYYY';
            $scope.photoURL = '/photo/user?id=company:' + $scope.company;
            angular.forEach($scope.currencies, function(c) {
               if (c.indexOf($scope.currency) !== -1) {
                   $scope.longcurrency = c;
               }
            });
        }).except(initFail);


        $scope.uploadFile = function() {
            $scope.photoURL = "/img/image-loader-140.gif";
            var fd = new FormData();
            for (var i = 0; i < $scope.files.length; i++) fd.append("uploadedFile", $scope.files[i]);
            SWBrijj.uploadLogo(fd).then(function(x) {
                void(x);
                $scope.photoURL = '/photo/user?id=company:' + $scope.company;
                $scope.$emit("notification:success", "Company logo successfully updated");
            }).except(function(x) {
                void(x);
                $scope.$emit("notification:fail", "Company logo change was unsuccessful, please try again.");
                $scope.photoURL = '/photo/user?id=company:' + $scope.company;
            });
        };

        $scope.setFiles = function(element) {
            $scope.files = [];
            for (var i = 0; i < element.files.length; i++) {
                $scope.files.push(element.files[i]);
                var oFReader = new FileReader();
                oFReader.readAsDataURL($scope.files[0]);

                oFReader.onload = function (oFREvent) {
                    document.getElementById("updateImage").src = oFREvent.target.result;
                };
                $scope.$apply();
            }
        };
        $scope.billing = {};
        $scope.update_card = false;
        SWBrijj.tblm('account.payment_plans', ['plan']).then(function(data) {
           $scope.billing.plans = data; 
        }).except(function(err) {
            console.log(err);
        });
        SWBrijj.tblm('account.my_usage_details').then(function(data) {
            $scope.billing.usage = data;
        });
        SWBrijj.tbl('account.my_company_payment').then(function(data) {
            if (data.length == 2) {
                $scope.billing.currentPlan =
                    $scope.billing.selectedPlan = data[1][3] || '000';
                $scope.billing.customer_id = data[1][1];
                $scope.billing.payment_token = data[1][2];
                $scope.get_customer();
                $scope.load_invoices();
            } else {
                $scope.billing.selectedPlan = '001';
            }
        }).except(function(err) {
            void(err);
        });
        // this swaps the CC data for a stripe card token
        $scope.getPaymentToken = function(status, response) {
            if (response.error) {
                console.log(response);
                $scope.$emit("notification:fail",
                             "Invalid credit card. Please try again.");
            } else {
                $scope.payment_token = response.id;
                $scope.create_customer();
            }
        };
        $scope.showSelectedPlan = function(p) {
            if (p == $scope.billing.currentPlan && p == "000") {
                return "Subscription Cancelled";
            } else {
                return $filter('billingPlans')(p);
            }
        };
        $scope.nextInvoice = function() {
            if ($scope.billing && $scope.billing.next_invoice_received) {
                return $scope.billing.invoices &&
                    $scope.billing.invoices[$scope.billing.invoices.length-1];
            } else {
                return false;
            }
        };

        $scope.updatePayment = function(status, response) {
            if (response.error) {
                console.log(response);
                $scope.$emit("notification:fail",
                             "Invalid credit card. Please try again.");
            } else {
                $scope.billing.payment_token = response.id;
                if ($scope.billing.customer_id) {
                    payments.update_payment($scope.billing.payment_token)
                    .then(function(x) {
                        if (x[1][0] !== 1) {
                            $scope.$emit("notification:fail",
                             "Oops, something went wrong. Please try again.");
                        } else {
                            $scope.$emit("notification:success",
                                         "New Credit Card Submitted");
                        }
                    }).except(function(err) {
                        console.log(err);
                    });
                } else {
                    $scope.$emit("notification:success",
                                 "Credit Card Verified");
                }
            }
        };
        $scope.get_customer = function() {
            payments.get_customer($scope.billing.customer_id)
            .then(function(x) {
                $scope.billing.current_card = x.data.cards.data[0];
            });
        };
        $scope.load_invoices = function() {
            payments.get_invoices($scope.billing.customer_id, 3)
            .then(function(resp) {
                $scope.billing.invoices = resp.data.data;
                if ($scope.billing.currentPlan!=="000") {
                    $scope.load_upcoming_invoice();
                }
            });
        };
        $scope.load_upcoming_invoice = function() {
            payments.get_upcoming_invoice($scope.billing.customer_id)
            .then(function(resp) {
                $scope.billing.invoices.push(resp.data);
                $scope.billing.next_invoice_received = true;
            });
        };
        $scope.selectPlan = function(newplan) {
            $scope.billing.selectedPlan = newplan;
        };
        $scope.updateSubscription = function() {
            var newplan = $scope.billing.selectedPlan;
            payments.update_subscription(newplan,
                    $scope.billing.payment_token)
            .then(function(x) {
                if (x[1][0] !== 1) {
                    $scope.$emit("notification:fail",
                                 "Oops, please try again.");
                } else {
                    $scope.$emit("notification:success",
                                 "Payment plan update submitted.");
                }
            }).except(function(err) {
            });
        };
        $scope.create_customer = function(newcc, newplan) {
            SWBrijj.proc('account.create_customer', newcc, newplan)
            .then(function(data) {
                if (data.length==2) {
                    $scope.$emit("notification:success",
                                 "Billing information submitted");
                    $route.reload();
                } else {
                    $scope.$emit("notification:fail",
                             "Oops, something went wrong. Please try again.");
                }
            }).except(function(err) {
                console.log(err);
            });
        };
        $scope.paymentPlanModalOpen = function() {
            $scope.paymentPlanModal = true;
        };
        $scope.paymentPlanModalClose = function() {
            $scope.paymentPlanModal = false;
        };
        $scope.paymentPlanModalFieldCheck = function() {
            return $scope.selectedPlan && $scope.selectedPlan != $scope.billing.current_plan;
        };
        $scope.ccModalOpen = function() {
            $scope.ccModal = true;
        };
        $scope.ccModalClose = function() {
            $scope.ccModal = false;
        };
        $scope.ccModalFieldCheck = function() {
            var fs = angular.element('form[name="updateCCForm"]').scope();
            return !(fs.cname && fs.number && fs.expiry && fs.cvc);
        };
        $scope.initPaymentModalOpen = function() {
            $scope.initPaymentModal = true;
        };
        $scope.initPaymentModalClose = function() {
            $scope.initPaymentModal = false;
        };
        $scope.initPaymentModalFieldCheck = function() {
            var fs = angular.element('form[name="initPaymentForm"]').scope();
            return $scope.paymentPlanModalFieldCheck()
                || !(fs.cname && fs.number && fs.expiry && fs.cvc);
        };
    }
]);

app.controller('PeopleCtrl', ['$scope', '$rootScope', 'SWBrijj', 'navState', '$route', '$location',
    function($scope, $rootScope, SWBrijj, navState, $route, $location) {

        if (navState.role == 'investor') {
            document.location.href = "/home";
            return;
        }

        angular.element('body').click(function(x) {
            if (angular.element(x.target).is('i') || angular.element(x.target).is('popover')) {
                x.preventDefault();
                return;
            }
            hidePopover();
        });

        SWBrijj.tblm('global.user_list', ['email', 'name']).then(function(x) {
            $scope.people = x;
            SWBrijj.tblm('account.company_issuers', ['email', 'name']).then(function(admins) {
                angular.forEach(admins, function(admin) {
                    angular.forEach($scope.people, function(person) {
                        if (person.email == admin.email) {
                            person.role = "issuer";
                        }
                    });
                });
                SWBrijj.tblm('account.profile', ['email']).then(function(me) {
                    angular.forEach($scope.people, function(person) {
                        if (person.email == me[0].email)
                            person.hideLock = true;
                        if (!person.name) {
                            person.name = person.email;
                        }

                    });
                    $scope.setLastLogins();
                });
                $scope.sort = 'name';
            });
        });

        $scope.setLastLogins = function() {
            SWBrijj.tblm("global.user_tracker").then(function(logins) {
                angular.forEach($scope.people, function(person) {
                    angular.forEach(logins, function(login) {
                        if (login.email === person.email) {
                            person.lastlogin = login.logintime;
                        }
                    });
                });
            });
        };

        $scope.formatLastLogin = function(lastlogin) {
            return lastlogin ? "Last Login " + moment(lastlogin).fromNow() : "Never Logged In";
        };

        $scope.sortBy = function(col) {
            if ($scope.sort == col) {
                $scope.sort = ('-' + col);
            } else {
                $scope.sort = col;
            }
        };

        $scope.gotoPerson = function(person) {
            if (!person.lastlogin) return;
            var link;
            link = (person.name ? ((navState.userid != person.email) ? '/app/company/profile/view?id=' + person.email : '/app/account/profile/') : '');
            if (link) {
                $location.url(link);
            }
        };

        // Admin Modal Functions

        $scope.adminModalOpen = function() {
            $scope.newEmail = "";
            $scope.newName = "";
            $scope.newRole = false;
            $scope.adminModal = true;
        };

        $scope.adminModalClose = function() {
            $scope.closeMsg = 'I was closed at: ' + new Date();
            $scope.adminModal = false;
        };

        $scope.toggleRole = function() {
            $scope.newRole = !$scope.newRole;
        };

        $scope.removeAdminModalOpen = function(email) {
            $scope.selectedToRevoke = email;
            $scope.removeAdminModal = true;
        };

        $scope.removeAdminModalClose = function() {
            $scope.removeAdminModal = false;
        };

        $scope.addAdminModalOpen = function(email) {
            $scope.selectedToAdd = email;
            $scope.addAdminModal = true;
        };

        $scope.addAdminModalClose = function() {
            $scope.addAdminModal = false;
        };

        $scope.narrowopts = {
            backdropFade: true,
            dialogFade: true,
            dialogClass: 'narrowModal modal'
        };

        $scope.profileopts = {
            backdropFade: true,
            dialogFade: true,
            dialogClass: 'profile-modal wideModal modal'
        };

        var re = /^(([^<>()[\]\\.,;:\s@\"]+(\.[^<>()[\]\\.,;:\s@\"]+)*)|(\".+\"))@((\[[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\])|(([a-zA-Z\-0-9]+\.)+[a-zA-Z]{2,}))$/;
        $scope.fieldCheck = function() {
            return re.test($scope.newEmail);
        };

        $scope.create_person = function() {
            if ($scope.newRole) {
                SWBrijj.proc('account.create_admin', $scope.newEmail.toLowerCase()).then(function(x) {
                    void(x);
                    $scope.$emit("notification:success", "Admin Added");
                    $route.reload();
                }).except(function(x) {
                    void(x);
                    $scope.$emit("notification:fail", "Something went wrong, please try again later.");
                });
            } else {
                SWBrijj.proc('account.create_investor', $scope.newEmail.toLowerCase(), $scope.newName).then(function(x) {
                    void(x);
                    $scope.$emit("notification:success", "Investor Added");
                    $route.reload();
                }).except(function(x) {
                    void(x);
                    $scope.$emit("notification:fail", "Something went wrong, please try again later.");
                });
            }
            $scope.newEmail = "";
        };
        $scope.revoke_admin = function() {
            SWBrijj.proc('account.revoke_admin', $scope.selectedToRevoke, navState.company).then(function(x) {
                void(x);
                $scope.$emit("notification:success", "Admin Removed");
                $route.reload();
            }).except(function(x) {
                void(x);
                $scope.$emit("notification:fail", "Something went wrong, please try again later.");
            });
            $scope.selectedToRevoke = "";
        };

        $scope.add_admin = function() {
            SWBrijj.proc('account.create_admin', $scope.selectedToAdd.toLowerCase()).then(function(x) {
                void(x);
                $scope.$emit("notification:success", "Admin Added");
                $route.reload();
            }).except(function(x) {
                void(x);
                $scope.$emit("notification:fail", "Something went wrong, please try again later.");
            });
        };
    }
]);

app.controller('ViewerCtrl', ['$scope', '$rootScope', '$location', '$routeParams', 'SWBrijj', 'navState',
    function($scope, $rootScope, $location, $routeParams, SWBrijj, navState) {

        if (navState.role == 'investor') {
            document.location.href = "/home";
            return;
        }

        var userId = $routeParams.id;
        $scope.docOrder = 'statusRank';

        SWBrijj.tblm('account.user', ['email']).then(function(x) { // Redirect to My Profile if viewing yourself
            if (x[0].email == userId)
                document.location.href = "/account/profile";
        });

        SWBrijj.tblm('global.user_list', 'email', userId).then(function(x) {
            if (!x.name) {
                history.back();
            }
            $scope.user = x;
            SWBrijj.tblm('account.company_investors', 'email', userId).then(function(x) {
                $scope.user.address1 = x.street;
                $scope.user.address2 = (x.city && x.state && x.postalcode) ? x.city + ", " + x.state + " " + x.postalcode + " " + x.country : null;
            });
            $scope.getCounterpartyLibrary();
        }).except(function(err) {
            void(err);
            history.back();
        });

        $scope.getCounterpartyLibrary = function() {
            SWBrijj.tblmm('document.my_counterparty_library', 'investor', $scope.user.email).then(function(data) {
                $scope.docs = data;
                $scope.getDocumentActivity();
                $scope.getCompanyActivity();
                $scope.getCompanyAccess();
            }).except(function(err) {
                console.log(err);
            });
        };

        $scope.getCompanyActivity = function() {
            SWBrijj.tblmm('global.get_company_activity', 'email', $scope.user.email).then(function(feed) {

                var originalfeed = feed;
                //Generate the groups for the activity feed
                $scope.feed = [];
                angular.forEach(originalfeed, function(event) {
                    if (event.activity != "sent") {
                        event.when = moment(event.time).from(event.timenow);
                        $scope.feed.push(event);
                    }
                });
            }).except(function(err) {
            });
        };
        $scope.getDocumentActivity = function() {
            SWBrijj.tblmm("document.company_activity", "person", $scope.user.email).then(function(data) {
                $scope.setDocsLastEvent(data);
            }).except(function(err) {
            });
        };
        $scope.setDocsLastEvent = function(activityfeed) {
            angular.forEach($scope.docs, function(doc) {
                var version_activity = activityfeed.filter(function(el) {
                    return el.doc_id === doc.doc_id;
                });
                doc.last_event = version_activity.sort($scope.compareEvents)[0];
                if (doc.last_event.activity === 'finalized') {
                    doc.last_event.activity = 'approved';
                }
                $scope.setStatusRank(doc);
            });
        };

        $scope.getCompanyAccess = function() {
            SWBrijj.tblmm('ownership.company_access', ['email', 'level'], 'email', userId).then(function(access) {
                if (access[0]) {
                    $scope.level = access[0].level;
                } else {
                    $scope.level = 'No View';
                }
            }).except(function(err) {
                void(err);
                $scope.level = false;
            });
        };
        $scope.setStatusRank = function(version) {
            version.statusRank = $scope.eventRank(version.last_event);
        };
        $scope.compareEvents = function(a, b) {
            var initRank = $scope.eventRank(b) - $scope.eventRank(a);
            return initRank === 0 ? (b.event_time - a.event_time) : initRank;
        };
        $scope.eventRank = function(ev) {
            switch (ev.activity) {
                case "finalized":
                    return 7;
                case "countersigned":
                    return 6;
                    // signed or rejected can come either before or after each other depending on chronological ordering.
                    // ambiguity is resolve in $scope.compareEvents
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
        $scope.setOrder = function(field) {
            $scope.docOrder = ($scope.docOrder == field) ? '-' + field : field;
        };
        $scope.viewInvestorCopy = function(version) {
            document.location.href = ("/documents/company-view?doc=" + version.original + "&page=1" + "&investor=" + version.doc_id);
        };
        $scope.viewVersionStatus = function(version) {
            document.location.href = "/documents/company-status?doc=" + version.original;
        };

        $scope.activityOrder = function(card) {
            return -card.time;
        };

        SWBrijj.tblmm('global.get_company_activity', 'email', userId).then(function(data) {
            $scope.activity = data;
        });
        $scope.shortStatus = function(version) {
            if (!version) return "";
            if ($scope.wasJustRejected(version) && $scope.lastEventByInvestor(version)) {
                return "Rejected by recipient";
            } else if ($scope.wasJustRejected(version) && !$scope.lastEventByInvestor(version)) {
                return "Rejected by you";
            } else if ($scope.isPendingSignature(version)) {
                return "Sent for Signature";
            } else if ($scope.isPendingCountersignature(version)) {
                return "Review and Sign";
            } else if ($scope.isPendingFinalization(version)) {
                return "Signed and Sent for Approval";
            } else if ($scope.isCompleteSigned(version)) {
                return "Completed";
            } else if ($scope.isPendingView(version)) {
                return "Unviewed";
            } else if ($scope.isCompleteViewed(version)) {
                return "Viewed";
            } else {
                return "Sent";
            }
        };
        $scope.lastEventByInvestor = function(doc) {
            return doc.last_event.person == navState.userid;
        };

        $scope.wasJustRejected = function(doc) {
            return doc.last_event && doc.last_event.activity == 'rejected';
        };
        $scope.isPendingFinalization = function(doc) {
            return (doc.signature_flow===2 && doc.when_countersigned && !doc.when_finalized) ||
                       (doc.signature_flow===1 && doc.when_signed && !doc.when_finalized);
        };

        $scope.isPendingCountersignature = function(doc) {
            return doc.when_signed && !doc.when_countersigned && doc.signature_flow===2;
        };

        $scope.isPendingSignature = function(doc) {
            return doc.signature_flow>0 && !doc.when_signed;
        };

        $scope.isPendingView = function(doc) {
            return doc.signature_flow===0 && !doc.last_viewed;
        };
        $scope.isCompleteSigned = function(version) {
            return version.signature_flow>0 && version.when_finalized;
        };
        $scope.isCompleteViewed = function(version) {
            return version.signature_flow===0 && version.last_viewed;
        };

        $scope.docIsComplete = function(doc) {
            return  $scope.isCompleteSigned(doc) || $scope.isCompleteViewed(doc);
        };

        $scope.momentFromNow = function(date) {
            return moment(date).from($rootScope.servertime);
        };

        $scope.changeVisibility = function(value) {
            $scope.level = value;
            SWBrijj.proc('ownership.update_investor_captable', userId, $scope.level).then(function(data) {
                void(data);
                $scope.$emit("notification:success", "Successfully changed cap table visibility");
            });
        };

    }
]);

app.filter('billingPlans', function() {
    return function(plan) {
        switch (plan) {
            case '000':
                return "Cancel Subscription";
            case '001':
                return "Plan 1";
            case '002':
                return "Plan 2";
            case '003':
                return "Plan 3";
            default:
                return "Error";
        }
    };
});
app.filter('fileLength', function() {
    return function(word) {
        if (word) {
            if (word.length > 25) {
                return word.substring(0, 24) + "..";
            } else {
                return word;
            }
        }
        return word;
    };
});

app.filter('fromNow', function() {
    return function(date) {
        return moment(date).fromNow();
    };
});
app.filter('fromNowSort', function() {
    return function(events) {
        if (events) {
            events.sort(function(a, b) {
                if (a[1] > b[1]) return -1;
                if (a[1] < b[1]) return 1;
                return 0;
            });
        }

        return events;
    };
});

/**
 *
 * @param $scope
 * @param x
 * @param {number} [row]
 */

function initPage($scope, x, row) {
    if (typeof(row) === 'undefined') row = 1;
    var y = x[0]; // the fieldnames
    var z = x[row]; // the values


    for (var i = 0; i < y.length; i++) {
        if (z[i] !== null) {
            $scope[y[i]] = z[i];
        }
    }
}

function initFail() {}

function updated(x) {}
