-- example on how to 

create or replace function get_signupcnt_all(USERID EMAIL) returns setof bigint as $$
begin
  return query select count(*) from public.user where when_registered IS NOT NULL;
end
$$ language plpgsql;

create or replace function get_signupcnt_today(USERID EMAIL) returns setof bigint as $$
begin
  return query select count(*) from public.user where when_registered >= now() - INTERVAL '1 DAY';
end
$$ language plpgsql;


create or replace function get_signupcnt_yesterday(USERID EMAIL) returns setof bigint as $$
begin
  return query select count(*) from public.user where (when_registered >= now() - INTERVAL '2 DAY') AND (when_registered < now() - INTERVAL '1 DAY');
end
$$ language plpgsql;

create or replace function get_signups(userid varchar, mimetype varchar, whenx date) returns bytea language plpgsql as $$
declare 
  cs cursor for select * from sxsw;
  result bytea;
begin
  open cs;
  if mimetype = 'application/ms-excel' then
   select asExcel('cs') into result;
    return result;
  elsif mimetype = 'application/csv' then
    select asCsv('cs') into result;
      return result;
  else raise exception 'unknown mime type';
  end if;
end $$;







