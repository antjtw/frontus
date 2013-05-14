
-- Returns single document info for company viewer
CREATE or REPLACE FUNCTION document.get_docdetail(did int) returns setof document.docinfo language plpgsql as $$
begin return query select * from document.docinfo where doc_id=did;
end $$;

-- this procedure seems to be the same as the previous one.
-- Gets doc information for company status page
CREATE or REPLACE FUNCTION document.get_docmeta(docid int) returns setof document.docinfo language plpgsql as $$
begin RETURN QUERY SELECT * from document.docinfo where doc_id=docid;
end $$;

CREATE or REPLACE FUNCTION document.get_doclength(did int) returns setof integer language plpgsql as $$
begin return query select max(page) from document.page_image_view where doc_id=did;
end $$;

-- --------------------------------------------

--creates a document activity view 
CREATE OR REPLACE view document.activity_feed as SELECT when_sent, sent_to, doc_id, activity FROM document.my_shares;
GRANT SELECT on document.activity_feed TO investor;

--Returns the user status information
CREATE OR REPLACE FUNCTION document.get_doc_activity(docid integer) RETURNS SETOF document.activity_feed LANGUAGE plpgsql AS $$
BEGIN RETURN QUERY SELECT * from document.activity_feed where doc_id=docid;
END $$;


-- Company delete document function
CREATE or REPLACE FUNCTION document.delete_document(delname varchar) returns int language plpgsql as $$
declare num int;
begin delete from document.my_library where docname = delname;
 GET DIAGNOSTICS num = ROW_COUNT;
 return num;
end $$;	

-- Changes the title of a company's document
CREATE or REPLACE FUNCTION document.title_change(user_id email, docid int, newname character varying) returns void language plpgsql as $$
BEGIN UPDATE document.my_library set docname=newname WHERE doc_id=docid;
END $$;

-- Revokes access to document for a specific user
CREATE or REPLACE FUNCTION document.document_revoke(user_id character varying, docid int, xemail character varying) returns void 
language plpgsql as $$
BEGIN INSERT INTO document.revoked(doc_id, sent_to, sent_by, access) values (docid, xemail, user_id, 'revoked');
END $$;

-- Share document, sends email and tracks action
CREATE or REPLACE FUNCTION document.share_document(user_id character varying, docid int, xemail character varying, message character varying) returns void
language plpgsql as $$
declare
  template text = get_mail_template('doc-share.html');
  comp company_type;
  doc text;
begin
  select company into comp from user_role where email=user_id and role='issuer';
  template = replace(replace(template,'{{message}}', message), '{{link}}', concat('http://localhost:4040/investor/documents/view?doc=' , docid));
  template = replace(template, '{{company}}', comp);
  select docname into doc from document.my_library where doc_id=docid;
  template = replace(template, '{{name}}', doc);
  perform send_mail(xemail, concat(doc,' has been shared with you!'), template);
  insert into document.docshares(doc_id, sent_to, sent_by, activity) values (docid, xemail, user_id, 'shared');
end $$;

-- Share document, sends email and tracks action
CREATE or REPLACE FUNCTION document.remind_document(user_id character varying, docid int, xemail character varying, message character varying) returns void
language plpgsql as $$
declare
  template text = get_mail_template('doc-share.html');
  comp company_type;
  doc text;
begin
  select company into comp from user_role where email=user_id and role='issuer';
  template = replace(replace(template,'{{message}}', message), '{{link}}', concat('http://localhost:4040/investor/documents/view?doc=' , docid));
  template = replace(template, '{{company}}', comp);
  select docname into doc from document.my_library where doc_id=docid;
  template = replace(template, '{{name}}', doc);
  perform send_mail(xemail, concat(doc,' needs your attention!'), template);
  insert into document.docshares(doc_id, sent_to, sent_by, activity) values (docid, xemail, user_id, 'reminder');
end $$;

-- Sharing information for document status page
CREATE TYPE document.shared_status as (sent_to email, whensent timestamp, event document.activity_type);

CREATE or REPLACE FUNCTION document.document_status(docid int) returns setof document.shared_status 
language plpgsql as $$
begin 
return query 
      (select sent_to, max(whendone) as whensent, max(activity) as event from document.docshares where doc_id=docid and sent_to not in (SELECT sent_to from document.revoked x where x.doc_id=docid) GROUP BY sent_to)
UNION (select sent_to, max(whendone) as whensent, max(access)   as event from document.revoked where doc_id=docid GROUP BY sent_to);
RETURN;
end $$;

-- Gets document
CREATE or REPLACE FUNCTION document.get_document(user_id email, docid int) returns bytea language plpgsql as $$
declare
  docu bytea;
begin 
--  select company into comp from user_role where email=user_id and role='issuer';
  select content into docu from document.library where (company in (select document.companies(user_id)) and doc_id=docid) OR ((user_id in (select sent_to from document.docshares where doc_id=docid)) AND (user_id not in (select sent_to from document.revoked where doc_id=docid)));
  return docu;
end $$;

create type document.I_doc_status_type as (loggedin timestamp);

CREATE OR REPLACE FUNCTION document.get_i_docstatus(user_id email, investor email)
 RETURNS SETOF document.i_doc_status_type
 LANGUAGE plpgsql
AS $function$
begin 
  return query select max(login_time) as loggedin from public.user_log where email=investor;
  return query select min(whendone) as loggedin from document.docshares where sent_to=investor and activity='shared';
  return query select max(whendone) as loggedin from document.docshares where sent_to=investor and activity='viewed';
  return query select min(whendone) as loggedin from document.docshares where sent_to=investor and activity='signed';
  return query select max(whendone) as loggedin from document.docshares where sent_to=investor and activity='reminder';
end $function$;
