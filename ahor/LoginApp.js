//app for the program
var app = angular.module('LoginApp', ['ngResource']);

//this is used to define a global list of users that can be accessed from all controllers
//it also d
app.factory('loginList', function(){
    var users = [{Username: 'Test', Password: 'password'},
        {Username: 'Adam', Password: 'pass'}];
    var userService = {};

    //adds user to the list
    userService.addUser = function(item){
        users.push(item);
    };

    //removes user from the list
    userService.removeUser = function(item){
        var index = users.indexOf(item);
        users.splice(index, 1);
    };

    //gets list of users
    userService.getUsers = function(){
        return users;
    };

    return userService;
});

//this is used to assign the correct template and controller for each URL path
app.config(function($routeProvider){
  $routeProvider.
      when('/', {controller:LoginCtrl, templateUrl:'login.html'}).
      when('/home/:userName', {controller:HomeCtrl, templateUrl:'home.html'}).
      when('/register', {controller:RegisterCtrl, templateUrl: 'register.html'}).
      otherwise({redirectTo:'/'});
});

//Controller for the Login Page
function LoginCtrl($scope, $location, loginList){
    $scope.loginList = loginList;

    //checks login information
    $scope.checkLogin = function(){
        var paragraph = document.getElementById("error");
        var userName = false;
        angular.forEach($scope.loginList.getUsers(), function(user){
            //if user exists
            if($scope.user == user.Username){
                  userName = true;
                  //if password matches that user
                  if($scope.pass == user.Password){
                      //redirect to user homepage
                      $location.path('/home/' + user.Username);
                  }
                  else{
                      //otherwise alert user of the error
                      paragraph.innerHTML = "Your password does not match your username.";
                  }
              }
        });
        if(userName == false){
            paragraph.innerHTML = "This username does not exist.";
        }
    };
}

//Controller for the home page
function HomeCtrl($scope, $routeParams){
    //gets user name from the paramater in the URL
    $scope.user = function(){
      return $routeParams.userName;
    };
}

//Controller for register page
function RegisterCtrl($scope, $location, loginList){
    $scope.loginList = loginList;

    //function to check register information
    $scope.checkRegister = function(){
        var userName = false;
        var paragraph = document.getElementById("error2");
        //make sure the user doesn't already exist
        angular.forEach($scope.loginList.getUsers(), function(user){
           if($scope.user == user.Username){
               userName = true;
               paragraph.innerHTML = user.Username + " already exists. Please choose another one.";
           }
        });

        //if username doesn't exist
        if(userName == false){
            //if passwords don't match
            if($scope.pass != $scope.pass2){
                paragraph.innerHTML = "Your passwords do not match.";
            }
            //add user and redirect to login
            else{
                loginList.addUser({Username: $scope.user, Password: $scope.pass});
                $location.path('/');
            }
        }
    };

}

