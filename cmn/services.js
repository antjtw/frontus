var service = angular.module('commonServices', ['brijj']);

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

service.factory('payments', function($http) {
    var factory = {};
    factory.create_customer = function(company, plan, discount) {
        return $http({method: 'GET',
                      url: 'https://api.stripe.com/customers/'}
        ).then(function(resp) {
            console.log(resp);
        });
    };

    factory.update_customer = function(customer,
                                       newcard,
                                       newplan,
                                       newdiscount) {
        // should this just take a key and a value?
    };
    factory.customer_invoices = function(customer) {
        var key = factory.key;
        return $http({method: 'GET',
                      url: 'https://api.stripe.com/v1/invoices'});
    };
    return factory;
});
