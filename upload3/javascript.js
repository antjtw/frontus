jQuery(document).ready(function() {
	
	// Makes sure the dataTransfer information is sent when we
	// Drop the item in the drop box.
	jQuery.event.props.push('dataTransfer');
	
	var z = -40;
	// The number of images to display
	var maxFiles = 5;
	var errMessage = 0;
	
	// Get all of the data URIs and put them in an array
	var dataArray = [];
	
	// Bind the drop event to the dropzone.
	jQuery('#drop-files').bind('drop', function(e) {
			
		// Stop the default action, which is to redirect the page
		// To the dropped file
		
		var files = e.dataTransfer.files;
		
		// Show the upload holder
		jQuery('#uploaded-holder').show();
		
		// For each file
		jQuery.each(files, function(index, file) {
						
			// Some error messaging
			if (!files[index].type.match('image.*')) {
				
				if(errMessage == 0) {
					jQuery('#drop-files').html('Hey! Images only');
					++errMessage
				}
				else if(errMessage == 1) {
					jQuery('#drop-files').html('Stop it! Images only!');
					++errMessage
				}
				else if(errMessage == 2) {
					jQuery('#drop-files').html("Can't you read?! Images only!");
					++errMessage
				}
				else if(errMessage == 3) {
					jQuery('#drop-files').html("Fine! Keep dropping non-images.");
					errMessage = 0;
				}
				return false;
			}
			
			// Check length of the total image elements
			
			if(jQuery('#dropped-files > .image').length < maxFiles) {
				// Change position of the upload button so it is centered
				var imageWidths = ((220 + (40 * jQuery('#dropped-files > .image').length)) / 2) - 20;
				jQuery('#upload-button').css({'left' : imageWidths+'px', 'display' : 'block'});
			}
			
			// Start a new instance of FileReader
			var fileReader = new FileReader();
				
				// When the filereader loads initiate a function
				fileReader.onload = (function(file) {
					
					return function(e) { 
						
						// Push the data URI into an array
						dataArray.push({name : file.name, value : this.result});
						
						// Move each image 40 more pixels across
						z = z+40;
						var image = this.result;
						
						
						// Just some grammatical adjustments
						if(dataArray.length == 1) {
							jQuery('#upload-button span').html("1 file to be uploaded");
						} else {
							jQuery('#upload-button span').html(dataArray.length+" files to be uploaded");
						}
						// Place extra files in a list
						if(jQuery('#dropped-files > .image').length < maxFiles) { 
							// Place the image inside the dropzone
							jQuery('#dropped-files').append('<div class="image" style="left: '+z+'px; background: url('+image+'); background-size: cover;"> </div>'); 
						}
						else {
							
							jQuery('#extra-files .number').html('+'+(jQuery('#file-list li').length + 1));
							// Show the extra files dialogue
							jQuery('#extra-files').show();
							
							// Start adding the file name to the file list
							jQuery('#extra-files #file-list ul').append('<li>'+file.name+'</li>');
							
						}
					}; 
					
				})(files[index]);
				
			// For data URI purposes
			fileReader.readAsDataURL(file);
	
		});
		

	});
	
	function restartFiles() {
	
		// This is to set the loading bar back to its default state
		jQuery('#loading-bar .loading-color').css({'width' : '0%'});
		jQuery('#loading').css({'display' : 'none'});
		jQuery('#loading-content').html(' ');
		// --------------------------------------------------------
		
		// We need to remove all the images and li elements as
		// appropriate. We'll also make the upload button disappear
		
		jQuery('#upload-button').hide();
		jQuery('#dropped-files > .image').remove();
		jQuery('#extra-files #file-list li').remove();
		jQuery('#extra-files').hide();
		jQuery('#uploaded-holder').hide();
	
		// And finally, empty the array/set z to -40
		dataArray.length = 0;
		z = -40;
		
		return false;
	}
	
	jQuery('#upload-button .upload').click(function() {
		
		jQuery("#loading").show();
		var totalPercent = 100 / dataArray.length;
		var x = 0;
		var y = 0;
		
		jQuery('#loading-content').html('Uploading '+dataArray[0].name);
		
		jQuery.each(dataArray, function(index, file) {	
			
			jQuery.post('upload.php', dataArray[index], function(data) {
			
				var fileName = dataArray[index].name;
				++x;
				
				// Change the bar to represent how much has loaded
				jQuery('#loading-bar .loading-color').css({'width' : totalPercent*(x)+'%'});
				
				if(totalPercent*(x) == 100) {
					// Show the upload is complete
					jQuery('#loading-content').html('Uploading Complete!');
					
					// Reset everything when the loading is completed
					setTimeout(restartFiles, 500);
					
				} else if(totalPercent*(x) < 100) {
				
					// Show that the files are uploading
					jQuery('#loading-content').html('Uploading '+fileName);
				
				}
				
				// Show a message showing the file URL.
				var dataSplit = data.split(':');
				if(dataSplit[1] == 'uploaded successfully') {
					var realData = '<li><a href="images/'+dataSplit[0]+'">'+fileName+'</a> '+dataSplit[1]+'</li>';
					
					jQuery('#uploaded-files').append('<li><a href="images/'+dataSplit[0]+'">'+fileName+'</a> '+dataSplit[1]+'</li>');
				
					// Add things to local storage 
					if(window.localStorage.length == 0) {
						y = 0;
					} else {
						y = window.localStorage.length;
					}
					
					window.localStorage.setItem(y, realData);
				
				} else {
					jQuery('#uploaded-files').append('<li><a href="images/'+data+'. File Name: '+dataArray[index].name+'</li>');
				}
				
			});
		});
		
		return false;
	});
	
	// Just some styling for the drop file container.
	jQuery('#drop-files').bind('dragenter', function() {
		jQuery(this).css({'box-shadow' : 'inset 0px 0px 20px rgba(0, 0, 0, 0.1)', 'border' : '4px dashed #bb2b2b'});
		return false;
	});
	
	jQuery('#drop-files').bind('drop', function() {
		jQuery(this).css({'box-shadow' : 'none', 'border' : '4px dashed rgba(0,0,0,0.2)'});
		return false;
	});
	
	// For the file list
	jQuery('#extra-files .number').toggle(function() {
		jQuery('#file-list').show();
	}, function() {
		jQuery('#file-list').hide();
	});
	
	jQuery('#dropped-files #upload-button .delete').click(restartFiles);
	
	// Append the localstorage the the uploaded files section
	if(window.localStorage.length > 0) {
		jQuery('#uploaded-files').show();
		for (var t = 0; t < window.localStorage.length; t++) {
			var key = window.localStorage.key(t);
			var value = window.localStorage[key];
			// Append the list items
			if(value != undefined || value != '') {
				jQuery('#uploaded-files').append(value);
			}
		}
	} else {
		jQuery('#uploaded-files').hide();
	}
});