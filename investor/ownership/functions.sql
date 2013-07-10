-- Investor Captable Functions



CREATE OR REPLACE VIEW ownership.my_company_issue AS (SELECT * from ownership.issue where company in (SELECT distinct company from ownership.audit where email=current_user));
GRANT SELECT ON ownership.my_company_issue to INVESTOR;

CREATE OR REPLACE VIEW ownership.my_company_transaction AS (SELECT * from ownership.transaction where company in (SELECT distinct company from ownership.audit where email=current_user) and investor=current_user);
GRANT SELECT ON ownership.my_company_transaction to INVESTOR;

CREATE OR REPLACE VIEW ownership.my_company_othertran AS (select sum(units) as units from ownership.transaction where investor != current_user and company in (SELECT distinct company from ownership.audit where email=current_user));
GRANT SELECT ON ownership.my_company_othertran to INVESTOR;

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