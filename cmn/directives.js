'use strict';

var m = angular.module('commonDirectives', ['ui.select2', 'brijj', 'ui.filters']);

m.directive('groupPeople', function(){
    return {
        scope: {people: "=people"},
        restrict: 'E',
        templateUrl:'/cmn/partials/groupPeople.html',
        controller: ['$scope', '$rootScope', 'SWBrijj', '$route', '$routeParams', '$location',
        function($scope, $rootScope, SWBrijj, $route, $routeParams, $location){

            $scope.unChecked = [];

            var newGroup = [];
            $scope.groupName = "";
            $scope.manyGroup = [];
            $scope.selectedGroup = [];
            var newGroups = [];
            $scope.groupData = [];
            var arrayRemove = [];

            $scope.updateGroup = function(array, json){
                SWBrijj.procm('account.multi_update_groups', array, json).then(function(x){
                }).except(function(x){
                    console.error("failed to add group");
                });
            };

            function IndGroup(group){
                this.group = group;
            }

            $scope.parseGroups = function(){
              SWBrijj.tblm('account.my_user_groups', ['email', 'json_array_elements']).then(function(data){
                    $scope.myUserGroups = data;
                    angular.forEach($scope.myUserGroups, function(info){
                        var a = info.json_array_elements;
                        var b = JSON.parse(a);
                        if(b !== ""){
                            $scope.groupData.push(new IndGroup(b));
                        }

                    });
                });
            };
            $scope.parseGroups();

            $scope.fromFront = function(person){
                var allGroups = [];
                angular.forEach(person, function(info){
                    if(info.groups !== undefined){
                        var a = info.groups.split(", ");
                        for(var i = 0; i < a.length; i++){
                            if(allGroups.indexOf(a[i])== -1){
                                allGroups.push(a[i]);
                            }
                        }
                    }

                });
                return allGroups;
            };
            $scope.fromFront($scope.people);


            $scope.doNotCheck = function(person){
                var deleteArray = [];
                var allGroups = $scope.fromFront(person);
                angular.forEach(person, function(elem){
                    if(elem.groups !== null && elem.groups !== undefined){
                        var elemGroup = elem.groups.split(", ");
                        angular.forEach(allGroups, function(gr){
                            if(elemGroup.indexOf(gr)==-1){
                                deleteArray.push(gr);
                            }
                        });
                    }
                    else if(elem.groups === null){
                        deleteArray = allGroups;
                    }



                });
                return deleteArray;
            };
            // run this when you already have groups that are checked
            $scope.toUncheck = function(person){
                var uncheckGroup = [];
                var allGroups = $scope.fromFront(person);
                angular.forEach(person, function(ind){
                    if(ind.groups !== null && ind.groups !== undefined){
                        var indArray = ind.groups.split(", ");
                        angular.forEach($scope.selectedGroup, function(group){
                            if(indArray.indexOf(group)==-1 && uncheckGroup.indexOf(group)== -1){
                                uncheckGroup.push($scope.selectedGroup.indexOf(group));
                            }
                        });
                    }

                });
                return uncheckGroup;

            };
            // $scope.doNotCheck($scope.people);

            $scope.checkBox = function(person){
                var unCheck =  $scope.toUncheck(person);
                var removeGroups = $scope.doNotCheck(person);
                var allGroups = $scope.fromFront(person);
                angular.forEach(allGroups, function(group){
                    if(removeGroups.indexOf(group) === -1 && $scope.selectedGroup.indexOf(group)== -1){
                        $scope.selectedGroup.push(group);
                    }
                });
                if(unCheck.length > 0){
                    for(var i = unCheck.length - 1; i >=0; i--){
                        $scope.selectedGroup.splice(unCheck[i], 1);
                    }
                }
                return($scope.selectedGroup);
            };

            $scope.$watch('people', function(){
                    // this is working and letting me know whenever groups change
                if($scope.people.length > 0){
                    angular.forEach($scope.people, function(ind){
                        if(ind.groups === undefined){
                            $scope.selectedGroup = [];
                        }
                        else{
                            $scope.checkBox($scope.people);
                        }
                    });

                }
                else{
                    $scope.selectedGroup = [];
                }

            }, true);



            $scope.groupIs = function(group){
                return $scope.selectedGroup.indexOf(group) != -1;
            };

            $scope.clearPeople = function(array){
                while(array.length > 0){
                    array.pop();
                }
            };

            $scope.selectGroup = function(group){
                if($scope.selectedGroup.indexOf(group)=== -1){
                    $scope.selectedGroup.push(group);
                }
                else {
                    var toDelete = $scope.selectedGroup.indexOf(group);
                    $scope.selectedGroup.splice(toDelete, 1);
                    if($scope.unChecked.indexOf(group)==-1){
                        $scope.unChecked.push(group);
                    }

                }
                return $scope.selectedGroup;
            };


            $scope.createGroups = function(person){
                // if($scope.selectedGroup.length > 0 || $scope.unChecked.length > 0 || $scope.selectedGroup.length > 0){
                    angular.forEach(person, function(info){
                        var bigGroup = [];
                        var newGroupsArray = [];
                        var myOldGroups = "";
                        var deleteInx = [];
                        SWBrijj.tblmm('account.my_user_role', "email", info.email).then(function(data){
                            var myInfo = data;
                            if(myInfo.length === 0){
                                bigGroup.push([info.email, 'investor']);
                                newGroupsArray = [];
                            }
                            else{
                                angular.forEach(myInfo, function(thing){
                                    bigGroup.push([thing.email, thing.role]);
                                    if(thing.groups === null || thing.groups === undefined || thing.groups === "" || thing.groups == []){
                                        newGroupsArray = [];
                                    }
                                    else{
                                        newGroupsArray = JSON.parse(thing.groups);
                                    }

                                });
                            }
                            if($scope.selectedGroup.length > 0){
                                angular.forEach($scope.selectedGroup, function(selected){
                                    if(newGroupsArray.indexOf(selected)==-1){
                                        newGroupsArray.push(selected);
                                    }

                                });
                            }
                            if($scope.unChecked.length > 0){
                                angular.forEach($scope.unChecked, function(unChecked){
                                    if(newGroupsArray.indexOf(unChecked) > -1){
                                         var toDelete = newGroupsArray.indexOf(unChecked);
                                         deleteInx.push(toDelete);
                                         newGroupsArray.splice(toDelete, 1);
                                    }
                                });
                            }
                            if($scope.groupName.length > 0){
                                var checkNew = [];
                                angular.forEach($scope.groupData, function(data){
                                        checkNew.push(data.group);
                                    });
                                if(newGroupsArray.indexOf($scope.groupName) == -1 && checkNew.indexOf($scope.groupName)== -1){
                                    newGroupsArray.push($scope.groupName);
                                }

                            }
                            // remove empty entries, and cannot add an empty group
                        if(newGroupsArray.indexOf("") > -1){
                           var toDelete= newGroupsArray.indexOf("");
                           newGroupsArray.splice(toDelete, 1);
                        }
                        $scope.updateGroup(JSON.stringify(bigGroup), JSON.stringify(newGroupsArray));

                    });
                });

            };



            $scope.showUserRoles = function(){
                SWBrijj.tblm('account.my_user_role', ['email', 'role', 'groups']).then(function(data){
                    $scope.myUserRoles = data;
                });
            };


        }]
    };
});
m.directive('peopleFilter', function(){
    return {
        scope: {people: '=people',
                filterParam: '=filterParam'},
        restrict: 'E',
        templateUrl:'/cmn/partials/peopleFilter.html',
        controller: ['$scope', '$rootScope', 'SWBrijj', '$route', '$routeParams', '$location', '$timeout', '$q',
        function($scope, $rootScope, SWBrijj, $route, $routeParams, $location, $timeout, $q){

            $scope.assignFilter = function(assignMe){
                if($scope.filterParam.param ===undefined){
                    $scope.filterParam.param = assignMe;
                }
                else if($scope.filterParam.param != assignMe){
                    $scope.filterParam.param = assignMe;
                }
                else if($scope.filterParam.param == assignMe){
                    $scope.filterParam.param = undefined;
                }
            };



            $scope.getContacts = function(){
                var promise = $q.defer();
                SWBrijj.tblm('global.user_list', ['email', 'name']).then(function(data){
                    $scope.myContacts = data;
                    promise.resolve($scope.myContacts);
                });
                return promise.promise;
            };
            // thing is scope.mycontacts because that is what the promise resolves
            $scope.getUserRoles = function(){
                SWBrijj.tblm('account.company_issuers', ['email', 'name']).then(function(data){
                    $scope.getContacts().then(function(){
                        $scope.myRoles = data;
                        $scope.myAdmins = $scope.myRoles.length;
                        $scope.myShareholders = $scope.myContacts.length - $scope.myAdmins;
                    });
                });
            };
            $scope.getUserRoles();


            $scope.getFilterCount = function(){
                SWBrijj.tblm('account.ind_user_group', ['ind_group', 'count']).then(function(data){
                    $scope.myGroups = data;
                    angular.forEach($scope.myGroups, function(info){
                        info.ind_group = info.ind_group.replace(/"/g, "");
                    });
                });
            };
            $scope.getFilterCount();



            // add a watch later to update the user roles as well

            $scope.$watch('people', function(newVal, oldVal){
                if(newVal){
                    $scope.getFilterCount();
                    $scope.getUserRoles();
                }

                // $scope.getUserRoles();
            }, true);



        }]
    };
});

m.directive('messageSide', function(){
    return {
        scope: {
            thread: '=',
            height: '='},
        restrict: 'E',
        templateUrl: '/cmn/partials/messageSide.html',
        controller: ['$scope', '$rootScope', 'SWBrijj', '$route', '$routeParams', '$location', '$timeout',

        function($scope, $rootScope, SWBrijj, $route, $routeParams, $location, $timeout) {

            $scope.getPeople = function(){
                SWBrijj.tblm('global.user_list', ['email', 'name']).then(function(data){
                    $scope.people = data;
                    var array = [];
                    var obj = {};
                    angular.forEach($scope.people, function(info){
                        array.push(obj[info.email] = info.name);
                        if(info.name === ""){
                            array.push(obj[info.email]= null);
                        }
                    });
                    $scope.peopleDict = obj;
                    $scope.getFeed();

                });
            };
            $scope.getPeople();

            $scope.$watch('peopleDict', function(newdata, olddata){
                if(newdata){
                    $scope.getLogs();
                }
            });

           $scope.poll = 0;

           $scope.newMessages = function(){
            SWBrijj.tblm('mail.msgstatus', ['our_id', 'event']).then(function(data){
                $scope.messageCount = data;
                // $scope.getFeed();
                var incrementer = 0;
                if($scope.msgstatus.length == $scope.messageCount.length && $scope.poll < 5){
                    $timeout($scope.newMessages, 2000);
                    $scope.poll += 1;
                }
                else {
                    $scope.getFeed();
                }

            }).except(function(data){
                console.error(data);
            });
           };

            $rootScope.$on('new:message', function(x){
                $scope.newMessages();

            });


            $scope.gotoPerson = function(person) {
                if (!person.lastlogin) return;
                var link;
                link = (person.name ? ((navState.userid != person.email) ? '/app/company/profile/view?id=' + person.email : '/app/account/profile/') : '');
                if (link) {
                $location.url(link);
                }
            };

            $scope.getLogins = function(){
                SWBrijj.tblm('global.user_tracker').then(function(data){
                    $scope.logins = data;
                });
            };
            $scope.getLogins();


            $scope.getFeed = function(){
                var p;
                if ($scope.thread)
                    p = SWBrijj.tblmm('mail.msgstatus', ['our_id', 'event', 'event_time', 'tox', 'category', 'when_requested', 'thread_id'], 'thread_id', $scope.thread);
                else
                    p = SWBrijj.tblm('mail.msgstatus', ['our_id', 'event', 'event_time', 'tox', 'category', 'when_requested', 'thread_id']);
                p.then(function(data){
                    $scope.msgstatus = data;
                    $scope.getNumber = $scope.msgstatus.length;
                    $scope.getLogs();
                    $scope.getLogins();

                }).except(function(data){
                    console.error(data);
                });
            };


            $scope.getLogs = function(){
                // $scope.getLogins();
                function Message(time, thread_id){
                    this.time = time;
                    this.thread = thread_id;
                    this.event = [];
                    this.tox = [];
                    this.to_names = [];
                    this.our_id = [];
                    this.foo = [];
                }

                function IndEvent(our_id, email, event, array, event_time){
                    this.our_id = our_id;
                    this.email = email;
                    this.event = event;
                    this.array = [];
                    this.event_time = [];
                }

                var myEvents = [];
                angular.forEach($scope.msgstatus, function(value){
                    if (!myEvents.some(function(mess, idx, arr){
                         return (mess.thread == value.thread_id) && (mess.time.equals(value.when_requested));
                    })) {
                        myEvents.push(new Message(value.when_requested, value.thread_id));
                    }

                });
                /*var myEvents = [];
                for (var i = 0; i < msgdata.length; i++){
                   myEvents.push(new Message(msgdata[i]));
                }*/
                angular.forEach($scope.msgstatus, function(value){
                    for (var i = 0; i < myEvents.length; i++){
                        if(value.thread_id == myEvents[i].thread && value.when_requested.equals(myEvents[i].time)) {
                            myEvents[i].category = value.category;
                            var idxtox = myEvents[i].tox.indexOf(value.tox);
                            if(idxtox == -1){
                                myEvents[i].tox.push(value.tox);
                            }
                            myEvents[i].event.push(value.event);
                            if($scope.peopleDict[value.tox]===null){
                                myEvents[i].to_names.push(value.tox);
                            }
                            else {
                                myEvents[i].to_names.push($scope.peopleDict[value.tox]);
                            }
                            var idx = myEvents[i].our_id.indexOf(value.our_id);
                            if(idx == -1){
                                myEvents[i].our_id.push(value.our_id);
                                myEvents[i].foo.push(new IndEvent(value.our_id, value.tox));
                            }
                            angular.forEach(myEvents[i].foo, function(myThings){
                                myThings[value.event_time] = value.event;
                                if(myThings.our_id == value.our_id){
                                    myThings.array.push({
                                        time: value.event_time,
                                        event: value.event,
                                    });
                                    myThings.event_time.push(value.event_time);
                                    var newEvent = myThings.event_time.sort();
                                    var lastEvent = newEvent[newEvent.length -1];
                                    myThings.timestamp = lastEvent;
                                    myThings.event = myThings[lastEvent];
                                    if(myThings.event == 'open'){
                                        myThings.event = 'opened';
                                    }
                                    if(myThings.event == 'dropped'){
                                        myThings.event = 'failed';
                                    }
                                    if(myThings.event == 'bounce'){
                                        myThings.event = 'bounced';
                                    }
                                    if($scope.peopleDict[myThings.email]===null){
                                        myThings.personName = myThings.email;
                                    }
                                    else {
                                        myThings.personName = $scope.peopleDict[myThings.email];
                                    }
                                }
                            });
                            angular.forEach($scope.logins, function(login){
                                if(login.email == value.tox){
                                    myEvents[i].foo.forEach(function(elem){
                                        elem.login = login.logintime;
                                    });
                                }
                            });

                        }
                    }
                    $scope.message_data = myEvents;
                });

            };


            $scope.gotoPerson = function(person) {
                if(person.login === undefined){
                    $scope.hasLink = false;
                }
                else{
                    var link = '/app/company/profile/view?id=' + encodeURIComponent(person.email);
                    $location.url(link);
                }

            };

        }]
    };
});
m.directive('addPerson', function(){
    return {
        scope: false,
        // replace: true,
        // transclude: false,
        restrict: 'E',
        templateUrl: '/cmn/partials/addPerson.html',
        controller: ['$scope', '$rootScope', 'SWBrijj', '$route',

        function($scope, $rootScope, SWBrijj, $route) {

            $scope.createPerson = function() {
                if ($scope.newRole) {
                    SWBrijj.proc('account.create_admin', $scope.newEmail.toLowerCase()).then(function(x) {
                        $rootScope.billing.usage.admins_total += 1;
                        $rootScope.$emit("notification:success", "Admin Added");

                        $route.reload();
                    }).except(function(x) {
                        $rootScope.$emit("notification:fail", "Something went wrong, please try again later.");
                    });
                } else {
                    SWBrijj.proc('account.create_investor', $scope.newEmail.toLowerCase(), $scope.newName).then(function(x) {
                        $rootScope.$emit("notification:success", "Person Added");
                        $route.reload();
                    }).except(function(x) {
                        $rootScope.$emit("notification:fail", "Something went wrong, please try again later.");
                    });
                }
                $scope.newEmail = "";
            };

            $scope.resetAdmin = function() {
                $scope.newEmail = "";
                $scope.newName = "";
                $scope.newRole = false;
            };


            $scope.toggleRole = function() {
                $scope.newRole = !$scope.newRole;

            };

            var re = /^(([^<>()[\]\\.,;:\s@\"]+(\.[^<>()[\]\\.,;:\s@\"]+)*)|(\".+\"))@((\[[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\])|(([a-zA-Z\-0-9]+\.)+[a-zA-Z]{2,}))$/;
            $scope.fieldCheck = function() {
                return re.test($scope.newEmail);

            };

        }]
    };
});

m.directive('paymentPlanSelector', function() {
    return {
        scope: false,
        replace: true,
        restrict: 'E',
        templateUrl: '/cmn/partials/paymentPlanSelector.html',
        controller: ['$scope', '$rootScope', '$routeParams',
        function($scope, $rootScope, $routeParams) {

            if ($routeParams.plan) {
                $rootScope.selectedPlan = $routeParams.plan;
            }
            $rootScope.$watch('selectedPlan', function(){
                $scope.selectedPlan = $rootScope.selectedPlan;
            });

            $scope.selectPlan = function(p) {
                if ($rootScope.selectedPlan == p) {
                    $rootScope.selectedPlan = null;
                } else {
                    if ($rootScope.billing) {
                        if ($rootScope.billing.plans.indexOf(p)!==-1) {
                            $rootScope.selectedPlan = p;
                        }
                    } else {
                        $rootScope.selectedPlan = p;
                    }
                }
            };
        }]
    };
});

m.directive('meter', function() {
    return {
        scope: {cur: '=',
                tot: '='},
        replace: true,
        restrict: 'E',
        templateUrl: '/cmn/partials/meter.html',
        controller: ['$scope', function($scope) {
            $scope.meterStyle = {};
            $scope.updateMeter = function() {
                $scope.meterStyle = {"width":
                                     ($scope.cur/$scope.tot)*100 + "%"};
                if ($scope.cur/$scope.tot > 1) {
                    $scope.meterStyle["background-color"] = "#E74C3C";
                }
            };
            $scope.$watch('cur', $scope.updateMeter);
            $scope.$watch('tot', $scope.updateMeter);
        }]
    };
});

m.directive('signatureModal', function() {
    return {
        scope: {options: "="},
        restrict: 'E',
        templateUrl: '/cmn/partials/signatureModal.html',
        controller: ['$scope', 'SWBrijj', '$rootScope',
            function($scope, SWBrijj, $rootScope) {
                
                //$scope.signaturestyle = {height: String(180), width: String(330), line-height: String(180/2) };
                
                $scope.label = {};
                $scope.label.value = "";
                
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
                
                $scope.sigModalUp = function () {
                    $scope.signatureModal = true;
                    $scope.label.value = "";
                };

                $scope.sigclose = function () {
                    $scope.signatureModal = false;
                    $scope.scribblemode = false;
                    $scope.imageReady = false;
                    $scope.options.open = false;
                };

                $scope.touropts = {
                    backdropFade: true,
                    dialogFade: true,
                    dialogClass: 'signatureModal modal'
                };

                $scope.uploadSignatureNow = function() {
                    if (($scope.scribblemode || $scope.imageReady) && 
                        (!$scope.options.labelrequired || $scope.label.value.length > 0)) 
                    {
                        $scope.signatureprocessing = true;
                        $scope.progressVisible = true;
                        var fd;
                        var p;
                        var label = ($scope.options.labelrequired) ? $scope.label.value : $scope.options.label;
                        //if ($scope.scribblemode) {
                            var canvas = document.getElementById("scribbleboard");
                            fd = canvas.toDataURL();
                            $scope.signatureModal = false;
                            if ($scope.options.type)
                                p = SWBrijj.uploadSignatureString(fd, $scope.options.type, label);
                            else
                                p = SWBrijj.uploadSignatureString(fd);
                            //p = SWBrijj.uploadSignatureString(fd, $scope.options.type, $scope.label.value);
                        /*}
                        else {
                            fd = new FormData();
                            console.log($scope.files.length, $scope.options.type);
                            for (var i = 0; i < $scope.files.length; i++) fd.append("uploadedFile", $scope.files[i]);
                            $scope.signatureModal = false;
                            if ($scope.options.type)
                                p = SWBrijj.uploadSignatureImage(fd, $scope.options.type, label);
                            else
                                p = SWBrijj.uploadSignatureImage(fd);
                            //p = SWBrijj.uploadSignatureImage(fd, $scope.options.type, $scope.label.value);
                        }*/
                        p.then(function(x) {
                            if ($scope.options.successCallback)
                                $scope.options.successCallback(label);
                        }).except(function(x) {
                            if ($scope.options.failureCallback)
                                $scope.options.failureCallback();
                        });
                        $rootScope.$emit("notification:success", "Uploading New Signature . . .");
                    }
                    else {
                        $scope.signatureModal = false;
                    }

                };

                $scope.createNewSignature = function() {
                    $scope.scribblemode = true;
                    //$scope.files = null;
                    $scope.imageReady = false;

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
                    //$scope.files = [];
                    if (element.files.length > 0) {
                        $scope.imageReady = false;
                        //$scope.files.push(element.files[i]);

                        var oFReader = new FileReader();
                        oFReader.readAsDataURL(element.files[0]);

                        oFReader.onload = function (oFREvent) {
                            var im = document.getElementById("signaturevisual");
                            im.src = oFREvent.target.result;
                            im.onload = function () {
                                var canvas = document.getElementById("scribbleboard");
                                if (!canvas)
                                    return;
                                var ctx=canvas.getContext("2d");
                                canvas.width = im.naturalWidth;
                                canvas.height = im.naturalHeight;
                                ctx.clearRect(0, 0, canvas.width, canvas.height);
                                ctx.drawImage(im, 0, 0, canvas.width, canvas.height);
                                $scope.imageReady = true;
                                $scope.$apply();
                            };
                        };
                        $scope.scribblemode = false;
                        $scope.$apply();
                    }
                };
        
                $scope.$watch('options.open', function() {
                    if ($scope.options.open)
                    {
                        if ($scope.options.label)
                            $scope.label.value = $scope.options.label;
                        $scope.sigModalUp();
                    }
                    else
                        $scope.sigclose();
                });
            }]
    };
});

m.directive('docMiniViewer', function() {
    return {
        scope: {docid: "="},
        restrict: 'E',
        templateUrl: '/cmn/partials/docMiniViewer.html',
        controller: ['$scope', 'SWBrijj',
            function($scope, SWBrijj) {


                $scope.opts = {
                    backdropFade: true,
                    dialogFade: true,
                    dialogClass: 'dmvModal modal'
                };

                $scope.openmodal = function () {
                    $scope.docMiniViewer = true;
                };

                $scope.closemodal = function () {
                    $scope.docMiniViewer = false;
                    $scope.docid = undefined;
                };

                $scope.getPages = function () {
                    while ($scope.lastpage <= parseInt($scope.document.pages) && $scope.lastpage < $scope.currentblock) {
                        if ($scope.docid[0] == "investor") {
                            $scope.pages.push("/photo/docpg?id=" + $scope.docid[1] + "&investor=false&counterparty=true&page=" + ($scope.lastpage) + "");
                        } else {
                            $scope.pages.push("/photo/docpg?id=" + $scope.docid[1] + "&investor=false&counterparty=false&page=" + ($scope.lastpage) + "");
                        }
                        $scope.lastpage += 1;
                    }
                };

                $scope.loadPages = function() {
                    $scope.currentblock = $scope.lastpage + 3;
                    if (!$scope.document.pages) {
                        SWBrijj.tblm('document.my_company_library', 'doc_id', $scope.document.original).then(function(data) {
                            $scope.document.pages = data.pages;
                            $scope.getPages();
                        });
                    } else {
                        $scope.getPages();
                    }

                };

                $scope.$watch('docid', function() {
                    if ($scope.docid && $scope.docid[1]) {
                        $scope.lastpage = 1;
                        if ($scope.docid[0] == "issuer") {
                            SWBrijj.tblm('document.my_company_library', 'doc_id', $scope.docid[1]).then(function(data) {
                                $scope.document = data;
                                $scope.pages = [];
                                $scope.openmodal();
                            });
                        } else if ($scope.docid[0] == "investor") {
                            SWBrijj.tblm('document.my_counterparty_library', 'doc_id', $scope.docid[1]).then(function(data) {
                                $scope.document = data;
                                $scope.pages = [];
                                $scope.openmodal();
                            });
                        }

                    }
                });
            }]
    };
});

m.directive('investorTile', function(){
    return {
        scope: false,
        restrict: 'E',
        templateUrl:'/cmn/partials/investorTile.html',
        controller: ['$scope', '$rootScope', 'SWBrijj', 'calculate', 'captable', 'navState', 'displayCopy',
        function($scope, $rootScope, SWBrijj, calculate, captable, navState, displayCopy){

            $scope.investorNames = [];
            $scope.cti=captable.getCapTable();
            $scope.tips = displayCopy.captabletips;

            $scope.$watch('cti', function(newval, oldval) {
                if (newval.securities.length > 0) {
                    $scope.cti = angular.copy($scope.cti);
                    $scope.ledgerAmounts();
                    $scope.getTotalInvested();
                }
            }, true);

            $scope.allTransactions = [];

            $scope.hasTip = function(key) {
                return key in $scope.tips;
            };

            $scope.displayAttr = captable.displayAttr;


            function myTransactions(transid, amount, shares){
                this.transid = transid;
                this.amount = amount;
                this.shares = shares;
            }

            $scope.transObjs = [];

            $scope.formatBool = function(bool){
                if(bool==true){
                    return "Yes";
                }
                else if(bool == false){
                    return "No";
                }
                else{
                    return bool;
                }
            };

            $scope.ledgerAmounts = function(){
                $scope.getTransactions();
            };

            var myName = "";
            $scope.getTransactions = function(){
                $scope.allTransactions = [];
                var name = "";
                angular.forEach($scope.cti.investors, function(cap){
                    if(cap.email == navState.userid){
                        name = cap.name;
                        myName = cap.name;
                    }
                    angular.forEach(cap.transactions, function(trans){
                        if(trans.attrs.investor == name) {
                            var newtran = angular.copy(trans);
                            delete newtran.attrs.physical;
                            delete newtran.attrs.investor;
                            delete newtran.attrs.units;
                            $scope.allTransactions.push(newtran);
                        }
                    });

                });
                console.log($scope.allTransactions);
                return($scope.allTransactions);
            };


            $scope.getTotalInvested = function(){
                angular.forEach($scope.allTransactions, function(tran) {
                    console.log(tran[calculate.primaryMeasure(tran.attrs.security_type)]);
                    tran[calculate.primaryMeasure(tran.attrs.security_type)] = 0;
                    angular.forEach($scope.cti.ledger_entries, function(ledger) {
                        if (tran.transaction == ledger.transaction) {
                            console.log(ledger);
                            console.log(tran[calculate.primaryMeasure(tran.attrs.security_type)]);
                            if (calculate.isNumber(ledger.credit)) {
                                tran[calculate.primaryMeasure(tran.attrs.security_type)] += parseFloat(ledger.credit);
                            }
                            if (calculate.isNumber(ledger.debit)) {
                                tran[calculate.primaryMeasure(tran.attrs.security_type)] -= parseFloat(ledger.debit);
                            }
                        }
                    });
                    if (calculate.primaryMeasure(tran.attrs.security_type) == "units") {
                        tran.amount = tran.attrs.amount;
                    }
                    delete tran.attrs.amount;
                });
            };

        }]
    };
});

m.directive('documentsTile', function(){
    return {
        scope: false,
        restrict: 'E',
        templateUrl:'/cmn/partials/documentsTile.html',
        controller: ['$scope', '$rootScope', 'SWBrijj', '$location',
        function($scope, $rootScope, SWBrijj, $location){


            $scope.getmyDocuments = function(){
                SWBrijj.tblm("document.this_investor_library").then(function(data){
                    $scope.myDocs = data;
                });
            };
            $scope.getmyDocuments();

            $scope.wasJustRejected = function(doc) {
                return doc.last_event && doc.last_event.activity == 'rejected';
            };

            $scope.isPendingFinalization = function(doc) {
                return (doc.signature_flow===2 && doc.when_countersigned && !doc.when_finalized);
            };

            $scope.isPendingCountersignature = function(doc) {
                return (doc.when_signed && !doc.when_countersigned && doc.signature_flow===2)
                        || (doc.when_signed && !doc.when_finalized && doc.signature_flow===1);
            };

            $scope.isPendingSignature = function(doc) {
                return doc.signature_flow>0 && !doc.when_signed;
            };

            $scope.isPendingView = function(doc) {
                return doc.signature_flow===0 && !doc.last_viewed;
            };

            $scope.isPendingVoid = function(version) {
                return version.signature_flow > 0 && !version.when_void_accepted && version.when_void_requested;
            };

            $scope.isvoided = function(version) {
                return version.signature_flow > 0 && version.when_void_accepted && version.when_void_requested;
            };


            $scope.gotoDoc = function(doc) {
                var link = "/app/documents/investor-view?doc=" + doc.doc_id;
                $location.url(link);
            };

        }]
    };
});

m.directive('integer', function() {
    // add number formatting to an input
    // useful when <input type="number"> can't be styled correctly
    return {
        restrict: 'A',
        require: 'ngModel',
        link: function(scope, elem, attr, ctrl) {
            // ctrl is ngModel controller
            ctrl.$parsers.unshift(function(val) {
                var ret = parseInt(val);
                if (isNaN(ret)) {
                    ret = undefined;
                }
                return ret;
            });
        }
    };
});

m.directive('float', function() {
    // add number formatting to an input
    // useful when <input type="number"> can't be styled correctly
    return {
        restrict: 'A',
        require: 'ngModel',
        link: function(scope, elem, attr, ctrl) {
            // ctrl is ngModel controller
            ctrl.$parsers.unshift(function(val) {
                var ret = parseFloat(val);
                if (isNaN(ret)) {
                    ret = undefined;
                }
                return ret;
            });
        }
    };
});
