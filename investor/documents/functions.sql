
-- Gets doc information for investor and tracks it as a viewing of the document
CREATE or REPLACE FUNCTION document.get_docmetaI(user_id email, docid int) returns setof document.docinfo language plpgsql as $$
begin 
  perform distinct doc_id from document.docshares where sent_to=user_id and doc_id=docid;
  if not found then return query select * from document.docinfo where 1 = 0; end if;
  insert into document.docshares(doc_id, sent_to, activity) values (docid, user_id, 'viewed');
  return query select * from document.docinfo where doc_id=docid;
end $$;

-- Get all the documents shared with an investor for the investor list page
create type document.investor_list as (doc integer, status document.activity_type, docname character varying, last_updated timestamp);

CREATE OR REPLACE FUNCTION document.get_investordocs(user_id email) returns setof document.investor_list language plpgsql as $$
begin return query select doc, status, docname, last_updated from document.docinfo i, (select doc_id as doc, max(activity) as status from document.docshares where sent_to=user_id group by doc_id) as d where d.doc=i.doc_id;
end $$;
