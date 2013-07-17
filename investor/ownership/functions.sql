-- Investor Captable Functions

-- Function to track views

CREATE OR REPLACE VIEW ownership.my_company_issue AS (SELECT * from ownership.issue where company in (SELECT distinct company from ownership.audit where email=current_user));
GRANT SELECT ON ownership.my_company_issue to INVESTOR;

CREATE OR REPLACE VIEW ownership.my_company_transaction AS (SELECT * from ownership.transaction where company in (SELECT distinct company from ownership.audit where email=current_user) and investor=current_user);
GRANT SELECT ON ownership.my_company_transaction to INVESTOR;

CREATE OR REPLACE VIEW ownership.my_company_othertran AS (select sum(units) as units from ownership.transaction where investor != current_user and company in (SELECT distinct company from ownership.audit where email=current_user));
GRANT SELECT ON ownership.my_company_othertran to INVESTOR;

CREATE OR REPLACE VIEW ownership.my_company_audit AS (SELECT * from ownership.audit where email=current_user and company in (SELECT distinct company from ownership.audit where email=current_user));
GRANT SELECT ON ownership.my_company_audit to INVESTOR;

CREATE OR REPLACE VIEW ownership.my_company_views AS (SELECT * from ownership.views where company in (SELECT distinct company from ownership.audit where email=current_user));
GRANT INSERT ON ownership.my_company_views to INVESTOR;

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
