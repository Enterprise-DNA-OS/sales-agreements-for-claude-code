insert into accounts(id,source_id,name,reviewed_on,review_due,retention_purpose) values
 ('10000000-0000-0000-0000-000000000001','DEMO-AC1','Harbour Components',current_date-90,current_date-1,'Current supply agreement'),
 ('10000000-0000-0000-0000-000000000002','DEMO-AC2','Southern Fabrication',current_date,current_date+90,'Current supply agreement') on conflict do nothing;
insert into products(id,source_id,name,unit) values
 ('20000000-0000-0000-0000-000000000001','DEMO-P1','Filter housing','pieces'),
 ('20000000-0000-0000-0000-000000000002','DEMO-P2','Seal kit','kits') on conflict do nothing;
insert into agreements(id,source_id,name,account_id,starts_on,ends_on,currency,status,owner,evidence,review_due) values
 ('30000000-0000-0000-0000-000000000001','DEMO-A1','Harbour annual supply','10000000-0000-0000-0000-000000000001',current_date-120,current_date+35,'NZD','Active','Mara','Signed demo agreement',current_date-2),
 ('30000000-0000-0000-0000-000000000002','DEMO-A2','Southern supply','10000000-0000-0000-0000-000000000002',current_date-120,current_date+180,'AUD','Active','Theo','',current_date+30) on conflict do nothing;
insert into lines(id,source_id,agreement_id,product_id) values
 ('40000000-0000-0000-0000-000000000001','DEMO-L1','30000000-0000-0000-0000-000000000001','20000000-0000-0000-0000-000000000001'),
 ('40000000-0000-0000-0000-000000000002','DEMO-L2','30000000-0000-0000-0000-000000000002','20000000-0000-0000-0000-000000000002') on conflict do nothing;
insert into schedules(id,source_id,line_id,starts_on,ends_on,planned,actual,price,actual_as_of) values
 ('50000000-0000-0000-0000-000000000001','DEMO-S1','40000000-0000-0000-0000-000000000001',current_date-60,current_date-31,1000,650,12.50,current_date-21),
 ('50000000-0000-0000-0000-000000000002','DEMO-S2','40000000-0000-0000-0000-000000000001',current_date-30,current_date-1,1200,1000,12.50,current_date),
 ('50000000-0000-0000-0000-000000000003','DEMO-S3','40000000-0000-0000-0000-000000000001',current_date,current_date+29,1500,0,12.50,current_date),
 ('50000000-0000-0000-0000-000000000004','DEMO-S4','40000000-0000-0000-0000-000000000002',current_date-30,current_date-1,800,850,8.25,current_date) on conflict do nothing;
insert into followups(id,agreement_id,name,owner,due_on) values
 ('60000000-0000-0000-0000-000000000001','30000000-0000-0000-0000-000000000001','Confirm shortfall recovery','Mara',current_date-3) on conflict do nothing;
