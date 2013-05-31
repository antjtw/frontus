CREATE OR REPLACE FUNCTION ownership.update_captable(specificrow int, person text, numshares int) RETURNS VOID AS
$$
BEGIN
	INSERT INTO ownership.my_captable (company, row, shareholder, shares) VALUES ((select distinct company from account.companies), specificrow, person, numshares);
END;
$$
LANGUAGE plpgsql;

CREATE OR REPLACE FUNCTION ownership.update_captable() returns TRIGGER language plpgsql SECURITY DEFINER AS $$
BEGIN
  BEGIN
    INSERT INTO ownership.captable_content (company, row, shareholder, shares) VALUES (NEW.company, NEW.row, NEW.shareholder, NEW.shares);
    RETURN NEW;
  EXCEPTION WHEN unique_violation THEN
    UPDATE ownership.captable_content SET shareholder=NEW.shareholder, shares=NEW.shares where row=NEW.row and company = NEW.company;
  	RETURN NEW;
  END;
END $$;
CREATE TRIGGER update_captable INSTEAD OF INSERT on ownership.my_captable FOR EACH ROW EXECUTE PROCEDURE ownership.update_captable();



CREATE OR REPLACE FUNCTION ownership.update_captable_header(index text, header text) RETURNS VOID AS
$$
BEGIN
	UPDATE ownership.my_captable_columns SET columnheaders = columnheaders || (index=>header);
END;
$$
LANGUAGE plpgsql;

CREATE OR REPLACE FUNCTION ownership.update_captable_header() returns TRIGGER language plpgsql SECURITY DEFINER AS $$
BEGIN
	UPDATE ownership.captable_columns SET columnheaders = columnheaders || NEW.index=>NEW.header::hstore;
  	RETURN NEW;
END $$;
CREATE TRIGGER update_captable_header INSTEAD OF UPDATE on ownership.my_captable_columns FOR EACH ROW EXECUTE PROCEDURE ownership.update_captable_header();