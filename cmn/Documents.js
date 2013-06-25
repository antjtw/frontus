

angular.module('draggable', []).
    directive('draggable', ['$document' , function($document) {
      return {
        restrict: 'A',
        link: function(scope, elm, attrs) {
          var startX, startY, initialMouseX, initialMouseY;
          elm.css({position: 'absolute'});

          elm.bind('mousedown', function($event) {
                if ($event.target.tagName == 'DIV') {
                  startX = elm.prop('offsetLeft');
                  startY = elm.prop('offsetTop');
                  initialMouseX = $event.clientX;
                  initialMouseY = $event.clientY;
                  $document.bind('mousemove', mousemove);
                  $document.bind('mouseup', mouseup);
                  return false;
                } else {
                  return true;
                }
              }

          );

          function mousemove($event) {
            var dx = $event.clientX - initialMouseX;
            var dy = $event.clientY - initialMouseY;
            elm.css({
              top:  startY + dy + 'px',
              left: startX + dx + 'px'
            });
            return false;
          }

          function mouseup() {
            $document.unbind('mousemove', mousemove);
            $document.unbind('mouseup', mouseup);
          }


          function initdrag(ev) {
//            startX = elm.prop('offsetLeft');
//            startY = elm.prop('offsetTop');
            startX = ev.clientX-5;
            startY = ev.clientY-5 + $document.scrollTop();
            initialMouseX = ev.clientX;
            initialMouseY = ev.clientY;
            mousemove(ev);
            $document.bind('mousemove', mousemove);
            $document.bind('mouseup', mouseup);
          }

          scope.initdrag = initdrag;
        }
      };
    }]);



var docs = angular.module('documents', ['ui.bootstrap','brijj','draggable']);

docs.directive('modaldelete', function() {
  return {
    restrict: 'EA',
    templateUrl: "modalDelete.html",
    replace:true,
    priority: 20
  }
});

docs.directive('modalupload', function($timeout) {
  return {
    restrict: 'EA',
    templateUrl: "modalUpload.html",
    link: function(scope, element, attrs) {
      scope.$watch('upModal', function(val, oldVal) {
          if (val) $timeout(function() {scope.draginit(element);} ) ;
      }); },
    replace:true,
    priority: 20
  }
});

docs.directive('backImg', function(){
  return {
    restrict: 'A',
    link: function(scope, element, attrs){
      attrs.$observe('backImg', function(url) {
        element.css({
          'background-image': 'url(' + url +')',
          'background-size' : 'cover'
        });
      });
    }
  }
});

docs.directive('docViewer', function() {
  return {
    restrict: 'EA',
    scope: { docId: '=docId', invq:'=invq' },
    templateUrl: '/cmn/docViewer.html',
    controller: DocumentViewController
  }
});

docs.filter('fromNow', function() {
  return function(date) {
    return moment(date).fromNow();
  }
});

function DocumentViewController($scope, $compile, $document, SWBrijj) {
  $scope.currentPage = 1;

  $scope.init = function () {
    $scope.signable = "";
    $scope.notes=[];

    SWBrijj.tblm("document.my_investor_doc_length", "doc_id", $scope.docId).then(function(data) {
      $scope.docLength = data.page_count;
      // does scaling happen here?
      $scope.currentPage = 1;
    });
    SWBrijj.tblm("document.my_investor_library", "doc_id", $scope.docId).then(function(data) {
      $scope.signable = data["signature_requested"] ? 0 : 2;
    });
  };

  $scope.nextPage = function(value) { $scope.currentPage = value+1; };
  $scope.previousPage = function(value) { $scope.currentPage = value-1; };
  $scope.jumpPage = function(value) {
    $scope.currentPage = value; };

  $scope.range = function(start, stop, step){
    if (typeof stop=='undefined'){ stop = start; start = 0; };
    if (typeof step=='undefined'){ step = 1; }
    if ((step>0 && start>=stop) || (step<0 && start<=stop)) return [];
    var result = [];
    for (var i=start; step>0 ? i<stop : i>stop; i+=step) result.push(i);
    return result;
  };

  $scope.newBox = function(event) {
    var nscope = $scope.$new();
    nscope.ntype = 'text';
    $scope.notes.push(nscope);
    var aa = $compile('<div draggable ng-show="currentPage=='+$scope.currentPage+'"	 class="row-fluid draggable" ><textarea ng-model="annotext" class="row-fluid" type="textarea"/></div>')(nscope);
    aa = aa[0];
    nscope.element = aa;
    document.querySelector('.docPanel').appendChild(aa);
    nscope.initdrag(event);
    // aa.style.top = event.currentTarget.clientY+"pt";
    // aa.style.left = event.currentTarget.clientX+"pt";

  };

  $scope.newCheck = function(event) {
    var nscope = $scope.$new();
    nscope.ntype='check';
    $scope.notes.push(nscope);
    var aa = $compile('<div draggable ng-show="currentPage=='+$scope.currentPage+'"	 class="row-fluid draggable">'+
        '<i class="button icon-ok icon-2x" background-color:white"></i></div>')(nscope);
    aa = aa[0];
    nscope.element = aa;
    document.querySelector('.docPanel').appendChild(aa);
    nscope.initdrag(event);
    // aa.style.top = event.currentTarget.clientY+"pt";
    // aa.style.left = event.currentTarget.clientX+"pt";
  };

  $scope.newPad = function(event) {
    var nscope = $scope.$new();
    nscope.ntype='canvas';
    $scope.notes.push(nscope);
    var aa = $compile('<div draggable ng-show="currentPage=='+$scope.currentPage+'"	 class="row-fluid draggable">'+
        '<canvas style="background-color:white"></canvas></div>')(nscope);
    aa = aa[0];
    nscope.element = aa;
    document.querySelector('.docPanel').appendChild(aa);
    nscope.initdrag(event);
    // aa.style.top = event.currentTarget.clientY+"pt";
    // aa.style.left = event.currentTarget.clientX+"pt";
  };

  $scope.submitSign = function(sig) {
    alert("not yet implemented: submitSign");
    /*
     if (sig == false || sig == undefined) {
     alert("Need to click the box");
     }
     if (sig == true) {
     SWBrijj.procm("document.sign_document", parseInt(docId)).then(function(data) {
     $scope.signable = 1;
     $scope.$apply();
     });
     }
     */
  }

  $scope.clearNotes = function(event) {
    SWBrijj.deletePage( $scope.docId, $scope.currentPage);
  };

  $scope.saveNotes = function(event) {
    var canvas = document.createElement('canvas');
    var docpanel = document.querySelector(".docPanel");
    canvas.width = docpanel.offsetWidth;
    canvas.height = docpanel.offsetHeight;
    var img = new Image();
    var imgurl = docpanel.style.backgroundImage;
    img.onload = function(x) {

    var ctx = canvas.getContext("2d");
      ctx.drawImage(img, 0, 0, canvas.width, canvas.height);

      for(var i = 0; i<$scope.notes.length;i++) {
        var note = $scope.notes[i];

        if (note.ntype == 'text') {
          ctx.fillStyle = "blue";
          ctx.font = "16px Optima";
          var se = note.element.querySelector("textarea");
          var ll = note.element.offsetLeft  - docpanel.offsetLeft + se.offsetLeft;
          var tt = note.element.offsetTop - docpanel.offsetTop + se.offsetHeight;
          ctx.fillText(note.annotext, ll + 4, tt - 4);
        }
        if (note.ntype == 'check') {
          ctx.fillStyle = "darkgray";
          ctx.font = "28px FontAwesome";
          var se = note.element.querySelector("i");
          var ll = note.element.offsetLeft  - docpanel.offsetLeft + se.offsetLeft;
          var tt = note.element.offsetTop - docpanel.offsetTop + se.offsetHeight;
          ctx.fillText("\uf00c", ll + 4 , tt - 4);
        }
        if (note.ntype == 'canvas') {
          alert('canvas saving not yet implemented');
        }
      }





    var z = canvas.toDataURL('image/tiff');
    SWBrijj.uploadDataURL($scope.docId, $scope.currentPage, z).then(function(x) { console.log(x);}).
    except(function(x) { console.log(x.message); } );
    return;
    }
  // must set the src AFTER the onload function for IE9
    img.src=imgurl.substring(4,imgurl.length-1);
  };
}
