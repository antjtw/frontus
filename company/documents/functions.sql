
-- return the list of companies that this user is an issuer for
CREATE or REPLACE FUNCTION document.companies(userid email) returns setof company_type language plpgsql as $$
begin return query select company from user_role where email = userid and role = 'issuer';
end $$;

-- Returns list of company documents for the company list view page
CREATE OR REPLACE FUNCTION document.get_companydocs(userid email) returns setof document.docinfo language plpgsql as $$
begin return query select * from document.docinfo where company in (select document.companies(userid));
end $$;

-- Returns single document info for company viewer
CREATE or REPLACE FUNCTION document.get_docdetail(userid email, did int) returns setof document.docinfo language plpgsql as $$
begin return query select * from document.get_companydocs(userid) where doc_id=did;
end $$;

-- Company delete document function
CREATE or REPLACE FUNCTION document.delete_document(userid email, delname varchar) returns int language plpgsql as $$
declare num int;
begin delete from document.documentview where company in (select document.companies(userid)) and docname = delname;
 GET DIAGNOSTICS num = ROW_COUNT;
 return num;
end $$;	

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
  select docname into doc from document.documentview where doc_id=docid;
  template = replace(template, '{{name}}', doc);
  perform send_mail(xemail, concat(doc,' has been shared with you!'), template);
  insert into document.docshares(doc_id, sent_to, sent_by, activity) values (docid, xemail, user_id, 'shared');
end $$;

-- Sharing information for document status page
CREATE TYPE document.shared_status as (sent_to email, whensent timestamp, event document.activity_type);

CREATE or REPLACE FUNCTION document.document_status(user_id email, docid int) returns setof document.shared_status 
language plpgsql as $$
begin return query select sent_to, max(whendone) as whensent, max(activity) as event from document.docshares where doc_id=docid GROUP BY sent_to;
end $$;

-- Gets doc information for company status page
CREATE or REPLACE FUNCTION document.get_document(user_id email, docid int) returns bytea language plpgsql as $$
declare
  docu bytea;
begin 
--  select company into comp from user_role where email=user_id and role='issuer';
  select content into docu from document.documentview where (company in (select document.companies(user_id)) and doc_id=docid) OR (user_id in (select sent_to from document.docshares where doc_id=doc_id) and doc_id=doc_id);
  return docu;
end $$;

-- Gets doc information for company status page
CREATE or REPLACE FUNCTION document.get_docmeta(user_id email, docid int) returns setof document.docinfo language plpgsql as $$
declare
  comp company_type;
begin 
--  select company into comp from user_role where email=user_id and role='issuer';
  return query select * from document.docinfo where company in (select document.companies(user_id)) and doc_id=docid;
end $$;

create type document.I_doc_status_type as (loggedin timestamp);

/* This seems to have been a typo - - not sure what it should be
CREATE or REPLACE FUNCTION document.get_I_docstatus(user_id email, investor email) returns setof document.I_doc_status_type language plpgsql as $$
begin 
  return query select loggedin, sent(select max(login_time) as loggedin from public.user_log where email=investor) as b;
end $$;
*/