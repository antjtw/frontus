#!/usr/bin/env python
import cgi, os
import cgitb
import subprocess
import requests

print 'Content-type: text/html'
print

form = cgi.FieldStorage()
try: 
	fileitem = form['file']
	if fileitem.filename: #File is found in POST
		fn = "files/" + os.path.basename(fileitem.filename)
		f = open(fn, 'wb')
		f.write(fileitem.file.read())
		f.close()
		rc = subprocess.Popen('oowriter --headless --convert-to pdf:writer_pdf_Export '+ os.path.abspath(fn) +' --outdir ' + "files/", shell=True).wait() #SOMETHING HERE
		if rc == 0: #Exit code 0 == successful
			with open(fn + ".pdf", 'rb') as r:
				print 'Content-type: application/pdf'
				print
				print r.read()
		else:
			print 'Error'
		# files = glob.glob("files/*")
		# for f in files:
		# 	os.unlink(f)
	else: #No file found
		print 'Content-type:text/plain'
		print 
		print "'File' field found, but an invalid file was found"
except Exception, e: #POST request did not have a "file" field
	print 'Content-type:text/plain'
	print 
	print "POST request invalid\nError: " + str(e)


	# t1 = tempfile.NamedTemporaryFile(dir=dir, suffix=sfx[1], delete=False)
 #  t1.write(TD['new']['content']);
 #  t1.flush()
 #  os.chmod(t1.name, 0666)
 #  t2n = os.path.splitext(t1.name)[0]+'.pdf'

 #  if mac:
 #    cmd = 'java -jar ~/Library/Containers/net.r0ml.transgres/Data/ext/doc_to_pdf.jar '+t1.name+' '+t2n
 #  else:
 #    cmd = 'oowriter --headless --convert-to pdf:writer_pdf_Export '+t1.name+' --outdir '+tmpdir

 #  res = check_call(cmd, shell=True) # , stdout=open(t1.name+".out","w"), stderr=open(t1.name+".err","w"))
 #  if (res != 0):
 #    raise Exception("conversion to pdf failed, res="+str(res))
 #  try:
 #    t2 = open(t2n,'rb')
 #    res2 = t2.read()
 #  except IOError:
 #    raise Exception("conversion to pdf failed")
 #  t1.close()
 #  t2.close()
 #  os.unlink(t2n)