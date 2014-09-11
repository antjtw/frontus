'use strict';

var service = angular.module('commonServices', ['brijj']);

service.filter('caplength', function () {
    return function (word, length) {
        if (word) {
            if (word.length > length) {
                return word.substring(0, (length-1)) + "...";
            }
            else {
                return word;
            }
        }
    };
});

service.service('payments', function(SWBrijj, $filter) {
    var s = {};
    s.available_plans = function() {
        return SWBrijj.tblm('account.available_payment_plans', ['plan']);
    };
    s.update_subscription = function(newplan) {
        return SWBrijj.proc('account.update_my_plan', newplan);
    };
    s.update_payment = function(newcard) {
        return SWBrijj.proc('account.update_my_cc', newcard);
    };
    s.create_customer = function(newplan, newcard) {
        return SWBrijj.proc('account.create_customer', newplan, newcard);
    };
    s.get_coupon = function(cpn) {
        return SWBrijj.stripeExternal(['get_coupon', cpn]);
    };
    s.get_customer = function(cusid) {
        return SWBrijj.stripe(['get_customer', cusid]);
    };
    s.get_invoices = function(cusid, n) {
        return SWBrijj.stripe(['get_invoices', cusid, n]);
    };
    s.get_upcoming_invoice = function(cusid) {
        return SWBrijj.stripe(['get_upcoming_invoice', cusid]);
    };
    s.format_discount = function(discount) {
        var cpn = discount.coupon;
        var formatted_coupon = "";
        if (cpn.percent_off) {
            formatted_coupon = cpn.percent_off + "% off";
        } else {
            formatted_coupon = $filter('currency')(cpn.amount_off/100, "$") +
                               " off";
        }
        if (discount.end) {
            formatted_coupon += ' until ' +
                                $filter('date')(discount['end']*1000,
                                                'MMMM d, yyyy');
        }
        return formatted_coupon;
    };
    /*
    s.get_coupon = function(cpn) {
        return $http({method: 'GET',
                      url: 'https://api.stripe.com/v1/coupons/'+cpn
        });
    };
    s.get_customer = function(customerid) {
        return $http({method: 'GET',
                      url: 'https://api.stripe.com/v1/customers/'+customerid
        });
    };
    s.get_invoices = function(customerid, n) {
        return $http({method: 'GET',
                      url: 'https://api.stripe.com/v1/invoices',
                      params: {customer: customerid,
                               count: n}
        });
    };
    s.get_upcoming_invoice = function(customerid) {
        return $http({method: 'GET',
                      url: 'https://api.stripe.com/v1/invoices/upcoming',
                      params: {customer: customerid}
        });
    };
    */
    s.usage_details = function() {
        return SWBrijj.tblm('account.my_usage_details');
    };
    s.usage_grid = function(p) {
        return SWBrijj.tblm('account.my_usage_grid', 'plan', p);
    };
    s.my_data = function() {
        return SWBrijj.tblm('account.my_company_payment');
    };


    return s;
});

service.factory('myPayments', function($q, payments) {
    var d = {};
    // TODO these must return promises
    // so where are results accumulated/published?
    var loadPlans = function() {
            return payments
                    .available_plans();
        },
        handlePlans = function(x) {
            var deferred = $q.defer();

            try {
                d.plans = [];
                angular.forEach(x, function(p) {
                    d.plans.push(p.plan);
                });
                d.recommendedPlan = "00" + Math.max(parseInt(d.plans, 10));
                deferred.resolve();
            } catch(e) {
                deferred.reject(e);
            }

            return deferred.promise;
        },
        loadUsage = function() {
            return payments
                    .usage_details().then(handleUsage);
        },
        handleUsage = function(x) {
            var deferred = $q.defer();
            if (x.length === 0) {
                loadSpecifiedUsage(d.recommendedPlan);
            } else {
                d.usage = x[0];
            }
            return deferred.resolve();
        },
        loadSpecifiedUsage = function(p) {
            return payments
                    .usage_grid(p)
                    .then(function(x)
                    {
                        d.usage = x;
                    });
        },
        loadUserPaymentData = function() {
            return payments
                    .my_data;
                        /*
                    .then(function(x)
                    {
                        if (data.length > 0) {
                            $scope.billing.currentPlan =
                                $scope.selectedPlan = data[0].plan || '000';
                            $scope.billing.customer_id = data[0].customer_id;
                            $scope.billing.payment_token = data[0].cc_token;
                            $scope.load_invoices();
                            payments.get_customer($scope.billing.customer_id)
                            .then(function(x) {
                                $scope.billing.current_card = x.data.cards.data[0];
                                $scope.openModalsFromURL();
                            });
                        } else {
                            if (parseInt($scope.billing.recommendedPlan, 10) > 2) {
                                $scope.selectedPlan = $scope.billing.recommendedPlan;
                            } else {
                                $scope.selectedPlan = '002';
                            }
                            $scope.openModalsFromURL();
                        }

                    });
                        */
        },
        loadCustomerInvoices = function() {
            return payments.get_invoices();
        },
        broadcastResults = function() {
            this.data = d;
        };


    loadPlans()
        //.then( handlePlans )
        .then( loadUsage )
        //.then( handleUsage )
        .then( loadUserPaymentData )
        .then( loadCustomerInvoices )
        .then( broadcastResults );

    return d;

});

service.service('User', ['SWBrijj', function(SWBrijj) {
    this.signaturePresent = false;
    var u = this; // save "this" context for procm callback
    SWBrijj.procm('account.have_signature').then(function(sig) {
        u.signaturePresent = sig[0].have_signature;
    });
}]);

service.service('Investor', ['SWBrijj', 'navState', function(SWBrijj, navState) {
    if (navState.role == 'issuer') {
        this.investors = [];
        this.names = {};
        this.displays = {};
        var inv_service = this;
        SWBrijj.tblm('global.investor_list', ['email', 'name']).then(function(data) {
            for (var i = 0; i < data.length; i++) {
                if (data[i].name) {
                    inv_service.names[data[i].email] = data[i].name;
                    inv_service.getDisplay(data[i].email).text = inv_service.getDisplayText(data[i].email); // overwrite old value if exists
                }
                inv_service.investors.push(inv_service.getDisplay(data[i].email));
            }
        });

        this.getName = function(identifier) {
            if (this.names[identifier]) {
                return this.names[identifier];
            } else {
                return identifier;
            }
        };

        this.getDisplayText = function(identifier) {
            return this.getName(identifier);
        };

        this.getDisplay = function(identifier) {
            if (!this.displays[identifier]) {
                this.displays[identifier] = {id: identifier, text: this.getDisplayText(identifier), name: this.getName(identifier)};
            }
            return this.displays[identifier];
        };
    }
}]);

// service.service('Messages', ['SWBrijj', function(SWBrijj) {
//     this.message_data = [];
// }]);
