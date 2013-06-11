-- Updates Issues
CREATE OR REPLACE FUNCTION ownership.update_issue(key character varying, newdate character varying, newexpiration character varying, newissue character varying, newstrike double precision, newtype character varying) RETURNS VOID AS
$$
BEGIN
	UPDATE ownership.company_issue SET company=(select distinct company from account.companies), date=newdate::date, expiration=newexpiration::date, issue=newissue, strike=newstrike, type=newtype::ownership.issue_type where issue=key;
END;
$$
LANGUAGE plpgsql;

CREATE OR REPLACE FUNCTION ownership.update_issue() returns TRIGGER language plpgsql SECURITY DEFINER AS $$
BEGIN
	UPDATE ownership.issue SET date=NEW.date, expiration=NEW.expiration, issue=NEW.issue, strike=NEW.strike, type=NEW.type where company=OLD.company and issue=OLD.issue;    
	RETURN NEW;
END $$;

CREATE TRIGGER update_issue INSTEAD OF UPDATE on ownership.company_issue FOR EACH ROW EXECUTE PROCEDURE ownership.update_issue();



-- Creates New Issues
CREATE OR REPLACE FUNCTION ownership.create_issue(newdate character varying, newexpiration character varying, newissue character varying, newstrike double precision, newtype character varying) RETURNS VOID AS
$$
BEGIN
	INSERT INTO ownership.company_issue (company, date, expiration, issue, strike, type) VALUES ((select distinct company from account.companies), newdate::date, newexpiration::date, newissue, newstrike, newtype::ownership.issue_type);
END;
$$
LANGUAGE plpgsql;

CREATE OR REPLACE FUNCTION ownership.create_issue() returns TRIGGER language plpgsql SECURITY DEFINER AS $$
BEGIN
	INSERT INTO ownership.issue (company, date, expiration, issue, strike, type) VALUES (New.company, NEW.date, NEW.expiration, NEW.issue, NEW.strike, NEW.type);    
	RETURN NEW;
END $$;

CREATE TRIGGER create_issue INSTEAD OF INSERT on ownership.company_issue FOR EACH ROW EXECUTE PROCEDURE ownership.create_issue();



-- Delete Issues
CREATE OR REPLACE FUNCTION ownership.delete_issue(key character varying) RETURNS VOID AS
$$
BEGIN
	DELETE FROM ownership.company_issue where company=(select distinct company from account.companies) and issue=key;
END;
$$
LANGUAGE plpgsql;

CREATE OR REPLACE FUNCTION ownership.delete_issue() returns TRIGGER language plpgsql SECURITY DEFINER AS $$
BEGIN
	DELETE FROM ownership.issue where company=OLD.company and issue=OLD.issue;    
	RETURN NEW;
END $$;

CREATE TRIGGER delete_issue INSTEAD OF DELETE on ownership.company_issue FOR EACH ROW EXECUTE PROCEDURE ownership.delete_issue();




-- Updates Transactions
CREATE OR REPLACE FUNCTION ownership.update_transaction(investorkey character varying, issuekey character varying, newissue character varying, newunits double precision, newtype character varying, datekey character varying) RETURNS VOID AS
$$
BEGIN
	UPDATE ownership.company_transaction SET units=newunits, type=newtype::ownership.transaction_type, issue=newissue where issue=issuekey and company=(select distinct company from account.companies) and investor=investorkey and date=datekey::date;
END;
$$
LANGUAGE plpgsql;


-- Creates and Updates Transactions
CREATE OR REPLACE FUNCTION ownership.update_transaction(investorkey character varying, issuekey character varying, newissue character varying, newunits double precision, newtype character varying, datekey character varying) RETURNS VOID AS
$$
BEGIN
	IF issuekey = 'undefined' THEN
	INSERT INTO ownership.company_transaction (investor, company, issue, type, units, date) VALUES (investorkey, (select distinct company from account.companies), newissue, newtype::ownership.transaction_type, newunits, datekey::date);
	ELSE
	UPDATE ownership.company_transaction SET units=newunits, type=newtype::ownership.transaction_type, issue=newissue where issue=issuekey and company=(select distinct company from account.companies) and investor=investorkey and date=datekey::date;
	END IF;
END;
$$
LANGUAGE plpgsql;

CREATE OR REPLACE FUNCTION ownership.create_transaction() returns TRIGGER language plpgsql SECURITY DEFINER AS $$
BEGIN
    INSERT INTO ownership.transaction (investor, company, issue, type, units, date) VALUES (NEW.investor, NEW.company, NEW.issue, NEW.type, NEW.units, NEW.date);
    RETURN NEW;
END $$;

CREATE TRIGGER create_transaction INSTEAD OF INSERT on ownership.company_transaction FOR EACH ROW EXECUTE PROCEDURE ownership.create_transaction();

CREATE OR REPLACE FUNCTION ownership.update_transaction() returns TRIGGER language plpgsql SECURITY DEFINER AS $$
BEGIN
    UPDATE ownership.transaction SET units=NEW.units, type=NEW.type, issue=NEW.issue where issue=OLD.issue and company=OLD.company and investor=OLD.investor and date=OLD.date;
    RETURN NEW;
END $$;

CREATE TRIGGER update_transaction INSTEAD OF UPDATE on ownership.company_transaction FOR EACH ROW EXECUTE PROCEDURE ownership.update_transaction();



-- Delete Transactions
CREATE OR REPLACE FUNCTION ownership.delete_transaction(inve character varying, iss character varying, dat character varying) RETURNS VOID AS
$$
BEGIN
	DELETE FROM ownership.company_transaction where company=(select distinct company from account.companies) and issue=iss and date=dat::date and investor=inve;
END;
$$
LANGUAGE plpgsql;

CREATE OR REPLACE FUNCTION ownership.delete_transaction() returns TRIGGER language plpgsql SECURITY DEFINER AS $$
BEGIN
	DELETE FROM ownership.transaction where company=OLD.company and issue=OLD.issue and date=OLD.date and investor=OLD.investor;    
	RETURN NEW;
END $$;

CREATE TRIGGER delete_transaction INSTEAD OF DELETE ON ownership.company_transaction FOR EACH ROW EXECUTE PROCEDURE ownership.delete_transaction();