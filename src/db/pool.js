import pg from 'pg';
import {config} from '../config.js';
const {Pool}=pg;
export const pool=new Pool({connectionString:config.databaseUrl,ssl:config.databaseSsl?{rejectUnauthorized:false}:undefined,max:10,idleTimeoutMillis:30000,connectionTimeoutMillis:10000});
pool.on('error',e=>console.error(JSON.stringify({level:'error',message:'PostgreSQL pool error',error:e.message})));
export async function inTransaction(fn){const c=await pool.connect();try{await c.query('BEGIN');const value=await fn(c);await c.query('COMMIT');return value;}catch(e){await c.query('ROLLBACK').catch(()=>{});throw e;}finally{c.release();}}
