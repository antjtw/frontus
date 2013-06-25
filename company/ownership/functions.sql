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
CREATE OR REPLACE FUNCTION ownership.update_transaction(newinvestor character varying, investorkey character varying, issuekey character varying, newissue character varying, newunits double precision, datekey character varying, newamount double precision) RETURNS VOID AS
$$
BEGIN
	IF issuekey = 'undefined' THEN
	INSERT INTO ownership.company_transaction (investor, company, issue, units, date, amount) VALUES (newinvestor, (select distinct company from account.companies), newissue, newunits, datekey::date, newamount);
	ELSE
	UPDATE ownership.company_transaction SET units=newunits, issue=newissue, investor=newinvestor, amount=newamount where issue=issuekey and company=(select distinct company from account.companies) and investor=investorkey and date=datekey::date;
	END IF;
END;
$$
LANGUAGE plpgsql;

CREATE OR REPLACE FUNCTION ownership.update_transaction() returns TRIGGER language plpgsql SECURITY DEFINER AS $$
BEGIN
    UPDATE ownership.transaction SET units=NEW.units, issue=NEW.issue, investor=NEW.investor, amount=NEW.amount where issue=OLD.issue and company=OLD.company and investor=OLD.investor and date=OLD.date;
    RETURN NEW;
END $$;

CREATE TRIGGER update_transaction INSTEAD OF UPDATE on ownership.company_transaction FOR EACH ROW EXECUTE PROCEDURE ownership.update_transaction();


CREATE OR REPLACE FUNCTION ownership.create_transaction() returns TRIGGER language plpgsql SECURITY DEFINER AS $$
BEGIN
    INSERT INTO ownership.transaction (investor, company, issue, units, date, amount) VALUES (NEW.investor, NEW.company, NEW.issue, NEW.units, NEW.date, NEW.amount);
    RETURN NEW;
END $$;

CREATE TRIGGER create_transaction INSTEAD OF INSERT on ownership.company_transaction FOR EACH ROW EXECUTE PROCEDURE ownership.create_transaction();




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