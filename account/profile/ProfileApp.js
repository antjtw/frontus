function getCanvasOffset(ev) {
    var offx, offy;
    if (ev.offsetX === undefined) { // Firefox code
        offx = ev.layerX-ev.target.offsetLeft;
        offy = ev.layerY-ev.target.offsetTop;
    } else {
        offx = ev.offsetX;
        offy = ev.offsetY;
    }
    return [offx, offy];
}

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

        $scope.profileCheck = function (attr, value) {
            $scope.profilecheck = $scope.profilecheck || {};
            $scope.profilecheck[attr] = value;
        };
        
        $scope.profileUpdate = function(attr, value) {
            if ($scope.profilecheck[attr] != value && value != undefined) {
                SWBrijj.proc("account.contact_update", attr, value).then(function(x) {
                    void(x);
                    $scope.$emit("notification:success", "Profile successfully updated");
                    if (attr == 'name') {
                        $rootScope.person.name = value;
                    }
                    $scope[attr] = value;
                }).except(function(x) {
                        void(x);
                        $scope.$emit("notification:fail", "Something went wrong, please try again later");
                });
            }
        };

        $scope.booleanUpdate = function(attribute, value) {
            if (value == null) {
                value = false;
            }
            value = value == "true" ? "false": "true";
            SWBrijj.procm("smartdoc.update_investor_attributes", attribute, String(value)).then(function(x) {
                $scope.investor_attributes[attribute][0] = value;
            }).except(function(err) {
                    console.log(err);
                });
        };

        $scope.setInvestor = function(attributetrue, attributefalse) {
            $scope.investor_attributes[attributetrue][0] = "true";
            $scope.investor_attributes[attributefalse][0] = "false";
            SWBrijj.procm("smartdoc.update_investor_attributes", attributetrue, String($scope.investor_attributes[attributetrue][0])).then(function(x) {
                SWBrijj.procm("smartdoc.update_investor_attributes", attributefalse, String($scope.investor_attributes[attributefalse][0])).then(function(x) {
                });
            });
        };

        $scope.attributeUpdate = function(attribute, value) {
            if (attribute == "investorIsNotAnAccreditedInvestor") {
                $scope.investor_attributes['investorIsAnAccreditedInvestor'][0] = value == "true" ? "false": "true";

            }
            SWBrijj.procm("smartdoc.update_investor_attributes", attribute, value).then(function(x) {
                $scope.investor_attributes[attribute][0] = value;
                $scope.$emit("notification:success", "Profile successfully updated");
            }).except(function(err) {
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
            if ($scope.city && $scope.state && $scope.postalcode) {
                return $scope.city + ", " + $scope.state + " " + $scope.postalcode;
            } else if ($scope.city || $scope.state) {
                return ($scope.city || "") + ($scope.state || "") + " " + ($scope.postalcode || "");
            } else if ($scope.postalcode) {
                return $scope.postalcode;
            } else {
                return null;
            }
        };

        $scope.getInvestorInformation = function() {
            SWBrijj.tblm('smartdoc.my_profile').then(function(data) {
                // Imports the investor attributes
                $scope.investor_attributes = {};
                // Accreditation is worked out based on whether other attributes exist
                $scope.investor_attributes['investorIsAnAccreditedInvestor'] = ['false',''];
                angular.forEach(data, function(attr) {
                    $scope.investor_attributes[attr.attribute] = [attr.answer, attr.label];
                    if ((attr.attribute == "investorMeetsNetWorthRequirement" && attr.answer=="true") || (attr.attribute == "investorMeetsIncomeRequirement" && attr.answer=="true")) {
                        $scope.investor_attributes['investorIsAnAccreditedInvestor'][0] = "true";
                    }
                });
            }).except(function(err) {
                console.log(err);
            });
        };

        /** @name SWBrijj#tbl
         * @function
         * @param {string} table_name */
        SWBrijj.tbl('account.profile').then(function(x) {
            initPage($scope, x);
            $scope.photoURL = '/photo/user?id=' + $scope.email;
            $scope.signatureURL = '/photo/user?id=signature:';
            $scope.namekey = $scope.name;
            $scope.getInvestorInformation();
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
                $scope.photoURL = '/photo/user?id=' + $scope.email + '#' + new Date().getTime();
                $rootScope.userURL = '/photo/user?id=' + $scope.email + '#' + new Date().getTime();
            }).except(function(x) {
                void(x);
                // console.log(x);
                $scope.$emit("notification:fail", "Profile photo change was unsuccessful, please try again.");
                $scope.photoURL = '/photo/user?id=' + $scope.email + '#' + new Date().getTime();
            });
        };

        $scope.setFiles = function(element) {
            $scope.files = [];
            for (var i = 0; i < element.files.length; i++) {
                $scope.files.push(element.files[i]);
                $scope.$apply();
            }
        };

        $scope.sigModalUp = function () {
            $scope.signaturestyle = {height: String(180), width: String(330) };
            $scope.signatureModal = true;
        };

        $scope.sigclose = function () {
            $scope.signatureModal = false;
            $scope.scribblemode = false;
        };

        $scope.touropts = {
            backdropFade: true,
            dialogFade: true,
            dialogClass: 'helpModal modal'
        };

        $scope.uploadSuccess = function() {
            $scope.signatureURL = '/photo/user?id=signature:';
            $scope.signatureprocessing = false;
            $scope.progressVisible = false;
            $scope.signaturepresent = true;
            var elements = document.getElementsByClassName('draggable imagesignature mysignature');
            angular.forEach(elements, function(element) {
                element = element.querySelector("textarea");
                if (element.style.backgroundImage == 'url(/photo/user?id=signature:)') {
                    element.style.backgroundImage = 'url(/photo/user?id=signature:1)';
                }
                else {
                    element.style.backgroundImage = 'url(/photo/user?id=signature:)';
                }
            })
            $scope.$emit("notification:success", "Signature uploaded");
            $scope.scribblemode = false;
            $scope.$apply();
        };

        $scope.uploadFail = function() {
            void(x);
            $scope.progressVisible = false;
            $scope.signatureprocessing = false;
            $scope.signatureURL = '/photo/user?id=signature:';
            $scope.$emit("notification:fail", "Oops, something went wrong.");
            // console.log(x);
        };

        $scope.uploadSignatureNow = function() {
            if ($scope.files || $scope.scribblemode) {
                $scope.signatureURL = "/img/image-loader-140.gif";
                $scope.signatureprocessing = true;
                $scope.progressVisible = true;
                if ($scope.scribblemode) {
                    var canvas = document.getElementById("scribbleboard");
                    var fd = canvas.toDataURL();
                    $scope.signatureModal = false;
                    SWBrijj.uploadSignatureString(fd).then(function(x) {
                        $scope.uploadSuccess();
                    }).except(function(x) {
                            $scope.uploadFail();
                        });
                }
                else {
                    var fd = new FormData();
                    for (var i = 0; i < $scope.files.length; i++) fd.append("uploadedFile", $scope.files[i]);
                    $scope.signatureModal = false;
                    SWBrijj.uploadSignatureImage(fd).then(function(x) {
                        $scope.uploadSuccess();
                    }).except(function(x) {
                            $scope.uploadFail();
                        });
                }
            }
            else {
                $scope.signatureModal = false;
            }

        };

        $scope.createNewSignature = function() {
            $scope.scribblemode = true;
            $scope.files = null;

            var canvas = document.getElementById("scribbleboard");

            var ctx = canvas.getContext('2d');
            canvas.height = 180;
            canvas.width = 330;
            console.log(ctx);
            console.log(canvas);
            ctx.lineCap = 'round';
            ctx.color = "blue";
            ctx.lineWidth = 2;
            ctx.fillStyle = "white";
            // ctx.setAlpha(0);
            ctx.fillRect(0, 0, 200, 200);
            // ctx.setAlpha(0.5);

            canvas.addEventListener('mousedown', function(e) {
                canvas.down = true;
                var offs = getCanvasOffset(e);
                canvas.X = offs[0];
                canvas.Y = offs[1];
            }, false);

            canvas.addEventListener('mouseover', function(e) {
                void(e);
                canvas.down = false;
            });

            canvas.addEventListener('mouseout', function(e) {
                void(e);
                canvas.down = false;
            });

            canvas.addEventListener('mouseup', function(e) {
                void(e);
                canvas.down = false;
            });

            canvas.strokes = [];

            canvas.addEventListener('mousemove', function(e) {
                if (canvas.down) {
                    ctx.beginPath();
                    ctx.moveTo(canvas.X, canvas.Y);
                    var offs = getCanvasOffset(e);
                    ctx.lineTo(offs[0], offs[1]);
                    canvas.strokes.push([canvas.color, canvas.X, canvas.Y, offs[0], offs[1]]);
                    ctx.stroke();
                    canvas.X = offs[0];
                    canvas.Y = offs[1];
                }
            }, true);
        };

        $scope.setFilesSig = function(element) {
            $scope.files = [];
            for (var i = 0; i < element.files.length; i++) {
                $scope.files.push(element.files[i]);

                var oFReader = new FileReader();
                oFReader.readAsDataURL($scope.files[0]);

                oFReader.onload = function (oFREvent) {
                    document.getElementById("signaturevisual").src = oFREvent.target.result;
                };
                $scope.scribblemode = false;
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
