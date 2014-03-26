var service = angular.module('commonServices', ['brijj']);

// Add Stripe authorization to default $http request headers.
service.run(function($http, SWBrijj) {
    SWBrijj.tblm('config.configuration', 'name', 'stripe'
    ).then(function(data) {
        $http.defaults.headers.common.Authorization = 'Bearer ' + data.value;
    });
});

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

/* STRIPE API SERVICE
 * Always returns a promise.
 *
 * Controllers must coordinate between Stripe, DB and UI.
 *
 */
service.factory('payments', function($http, SWBrijj) {
    var s = {};
        $http.defaults.useXDomain = true;
    s.create_customer = function(xcard, xplan, xcoupon) {
        return $http({method: 'POST',
                      url: 'https://api.stripe.com/customers/',
                      params: {card: xcard,
                               coupon: xcoupon,
                               plan: xplan}
        });
    };

    s.update_subscription = function(customer, newplan) {
        // here i should take the customer object b/c
        // i need both the customer id and the subscription id
    };

    s.apply_coupon = function(customer, coupon) {
        return $http({method: 'POST',
                      url: ''
        });
    };
    s.update_payment = function(customer, newcard) {
        return $http({method: 'POST',
                      url: ''
        });
    };
    s.customer_invoices = function(customer) {
        return $http({method: 'GET',
                      url: 'https://api.stripe.com/v1/invoices'
        });
    };
    s.get_customer = function(customerid) {
        return $http({method: 'GET',
                      url: 'https://api.stripe.com/v1/customers/'+customerid
        });
    };
    s.get_invoices = function(customerid) {
        return $http({method: 'GET',
                      url: 'https://api.stripe.com/v1/invoices',
                      params: {customer: customerid,
                               count: 3}
        });
    };
    s.get_upcoming_invoice = function(customerid) {
        return $http({method: 'GET',
                      url: 'https://api.stripe.com/v1/invoices/upcoming',
                      params: {customer: customerid}
        });
    };

    return s;
});
