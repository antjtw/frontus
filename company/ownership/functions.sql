-- Captable Functions


-- Get allowable types

CREATE OR REPLACE FUNCTION ownership.get_issuetypes() RETURNS SETOF name AS $$
BEGIN
RETURN QUERY SELECT enumlabel FROM pg_enum WHERE enumtypid = 'ownership.issue_type'::regtype ORDER BY oid;
END;
$$
LANGUAGE plpgsql;

CREATE OR REPLACE FUNCTION ownership.get_freqtypes() RETURNS SETOF name AS $$
BEGIN
RETURN QUERY SELECT enumlabel FROM pg_enum WHERE enumtypid = 'ownership.frequency_type'::regtype ORDER BY oid;
END;
$$
LANGUAGE plpgsql;

-- Updates Issues
CREATE OR REPLACE FUNCTION ownership.update_issue(key character varying, newdate character varying, newissue character varying, newpremoney double precision, newpostmoney double precision, newppshare double precision, newtotalauth double precision, newpartpref boolean, newliquidpref boolean, newoptundersec character varying, newprice double precision, newterms double precision, newvestcliffdate character varying, newvestcliff double precision, newvestclifffreq character varying, newdebtundersec character varying, newinterestrate double precision, newvalcap double precision, newdiscount double precision, newterm double precision) RETURNS VOID AS
$$
BEGIN
	UPDATE ownership.company_issue SET company=(select distinct company from account.companies), date=newdate::date, issue=newissue, premoney=newpremoney, postmoney=newpostmoney, price=newprice, ppshare=newppshare, totalauth=newtotalauth, partpref=newpartpref, liquidpref=newliquidpref, optundersec=newoptundersec, terms=newterms, vestingbegins=newvestcliffdate::date, vestcliff=newvestcliff, vestfreq=newvestclifffreq::ownership.frequency_type, debtundersec=newdebtundersec, interestrate=newinterestrate, valcap=newvalcap, discount=newdiscount, term=newterm where issue=key;
END;
$$
LANGUAGE plpgsql;

CREATE OR REPLACE FUNCTION ownership.update_issue() returns TRIGGER language plpgsql SECURITY DEFINER AS $$
BEGIN
	UPDATE ownership.issue SET date=NEW.date, issue=NEW.issue, premoney=NEW.premoney, postmoney=NEW.postmoney, ppshare=NEW.ppshare, totalauth=NEW.totalauth, partpref=NEW.partpref, liquidpref=NEW.liquidpref, price=NEW.price, optundersec=NEW.optundersec, terms=NEW.terms, vestingbegins=NEW.vestingbegins, vestcliff=NEW.vestcliff, vestfreq=NEW.vestfreq, debtundersec=NEW.debtundersec, interestrate=NEW.interestrate, valcap=NEW.valcap, discount=NEW.discount, term=NEW.term where company=OLD.company and issue=OLD.issue;    
	RETURN NEW;
END $$;

CREATE TRIGGER update_issue INSTEAD OF UPDATE on ownership.company_issue FOR EACH ROW EXECUTE PROCEDURE ownership.update_issue();



-- Creates New Issues
CREATE OR REPLACE FUNCTION ownership.create_issue(newdate character varying, newexpiration character varying, newissue character varying, newprice double precision) RETURNS VOID AS
$$
BEGIN
	INSERT INTO ownership.company_issue (company, date, vestingbegins, issue, price) VALUES ((select distinct company from account.companies), newdate::date, newexpiration::date, newissue, newprice);
END;
$$
LANGUAGE plpgsql;

CREATE OR REPLACE FUNCTION ownership.create_issue() returns TRIGGER language plpgsql SECURITY DEFINER AS $$
BEGIN
	INSERT INTO ownership.issue (company, date, vestingbegins, issue, price) VALUES (New.company, NEW.date, NEW.vestingbegins, NEW.issue, NEW.price);    
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


-- Creates and Updates Transactions
CREATE OR REPLACE FUNCTION ownership.update_transaction(key character varying, newinvestor character varying, newissue character varying, newunits double precision, newdate character varying, newtype character varying, newamount double precision, newpremoney double precision, newpostmoney double precision, newppshare double precision, newtotalauth double precision, newpartpref boolean, newliquidpref boolean, newoptundersec character varying, newprice double precision, newterms double precision, newvestcliffdate character varying, newvestcliff double precision, newvestclifffreq character varying, newdebtundersec character varying, newinterestrate double precision, newvalcap double precision, newdiscount double precision, newterm double precision) RETURNS SETOF bigint AS
$$
BEGIN
	IF key = '' THEN
	INSERT INTO ownership.company_transaction (tran_id, investor, company, issue, units, date, amount, type) VALUES (DEFAULT, newinvestor, (select distinct company from account.companies), newissue, newunits, newdate::date, newamount, newtype::ownership.transaction_type);
	RETURN QUERY SELECT document.pseudo_encrypt(currval('ownership.transaction_tran_id_seq')::int);
	ELSE
	RETURN QUERY UPDATE ownership.company_transaction SET units=newunits, issue=newissue, investor=newinvestor, amount=newamount, date=newdate::date, type=newtype::ownership.transaction_type, premoney=newpremoney, postmoney=newpostmoney, ppshare=newppshare, totalauth=newtotalauth, partpref=newpartpref, liquidpref=newliquidpref, price=newprice, optundersec=newoptundersec, terms=newterms, vestingbegins=newvestcliffdate::date, vestcliff=newvestcliff, vestfreq=newvestclifffreq::ownership.frequency_type, debtundersec=newdebtundersec, interestrate=newinterestrate, valcap=newvalcap, discount=newdiscount, term=newterm where tran_id=key::integer and company=(select distinct company from account.companies) RETURNING tran_id::bigint;
	END IF;
END;
$$
LANGUAGE plpgsql;

GRANT SELECT ON ownership.transaction_tran_id_seq to investor;

CREATE OR REPLACE FUNCTION ownership.update_transaction() returns TRIGGER language plpgsql SECURITY DEFINER AS $$
BEGIN
    UPDATE ownership.transaction SET units=NEW.units, issue=NEW.issue, investor=NEW.investor, amount=NEW.amount, date=NEW.date, type=NEW.type, premoney=NEW.premoney, postmoney=NEW.postmoney, ppshare=NEW.ppshare, totalauth=NEW.totalauth, partpref=NEW.partpref, liquidpref=NEW.liquidpref, price=NEW.price, optundersec=NEW.optundersec, terms=NEW.terms, vestingbegins=NEW.vestingbegins, vestcliff=NEW.vestcliff, vestfreq=NEW.vestfreq, debtundersec=NEW.debtundersec, interestrate=NEW.interestrate, valcap=NEW.valcap, discount=NEW.discount, term=NEW.term where tran_id=OLD.tran_id and company=OLD.company;
    RETURN NEW;
END $$;

CREATE TRIGGER update_transaction INSTEAD OF UPDATE on ownership.company_transaction FOR EACH ROW EXECUTE PROCEDURE ownership.update_transaction();


CREATE OR REPLACE FUNCTION ownership.create_transaction() returns TRIGGER language plpgsql SECURITY DEFINER AS $$
BEGIN
    INSERT INTO ownership.transaction (tran_id, investor, company, issue, units, date, amount, type) VALUES (DEFAULT, NEW.investor, NEW.company, NEW.issue, NEW.units, NEW.date, NEW.amount, NEW.type);
    RETURN NEW;
END $$;

CREATE TRIGGER create_transaction INSTEAD OF INSERT on ownership.company_transaction FOR EACH ROW EXECUTE PROCEDURE ownership.create_transaction();


-- Delete Transactions
CREATE OR REPLACE FUNCTION ownership.delete_transaction(key integer) RETURNS VOID AS
$$
BEGIN
	DELETE FROM ownership.company_transaction where company=(select distinct company from account.companies) and tran_id=key;
END;
$$
LANGUAGE plpgsql;

CREATE OR REPLACE FUNCTION ownership.delete_transaction() returns TRIGGER language plpgsql SECURITY DEFINER AS $$
BEGIN
	DELETE FROM ownership.transaction where company=OLD.company and tran_id=OLD.tran_id;    
	RETURN NEW;
END $$;

CREATE TRIGGER delete_transaction INSTEAD OF DELETE ON ownership.company_transaction FOR EACH ROW EXECUTE PROCEDURE ownership.delete_transaction();



-- Grants Page
CREATE OR REPLACE VIEW ownership.company_options AS (SELECT * from ownership.company_transaction where company = (select distinct company from account.companies) and type='options');
GRANT SELECT ON ownership.company_options to investor;


-- Update or Create Grants
CREATE OR REPLACE FUNCTION ownership.update_grant(key character varying, newtran_id character varying, newaction character varying, newdate character varying, newunit double precision) RETURNS SETOF bigint AS
$$
BEGIN
	IF key = '' THEN
	RETURN QUERY INSERT INTO ownership.company_grants (grant_id, tran_id, company, unit, date, action) VALUES (document.pseudo_encrypt(nextval('ownership.grants_grant_id_seq')::int), newtran_id::integer, (select distinct company from account.companies), newunit, newdate::date, newaction::ownership.grant_type) RETURNING grant_id::bigint;
	ELSE
	RETURN QUERY UPDATE ownership.company_grants SET unit=newunit, date=newdate::date, action=newaction::ownership.grant_type where tran_id=newtran_id::integer and grant_id=key::int and company=(select distinct company from account.companies) RETURNING grant_id::bigint;
	END IF;
END;
$$
LANGUAGE plpgsql;

GRANT USAGE, SELECT ON ownership.grants_grant_id_seq to investor;

CREATE OR REPLACE FUNCTION ownership.update_grant() returns TRIGGER language plpgsql SECURITY DEFINER AS $$
BEGIN
    UPDATE ownership.grants SET unit=NEW.unit, date=NEW.date, action=NEW.action where tran_id=OLD.tran_id and grant_id=OLD.grant_id and company=OLD.company;
    RETURN NEW;
END $$;

CREATE TRIGGER update_grant INSTEAD OF UPDATE on ownership.company_grants FOR EACH ROW EXECUTE PROCEDURE ownership.update_grant();


CREATE OR REPLACE FUNCTION ownership.create_grant() returns TRIGGER language plpgsql SECURITY DEFINER AS $$
BEGIN
    INSERT INTO ownership.grants (tran_id, grant_id, company, unit, date, action) VALUES (New.tran_id, NEW.grant_id, NEW.company, NEW.unit, NEW.date, NEW.action);
    RETURN NEW;
END $$;

CREATE TRIGGER create_grant INSTEAD OF INSERT on ownership.company_grants FOR EACH ROW EXECUTE PROCEDURE ownership.create_grant();


CREATE OR REPLACE FUNCTION ownership.delete_grant(key integer) RETURNS VOID AS
$$
BEGIN
	DELETE FROM ownership.company_grants where company=(select distinct company from account.companies) and grant_id=key;
END;
$$
LANGUAGE plpgsql;

CREATE OR REPLACE FUNCTION ownership.delete_grant() returns TRIGGER language plpgsql SECURITY DEFINER AS $$
BEGIN
	DELETE FROM ownership.grants where company=OLD.company and grant_id=OLD.grant_id;    
	RETURN NEW;
END $$;

CREATE TRIGGER delete_grant INSTEAD OF DELETE ON ownership.company_grants FOR EACH ROW EXECUTE PROCEDURE ownership.delete_grant();

