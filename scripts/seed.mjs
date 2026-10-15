import {readFileSync} from 'node:fs';
import path from 'node:path';
import {getDb,loadEnv,REPO_ROOT} from './lib/db.mjs';
loadEnv();
if(process.env.DATABASE_URL && !process.env.TEST_DATABASE_URL) throw Error('Demo seed refuses a remote database');
const db=await getDb();
try {await db.exec('BEGIN');await db.exec(readFileSync(path.join(REPO_ROOT,'supabase/seed.sql'),'utf8'));await db.exec('COMMIT');console.log('Demo seed ready');} catch(e){await db.exec('ROLLBACK');throw e;}finally{await db.close();}
