<script src="/i/nav.js"></script>
<div id="navBar">
  <div ng-controller="NavCtrl">
    <div class="navbar topnav row-fluid">
      <div class="navbounder">
        <ul class="nav pull-left nav-logo">
          <li><span class="logo" data-logo="&#xe02e;" aria-hidden="true"></li>
        </ul>
        <ul class="nav pull-right">
          <li class="dropdown">
            <a class="dropdown-toggle menuProfileText" data-toggle="dropdown" href="#">PROFILE<b class="caret"></b></a>
            <ul class="dropdown-menu">
              <li><a class="menuProfileText button" href="/investor/profile">MY ACCOUNT</a></li>
              <li ng-show="selected.isAdmin"><a class="menuProfileText button" href="/company/profile">MY COMPANY</a></li>
              <li><a class="menuProfileText button" href="/login/logout">LOGOUT</a></li>
            </ul>
          <li>
        </ul>
      </div>
    </div>
    <div class="bottomnav navbar row-fluid">
      <div class="navbounder">
        <ul class="menuHeaderText nav">
          <li class="dropdown">
            <a class="menu_dropdown dropdown-toggle" href="#" ng-bind="selected.name">Company</a>
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

<!--Notification Bar-->
<div ng-class="notification.style" ng-show="notification.visible">{{notification.message}}</div>

