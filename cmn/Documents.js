
function getIntProperty(se, z) {
  var lh = getComputed(se, z);
  lh = parseFloat(lh.replace("px", ""));
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
        template: '<div class="sticky">' +
            '<ul>'+
            '<li ng-click="dragMe($event)"><span data-icon="&#xe043;"</span></li>'+
            '<li ng-show="growable" ng-click="biggerMe($event)"><span data-icon="&#xe041;" aria-hidden="true"/></li>'+
            '<li ng-show="growable" ng-click="smallerMe($event)"><span data-icon="&#xe040;" aria-hidden="true"/></li>' +
            '<li ng-click="closeMe($event)"><span data-icon="&#xe01b;"></span></li></ul>'+
            '<span style="display:inline-block" ng-transclude></span>' +
            '</div>',
        link: function(scope, elm, attrs) {
          // the elm[0] is to unwrap the angular element
          document.querySelector('.docPanel').appendChild(elm[0]);
          scope.page = scope.restoredPage || scope.currentPage;
          elm.page = scope.page;
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
               var dragicon = $element.find("ul>li:first-child");

               /* This is the drag - code -- its been moved to work on the drag widget */
               $scope.mousedown = function ($event) {
                 // if ($event.target.tagName == 'DIV') {
                   $scope.initdrag($event);
                   return false;
                 // } else {
                 //   return true;
                 // }
               };

               dragicon.bind('mousedown', $scope.mousedown);

               $scope.mousemove = function ($event) {
                 var dx = $event.clientX - $scope.initialMouseX;
                 var dy = $event.clientY - $scope.initialMouseY;
                 $element.css({
                   top: $scope.startY + dy + 'px',
                   left: $scope.startX + dx + 'px'
                 });
                 return false;
               };

               $scope.mouseup = function () {
                 $document.unbind('mousemove', $scope.mousemove);
                 $document.unbind('mouseup', $scope.mouseup);
                 return false;
               };

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
               };

               $scope.biggerMe = function (ev) {
                 var elem = $element.find('textarea');
                 var fs = elem.css('font-size');
                 elem.css( 'font-size', parseInt(fs.substr(0, fs.length-2)) + 2);
                 $scope.fixBox(elem[0]);
               };

               $scope.smallerMe = function (ev) {
                 var elem = $element.find('textarea');
                 var fs = elem.css('font-size');
                 elem.css( 'font-size', parseInt(fs.substr(0, fs.length-2)) - 2);
               };


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

  $scope.unsaved = function (page) {
    var nn = $scope.notes;
    for (var i = 0; i < nn.length; i++) {
      if (nn[i].scope().page == page) return true;
    }
    return false;
  };
  $scope.isAnnotated = function (page) {
    return (!$scope.unsaved(page)) && $scope.annotated[page - 1];
  };

  $scope.init = function () {
    $scope.signable = "";
    $scope.when_signed = "";
    $scope.notes=[];

    SWBrijj.tblmm($scope.$parent.pages, 'annotated,page'.split(','), "doc_id", $scope.docId).then(function(data) {
      $scope.docLength = data.length;
      // does scaling happen here?
      $scope.currentPage = 1;
      $scope.annotated = new Array(data.length);
      for(var i=0;i<data.length;i++) {
        $scope.annotated[data[i].page-1] = data[i].annotated;
      }
    });
    SWBrijj.tblm($scope.$parent.library, "doc_id", $scope.docId).then(function(data) {
      $scope.signable = data["signature_status"] == 'signature requested';
      $scope.signed = data["when_signed"];
      if (data['annotations']) {
        // restoreNotes
        var annots = eval(data['annotations']);
        var sticky;
        for(var i = 0;i<annots.length;i++) {
          var annot = annots[i];
          if (annot[1] == 'check') {
            sticky = $scope.newCheckX(annot[0][0]);
          } else if (annot[1] == 'text') {
            sticky = $scope.newBoxX(annot[0][0],annot[2][0], annot[3]);
          } else if (annot[1] == 'canvas') {
            sticky = $scope.newPadX(annot[0][0], annot[2][0]);
          }
          // the notes were pushed in the newXXX function
          sticky.css({
            top:  annot[0][4],
            left: annot[0][3]
          });

        }
      } // json struct



    });
  };

  $scope.closeMe = function (ev) {
    var z = ev.currentTarget;
    while (z.attributes.draggable === undefined) z = z.parentElement;
    z.parentElement.removeChild(z);
    for (var i = 0; i < $scope.notes.length; i++) {
      if ($scope.notes[i][0] === z) {
        $scope.notes.splice(i, 1);
        return;
      }
    }
  };

  $scope.nextPage = function(value) { 
    if ($scope.currentPage < $scope.docLength) {
      $scope.currentPage = value+1; 
    }
  };
  $scope.previousPage = function(value) { 
    if ($scope.currentPage > 1) {
      $scope.currentPage = value-1; 
    }
  };
  
  $scope.jumpPage = function(value) {
    $scope.currentPage = value; };

  $scope.range = function(start, stop, step){
    if (typeof stop=='undefined'){ stop = start; start = 0; }
    if (typeof step=='undefined'){ step = 1; }
    if ((step>0 && start>=stop) || (step<0 && start<=stop)) return [];
    var result = [];
    for (var i=start; step>0 ? i<stop : i>stop; i+=step) result.push(i);
    return result;
  };
  $scope.newBox = function (event) {
    var aa = $scope.newBoxX($scope.currentPage, '', null);
    aa.scope().initdrag(event);
  };

  $scope.fixBox = function(bb) {
    var pad;
    if (bb.clientHeight < bb.scrollHeight) {
      pad = getIntProperty(bb, 'padding-top') + getIntProperty(bb,'padding-bottom');
      bb.style.height = (bb.scrollHeight - pad) + "px";
    }
    if (bb.clientWidth < bb.scrollWidth) {
      pad = getIntProperty(bb, 'padding-left') + getIntProperty(bb,'padding-right');
      bb.style.width = (bb.scrollWidth - pad) +"px";
    }
  }
  $scope.newBoxX = function(page, val, style) {
    $scope.restoredPage = page;
    var aa = $compile('<div draggable ng-show="currentPage=='+page+'"	 class="row-fluid draggable" >'+
        '<textarea ng-model="annotext" class="row-fluid"/></div>')($scope);
    aa.scope().ntype='text';
    aa.scope().growable = true; // for the growable icons
    var bb = aa[0].querySelector("textarea");
/*    window.setInterval( function() {
       if (bb.clientHeight < bb.scrollHeight) bb.style.height = (bb.scrollHeight+5) +"px";
       if (bb.clientWidth < bb.scrollWidth) bb.style.width = (bb.scrollWidth + 5) +"px";
    }, 300);
    */
    bb.addEventListener('input', function(e) { $scope.fixbox(bb); });
    var ta = aa.find('textarea');
    ta.scope().annotext = val;
    ta.width( ta.width() );
    if (style) {
      aa.find('textarea').css('fontSize',style[0]);
    }
    return aa;
  };

  $scope.newCheck = function(event) {
    var aa = $scope.newCheckX($scope.currentPage);
    aa.scope().initdrag(event);
  };
  $scope.newCheckX = function (page) {
    $scope.restoredPage = page;
    var aa = $compile('<div draggable ng-show="currentPage==' + page + '"	 class="row-fluid draggable">' +
        '<span class="check-annotation" data-icon="&#xe023;"></i>' +
        '</div>')($scope);
    aa.scope().ntype = 'check';
    return aa;
  };
  $scope.newDate = function(event) {
    var d = new Date();
    var fmtdat = (d.getMonth() + 1) + "/" + d.getDate() + "/" + d.getFullYear();
    var aa = $scope.newBoxX($scope.currentPage, fmtdat);
    aa.scope().initdrag(event);
    return aa;
  };

  $scope.newPad = function (event) {
    var aa = $scope.newPadX($scope.currentPage, []);
    aa.scope().initdrag(event);
  };
  $scope.newPadX = function(page,lines) {
    $scope.restoredPage = page;
    var aa = $compile('<div draggable ng-show="currentPage=='+page+'"	 class="row-fluid draggable">'+
        '<canvas style="background-color:white"></canvas></div>')($scope);
    aa.scope().ntype='canvas';
    aa.css({resize: 'both',overflow:'hidden'});

    aa[0].addEventListener('mouseup', function(e) {
      if (e.target.tagName == 'DIV') {
        console.log('resizing?');
        console.log(e);
        aa.find('canvas')[0].width = ( aa.width() - 8);
        aa.find('canvas')[0].height = (aa.height() - 28);
      }
    });
    aa[0].addEventListener('mousemove', function(e) {
      if (e.target.tagName == 'DIV') {
        console.log('resizing?');
        console.log(e);
      }
    });
    aa[0].addEventListener('mousedown',function(e) {
      console.log('resizing?');
      console.log(e);
    });

    var canvas = aa[0].querySelector('canvas');
    var ctx = canvas.getContext('2d');
    ctx.lineCap = 'round';
    ctx.color = 'blue';
    ctx.lineWidth = 2;
    ctx.fillStyle = 'white';
    ctx.setAlpha(0);
    ctx.fillRect(0,0,200,200);
    ctx.setAlpha(0.5);

    canvas.addEventListener('mousedown', function(e) {
      this.down = true;
      this.X = e.offsetX ;
      this.Y = e.offsetY ;
    }, false);
    canvas.addEventListener('mouseover', function(e) { this.down = false; });
    canvas.addEventListener('mouseout', function(e) { this.down = false; });
    canvas.addEventListener('mouseup', function() { this.down = false; });

    canvas.strokes = [];
    canvas.addEventListener('mousemove', function(e) {
      if(this.down) {
        with(ctx) {
          beginPath();
          moveTo(this.X, this.Y);
          lineTo(e.offsetX , e.offsetY );
          strokeStyle = this.color;
          canvas.strokes.push([this.color, this.X, this.Y, e.offsetX, e.offsetY]);
          stroke();
        }
        this.X = e.offsetX ;
        this.Y = e.offsetY ;
      }
    }, true); // cancel bubble
    for(var i=0;i<lines.length;i++) {
      var line = lines[i];
      with(ctx) {
        beginPath();
        moveTo(line[1],line[2]);
        lineTo(line[3],line[4]);
        strokeStyle = line[0];
        canvas.strokes.push(line);
        stroke();
      }
    }
    return aa;
  };

  $scope.submitSign = function (sig) {
    SWBrijj.procm("document.sign_document", $scope.docId).then(function (data) {
      window.location.reload();
    }).except(function (x) {
          alert(x.message);
        });
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
  };

  $scope.rejectSign = function (sig) {
    SWBrijj.procm("document.reject_sign_document", $scope.docId).then(function (data) {
      window.location.reload();
    }).except(function (x) {
          alert(x.message);
        });
  };

  $scope.acceptSign = function (sig) {
    $scope.finalized = true;
  };

  $scope.finalizeSigns = function (event) {
    $scope.saveNotes(event);
    SWBrijj.procm("document.finalize_document", $scope.docId).then(function (data) {
      $scope.finalized = false;
      $scope.signed = true;
    }).except(function (x) {
          alert(x.message);
        });
  };

  $scope.clearNotes = function(event) {
    SWBrijj.deletePage( $scope.docId, $scope.currentPage).then(function(x) {
    var docpanel = document.querySelector(".docPanel");
    var imgurl = docpanel.style.backgroundImage;
    docpanel.style.backgroundImage = imgurl;
    });
  };

  $scope.getNoteData = function () {
    var noteData = [];
    for (var i = 0; i < $scope.notes.length; i++) {
      var n = $scope.notes[i];
      var pos = [n.page, n.width(), n.height(), n[0].style.left, n[0].style.top];
      var typ = n.scope().ntype;
      var val = [];
      var style = [];
      var ndx = [pos, typ, val, style];
      if (typ == 'text')  {
        val.push(n[0].querySelector("textarea").value);
        style.push(n.find('textarea').css('fontSize'));
      } else if (typ == 'canvas') {
        var se = n[0].querySelector("canvas");
        val.push(se.strokes);
      }
      noteData.push(ndx);
    }
    return noteData;
  };

  $scope.saveNoteData = function () {
    var nd = $scope.getNoteData();
    console.log(nd);
    SWBrijj.saveNoteData($scope.docId, JSON.stringify(nd)).then(function (data) {
      console.log(data);
    });
  };

  $scope.saveNotes = function(event) {
    var canvas = document.createElement('canvas');
    var docpanel = document.querySelector(".docPanel");
    canvas.width = docpanel.offsetWidth;
    canvas.height = docpanel.offsetHeight;
    var img = new Image();
    var imgurl = docpanel.style.backgroundImage;
    img.onload = function (x) {

      var ctx = canvas.getContext("2d");
      ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
      var canvascount = 0;

      for (var nnum = 0; nnum < $scope.notes.length; nnum++) {
        var note = $scope.notes[nnum];
        var ntype = note.scope().ntype;
        var notex = note[0];
        if (note.scope().page != note.scope().currentPage) continue;
        var se, ll, tt, lh, padx, pady, bl, bt;
        if (ntype == 'text') {
          var annotext = note.scope().$$nextSibling.annotext;
          se = notex.querySelector("textarea");

          lh = getIntProperty(se, 'line-height');
          padx = getIntProperty(se, 'padding-left');
          pady = getIntProperty(se, 'padding-top');
          bl = getIntProperty(se, 'border-left') +
              getIntProperty(notex, 'border-left');

          bt = getIntProperty(se, 'border-top') +
              getIntProperty(notex, 'border-top');

          ctx.fillStyle = "blue";
          // ctx.font = "16px Optima";
          ctx.font = getComputed(se, 'font');
          ll = notex.offsetLeft - docpanel.offsetLeft + se.offsetLeft;
          tt = notex.offsetTop - docpanel.offsetTop + se.offsetTop;

          tt += pady;
          ll += padx;

          ll += 2;
          tt -= 4;

          var anoray = annotext.split('\n');
          for (var i = 0; i < anoray.length; i++) {
            ctx.fillText(anoray[i], ll, tt + lh * (i + 1));
          }
        }
        else if (ntype == 'check') {
          ctx.fillStyle = "blue";
          ctx.font = "28px FontAwesome";
          se = notex.querySelector("i");
          ll = notex.offsetLeft - docpanel.offsetLeft + se.offsetLeft;
          tt = notex.offsetTop - docpanel.offsetTop + se.offsetHeight + se.offsetTop;
          tt -= 4;
          lh = getIntProperty(se, 'line-height');
          padx = getIntProperty(se, 'padding-left');
          pady = getIntProperty(se, 'padding-top');
          bl = getIntProperty(se, 'border-left') +
              getIntProperty(notex, 'border-left');

          bt = getIntProperty(se, 'border-top') +
              getIntProperty(notex, 'border-top');

          tt += pady;
          ll += padx;

          ctx.fillText("\uf00c", ll, tt);
        }
        else if (ntype == 'canvas') {
          se = notex.querySelector("canvas");
          ll = notex.offsetLeft - docpanel.offsetLeft + se.offsetLeft;
          tt = notex.offsetTop - docpanel.offsetTop + se.offsetTop;

          canvascount++;
          // var ctxxx = se.getContext('2d');
          var imgx = new Image();
          imgx.onload = function () {
            ctx.drawImage(imgx, ll, tt);
            canvascount--;
          };
          imgx.src = se.toDataURL("image/png");
          // var imgData=ctxxx.getImageData(0,0,se.offsetWidth, se.offsetHeight);
          // ctx.putImageData(imgData,ll,tt);
        } else if (ntype == 'date') {
           alert('date not yet implemented');
        }
      }

      var cvfin = function () {

        // TODO: if the canvascount doesnt go to zero after a while, abort somehow
        if (canvascount == 0) {
          var z = canvas.toDataURL('image/tiff');
          SWBrijj.uploadDataURL($scope.docId, $scope.currentPage, z).
              then(function (x) {
                var docpanel = document.querySelector(".docPanel");
                var imgurl = docpanel.style.backgroundImage;
                docpanel.style.backgroundImage = imgurl;
                var keepnotes = [];
                for (var i = 0; i < $scope.notes.length; i++) {
                  if ($scope.notes[i].page != $scope.currentPage) {
                    keepnotes.push($scope.notes[i]);
                  } else {
                    document.querySelector('.docPanel').removeChild($scope.notes[i][0]);
                  }
                }
                $scope.notes = keepnotes;
              }).
              except(function (x) {
                console.log(x.message);
              });
          $scope.$apply();
        } else {
          window.setTimeout(cvfin, 50);
        }

      };

      window.setTimeout(cvfin, 50);
    };
  // must set the src AFTER the onload function for IE9
    img.src=imgurl.substring(4,imgurl.length-1);
  };
}
