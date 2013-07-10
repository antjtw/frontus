<script src="/i/nav.js"></script>
<div id="navBar">
  <div class="container" ng-controller="NavCtrl">
    <div class="row-fluid">
      <section id="bannerBar">
        <div class="span12" id="homenav">
          <div class="pull-left">
            <img src="/img/email/logo.png">
          </div>
          <div class="pull-right">
            <a class="menuHeaderText button" href="/login/logout">LOGOUT</a>
          </div>
        </div>
      </section>
    </div>
    <div class="navbar navbar-inner dropdown">
      <a class="brand dropdown-toggle" href="#" ng-bind="selected">Company</a>
      <ul class="dropdown-menu">
        <li ng-repeat="company in companies">
          <a>{{company.name}}</a>
        </li>
      </ul>
      <ul class="nav">
        <li><a class="menuHeaderText button" href="">INVESTMENTS</a></li>
        <li><a class="menuHeaderText button" href="">ALERTS</a></li>
        <li><a class="menuHeaderText button" href="">SETTINGS</a></li>
      </ul>
    </div>
  </div>
</div>
