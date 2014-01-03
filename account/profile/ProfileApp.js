var app = angular.module('ProfileApp', ['ngResource', 'ui.bootstrap', 'ui.event', 'nav', 'brijj'], function($routeProvider, $locationProvider) {
    //this is used to assign the correct template and controller for each URL path
    $locationProvider.html5Mode(true).hashPrefix('');
    // $locationProvider.html5Mode(false).hashPrefix('!');

    $routeProvider.
    when('/', {
        controller: 'ContactCtrl',
        templateUrl: 'contact.html'
    }).
    otherwise({
        redirectTo: '/'
    });
});


app.controller('ContactCtrl', ['$scope', '$rootScope', 'SWBrijj',
    function($scope, $rootScope, SWBrijj) {
        $scope.pictureModalOpen = function() {
            $scope.pictureModal = true;
        };

        $scope.pictureModalClose = function() {
            $scope.files = [];
            $scope.closeMsg = 'I was closed at: ' + new Date();
            $scope.pictureModal = false;
        };

        $scope.passwordModalOpen = function() {
            $scope.passwordModal = true;
        };

        $scope.passwordModalClose = function() {
            $scope.closeMsg = 'I was closed at: ' + new Date();
            $scope.passwordModal = false;
            $scope.currentPassword = "";
            $scope.newPassword = "";
            $scope.passwordConfirm = "";
        };

        // Password code
        $scope.currentPassword = "";
        $scope.newPassword = "";
        $scope.passwordConfirm = "";

        $scope.validPasswordNot = function() {
            return !($scope.currentPassword && $scope.passwordMatches());
            // return !($scope.currentPassword && !($scope.passwordMatchesNot() || $scope.regexPassword())); };
        };

        $scope.regexPassword = function() {
            var newP = $scope.newPassword;
            if (newP.match(/(?=.*?[a-z])(?=.*?[A-Z])(?=.*?[0-9]).{8,}/)) return "";
            else if (newP.match(/(?=.*?[a-z])(?=.*?[A-Z]).{8,}/)) return "Missing a digit";
            else if (newP.match(/(?=.*?[a-z])(?=.*?[0-9]).{8,}/)) return "Missing an uppercase letter";
            else if (newP.match(/(?=.*?[0-9])(?=.*?[A-Z]).{8,}/)) return "Missing a lowercase letter";
            else if (newP.length < 8) return "Must be at least eight characters";
            else return "Must contain at least one lowercase letter, one uppercase letter, and one digit";
        };

        $scope.passwordMatches = function() {
            return $scope.passwordConfirm && $scope.newPassword && $scope.passwordConfirm == $scope.newPassword;
        };

        $scope.changePassword = function() {
            SWBrijj.proc("account.change_password", $scope.currentPassword, $scope.newPassword).then(function(x) {
                if (x[1][0]) {
                    $scope.$emit("notification:success", "Your password has been updated successfully.");
                    // console.log("changed successfully");
                } else {
                    $scope.$emit("notification:fail", "There was an error updating your password.");
                    // console.log("Oops.  Change failed");
                    $scope.currentPassword = "";
                    $scope.newPassword = "";
                    $scope.passwordConfirm = "";
                }
            }).except(function(x) {
                alert("Oops.  Change failed: " + x);
            });
        };

        $scope.profileModalOpen = function() {
            $scope.profileModal = true;
            $scope.editData = {'name': angular.copy($scope.name),
                               'street': angular.copy($scope.street),
                               'city': angular.copy($scope.city),
                               'state': angular.copy($scope.state),
                               'postalcode': angular.copy($scope.postalcode)};
        };
        $scope.profileModalClose = function() {
            $scope.profileModal = false;
            $scope.editData = null;
        };
        
        $scope.profileUpdate = function(user) {
            SWBrijj.proc("account.contact_update", user.name, user.street, user.city, user.state, user.postalcode).then(function(x) {
                void(x);
                if ($scope.files) {
                    $scope.uploadFile();
                }
                $scope.$emit("notification:success", "Profile successfully updated");
                $scope.name = user.name;
                $scope.street = user.street;
                $scope.city = user.city;
                $scope.state = user.state;
                $scope.postalcode = user.postalcode;
            }).except(function(x) {
                void(x);
                $scope.$emit("notification:fail", "Something went wrong, please try again later");
            });
        };

        $scope.profileopts = {
            backdropFade: true,
            dialogFade:true,
            dialogClass: 'profile-modal wideModal modal'
        };

        $scope.opts = {
            backdropFade: true,
            dialogFade: true
        };

        $scope.address1 = function() {
            return $scope.street;
        };
        $scope.address2 = function() {
            return ($scope.city && $scope.state && $scope.postalcode) ? $scope.city + ", " + $scope.state + " " + $scope.postalcode : null;
        };

        /** @name SWBrijj#tbl
         * @function
         * @param {string} table_name */
        SWBrijj.tbl('account.profile').then(function(x) {
            initPage($scope, x);
            $scope.photoURL = '/photo/user?id=' + $scope.email;
            $scope.namekey = $scope.name;
        }).except(initFail);

        $scope.uploadFile = function() {
            $scope.photoURL = "/img/image-loader-140.gif";
            var fd = new FormData();
            $scope.progressVisible = true;
            for (var i = 0; i < $scope.files.length; i++) fd.append("uploadedFile", $scope.files[i]);

            /** @name SWBrijj#uploadImage
             * @function
             * @param {FormData}
             */
            SWBrijj.uploadImage(fd).then(function(x) {
                void(x);
                // console.log(x);
                $scope.$emit("notification:success", "Profile photo successfully updated");
                $scope.photoURL = '/photo/user?id=' + $scope.email;
            }).except(function(x) {
                void(x);
                // console.log(x);
                $scope.$emit("notification:fail", "Profile photo change was unsuccessful, please try again.");
                $scope.photoURL = '/photo/user?id=' + $scope.email;
            });
        };

        $scope.setFiles = function(element) {
            $scope.files = [];
            for (var i = 0; i < element.files.length; i++) {
                $scope.files.push(element.files[i]);
                $scope.$apply();
            }
        };
    }
]);

app.controller('SocialCtrl', ['$scope', '$location', 'SWBrijj',
    function($scope, $location, SWBrijj) {
        $scope.contactSave = function() {
            SWBrijj.proc("social_update", $scope.twitter, $scope.linkedin, $scope.google, $scope.dropbox, $scope.facebook).
            then(function(x) {
                alert("done: " + x);
            });
        };

        $scope.authTwitter = function() {
            SWBrijj.proc("oauth.twitter_authorize").then(function(x) {
                document.location.href = x[1][0];
            });
        };
        $scope.authLinkedin = function() {
            SWBrijj.proc("oauth.linkedin_authorize").then(function(x) {
                document.location.href = x[1][0];
            });
        };
        $scope.authDropbox = function() {
            SWBrijj.proc("oauth.dropbox_authorize").then(function(x) {
                document.location.href = x[1][0];
            });
        };
        $scope.authGoogle = function() {
            SWBrijj.proc("oauth.google_authorize").then(function(x) {
                document.location.href = x[1][0];
            });
        };
        $scope.authFacebook = function() {
            SWBrijj.proc("oauth.facebook_authorize").then(function(x) {
                document.location.href = x[1][0];
            });
        };


        SWBrijj.tbl('account.profile').then(function(x) {
            initPage($scope, x)
        }).except(initFail);
        SWBrijj.procm('oauth.dropbox_list', '')
            .then(function(x) {
            $scope.dropboxFiles = x;
            $scope.$apply();
        })
            .except(function(x) {});

    }
]);

app.controller('PhotoCtrl', ['$scope', 'SWBrijj',
    function($scope, SWBrijj) {
        $scope.upload = function() {
            alert('heh');
        };

        SWBrijj.tbl('account.profile').then(function(x) {
            initPage($scope, x)
        }).except(initFail);
    }
]);

/** initPage
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

function initFail(x) {
    void(x);
    document.location.href = '/login';
}

function updated(x) {}

app.filter('fileLength', function() {
    return function(word) {
        if (word) {
            if (word.length > 25) {
                return word.substring(0, 24) + "..";
            } else {
                return word;
            }
        }
        return '';
    };
});
