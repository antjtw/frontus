
-- Gets doc information for investor and tracks it as a viewing of the document
CREATE or REPLACE FUNCTION document.get_docmetaI(docid int) returns setof document.investor_docinfo language plpgsql as $$
begin
  perform distinct doc_id from document.my_investor_revoked where doc_id=docid;
  if found then return query select * from document.investor_docinfo where 1 = 0; end if;
  perform distinct doc_id from document.my_investor_shares where doc_id=docid;
  if not found then return query select * from document.investor_docinfo where 1 = 0; end if; 
  insert into document.my_shares(doc_id, sent_to, sender, sent_from, activity) values (docid, current_user, current_user, (select distinct sent_from from document.my_investor_shares where docid=doc_id), 'viewed');
  return query select * from document.investor_docinfo where doc_id=docid;
end $$;

-- Get all the documents shared with an investor for the investor list page
create type document.investor_list as (doc integer, status document.activity_type, docname character varying, last_updated timestamp);

CREATE OR REPLACE FUNCTION document.get_investordocs() returns setof document.investor_list language plpgsql as $$
begin return query select doc, status, docname, last_updated from document.investor_docinfo i, (select doc_id as doc, max(activity) as status from document.my_investor_shares group by doc_id) as d where d.doc=i.doc_id;
end $$;

CREATE OR REPLACE FUNCTION document.get_docstatus(docid int) returns document.activity_type language plpgsql as $$
begin return max(activity) from document.my_investor_shares where doc_id = docid ;
end $$;

CREATE OR REPLACE FUNCTION document.sign_document(docid int) returns boolean language plpgsql as $$
begin
	  insert into document.my_shares(doc_id, sent_to, sender, sent_from, activity) values (docid, current_user, current_user, (select distinct sent_from from document.my_investor_shares where docid=doc_id), 'signed');
	  RETURN true;
end $$;
