#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';
import {randomUUID} from 'node:crypto';
import {getDb,REPO_ROOT} from './lib/db.mjs';
import {table as textTable} from './lib/format.mjs';
import {page,table,writeOut} from './lib/render.mjs';
import {importSalesforce,required,date,decimal,currency} from './lib/import.mjs';
export const reads={
 accounts:'select id,source_id,name,reviewed_on,review_due,retention_purpose from accounts order by name',
 products:'select id,source_id,name,unit from products order by name',
 agreements:'select a.id,a.source_id,a.name,c.name account,a.status,a.currency,a.starts_on,a.ends_on,a.owner from agreements a join accounts c on c.id=a.account_id order by a.ends_on,a.name',
 lines:'select l.id,l.source_id,a.name agreement,p.name product,p.unit from lines l join agreements a on a.id=l.agreement_id join products p on p.id=l.product_id order by a.name,p.name',
 schedules:'select * from schedule_performance order by ends_on,source_id',
 'commitment-gaps':'select account,agreement,product,ends_on,unit,planned,actual,gap,currency,gap_value,actuals_freshness from commitment_gaps order by ends_on,source_id',
 'renewals-due':'select agreement,account,owner,ends_on,days_left,status from renewals_due order by ends_on,agreement',
 'demand-review':`select date_trunc('month',starts_on)::date as period_month,product,unit,currency,sum(planned) planned,sum(actual) actual,round(sum(planned_value),2) planned_value from schedule_performance where status in ('Active','Approved') and ends_on>=current_date group by 1,2,3,4 order by 1,2,4`,
 'account-review':`select account,currency,count(distinct agreement_id) agreements,round(sum(planned_value),2) planned_value,round(sum(actual_value),2) actual_value,round(sum(case when ends_on<current_date then gap_value else 0 end),2) overdue_gap_value from schedule_performance where status in ('Active','Approved') group by account_id,account,currency order by account,currency`,
 'stale-actuals':"select source_id,agreement,product,ends_on,actual_as_of,actuals_freshness from schedule_performance where actuals_freshness<>'current' order by ends_on,source_id",
 followups:"select f.id,a.name agreement,f.name,f.owner,f.due_on,f.state,f.resolution from followups f join agreements a on a.id=f.agreement_id order by due_on,f.name",
 attention:"select a.name agreement,f.name task,f.owner,f.due_on from followups f join agreements a on a.id=f.agreement_id where f.state='open' and f.due_on<current_date order by f.due_on",
 compliance:'select * from control_exceptions order by rule,record',
 activity:'select actor,action,details,created_at from events order by created_at,id',
};
const writeOptions={
 'add-account':['name'], 'add-product':['name','unit'],
 'add-agreement':['name','account','start','end','currency','owner'],
 'add-line':['agreement','product'],
 'add-schedule':['line','start','end','planned','price'],
 'set-actual':['schedule','actual','as-of','evidence'],
 'set-plan':['schedule','planned','price','evidence'],
 'set-status':['agreement','status','evidence','review-due'],
 'review-account':['account','review-due','purpose','evidence'],
 'review-agreement':['agreement','review-due','evidence','owner'],
 'add-followup':['agreement','name','owner','due'],
 'close-followup':['followup','resolution'],
 import:['dir','as-of','currency','replace-source'],
};
export const commands=[...Object.keys(reads),'show-agreement','weekly-review',...Object.keys(writeOptions),'export','draft-review','draft-renewal','help'];
function parse(args){const o={},pos=[];for(const arg of args){if(!arg.startsWith('--')){pos.push(arg);continue;}const i=arg.indexOf('=');const k=arg.slice(2,i<0?undefined:i);if(k in o)throw Error(`Duplicate option --${k}`);o[k]=i<0?true:arg.slice(i+1);}return{cmd:pos[0]||'help',pos:pos.slice(1),o};}
async function resolve(db,t,ref){required(ref,`${t} reference`);const names=t==='schedules'||t==='lines'?'source_id':'name';const rows=await db.query(`select * from ${t} where lower(${names})=lower($1) or id::text like $2 ${t==='followups'?'':'or lower(source_id)=lower($1)'}`, [ref,ref+'%']);if(rows.length!==1)throw Error(rows.length?`Ambiguous ${t}: ${rows.map(r=>`${r.id} ${r[names]}`).join('; ')}`:`No ${t} match: ${ref}`);return rows[0];}
async function insert(db,t,v){const k=Object.keys(v);return(await db.query(`insert into ${t} (${k.join(',')}) values (${k.map((_,i)=>'$'+(i+1)).join(',')}) returning *`,Object.values(v)))[0];}
async function update(db,t,r,v){const k=Object.keys(v);return {before:r,after:(await db.query(`update ${t} set ${k.map((x,i)=>`${x}=$${i+1}`).join(',')} where id=$${k.length+1} returning *`,[...Object.values(v),r.id]))[0]};}
async function dossier(db,ref){const a=await resolve(db,'agreements',ref);return {agreement:a,schedules:await db.query('select * from schedule_performance where agreement_id=$1 order by ends_on,source_id',[a.id]),followups:await db.query('select * from followups where agreement_id=$1 order by due_on',[a.id])};}
async function weekly(db){const out={};for(const c of ['commitment-gaps','renewals-due','attention','compliance'])out[c]=await db.query(reads[c]);return out;}
function output(value,json){if(json)return console.log(JSON.stringify(value,null,2));if(Array.isArray(value)){if(!value.length)return console.log('(none)');const keys=Object.keys(value[0]);return console.log(textTable(value,keys.map(k=>({key:k,label:k,format:v=>typeof v==='object'?JSON.stringify(v):v}))));}for(const[k,v]of Object.entries(value)){console.log(`\n${k}`);if(Array.isArray(v))output(v,false);else console.log(typeof v==='object'?JSON.stringify(v,null,2):v);}}
async function main(){const {cmd,pos,o}=parse(process.argv.slice(2));if(!commands.includes(cmd))throw Error(`Unknown command ${cmd}. Use help.`);
 const allowed=new Set(['json',...(writeOptions[cmd]?[...writeOptions[cmd],'actor','dry-run']:[]),...(['show-agreement','draft-renewal'].includes(cmd)?['agreement']:[]),...(cmd==='export'?['out']:[])]);
 for(const k of Object.keys(o))if(!allowed.has(k))throw Error(`Unknown option --${k} for ${cmd}`);
 if(pos.length && !(cmd==='import'&&pos.length===1&&pos[0]==='salesforce-manufacturing-cloud'))throw Error('Unexpected positional argument');
 if(cmd==='help'){output(commands.map(command=>({command,options:writeOptions[command]?.map(x=>'--'+x+'=').join(' ')||(['show-agreement','draft-renewal'].includes(command)?'--agreement=':command==='export'?'--out=':'')})),o.json);return;}
 if(cmd==='import'&&pos[0]!=='salesforce-manufacturing-cloud')throw Error('Use import salesforce-manufacturing-cloud');
 const db=await getDb();let tx=false;
 try{
  let result;
  if(reads[cmd])result=await db.query(reads[cmd]);
  else if(cmd==='show-agreement')result=await dossier(db,o.agreement);
  else if(cmd==='weekly-review')result=await weekly(db);
  else if(cmd==='export'){
   result={format:1,exported_at:new Date().toISOString(),records:{}};
   for(const t of ['accounts','products','agreements','lines','schedules','followups','events'])result.records[t]=await db.query(`select * from ${t} order by id`);
   if(o.out){const out=path.resolve(required(o.out,'--out'));fs.mkdirSync(path.dirname(out),{recursive:true});fs.writeFileSync(out,JSON.stringify(result,null,2)+'\n',{flag:'wx',mode:0o600});result={file:out};}
  }else if(cmd.startsWith('draft-')){
   const data=cmd==='draft-review'?await weekly(db):await dossier(db,o.agreement);
   const sections=Object.entries(data).map(([title,rows])=>({title,html:table(Array.isArray(rows)?rows:[rows])}));
   result={file:writeOut('drafts',`${cmd}-${randomUUID()}`,page({title:cmd==='draft-review'?'Draft weekly agreement review':'Draft renewal brief',subtitle:'Internal draft. Verify quantities, prices and terms before sharing.',sections}))};
  }else{
   required(o.actor,'--actor');await db.exec('BEGIN');tx=true;
   const id=()=>`LOCAL-${randomUUID()}`;
   const req=k=>required(o[k],'--'+k);
   const evidence=()=>req('evidence');
   if(cmd==='import')result=await importSalesforce(db,o);
   if(cmd==='add-account')result=await insert(db,'accounts',{source_id:id(),name:req('name')});
   if(cmd==='add-product')result=await insert(db,'products',{source_id:id(),name:req('name'),unit:req('unit')});
   if(cmd==='add-agreement')result=await insert(db,'agreements',{source_id:id(),name:req('name'),account_id:(await resolve(db,'accounts',o.account)).id,starts_on:date(req('start')),ends_on:date(req('end')),currency:currency(req('currency')),status:'Draft',owner:req('owner')});
   if(cmd==='add-line')result=await insert(db,'lines',{source_id:id(),agreement_id:(await resolve(db,'agreements',o.agreement)).id,product_id:(await resolve(db,'products',o.product)).id});
   if(cmd==='add-schedule')result=await insert(db,'schedules',{source_id:id(),line_id:(await resolve(db,'lines',o.line)).id,starts_on:date(req('start')),ends_on:date(req('end')),planned:decimal(req('planned')),price:decimal(req('price'),'price',4)});
   if(cmd==='set-actual'){evidence();result=await update(db,'schedules',await resolve(db,'schedules',o.schedule),{actual:decimal(req('actual')),actual_as_of:date(req('as-of'))});}
   if(cmd==='set-plan'){evidence();result=await update(db,'schedules',await resolve(db,'schedules',o.schedule),{planned:decimal(req('planned')),price:decimal(req('price'),'price',4)});}
   if(cmd==='set-status'){
    const a=await resolve(db,'agreements',o.agreement);const status=req('status');
    const next={Draft:['Approved','Cancelled'],Approved:['Active','Cancelled'],Active:['Expired','Cancelled'],Expired:[],Cancelled:[]};
    if(!next[a.status].includes(status))throw Error(`Invalid status transition ${a.status} to ${status}`);
    if(['Approved','Active'].includes(status)){
     const [n]=await db.query('select count(*) n from schedules s join lines l on l.id=s.line_id where l.agreement_id=$1',[a.id]);if(Number(n.n)===0)throw Error('Agreement needs schedules before approval');
     if(date(req('review-due'))<new Date().toISOString().slice(0,10))throw Error('Review date must be today or later');
    }
    result=await update(db,'agreements',a,{status,evidence:evidence(),...(o['review-due']?{review_due:date(o['review-due'])}:{})});
   }
   if(cmd==='review-account'||cmd==='review-agreement'){
    evidence();const due=date(req('review-due'));if(due<new Date().toISOString().slice(0,10))throw Error('Review date must be today or later');
    result=cmd==='review-account'?await update(db,'accounts',await resolve(db,'accounts',o.account),{reviewed_on:new Date().toISOString().slice(0,10),review_due:due,retention_purpose:req('purpose')}):await update(db,'agreements',await resolve(db,'agreements',o.agreement),{review_due:due,evidence:evidence(),owner:req('owner')});
   }
   if(cmd==='add-followup')result=await insert(db,'followups',{agreement_id:(await resolve(db,'agreements',o.agreement)).id,name:req('name'),owner:req('owner'),due_on:date(req('due'))});
   if(cmd==='close-followup'){const f=await resolve(db,'followups',o.followup);if(f.state==='done')throw Error('Follow-up is already closed');result=await update(db,'followups',f,{state:'done',resolution:req('resolution')});}
   if(!result)throw Error('Command has no implementation');
   await insert(db,'events',{actor:o.actor,action:cmd,details:JSON.stringify({options:o,result})});
   await db.exec(o['dry-run']?'ROLLBACK':'COMMIT');tx=false;
   if(o['dry-run'])result={dry_run:true,result};
  }
  output(result,o.json);
 }catch(e){if(tx)await db.exec('ROLLBACK');throw e;}finally{await db.close();}
}
main().catch(e=>{console.error(e.message);process.exitCode=1;});
