
function getIntProperty(se, z) {
  var lh = getComputed(se, z);
  lh = parseFloat(lh.replace("px",""))
  return lh;
}

function getComputed(se, z) {
  return (se.currentStyle) ? se.currentStyle[z] : document.defaultView.getComputedStyle(se, null).getPropertyValue(z);
}

angular.module('draggable', []).
    directive('draggable', ['$document' , function($document) {
      return {
        restrict: 'EA',
        replace: true,
        transclude: true,
        scope: true,
        template: "<div>" +
            '<span style="display:inline-block" ng-transclude></span>' +
            '<ul style="float:right; display:inline-block; list-style-type:none; cursor:pointer"><li ng-click="closeMe($event)" style="line-height:14px"><i class="icon-remove-sign"></i></li><li ng-click="biggerMe(element,$event)" style="line-height:14px"><i class="icon-font"></i><i class="icon-arrow-up"></i></li><li ng-click="smallerMe(element,$event)" style="line-height:14px"><i class="icon-font"></i><i class="icon-arrow-down"></i></li></ul>' +
            "</div>",
        link: function(scope, elm, attrs) {
          // the elm[0] is to unwrap the angular element
          document.querySelector('.docPanel').appendChild(elm[0]);
          scope.page = scope.currentPage;
          elm.page = scope.currentPage;
          scope.$parent.notes.push(elm);
          elm.css({position: 'absolute'});
        },

           controller: ["$scope", "$element", "$attrs", "$transclude",
             function($scope, $element, $attrs, $transclude, otherInjectables) {

    /*           $transclude(function(clone, scope) {
                 $scope.annotation = scope;
                 // $element.prepend(clone);
               });
      */
               $scope.mousedown = function($event) {
                 if ($event.target.tagName == 'DIV') {
                   $scope.initdrag($event);
                   return false;
                 } else {
                   return true;
                 }
               }
               $element.bind('mousedown', $scope.mousedown);
               $scope.mousemove = function($event) {
                 var dx = $event.clientX - $scope.initialMouseX;
                 var dy = $event.clientY - $scope.initialMouseY;
                 $element.css({
                   top:  $scope.startY + dy + 'px',
                   left: $scope.startX + dx + 'px'
                 });
                 return false;
               }

               $scope.mouseup = function() {
                 $document.unbind('mousemove', $scope.mousemove);
                 $document.unbind('mouseup', $scope.mouseup);
               }

               $scope.initdrag = function(ev) {
//            startX = elm.prop('offsetLeft');
//            startY = elm.prop('offsetTop');
                 $scope.startX = ev.clientX-5;
                 $scope.startY = ev.clientY-5 + $document.scrollTop();
                 $scope.initialMouseX = ev.clientX;
                 $scope.initialMouseY = ev.clientY;
                 $scope.mousemove(ev);
                 $document.bind('mousemove', $scope.mousemove);
                 $document.bind('mouseup', $scope.mouseup);
               }

             }]
      };
    }])
    /*.directive('checkbox', function() {
      return {
        restrict: 'A',
        template: '<i class="button icon-ok icon-2x" background-color:white"></i>'
      }}) */;



var docs = angular.module('documents', ['ui.bootstrap','brijj','draggable']);

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
    scope: { docId: '=docId', invq:'=invq', finalized:'=finalized', needsign:'=needsign', countersign:'=countersign'},
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

  $scope.unsaved = function(page) {
    var nn = $scope.notes;
    for(var i = 0; i < nn.length; i++) {
      if ( nn[i].scope().page == page) return true;
    }
    return false;
  }
  $scope.init = function () {
    $scope.signable = "";
    $scope.when_signed = "";
    $scope.notes=[];

    SWBrijj.tblm($scope.$parent.pages, "doc_id", $scope.docId).then(function(data) {
      $scope.docLength = data.page_count;
      // does scaling happen here?
      $scope.currentPage = 1;
    });
    SWBrijj.tblm($scope.$parent.library, "doc_id", $scope.docId).then(function(data) {
      $scope.signable = data["signature_status"] == 'signature requested';
      $scope.signed = data["when_signed"];
    });
  };

  $scope.closeMe = function(ev) {
    var z = ev.currentTarget;
    while(z.attributes.draggable === undefined) z= z.parentElement;
    z.parentElement.removeChild(z);
    for(var i=0;i<$scope.notes.length; i++) {
      if ($scope.notes[i][0] === z) { $scope.notes.splice(i,1);
        return; }
    }
  }

  $scope.biggerMe = function(elem,ev) {
    alert("make me bigger");
  }

  $scope.smallerMe = function(elem,ev) {
    alert("make me smaller");
  }

  $scope.nextPage = function(value) { 
    if ($scope.currentPage < $scope.docLength) {
      $scope.currentPage = value+1; 
    }
  };
  $scope.previousPage = function(value) { 
    if ($scope.currentPage > 1) {
      $scope.currentPage = value-1; 
    };
  };
  
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
    var aa = $compile('<div draggable ng-show="currentPage=='+$scope.currentPage+'"	 class="row-fluid draggable" >'+
        '<textarea ng-model="annotext" class="row-fluid" type="textarea" style="white-space: nowrap; overflow: hidden; height: 20px;"/></div>')($scope);
    aa.scope().initdrag(event);
    aa.scope().ntype='text';
    bb = aa[0].querySelector("textarea");
/*    window.setInterval( function() {
       if (bb.clientHeight < bb.scrollHeight) bb.style.height = (bb.scrollHeight+5) +"px";
       if (bb.clientWidth < bb.scrollWidth) bb.style.width = (bb.scrollWidth + 5) +"px";
    }, 300);
    */
    bb.addEventListener('input', function(e) {
      if (bb.clientHeight < bb.scrollHeight) {
        var pad = getIntProperty(bb, 'padding-top') + getIntProperty(bb,'padding-bottom');
        bb.style.height = (bb.scrollHeight - pad) + "px";
      }
      if (bb.clientWidth < bb.scrollWidth) {
        var pad = getIntProperty(bb, 'padding-left') + getIntProperty(bb,'padding-right');
        bb.style.width = (bb.scrollWidth - pad) +"px";
      }
    }, 0);
  };

  $scope.newCheck = function(event) {
    var aa = $compile('<div draggable ng-show="currentPage=='+$scope.currentPage+'"	 class="row-fluid draggable">'+
        '<i class="button icon-ok icon-2x" background-color:white"></i>' +
        '</div>')($scope);
    aa.scope().initdrag(event);
    aa.scope().ntype='check'
  };

  $scope.newPad = function(event) {
    var aa = $compile('<div draggable ng-show="currentPage=='+$scope.currentPage+'"	 class="row-fluid draggable">'+
        '<canvas style="background-color:white"></canvas></div>')($scope);
    aa.scope().initdrag(event);
    aa.scope().ntype='canvas';



    var canvas = aa[0].querySelector('canvas');
    var ctx = canvas.getContext('2d');
    ctx.lineCap = 'round';
    this.color='blue';
    ctx.lineWidth = '2';
    ctx.fillStyle = 'white'
    ctx.setAlpha(0);
    ctx.fillRect(0,0,200,200);
    ctx.setAlpha(0.5);

    canvas.addEventListener('mousedown', function(e) {
      this.down = true;
      this.X = e.offsetX ;
      this.Y = e.offsetY ;
    }, 0);
    canvas.addEventListener('mouseup', function() {
      this.down = false;
    }, 0);
    canvas.addEventListener('mousemove', function(e) {
      this.style.cursor = 'pointer';
      if(this.down) {
        with(ctx) {
          beginPath();
          moveTo(this.X, this.Y);
          lineTo(e.offsetX , e.offsetY );
          strokeStyle = this.color;
          stroke();
        }
        this.X = e.offsetX ;
        this.Y = e.offsetY ;
      }
    }, 0);

  };

  $scope.submitSign = function(sig) {
    SWBrijj.procm("document.sign_document", $scope.docId).then(function(data) {
       window.location.reload();
    }).except(function(x) { alert(x.message); });
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

  $scope.rejectSign = function(sig) {
    SWBrijj.procm("document.reject_sign_document", $scope.docId).then(function(data) {
       window.location.reload();
    }).except(function(x) { alert(x.message); });
  }

  $scope.acceptSign = function(sig) {
    $scope.finalized = true;
  }

  $scope.finalizeSigns = function(event) {
    $scope.saveNotes(event);
    SWBrijj.procm("document.finalize_document", $scope.docId).then(function(data) {
      $scope.finalized = false;
      $scope.signed = true;
    }).except(function(x) { alert(x.message); });
  }

  $scope.clearNotes = function(event) {
    SWBrijj.deletePage( $scope.docId, $scope.currentPage).then(function(x) {
    var docpanel = document.querySelector(".docPanel");
    var imgurl = docpanel.style.backgroundImage;
    docpanel.style.backgroundImage = imgurl;
    });
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
       var canvascount = 0;

      for(var nnum = 0; nnum<$scope.notes.length;nnum++) {
        var note = $scope.notes[nnum];
        var ntype = note.scope().ntype;
        var notex = note[0];
        if (note.scope().page != note.scope().currentPage) continue;
        if (ntype == 'text') {
          var annotext = note.scope().$$nextSibling.annotext;
          var se = notex.querySelector("textarea");

          var lh = getIntProperty(se, 'line-height');
          var padx = getIntProperty(se, 'padding-left');
          var pady = getIntProperty(se, 'padding-top');
          var bl = getIntProperty(se, 'border-left') +
                   getIntProperty(notex, 'border-left');

          var bt = getIntProperty(se, 'border-top') +
              getIntProperty(notex, 'border-top');

          ctx.fillStyle = "blue";
          // ctx.font = "16px Optima";
          ctx.font = getComputed(se,'font');
          var ll = notex.offsetLeft  - docpanel.offsetLeft + se.offsetLeft;
          var tt = notex.offsetTop - docpanel.offsetTop + se.offsetTop;

          tt += pady;
          ll += padx;

          ll += 2;
          tt -= 4;

          var anoray = annotext.split('\n');
          for(var i=0;i<anoray.length;i++) {
            ctx.fillText(anoray[i], ll, tt + lh * (i+1));
          }
        }
        else if (ntype == 'check') {
          ctx.fillStyle = "blue";
          ctx.font = "28px FontAwesome";
          var se = notex.querySelector("i");
          var ll = notex.offsetLeft  - docpanel.offsetLeft + se.offsetLeft;
          var tt = notex.offsetTop - docpanel.offsetTop + se.offsetHeight + se.offsetTop;

          tt -= 4
          var lh = getIntProperty(se, 'line-height');
          var padx = getIntProperty(se, 'padding-left');
          var pady = getIntProperty(se, 'padding-top');
          var bl = getIntProperty(se, 'border-left') +
              getIntProperty(notex, 'border-left');

          var bt = getIntProperty(se, 'border-top') +
              getIntProperty(notex, 'border-top');

          tt += pady;
          ll += padx;


          ctx.fillText("\uf00c", ll , tt);
        }
        else if (ntype == 'canvas') {
          var se = notex.querySelector("canvas");
          var ll = notex.offsetLeft  - docpanel.offsetLeft + se.offsetLeft;
          var tt = notex.offsetTop - docpanel.offsetTop + se.offsetTop;


          canvascount ++;
          var ctxxx = se.getContext('2d');
           var imgx = new Image();
          imgx.onload = function() {
            ctx.drawImage(imgx, ll, tt);
            canvascount --;
          }
          imgx.src = se.toDataURL("image/png");
          // var imgData=ctxxx.getImageData(0,0,se.offsetWidth, se.offsetHeight);
          // ctx.putImageData(imgData,ll,tt);
        }
      }


    var cvfin = function() {

      // TODO: if the canvascount doesnt go to zero after a while, abort somehow
      if (canvascount == 0) {
        var z = canvas.toDataURL('image/tiff');
        SWBrijj.uploadDataURL($scope.docId, $scope.currentPage, z).
            then(function(x) {
              var docpanel = document.querySelector(".docPanel");
              var imgurl = docpanel.style.backgroundImage;
              docpanel.style.backgroundImage = imgurl;

              for(var i = 0;i<$scope.notes.length;i++) {
                if (note.scope().page != note.scope().currentPage) continue;
                document.querySelector('.docPanel').removeChild($scope.notes[i][0]);
              }
              $scope.notes = [];
            }).
            except(function(x) {
              console.log(x.message); } );
        $scope.$apply();
        return;



      } else {
        window.setTimeout(cvfin, 50);
      }

    };

    window.setTimeout(cvfin, 50);
    }
  // must set the src AFTER the onload function for IE9
    img.src=imgurl.substring(4,imgurl.length-1);
  };
}
