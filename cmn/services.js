var service = angular.module('commonServices', ['brijj']);

// Add Stripe authorization to default $http request headers.
service.run(function($http, SWBrijj) {
    SWBrijj.tblm('config.configuration', 'name', 'stripe').then(function(data) {
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
    s.update_subscription = function(newplan) {
        return SWBrijj.proc('account.update_my_plan', newplan);
    };
    s.update_payment = function(newcard) {
        return SWBrijj.proc('account.update_my_cc', newcard);
    };
    s.create_customer = function(newplan, newcard) {
        return SWBrijj.proc('account.create_customer', newplan, newcard);
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
    return s;
});
