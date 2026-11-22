-- Server actions read and write dean_signatures with the service role when a letter is endorsed.
grant select, insert, update on public.dean_signatures to service_role;
