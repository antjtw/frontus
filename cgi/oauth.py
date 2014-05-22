#!/usr/bin/env python

import psycopg2
import sys
import json
import os
import storewave
import urllib
import urllib2

import cgi


args = {}

if len(sys.argv) > 1:
    args = {'svc': sys.argv[1], 'state': sys.argv[2], 'code': sys.argv[3]}
else:
    form = cgi.FieldStorage()
    args = {'state': form.getvalue('state'),
            'code': form.getvalue('code'),
            'svc': form.getvalue('svc')}

def get_auth_code(code, svc):
    cb = "https://testing.sharewave.com:3030"
    conn = storewave.get_dbconn()
    cur = conn.cursor()

    if svc == 'dropbox':
        endpoint = 'https://api.dropbox.com/1/oauth2/token'
        callback = cb + '/oauth/dropbox'
        query = "update oauth.coalesced_tokens set access_token=%s, \
            uid=%s where authorization_code = %s"
        keys = ['access_token', 'uid']
    elif svc == 'google':
        endpoint = 'https://accounts.google.com/o/oauth2/token'
        callback = cb + '/oauth/google'
        query = "update oauth.coalesced_tokens set access_token=%s \
            where authorization_code=%s"
        keys = ['access_token'] # TODO capture the 'expires_in' attribute
    else:
        raise Exception('Service not recognized: %s' % svc)
    
    cur.execute("select * from oauth.providers_table where service='" + svc 
        + "';")
    (_, client_id, client_secret) = cur.fetchone()
    params ={'grant_type': 'authorization_code',
                   'code': code,
                   'redirect_uri': callback,
                   'client_id': client_id,
                   'client_secret': client_secret
                   }
    
    dd = urllib.urlencode(params)
    req = urllib2.Request(endpoint, dd)
    
    try:
        rsp = urllib2.urlopen(req)
        res = rsp.read()
        res = json.loads(res)
        query_values = []
        for k in keys:
            query_values.append(res[k])
        query_values.append(code)
        cur.execute(query, query_values)
        retres = res['access_token']
        conn.commit()
        print >>sys.stderr, "Storing access token successful"
        return retres
    except urllib2.HTTPError as e:
        print >>sys.stderr, "Exception: " + str(e.code) + " " + e.read()
        return "Exception: " + str(e.code) + " " + e.read()


def store_token(args):
    con = storewave.get_dbconn()
    cur = con.cursor()
    
    print >>sys.stderr, args
    print >>sys.stderr, os.environ['QUERY_STRING']
    print >>sys.stderr, os.environ
    
    cur.execute("select oauth.store_authcode(%s,%s,%s)",(args['svc'], args['state'], args['code']))
    rrc = cur.rowcount
    con.commit()
    if (rrc == 0):
        raise Exception('failed to store token')
    
    get_auth_code(args['code'], args['svc'])
    
    sn = os.environ.get("SERVER_NAME")
    if (sn == 'share.wave'):
        prot = 'http'
    else:
        prot = 'https'
    
    print "Status: 200 OK"
    print ""
    print "Successfully authenticated Dropbox."
    #print "Status: 302 Moved Temporarily"
    #print ""
    #print "Location: " + prot + "://" + sn + "/#here"
    
store_token(args)
