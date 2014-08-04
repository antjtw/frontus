'use strict';
app.controller('CompContactCtrl',
    ['$scope', '$rootScope', 'SWBrijj', 'navState', '$routeParams',
        'payments', '$route', '$filter', '$location', '$http',
        function($scope, $rootScope, SWBrijj, navState, $routeParams,
                 payments, $route, $filter, $location, $http) {
            if (navState.role === 'investor') {
                document.location.href = "/app/home";
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
            $scope.usagetips = {documents_total: "A document is any item that is uploaded to Sharewave, as well as any document signed and executed via Sharewave. However, inviting people to view a document is limitless.",
                admins_total: "Admins are users with permission to edit company data, which includes the ability to edit your cap table and sign documents on your company's behalf.",
                direct_messages_monthly: "A one-way email message to a person or group of people, ideal for sending company information while keeping your personal inbox clean.",
                plan_not_available: "You have exceeded one or more of the usage limits for this plan."};

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
                    'cname': angular.copy($scope.cname),
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
                        editcompany.cname, editcompany.address,
                        editcompany.city, editcompany.state,
                        editcompany.zipcode
                    ).then(function(x) {
                        void(x);
                        if ($scope.files) {
                            $scope.uploadFile();
                        }
                        $scope.$emit("notification:success", "Company profile successfully updated.");
                        $scope.cname = editcompany.cname;
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
                $scope.cname = angular.copy($scope.name);
                delete $scope.name;
                $scope.cnamekey = $scope.cname;
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

            $scope.paymentPlanModalOpen = function() {
                $scope.paymentPlanModal = true;
            };
            $scope.paymentPlanModalClose = function() {
                $scope.paymentPlanModal = false;
            };
            $scope.paymentPlanModalFieldCheck = function() {
                return !($rootScope.selectedPlan &&
                    $rootScope.selectedPlan != $rootScope.billing.currentPlan);
            };
            $scope.ccModalOpen = function() {
                $scope.ccModal = true;
            };
            $scope.ccModalClose = function() {
                $scope.ccModal = false;
            };
            $scope.ccModalFieldCheck = function() {
                var fs = angular.element('form[name="updateCCForm"]').scope();
                return fs && !(fs.name && fs.number && fs.expiry && fs.cvc);
            };
            $scope.initPaymentModalOpen = function() {
                $scope.initPaymentModal = true;
            };
            $scope.initPaymentModalClose = function() {
                $scope.initPaymentModal = false;
            };
            $scope.initPaymentModalFieldCheck = function() {
                var fs = angular.element('form[name="initPaymentForm"]').scope();
                return fs && !(fs.name && fs.number && fs.expiry && fs.cvc &&
                    $rootScope.selectedPlan);
            };
            $scope.cancelSubscriptionModalOpen = function() {
                $scope.cancelSubscriptionModal = true;
            };
            $scope.cancelSubscription = function() {
                $rootScope.selectedPlan = 'cancel';
                $scope.updateSubscription();
                $scope.cancelSubscriptionModalClose();

            };
            $scope.cancelSubscriptionModalClose = function() {
                $scope.cancelSubscriptionModal = false;
            };
            $scope.reactivateSubscriptionModalOpen = function() {
                $scope.reactivateSubscriptionModal = true;
            };
            $scope.reactivateSubscription = function() {
                $rootScope.selectedPlan = 'reactivate';
                $scope.updateSubscription();
                $scope.reactivateSubscriptionModalClose();
            };
            $scope.reactivateSubscriptionModalClose = function() {
                $scope.reactivateSubscriptionModal = false;
            };

            $scope.toggleCoupon = function() {
                $scope.enter_coupon = !$scope.enter_coupon;
            };
            $scope.getPaymentToken = function(status, response) {
                if (!$scope.initPaymentModal) return;
                //_kmq.push(['record', 'Subscription Submitted - Existing Customer']);
                if (response.error) {
                    console.log(response);
                    $scope.$emit("notification:fail",
                        "Invalid credit card. Please try again.");
                    //_kmq.push(['record', 'Subscription Submitted - Invalid Credit Card']);
                } else {
                    $scope.payment_token = response.id;
                    $scope.create_customer($scope.payment_token,
                        $rootScope.selectedPlan);
                }
            };
            $scope.updatePayment = function(status, response) {
                if (!$scope.ccModal) return;
                if (response.error) {
                    console.log(response);
                    $scope.$emit("notification:fail",
                        "Invalid credit card. Please try again.");
                } else {
                    if ($rootScope.billing.last_status == 'cancel') {
                        $scope.$emit("notification:fail",
                            "Oops, please reactivate your subscription before making other updates.");
                    }
                    $rootScope.billing.payment_token = response.id;
                    if ($rootScope.billing.customer_id) {
                        payments.update_payment($rootScope.billing.payment_token)
                            .then(function(x) {
                                if (x[1][0] !== 1) {
                                    $scope.$emit("notification:fail",
                                        "Oops, something went wrong. Please try again.");
                                } else {
                                    $scope.$emit("notification:success",
                                        "Processing new credit card");
                                    $scope.ccModalClose();
                                }
                            }).except(function(err) {
                                console.log(err);
                            });
                    } else {
                        $scope.$emit("notification:success",
                            "Credit Card Verified");
                        $scope.ccModalClose();
                    }
                }
            };
            $scope.updateSubscription = function() {
                var newplan = $rootScope.selectedPlan;
                if (newplan == "cancel") {
                    //_kmq.push(['record', 'Subscription Cancelled']);
                } else {
                    //_kmq.push(['record', 'Subscription Modified']);
                }
                payments.update_subscription(newplan)
                    .then(function(x) {
                        if (x[1][0] !== 1) {
                            $scope.$emit("notification:fail",
                                "Oops, please try again.");
                        } else if ($rootScope.selectedPlan=='cancel') {
                            $rootScope.billing.last_status = 'cancel';
                            $scope.$emit("notification:success",
                                "Subscription cancelled");
                        } else if ($rootScope.selectedPlan=='reactivate') {
                            $rootScope.billing.last_status = 'reactivate';
                            $scope.$emit("notification:success",
                                "Subscription reactivated");
                        } else {
                            $scope.$emit("notification:success",
                                "Payment plan update submitted.");
                            $rootScope.billing.currentPlan = $rootScope.selectedPlan;
                            $rootScope.get_hypothetical_usage_details($rootScope.selectedPlan);
                        }
                    }).except(function(err) {
                        $scope.$emit("notification:fail",
                            "Oops, please try again.");
                    });
            };
            $scope.create_customer = function(newcc, newplan) {
                payments.create_customer(newplan, newcc)
                    .then(function(data) {
                        if (data.length==2) {
                            $location.url("/app/home/company");
                            $scope.$emit("notification:success",
                                "Processing billing information");
                            $scope.initPaymentModalClose();
                            $rootScope.persistentNotification = false;
                        } else {
                            $scope.$emit("notification:fail",
                                "Oops, something went wrong. Please try again.");
                        }
                    }).except(function(err) {
                        console.log(err);
                    });
            };
            $scope.showSelectedPlan = function(p) {
                if (p == $rootScope.billing.currentPlan && p == "000") {
                    return "Subscription Cancelled";
                } else {
                    return $filter('billingPlans')(p);
                }
            };
            $scope.openModalsFromURL = function() {
                if ($routeParams.coupon) {
                    $rootScope.billing.coupon_code = $routeParams.coupon;
                    $scope.toggleCoupon();
                }
                if ($routeParams.setup) {
                    $scope.initPaymentModalOpen();
                } else if ($rootScope.billing.customer_id
                    && $rootScope.billing.coupon_code) {
                    $scope.ccModalOpen();
                }
            };
            $scope.startOauth = function(svc) {
                SWBrijj.start_oauth(svc).then(function(x) {
                    document.domain = "sharewave.com";
                    window.oauthSuccessCallback = function(x){
                        console.log("success");
                        $rootScope.access_token = 1;
                        $scope.$apply();
                        $rootScope.$emit("notification:success", "Linked to Dropbox");
                    };
                    window.open(x);
                    console.log(x);
                }).except(function(x) {
                    console.log(x);
                    $scope.response = x;
                });
            };
            
            $scope.exportAllToDropbox = function() {
                SWBrijj.document_dropbox_export_all().then(function(x) {
                    $scope.$emit("notification:success", "Successfully Exported to Dropbox");
                }).except(function(x) {
                    $scope.response = x;
                    console.log(x);
                });
                $scope.$emit("notification:success", "Starting Export . . .");
            };
            
            $scope.exportCaptableToDropbox = function() {
                SWBrijj.document_dropbox_export_captable().then(function(x) {
                    $scope.$emit("notification:success", "Successfully Exported to Dropbox");
                }).except(function(x) {
                    $scope.response = x;
                    console.log(x);
                });
                $scope.$emit("notification:success", "Starting Export . . .");
            };
            
            $rootScope.$on('billingLoaded', function(x) {
                $scope.openModalsFromURL();
            });
            if ($rootScope.selectedPlan) $scope.openModalsFromURL();
        }
    ]);
app.controller('InvoiceCtrl',
    ['$scope', '$rootScope', 'SWBrijj', 'payments',
        '$routeParams', '$location', 'navState',
        function($scope, $rootScope, SWBrijj, payments,
                 $routeParams, $location, navState) {

            if (!$routeParams.id) $location.url('/app/company/profile');
            if (navState.role == 'investor') $location.url('/home');

            payments.my_data().then(function(x) {
                payments.get_invoices(x[0].customer_id, 100).then(function(x) {
                    var matches = JSON.parse(x).data.filter(function(el) {
                        return el.id == $routeParams.id;
                    });
                    if (matches.length == 1) {
                        $scope.invoice = matches[0];
                    } else {
                        console.log("here");
                        //$location.url('/app/company/profile');
                    }
                });
            });
            SWBrijj.tbl('account.my_company').then(function(x) {
                initPage($scope, x);
                $scope.cname = angular.copy($scope.name);
                delete $scope.name;
                $scope.cnamekey = $scope.cname;
                $scope.companykey = $scope.company;
                $scope.dateformat = ($scope.dateformat == 'MM/dd/yyyy') ? 'MM/DD/YYYY' : 'DD/MM/YYYY';
                $scope.photoURL = '/photo/user?id=company:' + $scope.company;
                angular.forEach($scope.currencies, function(c) {
                    if (c.indexOf($scope.currency) !== -1) {
                        $scope.longcurrency = c;
                    }
                });
            }).except(initFail);
            $scope.amountPaid = function() {
                if (!$scope.invoice) return 0;
                if ($scope.invoice.paid) {
                    return $scope.invoice.total;
                } else {
                    return 0;
                }
            };
            $scope.print = function() {
                window.print();
            };
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
        }
    ]);

app.controller('PeopleCtrl', ['$scope', '$rootScope', 'SWBrijj', 'navState', '$route', '$location',
    function($scope, $rootScope, SWBrijj, navState, $route, $location) {

        if (navState.role == 'investor') {
            document.location.href = "/home";
            return;
        }
        $scope.sidebarPage = null;
        // $scope.hideRail = false;

        $scope.filterParam = {};
        $scope.oldRoles = [];
        


        angular.element('body').click(function(x) {
            if (angular.element(x.target).is('i') || angular.element(x.target).is('popover')) {
                x.preventDefault();
                return;
            }
            hidePopover();
        });

        $scope.isParam = function(person){
            if($scope.filterParam.param == person.role){
                return person.role
            }
            else if($scope.filterParam.param == undefined){
                return person
            }
            else if(person.groupsArray != undefined && person.groupsArray.indexOf($scope.filterParam.param) > -1){
                return person.groups;
            }
        }


        $scope.createPeople = function(){
            SWBrijj.tblm('global.user_list', ['email', 'name']).then(function(x) {
                $scope.people = x;
                SWBrijj.tblm('account.company_issuers', ['email', 'name']).then(function(admins) {
                    angular.forEach(admins, function(admin) {
                        angular.forEach($scope.people, function(person) {
                            if (person.name) {
                                person.selector = person.name + "  (" + person.email +")";
                            }
                            else {
                                person.selector = "(" + person.email+")";
                            }

                            if (person.email == admin.email) {
                                person.role = "issuer";
                            }
                            else if(person.email != admin.email && person.role != 'issuer'){
                                person.role = "investor";
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
                        $scope.setGroups();
                        // $scope.setGroups();
                        // $scope.resetFilter();
                    });
                    $scope.sort = 'name';
                });
                $scope.allPeople = $scope.people;
            });

        };
        $scope.createPeople();



        $scope.resetFilter = function(){
            $scope.filterParam.param = undefined;
        }
        $scope.allGroups = function(){
            SWBrijj.tblm('account.my_user_groups', ['json_array_elements']).then(function(data){
                $scope.myGroups = data;
                console.log($scope.myGroups);
            });
        };

        $scope.setGroups = function(){
            SWBrijj.tblm('account.my_user_role', ["email", "groups"]).then(function(data){
                var groups = data;
                angular.forEach($scope.people, function(person){
                    angular.forEach(groups, function(group){
                        if(group.email == person.email && group.groups !== null){
                            var gr = JSON.parse(group.groups);
                            var grSorted = gr.sort(function(a, b){
                                if (a.toLowerCase() > b.toLowerCase()) return 1; 
                                 else if (a.toLowerCase() < b.toLowerCase()) return -1; 
                                else return 0
                            });
                            person.groups = grSorted.join(", ");
                            person.groupsArray = JSON.parse(group.groups);
                        };
                    });
                    
                });
            });
        }



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
            link = (person.name ? ((navState.userid != person.email) ? '/app/company/profile/view?id=' + encodeURIComponent(person.email) : '/app/account/profile/') : '');
            if (link) {
                $location.url(link);
            }
        };

        $scope.loadPage = function(){
            // $scope.createPeople();
            $scope.setLastLogins();
            $scope.resetFilter();
        }
        $scope.loadPage();

        // Admin Modal Functions

        $scope.adminModalOpen = function() {
            $scope.newEmail = "";
            $scope.newName = "";
            $scope.newRole = false;
            $scope.adminModal = true;
        };


        $scope.sortRolesForAdd = function(people){
            angular.forEach(people, function(ind){
                if(ind.email === $scope.navState.userid){
                   console.log("you must stay where you are")
                }
                else if(ind.email !== $scope.navState.userid && $scope.oldRoles.indexOf(ind.role)=== -1){
                    $scope.oldRoles.push(ind.role)
                };
                
            });
        };

        $scope.addOrRemoveAdmin = function(people){
            $scope.sortRolesForAdd(people);
            if($scope.oldRoles.length === 1){
                $scope.addOrRemove = $scope.oldRoles[0];
            }
            else{
                $scope.addOrRemove = ""
            }
            $scope.oldRoles = [];
        };

       

        $scope.adminModalClose = function() {
            $scope.closeMsg = 'I was closed at: ' + new Date();
            $scope.adminModal = false;
        };


        $scope.removeAdminModalOpen = function(ppl) {
            $scope.selectedToRevokes = [];
            angular.forEach(ppl, function(ind){
                if(ind.email !== $scope.navState.userid && $scope.selectedToRevokes.indexOf(ind.email)== -1){ 
                    $scope.selectedToRevokes.push(ind.email);
                }
                else if($scope.navState.userid==ind.email){
                    console.log("error!")
                };
                
            });
            $scope.removeAdminModal = true;
        
        };


        $scope.removeAdminModalClose = function() {
            $scope.removeAdminModal = false;
            $scope.clearArray($scope.groupPeople);
            $scope.clearArray($scope.oldRoles);
        };

        $scope.removeAdminModalCancel = function(){
            $scope.removeAdminModal = false;
        }

        $scope.addAdminModalOpen = function(person) {
            $scope.selectedToAdds = [];
            angular.forEach(person, function(ind){
                if(ind.email !== $scope.navState.userid){
                    $scope.selectedToAdds.push(ind.email);
                };
            });
            $scope.addAdminModal = true;

        };


        $scope.addAdminModalClose = function() {
            $scope.addAdminModal = false;
            $scope.clearArray($scope.groupPeople);
            $scope.clearArray($scope.oldRoles);

        };

        $scope.addAdminModalCancel = function(){
            $scope.addAdminModal = false;
           
        }
        
        //want the email directive to bind to this property in the controller
        $scope.personIs = function(person){
            if($scope.sidebarPage=='email'){
                return $scope.messageData.recipients.indexOf(person.email) != -1;
            }
            else {
                return $scope.groupPeople.indexOf(person) != -1;
               
            };
            
        };




        $scope.clearRecipient = function(){
            while($scope.messageData.recipients.length > 0) {
                $scope.messageData.recipients.pop();
            };
        };
      
        // add person to dropdown on people page

        $scope.emailRecipients = function(person){
            if ($scope.messageData.recipients.indexOf(person.email)=== -1){
                    $scope.messageData.recipients.push(person.email);             
             }
            else {
                var toDelete = $scope.messageData.recipients.indexOf(person.email)
                $scope.messageData.recipients.splice(toDelete, 1);
             };   
            return $scope.messageData.recipients;
            console.log($scope.messageData.recipients)
        }; 

        $scope.selectPerson = function(person){
            if($scope.sidebarPage == 'email'){
                if ($scope.messageData.recipients.indexOf(person.email)=== -1){
                 $scope.messageData.recipients.push(person.email);
                 
                 }

                else {
                    var toDelete = $scope.messageData.recipients.indexOf(person.email)
                    $scope.messageData.recipients.splice(toDelete, 1);
                 };   
                return $scope.messageData.recipients;
            }
            else {
                if($scope.groupPeople.indexOf(person)=== -1){
                    $scope.groupPeople.push(person);
                }
                else {
                    var toDelete = $scope.groupPeople.indexOf(person)
                    $scope.groupPeople.splice(toDelete, 1);
                };
            };
            console.log($scope.groupPeople);
            
        };
        
        $scope.messageData = {};
        $scope.messageData.recipients = [];
        $scope.groupPeople = []


        $scope.narrowopts = {
            backdropFade: true,
            dialogFade: true,
            dialogClass: 'narrowModal modal'
        };


        $scope.revoke_admin = function() {
            angular.forEach($scope.selectedToRevokes, function(elem){
                SWBrijj.proc('account.revoke_admin', elem, navState.company).then(function(x) {
                    void(x);
                    $rootScope.billing.usage.admins_total -= 1;
                    $scope.$emit("notification:success", "Admin Removed");
                    // console.log()
                    // $route.reload();
                }).except(function(x) {
                    void(x);
                    $scope.$emit("notification:fail", "Something went wrong, please try again later.");
                });

            });
            $scope.createPeople();
            // $scope.oldRoles = [];
            
        };

        $scope.clearArray = function(array){
                while(array.length > 0){
                    array.pop();
                }
            }

        $scope.add_admin = function() {
            angular.forEach($scope.selectedToAdds, function(elem){
                 SWBrijj.proc('account.create_admin', elem.toLowerCase()).then(function(x) {
                    void(x);
                    $rootScope.billing.usage.admins_total += 1;
                    $scope.$emit("notification:success", "Admin Added");
                }).except(function(x) {
                    void(x);
                    $scope.$emit("notification:fail", "Something went wrong, please try again later.");
                });
            }); 
        $scope.createPeople();
        };

   

        // email sidebar
        $scope.toggleSide = function(button) {
            if(button == $scope.sidebarPage){
                $scope.sidebarPage = false;
            }
            else if(button){
                $scope.sidebarPage = button;
            }
            else if(button == undefined){
                $scope.sidebarPage = false;
            }
            else {
                $scope.sidebarPage = button;
                // opens sidebar with email
            };
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
                $scope.getCompanyAccess();
            }).except(function(err) {
                    console.log(err);
                });
        };

        $scope.activityFeed = "global.get_company_activity";
        $scope.activityFeedFilter = "email";
        $scope.activityFeedFilterVal = userId;

        $scope.getDocumentActivity = function() {
            SWBrijj.tblmm("document.company_activity", "person", $scope.user.email).then(function(data) {
                $scope.setDocsLastEvent(data);
            }).except(function(err) {
                });
        };
        $scope.setDocsLastEvent = function(activityfeed) {
            angular.forEach($scope.docs, function(doc) {
                //TODO This is not working currently - commented out to stop the errors occuring
                var version_activity = activityfeed.filter(function(el) {
                    return el.doc_id === doc.doc_id;
                });
                doc.last_event = version_activity.sort($scope.compareEvents)[0];
                /*if (doc.last_event.activity === 'finalized') {
                    doc.last_event.activity = 'approved';
                }
                $scope.setStatusRank(doc);
                 */
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

app.filter('interval', function() {
    return function(word) {
        switch(word) {
            case "day":
                return "daily";
            case "week":
                return "weekly";
            case "month":
                return "monthly";
            case "year":
                return "annually";
            default:
                return null;
        }
    };
});

app.filter('billingPlans', function() {
    return function(plan) {
        switch (plan) {
            case '000':
                return "Cancel Subscription";
            case '001':
                return "Seed ($9 / month)";
            case '002':
                return "Startup ($29 / month)";
            case '003':
                return "Growth ($99 / month)";
            case '004':
                return "Established ($199 / month)";
            default:
                return "Unknown Plan";
        }
    };
});
app.filter('billingPlansNameOnly', function() {
    return function(plan) {
        switch (plan) {
            case '000':
                return "Cancel Subscription";
            case '001':
                return "Seed";
            case '002':
                return "Startup";
            case '003':
                return "Growth";
            case '004':
                return "Established";
            default:
                return "Unknown Plan";
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
