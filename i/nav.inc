<script src="/i/nav.js"></script>

<div ng-controller="NavCtrl">
  <div style="display: none;" ng-class="notification.style" ng-show="notification.visible">{{notification.message}}</div>
  <div style="display:none;" ng-show="loaded" collapse="isCollapsed">
    <div class="well well-large">
      <div class="row-fluid">
        <div class="span8 offset2 text-center" >
          <div id="Login-form" >
            <form>
              <fieldset>
                <input type="email" placeholder="EMAIL ADDRESS" class="loginInput" autocomplete="off" tabindex="1" autocapitalize="off" name="username" ng-model="username">
                <input placeholder="PASSWORD" class="loginInput" autocomplete="off" tabindex="2" name="password"  type="password" ng-model="password">                
                <button class="button subText greenButton" id="submitLogin" type="submit" ng-disabled="forgotLogin()" ng-class="loginClass()" ng-click="doLogin()" tabindex="3">Login</button>
               <br>  <a href="#" >Forgotten Password</a>
               
              </fieldset>
            </form>
          </div>
        </div>
        <div class="span2 text-right" >
          <a ng-click="isCollapsed = !isCollapsed"><span data-icon="&#xe00f;" aria-hidden="true"></a>
        </div>
      </div>  
    </div> 
  </div>
  <div id="{{nav}}">
    <div class="navbar topnav row-fluid">
      <div class="navbounder">
        <ul class="nav pull-left nav-logo">
          <li><a href="/" ng-href="{{logoLink}}"><span class="logo" data-logo="&#xe02e;" aria-hidden="true"></a></li>
        </ul>
        <ul class="nav pull-right nav-item">
          <li class="dropdown" ng-show="selected.company">
            <a class="dropdown-toggle menuProfileText" data-toggle="dropdown" href="#">PROFILE<b class="caret"></b></a>
            <ul class="dropdown-menu">
              <li><a class="menuProfileText button" href="/investor/profile">MY ACCOUNT</a></li>
              <li ng-show="selected.isAdmin"><a class="menuProfileText button" href="/company/profile">MY COMPANY</a></li>
              <li><a class="menuProfileText button" href="/login/logout">LOGOUT</a></li>
            </ul>
          <li>
          <li class="dropdown" ng-hide="selected.company">
            <a class="menuProfileText" href="javascript:void(0)" ng-click="isCollapsed = !isCollapsed">LOGIN</a>
          <li>
        </ul>
      </div>
    </div>
    <div style="display:none" class="bottomnav navbar row-fluid" ng-show="showBothBars">
      <div class="navbounder">
        <ul class="menuHeaderText nav">
          <li class="dropdown">
            <a class="menu_dropdown dropdown-toggle" href="#" ng-bind="selected.name"></a>
            <b class="fauxcaret"></b>
            <ul class="dropdown-menu">
              <li class="button" ng-repeat="company in companies">
                <a class="button" ng-click="select('{{company.company}}')">{{company.name}}</a>
              </li>
            </ul>
          <li>
          <li ng-show="ownership.visible"><a class="button" href="{{ownership.link}}">Ownership</a></li>
          <li ng-show="documents.visible"><a class="button" href="{{documents.link}}">Documents</a></li>
          <li ng-show="people.visible"><a class="button" href="{{people.link}}">People</a></li>
        </ul>
      </div>
    </div>
  </div>
</div>

