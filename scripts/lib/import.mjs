import fs from 'node:fs';
import path from 'node:path';
import {parseCsv,pick} from './csv.mjs';
export const required=(v,label)=>{if(typeof v!=='string'||!v.trim())throw Error(`Missing ${label}`);return v.trim();};
export function date(v,label='date') {required(v,label);if(!/^\d{4}-\d{2}-\d{2}$/.test(v)||!Number.isFinite(Date.parse(v))||new Date(v).toISOString().slice(0,10)!==v)throw Error(`Invalid ${label}: ${v}`);return v;}
export function decimal(v,label='quantity',scale=3) {v=String(v??'');if(!new RegExp(`^\\d{1,12}(?:\\.\\d{1,${scale}})?$`).test(v))throw Error(`Invalid non-negative ${label}: ${v}`);return v;}
export function currency(v){if(!/^[A-Z]{3}$/.test(v||''))throw Error('Currency must be three uppercase letters');return v;}
const fileSpecs=[['Account','accounts'],['Product2','products'],['SalesAgreement','agreements'],['SalesAgreementProduct','lines'],['SalesAgreementProductSchedule','schedules']];
export async function importSalesforce(db,o){
 const dir=path.resolve(required(o.dir,'--dir')); const asOf=date(required(o['as-of'],'--as-of'));
 if(asOf>new Date().toISOString().slice(0,10))throw Error('Actuals date cannot be in the future');
 const data=fileSpecs.map(([file,table])=>({file,table,rows:parseCsv(fs.readFileSync(path.join(dir,`${file}.csv`),'utf8'))}));
 if(data.some(x=>!x.rows.length))throw Error('All five files must contain records');
 const result=[];
 const link=async(table,key)=>{required(key,`${table} source reference`);const [r]=await db.query(`select id from ${table} where source_id=$1`,[key]);if(!r)throw Error(`Missing ${table} source reference: ${key}`);return r.id;};
 for(const {file,table,rows} of data){
  const seen=new Set();let added=0,updated=0,unchanged=0;
  for(const row of rows){
   const id=required(pick(row,'Id'),`${file}.Id`);if(seen.has(id))throw Error(`Duplicate ${file}.Id: ${id}`);seen.add(id);
   const raw=JSON.stringify(row);const [old]=await db.query(`select * from ${table} where source_id=$1`,[id]);
   const same=old&&(await db.query('select $1::jsonb=$2::jsonb same',[JSON.stringify(old.source_row),raw]))[0].same;
   if(same){unchanged++;continue;}
   if(old&&!o['replace-source'])throw Error(`Source changed for ${file} ${id}; preview with --replace-source --dry-run`);
   let values={source_id:id};
   if(table==='accounts')values.name=required(pick(row,'Name'),`${file}.Name`);
   if(table==='products')values={...values,name:required(pick(row,'Name'),`${file}.Name`),unit:pick(row,'QuantityUnitOfMeasure')||'units'};
   if(table==='agreements'){
    const status=required(pick(row,'Status'),'Status');if(!['Draft','Approved','Active','Expired','Cancelled'].includes(status))throw Error(`Unsupported source status ${status}; map explicitly before import`);
    values={...values,name:required(pick(row,'Name'),'Name'),account_id:await link('accounts',pick(row,'AccountId')),starts_on:date(pick(row,'StartDate','SA_Start_Date')),ends_on:date(pick(row,'EndDate','SA_End_Date')),currency:currency(pick(row,'CurrencyIsoCode','cdp_sys_record_currency')||o.currency),status,owner:pick(row,'OwnerId')};
   }
   if(table==='lines')values={...values,agreement_id:await link('agreements',pick(row,'SalesAgreementId')),product_id:await link('products',pick(row,'ProductId'))};
   if(table==='schedules')values={...values,line_id:await link('lines',pick(row,'SalesAgreementProductId')),starts_on:date(pick(row,'StartDate','SA_Pdct_Schd_Start_Date')),ends_on:date(pick(row,'EndDate','SA_Pdct_Schd_End_Date')),planned:decimal(pick(row,'PlannedQuantity')),actual:decimal(pick(row,'ActualQuantity')),price:decimal(pick(row,'SalesPrice','SalesPriceCurrency'),'price',4),actual_as_of:asOf};
   if(table==='agreements'&&old){values.evidence='';values.review_due=null;}
   // Invalidate local account review when upstream facts change.
   if(table==='accounts'&&old){values.reviewed_on=null;values.review_due=null;}
   values.source_row=raw;
   const keys=Object.keys(values),params=Object.values(values);
   if(old){await db.query(`update ${table} set ${keys.map((k,i)=>`${k}=$${i+1}`).join(',')} where id=$${keys.length+1}`,[...params,old.id]);updated++;}
   else{await db.query(`insert into ${table} (${keys.join(',')}) values (${keys.map((_,i)=>`$${i+1}`).join(',')})`,params);added++;}
   await db.query('insert into events(actor,action,details) values($1,$2,$3)',[o.actor,`import:${file}`,JSON.stringify({source_id:id,before:old||null,source:row,as_of:asOf})]);
  }
  result.push({object:file,added,updated,unchanged});
 }
 return result;
}
