-- Investor Captable Functions

-- Function to track views

CREATE OR REPLACE FUNCTION ownership.mark_viewed(comp character varying)
 RETURNS boolean
 LANGUAGE plpgsql
AS $$
BEGIN
	PERFORM distinct company from ownership.my_company_audit where email = current_user and company = comp;
	IF FOUND THEN
		INSERT INTO ownership.my_company_views (email, company) VALUES (current_user, comp::account.company_type);
		RETURN true;
	END IF;
	RETURN false;
END
$$;

CREATE OR REPLACE FUNCTION ownership.mark_viewed() returns TRIGGER language plpgsql SECURITY DEFINER AS $$
BEGIN
    INSERT INTO ownership.views (company, email) VALUES (NEW.company, NEW.email);
  RETURN NEW;
END $$;
CREATE TRIGGER mark_viewed INSTEAD OF INSERT ON ownership.my_company_views FOR EACH ROW EXECUTE PROCEDURE ownership.mark_viewed();


CREATE OR REPLACE FUNCTION ownership.get_my_transactions(comp character varying)
 RETURNS SETOF ownership.my_company_transaction
 LANGUAGE plpgsql
AS $$
BEGIN
	RETURN QUERY SELECT * from ownership.my_company_transaction where company = comp::account.company_type;
END
$$;

CREATE OR REPLACE FUNCTION ownership.get_my_issues(comp character varying)
 RETURNS SETOF ownership.my_company_issue
 LANGUAGE plpgsql
AS $$
BEGIN
	RETURN QUERY SELECT * from ownership.my_company_issue where company = comp::account.company_type;
END
$$;

--Allows an issuer to view the ownership activity of an investor in his company
CREATE OR REPLACE FUNCTION ownership.get_investor_activity_feed(xemail account.email)
 RETURNS SETOF ownership.company_activity_feed
 LANGUAGE plpgsql
AS $$
BEGIN
	RETURN QUERY SELECT * from ownership.company_activity_feed where email = xemail;
END
$$;

CREATE or REPLACE FUNCTION ownership.smush_rows(comp character varying) returns SETOF double precision language plpgsql SECURITY DEFINER as $$
BEGIN
	RETURN QUERY SELECT SUM(UNITS) from ownership.transaction where company = comp;	
END;
$$;

CREATE or REPLACE FUNCTION ownership.get_everyone_else(comp character varying) returns double precision language plpythonu as $$
z = plpy.prepare("select * from account.invested_companies where company=$1", ['text'])
r = plpy.execute(z,[comp])
try:
  allowed = r[0]['company']
  if allowed == comp:
    z = plpy.prepare("select * from ownership.smush_rows($1)", ['text'])
    r = plpy.execute(z,[comp])
    return r[0]['sum']
  else:
    return 0
except:
  return 0
$$;

CREATE or REPLACE FUNCTION ownership.get_everyone_else(comp character varying) returns text language plpythonu as $$
z = plpy.prepare("select * from account.invested_companies where company=$1", ['text'])
r = plpy.execute(z,[comp])
try:
  allowed = r[0]['company']
  if allowed == comp:
    return "here"
    z = plpy.prepare("select * from ownership.smush_rows($1)", ['text'])
    r = plpy.execute(z,[comp])
    return r[0]['sum']
  else:
    return 0
except:
  return 0
$$;

CREATE or REPLACE FUNCTION mail.get_ticket() returns varchar language plpythonu as $$
import random
import string
return ''.join(random.choice(string.ascii_uppercase+string.digits) for x in range(16))
$$;




