
-- Returns single document info for company viewer
CREATE or REPLACE FUNCTION document.get_docdetail(did int) returns setof document.docinfo language plpgsql as $$
begin return query select * from document.docinfo where doc_id=did;
end $$;

CREATE or REPLACE FUNCTION document.get_doclength(did int) returns setof integer language plpgsql as $$
begin return query select max(page) from document.page_image_view where doc_id=did;
end $$;

-- --------------------------------------------

--Returns the user status information
CREATE OR REPLACE FUNCTION document.get_doc_activity(docid integer) RETURNS SETOF document.activity_feed LANGUAGE plpgsql AS $$
BEGIN RETURN QUERY SELECT * from document.activity_feed where doc_id=docid;
END $$;

CREATE OR REPLACE FUNCTION document.delete_document() returns TRIGGER language plpgsql SECURITY DEFINER AS $$
BEGIN
  delete from document.library where doc_id = OLD.doc_id;
  RETURN NEW;
END $$;
CREATE TRIGGER delete_document INSTEAD OF DELETE ON document.my_library FOR EACH ROW EXECUTE PROCEDURE document.delete_document();
GRANT DELETE on document.my_library TO investor;


-- Company delete document function
CREATE or REPLACE FUNCTION document.delete_document(docid int) returns int language plpgsql as $$
declare num int;
begin delete from document.my_library where doc_id = docid and company in (Select company from account.my_role where role='issuer');
 GET DIAGNOSTICS num = ROW_COUNT;
 return num;
end $$;	

CREATE OR REPLACE FUNCTION document.title_change() returns TRIGGER language plpgsql SECURITY DEFINER AS $$
BEGIN
  UPDATE document.library SET docname=NEW.docname where doc_id = OLD.doc_id;
  RETURN NEW;
END $$;
CREATE TRIGGER title_change INSTEAD OF UPDATE ON document.my_library FOR EACH ROW EXECUTE PROCEDURE document.title_change();
GRANT UPDATE on document.my_library TO investor;

-- Changes the title of a company's document
CREATE or REPLACE FUNCTION document.title_change(docid int, newname character varying) returns void language plpgsql as $$
BEGIN UPDATE document.my_library set docname=newname WHERE doc_id=docid and company in (Select company from account.my_role where role='issuer');
END $$;

CREATE OR REPLACE FUNCTION document.document_revoke() returns TRIGGER language plpgsql SECURITY DEFINER AS $$
BEGIN
  INSERT INTO document.revoked VALUES (NEW.doc_id, NEW.sent_to, NEW.sent_from, NEW.sender, NEW.access);
  RETURN NEW;
END $$;
CREATE TRIGGER document_revoke INSTEAD OF INSERT ON document.my_revoked FOR EACH ROW EXECUTE PROCEDURE document.document_revoke();
GRANT INSERT on document.my_revoked TO investor;

-- Revokes access to document for a specific user
CREATE or REPLACE FUNCTION document.document_revoke(docid int, xemail character varying) returns void 
language plpgsql as $$
BEGIN INSERT INTO document.my_revoked(doc_id, sent_to, sent_from, sender, access) values (docid, xemail, (select email from account.my_role where role='issuer'), (Select company from account.my_role where role='issuer'), 'revoked');
END $$;



CREATE OR REPLACE FUNCTION document.share_document() returns TRIGGER language plpgsql SECURITY DEFINER AS $$
BEGIN
    INSERT INTO document.sharing (doc_id, sent_to, sender, sent_from, activity) VALUES (NEW.doc_id, NEW.sent_to, NEW.sender, NEW.sent_from, NEW.activity);
  RETURN NEW;
END $$;
CREATE TRIGGER share_document INSTEAD OF INSERT ON document.my_shares FOR EACH ROW EXECUTE PROCEDURE document.share_document();
GRANT INSERT on document.my_shares TO investor;

-- Share document, sends email and tracks action
CREATE or REPLACE FUNCTION document.share_document(docid int, xemail character varying, message character varying) returns void
language plpgsql as $$
declare
  template text = mail.get_mail_template('doc-share.html');
  comp account.company_type;
  doc text;
begin
  select company into comp from account.my_role where role='issuer';
  template = replace(replace(template,'{{message}}', message), '{{link}}', concat('http://localhost:4040/investor/documents/view?doc=' , docid));
  template = replace(template, '{{company}}', comp);
  select docname into doc from document.my_library where doc_id=docid;
  template = replace(template, '{{name}}', doc);
  perform mail.send_mail(xemail, concat(doc,' has been shared with you!'), template);
  insert into document.my_shares(doc_id, sent_to, sent_from, activity, sender) values (docid, xemail, comp, 'shared', (select distinct email from account.my_role));
end $$;

-- Share document, sends email and tracks action
CREATE or REPLACE FUNCTION document.remind_document(docid int, xemail character varying, message character varying) returns void
language plpgsql as $$
declare
  template text = mail.get_mail_template('doc-share.html');
  comp account.company_type;
  doc text;
begin
  select company into comp from account.my_role where role='issuer';
  template = replace(replace(template,'{{message}}', message), '{{link}}', concat('http://localhost:4040/investor/documents/view?doc=' , docid));
  template = replace(template, '{{company}}', comp);
  select docname into doc from document.my_library where doc_id=docid;
  template = replace(template, '{{name}}', doc);
  perform mail.send_mail(xemail, concat(doc,' needs your attention!'), template);
  insert into document.my_shares(doc_id, sent_to, sent_from, activity, sender) values (docid, xemail, comp, 'reminder', (select distinct email from account.my_role));
end $$;

-- Sharing information for document status page
CREATE TYPE document.shared_status as (sent_to email, whensent timestamp, event document.activity_type);

CREATE or REPLACE FUNCTION document.document_status(docid int) returns setof document.shared_status 
language plpgsql as $$
begin 
return query 
      (select sent_to, max(when_sent) as whensent, max(activity) as event from document.my_shares where doc_id=docid and sent_to not in (SELECT sent_to from document.my_revoked x where x.doc_id=docid) GROUP BY sent_to)
UNION (select sent_to, max(when_revoked) as whensent, max(access)   as event from document.my_revoked where doc_id=docid GROUP BY sent_to);
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

CREATE OR REPLACE FUNCTION document.get_i_docstatus(investor account.email)
 RETURNS SETOF document.i_doc_status_type
 LANGUAGE plpgsql
AS $function$
begin 
  return query select max(login_time) as loggedin from document.user_tracker where email=investor;
  return query select min(when_sent) as loggedin from document.my_shares where sent_to=investor and activity='shared';
  return query select max(when_sent) as loggedin from document.my_shares where sent_to=investor and activity='viewed';
  return query select min(when_sent) as loggedin from document.my_shares where sent_to=investor and activity='signed';
  return query select max(when_sent) as loggedin from document.my_shares where sent_to=investor and activity='reminder';
end $function$;
