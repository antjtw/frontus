$(document).ready(function() {
	
	/*****************************
		Variables
	*****************************/
	var imgWidth = 180,
		imgHeight = 180,
		zindex = 0;
		dropzone = $('#droparea'),
		uploadBtn = $('#uploadbtn'),
		defaultUploadBtn = $('#upload');
		

	/*****************************
		Events Handler
	*****************************/
	dropzone.on('dragover', function() {
		//add hover class when drag over
		dropzone.addClass('hover');
		return false;
	});
	dropzone.on('dragleave', function() {
		//remove hover class when drag out
		dropzone.removeClass('hover');
		return false;
	});
	dropzone.on('drop', function(e) {
		//prevent browser from open the file when drop off
		e.stopPropagation();
		e.preventDefault();
		dropzone.removeClass('hover');
		
		//retrieve uploaded files data
		var files = e.originalEvent.dataTransfer.files;
		processFiles(files);

		return false;
	});
		
	uploadBtn.on('click', function(e) {
		e.stopPropagation();
		e.preventDefault();
		//trigger default file upload button
		defaultUploadBtn.click();
	});
	defaultUploadBtn.on('change', function() {
		//retrieve selected uploaded files data
		var files = $(this)[0].files;
		processFiles(files);
		
		return false;
	});
	
	
	/***************************** 
		internal functions
	*****************************/	
	//Bytes to KiloBytes conversion
	function convertToKBytes(number) {
		return (number / 1024).toFixed(1);
	}
	
	function compareWidthHeight(width, height) {
		var diff = [];
		if(width > height) {
			diff[0] = width - height;
			diff[1] = 0;
		} else {
			diff[0] = 0;
			diff[1] = height - width;
		}
		return diff;
	}
	
	//convert datauri to blob
	function dataURItoBlob(dataURI) {
		var BlobBuilder = window.WebKitBlobBuilder || window.MozBlobBuilder || window.BlobBuilder;
	
		//skip if browser doesn't support BlobBuilder object
		if(typeof BlobBuilder === "undefined") {
			$('#err').html('Ops! There have some limited with your browser! <br/>New image produced from canvas can\'t be upload to the server...');
			return dataURI;
		}
		
		// convert base64 to raw binary data held in a string
		// doesn't handle URLEncoded DataURIs
		var byteString;
		if (dataURI.split(',')[0].indexOf('base64') >= 0)
			byteString = atob(dataURI.split(',')[1]);
		else
			byteString = unescape(dataURI.split(',')[1]);

		// separate out the mime component
		var mimeString = dataURI.split(',')[0].split(':')[1].split(';')[0]

		// write the bytes of the string to an ArrayBuffer
		var ab = new ArrayBuffer(byteString.length);
		var ia = new Uint8Array(ab);
		for (var i = 0; i < byteString.length; i++) {
			ia[i] = byteString.charCodeAt(i);
		}

		// write the ArrayBuffer to a blob, and you're done
        var bb = new BlobBuilder();
		bb.append(ab);
		return bb.getBlob(mimeString);
	}
	
	/***************************** 
		canvas filter function
	*****************************/	
	//Black & White image effect 
	//by Marco Lisci - http://badsharkco.com/
	var grayscale = function(context) {
		var imgd = context.getImageData(0, 0, imgWidth, imgHeight);
		var pix = imgd.data;
		for (var i = 0, n = pix.length; i < n; i += 4) {
			var grayscale = pix[i  ] * .3 + pix[i+1] * .59 + pix[i+2] * .11;
			pix[i  ] = grayscale;
			pix[i+1] = grayscale;
			pix[i+2] = grayscale;
		}
		context.putImageData(imgd, 0, 0);
	}
	
	//canvas-blur effect 
	//by Matt Riggott - http://www.flother.com/			
	var blurry = function(context, image, diff) {
		var i, x, y,
			blureffect = 4;
		
		context.globalAlpha = 0.1;
		for (i = 1; i <= blureffect; i++) {
			for (y = -blureffect/2; y <= blureffect/2; y++) {
				for (x = -blureffect/2; x <= blureffect/2; x++) {
					context.drawImage(image, diff[0]/2, diff[1]/2, image.width-diff[0], image.height-diff[1], x, y, imgWidth, imgHeight);
				}
			}
		}
		context.globalAlpha = 1.0;
	}
	
	
	
	/***************************** 
		Process FileList 
	*****************************/	
	var processFiles = function(files) {
		if(files && typeof FileReader !== "undefined") {
			//process each files only if browser is supported
			for(var i=0; i<files.length; i++) {
				readFile(files[i]);
			}
		} else {
			
		}
	}
	
	
	/***************************** 
		Read the File Object
	*****************************/	
	var readFile = function(file) {
		if( (/image/i).test(file.type) ) {
			//define FileReader object
			var reader = new FileReader();
			
			//init reader onload event handlers
			reader.onload = function(e) {	
				var image = $('<img/>')
				.load(function() {
					//when image fully loaded
					var newimageurl = getCanvasImage(this);
					createPreview(file, newimageurl);
					//uploadToServer(file, dataURItoBlob(newimageurl));
					
				})
				.attr('src', e.target.result);	
			};
			
			//begin reader read operation
			reader.readAsDataURL(file);
			
			$('#err').text('');
		} else {
			//some message for wrong file format
			$('#err').text('*Selected file format not supported!');
		}
	}
	
	
	/***************************** 
		Get New Canvas Image URL
	*****************************/	
	var getCanvasImage = function(image) {
		//get selected effect
		var effect = $('input[name=effect]:checked').val();
		var croping = $('input[name=croping]:checked').val();
	
		//define canvas
		var canvas = document.createElement('canvas');
		canvas.width = imgWidth;
		canvas.height = imgHeight;
		var ctx = canvas.getContext('2d');
		
		//default resize variable
		var diff = [0, 0];
		if(croping == 'crop') {
			//get resized width and height
			diff = compareWidthHeight(image.width, image.height);
		}
		
		//draw canvas image	
		ctx.drawImage(image, diff[0]/2, diff[1]/2, image.width-diff[0], image.height-diff[1], 0, 0, imgWidth, imgHeight);
					
		//apply effects if any					
		if(effect == 'grayscale') {
			grayscale(ctx);
		} else if(effect == 'blurry') {
			blurry(ctx, image, diff);
		} else {}
		
		//convert canvas to jpeg url
		return canvas.toDataURL("image/jpeg");
	}
	
	
	/***************************** 
		Draw Image Preview
	*****************************/	
	var createPreview = function(file, newURL) {	
		//populate jQuery Template binding object
		var imageObj = {};
		imageObj.filePath = newURL;
		imageObj.fileName = file.name.substr(0, file.name.lastIndexOf('.')); //subtract file extension
		imageObj.fileOriSize = convertToKBytes(file.size);
		imageObj.fileUploadSize = convertToKBytes(dataURItoBlob(newURL).size); //convert new image URL to blob to get file.size
					
		//extend filename
		var effect = $('input[name=effect]:checked').val();			
		if(effect == 'grayscale') {
			imageObj.fileName += " (Grayscale)";
		} else if(effect == 'blurry') {
			imageObj.fileName += " (Blurry)";
		} 			
					
		//append new image through jQuery Template
		var randvalue = Math.floor(Math.random()*31)-15;  //random number
		var img = $("#imageTemplate").tmpl(imageObj).prependTo("#result")
		.hide()
		.css({
			'Transform': 'scale(1) rotate('+randvalue+'deg)',
			'msTransform': 'scale(1) rotate('+randvalue+'deg)',
			'MozTransform': 'scale(1) rotate('+randvalue+'deg)',
			'webkitTransform': 'scale(1) rotate('+randvalue+'deg)',
			'OTransform': 'scale(1) rotate('+randvalue+'deg)',
			'z-index': zindex++
		})
		.show();
		
		if(isNaN(imageObj.fileUploadSize)) {
			$('.imageholder span').last().hide();
		}
	}
	
	
	
	/****************************
		Upload Image to Server
	****************************/
	var uploadToServer = function(oldFile, newFile) {
		// prepare FormData
		var formData = new FormData();  
		//we still have to use back old file
		//since new file doesn't contains original file data
		formData.append('filename', oldFile.name);
		formData.append('filetype', oldFile.type);
		formData.append('file', newFile); 
					
		//submit formData using $.ajax			
		$.ajax({
			url: 'upload.php',
			type: 'POST',
			data: formData,
			processData: false,
			contentType: false,
			success: function(data) {
				console.log(data);
			}
		});	
	}
	
	
	//file upload via original byte sequence
	var processFileInIE = function(file) {

		var imageObj = {};
		var extension = ['jpg', 'jpeg', 'gif', 'png'];
		var filepath = file.value;
		if (filepath) {
			//get file name
			var startIndex = (filepath.indexOf('\\') >= 0 ? filepath.lastIndexOf('\\') : filepath.lastIndexOf('/'));
			var filedetail = filepath.substring(startIndex);
			if (filedetail.indexOf('\\') === 0 || filedetail.indexOf('/') === 0) {
				filedetail = filedetail.substring(1);
			}
			var filename = filedetail.substr(0, filedetail.lastIndexOf('.'));
			var fileext = filedetail.slice(filedetail.lastIndexOf(".")+1).toLowerCase();

			//check file extension
			if($.inArray(fileext, extension) > -1) {
				//append using template
				$('#err').text('');
				imageObj.filepath = filepath;
				imageObj.filename = filename;
				var randvalue = Math.floor(Math.random()*31)-15;
				$("#imageTemplate").tmpl(imageObj).prependTo( "#result" )
				.hide()
				.css({
					'Transform': 'scale(1) rotate('+randvalue+'deg)',
					'msTransform': 'scale(1) rotate('+randvalue+'deg)',
					'MozTransform': 'scale(1) rotate('+randvalue+'deg)',
					'webkitTransform': 'scale(1) rotate('+randvalue+'deg)',
					'oTransform': 'scale(1) rotate('+randvalue+'deg)',
					'z-index': zindex++
				})
				.show();
				$('#result').find('figcaption span').hide();
			} else {
				$('#err').text('*Selected file format not supported!');
			}
		}
	}
	
	/****************************
		Browser compatible text
	****************************/
	if (typeof FileReader === "undefined") {
		//$('.extra').hide();
		$('#err').html('Hey! Your browser does not support <strong>HTML5 File API</strong> <br/>Try using Chrome or Firefox to have it works!');
	} else if (!Modernizr.draganddrop) {
		$('#err').html('Ops! Look like your browser does not support <strong>Drag and Drop API</strong>! <br/>Still, you are able to use \'<em>Select Files</em>\' button to upload file =)');
	} else {
		$('#err').text('');
	}
});