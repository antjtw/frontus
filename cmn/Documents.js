
function getIntProperty(se, z) {
  var lh = getComputed(se, z);
  lh = parseFloat(lh.replace("px", ""));
  return lh;
}

function getComputed(se, z) {
  return se.currentStyle ? se.currentStyle[z] : document.defaultView.getComputedStyle(se, null).getPropertyValue(z);
}

function getNoteBounds(n) {
  var dp = document.querySelector('.docPanel');
  var dpo = [ dp.offsetLeft, dp.offsetTop];
  var bds = [ getIntProperty(n[0],'left'), getIntProperty(n[0], 'top'),0,0];
  var ntyp = n.scope().ntype;
  var z, ibds;
  if (ntyp == 'text') {
    var t = n.find('textarea')[0];
    z = t.offset;
    ibds = [z[0], z[1], z[2], z[3]];
    ibds[0] += t.offsetLeft; // + getIntProperty(t,'padding-left');
    ibds[1] += t.offsetTop; // + getIntProperty(t,'padding-top');
  } else if (ntyp == 'canvas') {
    var c = n.find('canvas')[0];
    z = c.offset;
    ibds = [z[0], z[1], z[2], z[3]];
    ibds[0] += c.offsetLeft; // + getIntProperty(t,'padding-left');
    ibds[1] += c.offsetTop; // + getIntProperty(t,'padding-top');
  } else if (ntyp == 'check') {
    ibds = [12, 27, 14, 14];
//    ibds[0]+= t.offsetLeft + getIntProperty(t,'padding-left');
//    ibds[1]+= t.offsetTop + getIntProperty(t,'padding-top');
  }
  ibds[0]-=dpo[0];
  ibds[1]-=dpo[1];

  return [bds,ibds];
}

function countCRs(str) {
  var z = str;
  var cnt = 0;
  while(true) {
    var a = z.indexOf('\n');
    if (a < 0) return cnt;
    cnt++;
    z = z.substring(a+1);
  }
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
            '<li></li>' +
            '<li ng-click="closeMe($event)"><span data-icon="&#xe01b;"></span></li></ul>'+
            '<span ng-transclude></span>' +
            '</div>',
        link: function(scope, elm, attrs) {
          // the elm[0] is to unwrap the angular element
          document.querySelector('.docPanel').appendChild(elm[0]);
          scope.page = scope.restoredPage || scope.currentPage;
          elm.page = scope.page;
          scope.$parent.notes.push(elm);
          elm.css({position: 'absolute'});
        },

           controller: ["$scope", "$element", function($scope, $element) {

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
                   top: ($scope.startY + dy) + 'px',
                   left: ($scope.startX + dx) + 'px'
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
                 var dp = document.querySelector(".docPanel");
                 var dpr = dp.getBoundingClientRect();
                 var dprl = dpr.left - dp.offsetLeft;
                 var dprt =  dpr.top - dp.offsetTop;
                 $scope.startX = ev.clientX-dprl - ev.offsetX;
                 $scope.startY = ev.clientY-dprt - ev.offsetY; // +document.scrollTop() ?
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
                 $scope.fixBox(elem[0]);
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
    scope: { docId: '=docId', invq:'=invq', pageQueryString: '=pageQueryString'},
    templateUrl: '/cmn/docViewer.html',
    controller: DocumentViewController
  }
});

docs.filter('fromNow', function() {
  return function(date) {
    return moment(date).fromNow();
  }
});

docs.directive('icon', function() {
  return {
    restrict: 'E',
    template: '<button><span data-icon="&#xe00d;" aria-hidden="true"></span></button>'
  }
});

function DocumentViewController($scope, $compile, $route, $location, $routeParams, $rootScope, $window, SWBrijj) {


  $window.addEventListener('beforeunload', function(event) {
    var ndx = $scope.getNoteData();
    if ( (!$scope.lib) || ndx == $scope.lib.annotations) return; // no changes
    // This is a synchronous save
    var res = SWBrijj._sync('SWBrijj','saveNoteData',[$scope.docId, $scope.invq, !$scope.lib.original, ndx]);
    // console.log(res);   // I expect this returns true (meaning updated).  If not, the data is lost
    if (!res) alert('failed to save annotations');
  });

  /* Save the notes when navigating away */
  $rootScope.$on('$locationChangeStart', function(event, newUrl, oldUrl) {
    if (!document.querySelector('.docPanel')) return;

    // don't save note data if I'm being redirected to log in
    if (newUrl.match(/login([?]|$)/)) return;
    $scope.saveNoteData();
  });

  $scope.showPages = function() {
    return $scope.range($scope.pageScroll+1, Math.min($scope.pageScroll+$scope.pageBarSize, $scope.docLength+1));
  };

  $scope.morePages = function() {
    return $scope.docLength > $scope.pageScroll+$scope.pageBarSize;
  };

  $scope.pageBarRight = function() {
    $scope.pageScroll = Math.min($scope.docLength-$scope.pageBarSize+1, $scope.pageScroll+($scope.pageBarSize-1));
  };

  $scope.pageBarLeft = function() {
    $scope.pageScroll = Math.max(0, $scope.pageScroll - ($scope.pageBarSize - 1));
  };

  $scope.unsaved = function (page) {
    var nn = $scope.notes;
    for (var i = 0; i < nn.length; i++) {
      if (nn[i].scope().page == page) return true;
    }
    return false;
  };
  $scope.isAnnotated = function (page) {
    return $scope.unsaved(page) || $scope.annotated[page - 1];
  };

  $scope.removeAllNotes = function() {
    for (i = 0; i < $scope.notes.length; i++) {
      document.querySelector('.docPanel').removeChild($scope.notes[i][0]);
    }
    $scope.notes = [];
  };
  $scope.annotable = function () {
    if ($scope.lib == undefined) return true;
    return ($scope.invq && (!$scope.lib.when_signed && $scope.lib.signature_deadline))
        || (!$scope.invq && (!$scope.lib.original || ($scope.lib.when_signed && !$scope.lib.when_confirmed)));
  };
  $scope.init = function () {
    $scope.notes=[];
    $scope.pageScroll = 0;
    $scope.pageBarSize = 13;
    $scope.showPageBar = true;

    if ($routeParams.page) $scope.currentPage = parseInt($routeParams.page);
    if (!$scope.docId) return;

    SWBrijj.tblmm($scope.$parent.pages, 'annotated,page'.split(','), "doc_id", $scope.docId).then(function(data) {
      $scope.docLength = data.length;
      // does scaling happen here?

      $scope.annotated = new Array(data.length);
      for(var i=0;i<data.length;i++) {
        $scope.annotated[data[i].page-1] = data[i].annotated;
      }
    });
    // This gets called twice because init gets called twice.
    // That doubles up the notes, so -- until I figure out why init gets called twice,
    // need to delete all the notes that init created the first time around
    SWBrijj.tblm($scope.$parent.library, "doc_id", $scope.docId).then(function(data) {
      $scope.lib = data;
      // if there were notes left over, delete them
      $scope.removeAllNotes();

      var aa = data['annotations'];
      if (aa) {
        // restoreNotes
        var annots = eval(aa);
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
            top:  annot[0][1][1],
            left: annot[0][1][0]
          });

        }
      } // json struct



    });
  };

  $scope.$watch("docId", $scope.init);

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

  $scope.setPage = function(n) {
    $scope.currentPage = n;
    var s = $location.search();
    s.page=n;
    $location.search(s);
  }
  $scope.nextPage = function(value) { 
    if ($scope.currentPage < $scope.docLength) {
      $scope.setPage(value+1);
    }
  };
  $scope.previousPage = function(value) { 
    if ($scope.currentPage > 1) {
      $scope.setPage(value-1);
    }
  };
  
  $scope.jumpPage = function(value) {
    $scope.setPage(value); };

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

  $scope.fixBox = function (bb) {
    var pad;
    bb.style.width = '30px';
    bb.style.height = '20px';
    var crs = countCRs(bb.value);
    if (bb.clientHeight < bb.scrollHeight) {
      pad = getIntProperty(bb, 'padding-top') + getIntProperty(bb, 'padding-bottom');
      bb.style.height = (bb.scrollHeight - pad) + "px";
    }
    if (bb.clientWidth < bb.scrollWidth) {
      // pad = getIntProperty(bb, 'padding-left') + getIntProperty(bb, 'padding-right');
      bb.style.width = (bb.scrollWidth + 10) + "px";
    }
    bb.fontSize = getIntProperty(bb, 'font-size');
    bb.lineHeight = Math.floor(bb.fontSize * 1.4);
    bb.style.lineHeight = 1.4;
    bb.rows = crs + 2;
    bb.style.height = "auto";
    bb.offset = [bb.offsetLeft, bb.offsetTop, bb.offsetWidth, bb.offsetHeight];
  };

  $scope.newBoxX = function(page, val, style) {
    $scope.restoredPage = page;
    var aa = $compile('<div draggable ng-show="currentPage=='+page+'"	 class="row-fluid draggable" >'+
        '<fieldset><div><textarea wrap="off" ng-model="annotext" class="row-fluid"/></div></fieldset></div>')($scope);
    aa.scope().ntype='text';
    aa.scope().growable = true; // for the growable icons
    var bb = aa[0].querySelector("textarea");
/*    window.setInterval( function() {
       if (bb.clientHeight < bb.scrollHeight) bb.style.height = (bb.scrollHeight+5) +"px";
       if (bb.clientWidth < bb.scrollWidth) bb.style.width = (bb.scrollWidth + 5) +"px";
    }, 300);
    */
    bb.addEventListener('input', function(e) { $scope.fixBox(bb);
/*      if (bb.value.substring(bb.value.length-1) == "\n") {
        bb.value+="\r\n";
      }  */
    });
    var ta = aa.find('textarea');
    ta.scope().annotext = val;
    ta.width( ta.width() );
    if (style) {
      aa.find('textarea').css('fontSize',style[0]);
    }
    bb.value = val;
    $scope.fixBox(bb);
    window.setTimeout( function() {
      if (bb.offsetWidth) $scope.fixBox(bb); }, 850);

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

  $scope.fixPad = function (aa) {
    var z = aa.find('canvas')[0];
    z.width = ( aa.width() - 8);
    z.height = (aa.height() - 27);
    z.offset = [getComputed(z, 'offsetTop'), getComputed(z, 'offsetLeft'), z.offsetWidth, z.offsetHeight];
    var strokes = z.strokes;
    var ctx = z.getContext('2d');
    ctx.lineCap = 'round';
    ctx.color = 'blue';
    ctx.lineWidth = 2;
    // ctx.setAlpha(0.5);
    for (var i = 0; i < strokes.length; i++) {
      var line = strokes[i];
      with (ctx) {
        beginPath();
        moveTo(line[1], line[2]);
        lineTo(line[3], line[4]);
        strokeStyle = line[0];
        stroke();
      }
    }
  };

  $scope.newPadX = function(page,lines) {
    $scope.restoredPage = page;
    var aa = $compile('<div draggable ng-show="currentPage=='+page+'"	 class="row-fluid draggable">'+
        '<canvas style="background-color:white"></canvas></div>')($scope);
    aa.scope().ntype='canvas';
    aa.css({resize: 'both',overflow:'hidden'});

    aa[0].addEventListener('mouseup', function(e) {
      $scope.fixPad(aa); $scope.resizeDown = false;  });
    aa[0].addEventListener('mousemove', function(e) {
      if (e.which != 0)
      $scope.fixPad(aa); });
    // I don't, in fact, get the mousedown event

    var canvas = aa[0].querySelector('canvas');
    var ctx = canvas.getContext('2d');
    ctx.lineCap = 'round';
    ctx.color = 'blue';
    ctx.lineWidth = 2;
    ctx.fillStyle = 'white';
    // ctx.setAlpha(0);
    ctx.fillRect(0,0,200,200);
    // ctx.setAlpha(0.5);

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
    canvas.strokes = lines;
    $scope.fixPad(aa);
    return aa;
  };

  /*$scope.submitSign = function (sig) {
    SWBrijj.procm("document.sign_document", $scope.docId, $scope.getNoteData() ).then(function (data) {
      $route.reload(); // window.location.reload();
    }).except(function (x) {
          alert(x.message);
        });
        */
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
  // };

  $scope.showPageBar = function(evt) {

  }

  $scope.acceptSign = function (sig) {
    SWBrijj.procm("document.countersign", $scope.docId).then(function (data) {
      console.log(data);
      window.location.reload();
    });
  };

  $scope.clearNotes = function(event) {
    SWBrijj.procm( $scope.invq ? "document.delete_investor_page" : "document.delete_counterparty_page",
            $scope.docId, $scope.currentPage).then(function(x) {
    var docpanel = document.querySelector(".docPanel");
    var imgurl = docpanel.style.backgroundImage;
    docpanel.style.backgroundImage = imgurl;
    });
  };

  $scope.clearAllNotes = function (event) {
    for (var i = 1; i <= $scope.docLength; i++) {
      var z = i;
      SWBrijj.deletePage($scope.docId, i).then(function (x) {
        if (z = $scope.currentPage) {
          var docpanel = document.querySelector(".docPanel");
          var imgurl = docpanel.style.backgroundImage;
          docpanel.style.backgroundImage = imgurl;
        }
      });
    }
  };

  $scope.getNoteData = function () {
    var noteData = [];
    var dp = document.querySelector(".docPanel");
    for (var i = 0; i < $scope.notes.length; i++) {
      var n = $scope.notes[i];
      if (!n.scope()) continue; // why?
      var bnds = getNoteBounds(n);
      var pos = [n.page, bnds[0], bnds[1], dp.clientWidth, dp.clientHeight ];
      var typ = n.scope().ntype;
      var val = [];
      var style = [];
      var ndx = [pos, typ, val, style];
      var se, lh;

      if (typ == 'text')  {
        se = n[0].querySelector("textarea");
        lh = getIntProperty(se,'line-height');
        val.push(se.value);
        style.push( getIntProperty(se,'font-size') );

        // var lho = Math.floor( (1/1.4) * lh);
        // ndx[0][2][1]+=lho;

        ndx[0][2][0]+=3;
        ndx[0][2][1]-=5;

      } else if (typ == 'check') {
        se = n[0].querySelector("span.check-annotation");
        lh =  getIntProperty(se,'line-height');
        style.push(getIntProperty(se,'font-size') );
        var lho = Math.floor( (1/1.4) * lh);
        ndx[0][2][1]+=lho;

        // ndx[0][2][0]+=2;
        ndx[0][2][1]-=4;

      } else if (typ == 'canvas') {
        se = n[0].querySelector("canvas");
        val.push(se.strokes);
      }
      noteData.push(ndx);
    }
    return JSON.stringify(noteData);
  };

  $scope.saveNoteData = function () {
    var nd = $scope.getNoteData();
    console.log(nd);
    if ($scope.lib == undefined) return;
    SWBrijj.saveNoteData($scope.docId, $scope.invq, !$scope.lib.original, nd).then(function (data) {
      console.log(data);

      var docpanel = document.querySelector(".docPanel");
      if (docpanel) {
        var imgurl = docpanel.style.backgroundImage;
        docpanel.style.backgroundImage = imgurl;
      }
    });
  };

  /* This could all be done server-side */
  /* The approach is as follows:
     1) figure out which pages need to be saved.
     2) call savePage(n) for each of those pages
     3) each savePage must
        a) load the image from the server (asynchronously), then
        b) stamp each note onto it and
        c) upload the modified image.
   */
  $scope.saveNotes = function (e) {
    var pr = $scope.invq ? "document.doSignStamp" : $scope.lib.original ? "document.doCounterStamp" : "document.doShareStamp";
    SWBrijj.procm(pr, $scope.docId, $scope.currentPage).then(function (data) {
      console.log(data);

      var docpanel = document.querySelector(".docPanel");
      var imgurl = docpanel.style.backgroundImage;
      docpanel.style.backgroundImage = imgurl;

    });
  };

  /*
  $scope.xxxsaveNotes = function(e) {
    var pageList = [];
    var noteList = [];
    for(var i=0;i<$scope.notes.length;i++) {
      var p = $scope.notes[i].scope().page;
      var x = pageList.indexOf(p);
      if ( x == -1) { pageList.push(p); noteList.push([]); x = pageList.indexOf(p); }
      noteList[x].push($scope.notes[i]);
    }

    // pageList is now the list of pages
    for(var j=0;j<pageList.length;j++) {
      $scope.savePageNotes(pageList[j], noteList[j]);
    }

    $scope.notes = [];

//    then(function (x) {
//      var docpanel = document.querySelector(".docPanel");
//      var imgurl = docpanel.style.backgroundImage;
//      docpanel.style.backgroundImage = imgurl;
//      var keepnotes = [];
//      for (var i = 0; i < $scope.notes.length; i++) {
//        if ($scope.notes[i].page != $scope.currentPage) {
//          keepnotes.push($scope.notes[i]);
//        } else {
//          document.querySelector('.docPanel').removeChild($scope.notes[i][0]);
//        }
//      }
//      $scope.notes = keepnotes;
//    }).
//        except(function (x) {
//          console.log(x.message);
//        });
  };
*/
/*
  $scope.savePageNotes = function(page, notes) {

    // At this point, figure out any size extensions required by annotations which stick out
    var maxbox = [0, 0, 0, 0];
    for(var k=0;k<notes.length;k++) {
      var box = getNoteBounds(notes[k]);

      if (box[0] < maxbox[0]) maxbox[0]=box[0];
      if (box[1] < maxbox[1]) maxbox[1]=box[1];
      if (box[2] > maxbox[2]) maxbox[2]=box[2];
      if (box[3] > maxbox[3]) maxbox[3]=box[3];

    }
    console.log(maxbox);
    var canvas = document.createElement('canvas');
    var docpanel = document.querySelector(".docPanel");

    var lo =  (maxbox[0] < 0) ? -maxbox[0] : 0;
    var to = (maxbox[1] < 0) ? -maxbox[1] : 0;

    canvas.width = docpanel.offsetWidth;
    if (maxbox[2] > canvas.width) canvas.width = maxbox[2];
    canvas.height = docpanel.offsetHeight;
    if  (maxbox[3] > canvas.height) canvas.height = maxbox[3];
    canvas.width += lo;
    canvas.height += to;

    var fudge = 40;
    canvas.width += fudge; // why do I need this?

    var img = new Image();
    var imgurl = "url(/photo/docpg?"+ $scope.pageQueryString+"&page="+page+")";
    // var imgurl = "url(/photo/docpg?id="+$scope.docId+"&investor="+$scope.invq+"&page="+page+"&counterparty="+$scope.counterparty+")";
    img.onload = function (x) {
      var ctx = canvas.getContext("2d");
      ctx.drawImage(img, lo, to, docpanel.offsetWidth + fudge, docpanel.offsetHeight);
      //  var canvascount = 0;

      for (var nnum = 0; nnum < notes.length; nnum++) {
        var note = notes[nnum];
        var ntype = note.scope().ntype;
        var notex = note[0];

        var se, ll, tt, lh, padx, pady, i;
        var bnds = getNoteBounds(note);
        ll = bnds[0] + lo;
        tt = bnds[1] + to;

        if (ntype == 'text') {
          var annotext = note.scope().$$nextSibling.annotext;
          se = notex.querySelector("textarea");

          lh = se.lineHeight; // had to be set by fixBox

          // padx = getIntProperty(se, 'padding-left');
          // pady = getIntProperty(se, 'padding-top');
          // bl = getIntProperty(se, 'border-left') +
          // getIntProperty(notex, 'border-left');

          // bt = getIntProperty(se, 'border-top') +
          // getIntProperty(notex, 'border-top');

          ctx.fillStyle = "blue";
          // ctx.font = "16px Optima";
          ctx.font = getComputed(se, 'font');

          // tt += se.offsetTop+pady;
          // ll += se.offsetLeft+padx;

          padx = 6;
          pady = 6;

          ll += padx + se.offset[0];
          tt += pady + se.offset[1] - Math.floor((1 - 1 / 1.4) * lh);

          // This "4" was better as "8" for a smaller font.
          // ctx.scale( (canvas.width-4)/(canvas.width),1);
          ctx.scale(1, 1);

          var anoray = annotext.split('\n');
          for (i = 0; i < anoray.length; i++) {
            ctx.fillText(anoray[i], ll, tt + lh * (i + 1));
          }
          ctx.scale(1, 1);
        }
        else if (ntype == 'check') {
          se = notex.querySelector("span");
          ctx.fillStyle = "blue";

          var fs = getComputed(se, 'font-size');
          ctx.font = fs + ' Sharewave';

          // padx = getIntProperty(se, 'padding-left');
          // pady = getIntProperty(se, 'padding-top');
          // bl = getIntProperty(se, 'border-left') +
          // getIntProperty(notex, 'border-left');

          // bt = getIntProperty(se, 'border-top') +
          // getIntProperty(notex, 'border-top');
          // ll += padx; //  + se.offset[0];
          // tt += pady; // + se.offset[1] - 6;

          // ll += 12;

          tt += (bnds[3] - bnds[1]) * (1 / 1.4);

          // ctx.fillText("\uf00c", ll, tt);
          ctx.fillText("\ue023", ll, tt);
        }
        else if (ntype == 'canvas') {
          se = notex.querySelector("canvas");

          // ll += se.offset[0];
          // tt += se.offset[1];

          // canvascount++;
           // var ctxxx = se.getContext('2d');
          // var imgx = new Image();
          // imgx.onload = function () {
          // ctx.drawImage(imgx, ll, tt);
          // canvascount--;
          // };

          // imgx.src = se.toDataURL("image/png");

          // var imgData=ctxxx.getImageData(0,0,se.offsetWidth, se.offsetHeight);
          // ctx.putImageData(imgData,ll,tt);

          //    if (e.target.tagName == 'DIV') {

          //z.width = ( aa.width() - 8);
          //z.height = (aa.height() - 27);
          //z.offset = [getComputed(z,'offsetTop'), getComputed(z,'offsetLeft')];

          ll += 4;
          tt += 23;

          var strokes = se.strokes;
          ctx.lineCap = 'round';
          ctx.color = 'blue';
          ctx.lineWidth = 2;
          // ctx.setAlpha(0.5);
          for (i = 0; i < strokes.length; i++) {
            var line = strokes[i];
            with (ctx) {
              beginPath();
              moveTo(line[1] + ll, line[2] + tt);
              lineTo(line[3] + ll, line[4] + tt);
              strokeStyle = line[0];
              stroke();
            }
          }
        }
      }

      $scope.removeAllNotes();

      var z = canvas.toDataURL('image/tiff');
      SWBrijj.uploadDataURL($scope.docId, page, z).then(function (data) {
            if (page == $scope.currentPage) {
              var docpanel = document.querySelector(".docPanel");
              var imgurl = docpanel.style.backgroundImage;
              docpanel.style.backgroundImage = imgurl;
            }

          }
      );
      $scope.$apply();

    };


    //        var cvfin = function () {

    //          // TODO: if the canvascount doesnt go to zero after a while, abort somehow
    //          if (canvascount == 0) {
    //            var z = canvas.toDataURL('image/tiff');
    //            SWBrijj.uploadDataURL($scope.docId, page, z).then( function(data) {
    //                  if (page == $scope.currentPage) {
    //                      var docpanel = document.querySelector(".docPanel");
    //                      var imgurl = docpanel.style.backgroundImage;
    //                      docpanel.style.backgroundImage = imgurl;
    //                  }

    //                }
    //          );
    //            $scope.$apply();
    //          } else {
    //            window.setTimeout(cvfin, 50);
    //          }

    //        };

    //        window.setTimeout(cvfin, 50);
    //      };


  // must set the src AFTER the onload function for IE9
  //  img.src=imgurl.substring(4,imgurl.length-1);
//  };
  */

}
/* Looking for a way to detect if I need to reload the page because the user has been logged out
*/
/* For images, the "login redirect" should return an image that says "Please login again"
 */
/*
 $('<img/>').attr('src', 'http://picture.de/image.png').load(function() {
 $(this).remove(); // prevent memory leaks as @benweet suggested
 $('body').css('background-image', 'url(http://picture.de/image.png)');
 });
    */