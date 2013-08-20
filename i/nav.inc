<script src="/i/nav.js"></script>

<div ng-controller="NavCtrl">
  <div style="cursor: pointer;" ng-class="notification.style" ng-show="notification.visible" ng-animate="'fade'" ng-click="notification.visible = false" ng-bind="notification.message"></div>
  <div style="display:none;" ng-show="loaded" collapse="isCollapsed">
    <div class="well well-large">
      <div class="container">
        <div class="row-fluid">
          <div class="span12 text-center" >
            <div id="Login-form" class="navlogin" >
              <form>
                <fieldset>
                  <input type="text" placeholder="EMAIL ADDRESS" class="loginInput" autocomplete="off" tabindex="1" autocapitalize="off" name="username" ng-model="username">
                  <input placeholder="PASSWORD" class="loginInput" autocomplete="off" tabindex="2" name="password"  type="password" ng-model="password">           
                  <button class="button greenButton" id="submitLogin" type="submit" ng-disabled="fieldCheck()" ng-class="loginClass()" ng-click="doLogin()" tabindex="3">Login</button>
                  <a ng-click="isCollapsed = !isCollapsed"><span data-icon="&#xe00f;" aria-hidden="true"></span></a>
                  <br>
                  <span class="forgotLog"><a href="/login/forgot">Forgot Password?</a></span>             
                </fieldset>
              </form>
            </div>
          </div>
        </div>
      </div>  
    </div> 
  </div>

  <div id="{{nav}}">
    <div class="navbar topnav row-fluid">
      <div ng-class="{navbounder:!showLogin, navpadding:showLogin}">
        <ul class="nav pull-left nav-logo">
          <li><a href="/" ng-href="{{logoLink}}"><img src="/img/logo.png"/></a></li>
        </ul>
        <ul class="nav pull-right nav-item">
          <li style="display: none;" class="dropdown" ng-show="isLoggedIn">
            <a class="dropdown-toggle menuProfileText" data-toggle="dropdown" href="#">PROFILE<b class="caret"></b></a>
            <ul class="dropdown-menu">
              <li><a class="menuProfileText button" href="/investor/profile">MY ACCOUNT</a></li>
              <li ng-show="selected.isAdmin"><a class="menuProfileText button" href="/company/profile">MY COMPANY</a></li>
              <li><a class="menuProfileText button" href="/login/logout">LOGOUT</a></li>
            </ul>
          <li>
          <li class="dropdown hidden-phone" ng-hide="isLoggedIn">
            <a style="display: none;" class="menuProfileText" href="javascript:void(0)" ng-click="isCollapsed = !isCollapsed" ng-show="showLogin">LOGIN</a>
          <li>
        </ul>
      </div>
    </div>
    <div style="display:none" class="bottomnav navbar row-fluid" ng-show="showBothBars">
      <div class="navbounder">
        <ul class="menuHeaderText nav">
          <li ng-class="{dropdown: companies.length > 1}">
            <a class="menu_dropdown dropdown-toggle" ng-class="{'no-hover':companies.length == 1}" ng-href="{{{true: '#', false: ''}[companies.length > 1]}}" ng-bind="selected.name"></a>
            <b class="fauxcaret" ng-show="companies.length > 1"></b>
            <ul class="dropdown-menu" ng-show="companies.length > 1">
              <li class="button" ng-repeat="company in companies">
                <a class="button" ng-click="switch('{{company.company}}')">{{company.name}}</a>
              </li>
            </ul>
          <li>
          <li ng-show="ownership.visible" ng-class="{active: path.indexOf('/ownership') != -1}"><a class="button" href="{{ownership.link}}">Ownership</a></li>
          <li ng-show="documents.visible" ng-class="{active: path.indexOf('/documents') != -1}"><a class="button" href="{{documents.link}}">Documents</a></li>
          <li ng-show="people.visible" ng-class="{active: path.indexOf('/profile/people') != -1}"><a class="button" href="{{people.link}}">People</a></li>
        </ul>
      </div>
    </div>
  </div>
</div>

