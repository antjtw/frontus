#!/usr/bin/env python
import cgi, os
import cgitb
import subprocess
import requests

form = cgi.FieldStorage()
try: 
	fileitem = form['file']
	if fileitem.filename: #File is found in POST
		fn = "files/" + os.path.basename(fileitem.filename)
		f = open(fn, 'wb')
		f.write(fileitem.file.read())
		f.close()
		#rc = subprocess.Popen('oowriter --headless --convert-to pdf:writer_pdf_Export '+ os.path.abspath(fn) +' --outdir ' + "files/", shell=True).wait() #SOMETHING HERE
		rc = subprocess.Popen('python DocumentConverter.py  '+ os.path.abspath(fn) +'  ' + os.path.abspath(fn) + ".pdf", shell=True).wait() #SOMETHING HERE
		if rc == 0: #Exit code 0 == successful
			with open(fn + ".pdf", 'rb') as r:
				print 'Content-type: application/pdf'
				print
				print r.read()
				files = glob.glob("files/*")
				for f in files:
				 	os.unlink(f)
		else:
			print 'Status: 500'
			print 'Content-type: text/html'
			print 
			print 'Error in transcoding process'
	else: #No file found
		print 'Status: 500'
		print 'Content-type: text/html'
		print 
		print "'File' field found, but an invalid file was found"
except Exception, e: #POST request did not have a "file" field
	print 'Status: 500'
	print 'Content-type: text/html'
	print 
	print "POST request invalid\nError: " + str(e)