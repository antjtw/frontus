'use strict';

app.controller('ContactCtrl',
    ['$scope', '$rootScope', 'SWBrijj', '$routeParams',
    function($scope, $rootScope, SWBrijj, $routeParams) {
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
        if ($routeParams.verificationCode) {
            SWBrijj.procm('account.verify_email', $routeParams.code)
            .then(function(res) {
                if (res[0].verify_email) {
                    $scope.$emit("notification:success", "Alternate email address verified.");
                } else {
                    $scope.$emit("notification:fail", "Failed to verify alternate email address.");
                }
            }).except(function(err) {
                console.log(err);
                $scope.$emit("notification:fail", "Failed to verify alternate email address.");
            });
        }

       
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
                console.error("Oops.  Change failed: " + x);
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

        $scope.profilecheck = {};
        $scope.profileCheck = function (attr, value) {
            $scope.profilecheck[attr] = value;
        };

        $scope.profileUpdate = function(attr, value) {
            if ($scope.profilecheck[attr] != value && value !== undefined) {
                SWBrijj.proc("account.contact_update", attr, value).then(function(x) {
                    $scope.$emit("notification:success", "Profile successfully updated");
                    if (attr == 'name') {
                        $rootScope.person.name = value;
                    }
                    $scope[attr] = value;
                    $scope.profileCheck(attr, value);
                }).except(function(x) {
                    $scope.$emit("notification:fail", "Something went wrong, please try again later");
                });
            }
        };

        $scope.attributeUpdate = function(attribute, value) {
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
                angular.forEach(data, function(attr) {
                    $scope.investor_attributes[attr.attribute] = [attr.answer, attr.label];
                });
            }).except(function(err) {
                console.log(err);
            });
        };

        /** initPage
         * @param $scope
         * @param x
         * @param {number} [row]
         */

        function initPage($scope, x) {
            var y = x[0]; // the fieldnames
            var z = x[1]; // the values

            for (var i = 0; i < y.length; i++) {
                if (z[i] !== null) {
                    $scope[y[i]] = z[i];
                }
            }
        }

        /** @name SWBrijj#tbl
         * @function
         * @param {string} table_name */
        SWBrijj.tbl('account.profile').then(function(x) {
            initPage($scope, x);
            $scope.profileCheck('primary_email', $scope.primary_email); // needed since it's not an input
            $scope.photoURL = '/photo/user?id=' + $scope.user_id;
            var randnum = Math.random();
            $scope.signatureURL = '/photo/user?id=signature:&dontcache=' + randnum;
            $scope.namekey = $scope.name;
            $scope.getInvestorInformation();
        }).except(function(err) {
            document.location.href = '/login';
        });



        $scope.emails = [];
        var primeEmail = ""
        
        SWBrijj.tblm('account.my_emails').then(function(returned_emails) {
            returned_emails.forEach(function (e) {
                $scope.emails.push(e);
            });
            angular.forEach($scope.emails, function(email){
                if(email.email==$scope.primary_email){
                    console.log("i am the primary!");
                    primeEmail = email;
                }
            });
            $scope.emails.splice($scope.emails.indexOf(primeEmail), 1);
            $scope.emails.unshift(primeEmail);

        });

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
                $scope.photoURL = '/photo/user?id=' + $scope.user_id + '#' + new Date().getTime();
                $rootScope.userURL = '/photo/user?id=' + $scope.user_id + '#' + new Date().getTime();
            }).except(function(x) {
                void(x);
                // console.log(x);
                $scope.$emit("notification:fail", "Profile photo change was unsuccessful, please try again.");
                $scope.photoURL = '/photo/user?id=' + $scope.user_id + '#' + new Date().getTime();
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
            var randnum = Math.random();
            $scope.signatureURL = '/photo/user?id=signature:&dontcache=' + randnum;
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
            });
            $scope.$emit("notification:success", "Signature uploaded");
            $scope.scribblemode = false;
            $scope.$apply();
        };

        $scope.uploadFail = function() {
            $scope.progressVisible = false;
            $scope.signatureprocessing = false;
            var randnum = Math.random();
            $scope.signatureURL = '/photo/user?id=signature:&dontcache=' + randnum;
            $scope.$emit("notification:fail", "Oops, something went wrong.");
        };

        $scope.uploadSignatureNow = function() {
            if ($scope.files || $scope.scribblemode) {
                $scope.signatureURL = "/img/image-loader-140.gif";
                $scope.signatureprocessing = true;
                $scope.progressVisible = true;
                var fd;
                if ($scope.scribblemode) {
                    var canvas = document.getElementById("scribbleboard");
                    fd = canvas.toDataURL();
                    $scope.signatureModal = false;
                    SWBrijj.uploadSignatureString(fd).then(function(x) {
                        $scope.uploadSuccess();
                    }).except(function(x) {
                        $scope.uploadFail();
                    });
                }
                else {
                    fd = new FormData();
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
                canvas.down = false;
            });

            canvas.addEventListener('mouseout', function(e) {
                canvas.down = false;
            });

            canvas.addEventListener('mouseup', function(e) {
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

        $scope.addEmail = function(email) {
            if (!email) {
                return;
            }
            SWBrijj.insert('account.my_emails', {user_id: $scope.user_id, email: email}).then(function(res) {
                $scope.emails.push({email: email, verified: false});
                // TODO: notification:success and call verification flow;
                $scope.newEmail = "";
            }).except(function(err) {
                console.error(err);
                $scope.$emit("notification:fail", "Sorry, we were unable to add " + email + ".");
                $route.$reload();
            });
        };

        $scope.removeEmail = function(email) {
            SWBrijj.delete_one('account.my_emails', {user_id: email.user_id, email: email.email}).then(function(res) {
                var ix = $scope.emails.indexOf(email);
                $scope.emails.splice(ix, 1);
                $scope.$emit("notification:success", "Email removed;");
            }).except(function(err) {
                console.error(err);
                $scope.$emit("notification:fail", "Sorry, we were unable to remove " + email.email + ". Please try again later.");
            });
        };

        $scope.updateEmail = function(email) {
            SWBrijj.update('account.my_emails', {email: email.email}, {user_id: email.user_id, email: $scope.profilecheck.workingEmail}).then(function(res) {
                // do nothing
            }).except(function(err) {
                console.error(err);
                $scope.$emit("notification:fail", "Sorry, we were unable to change " + $scope.profilecheck.workingEmail + ".");
                email.email = $scope.profilecheck.workingEmail;
            });
        };

        $scope.reverifyEmail = function(email) {
            // TODO
        };
    }
]);
