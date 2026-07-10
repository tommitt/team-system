import { Client } from "pg";
import { readFileSync } from "node:fs";
const url = readFileSync(".env.prod","utf8").split("\n").find(l=>l.startsWith("DATABASE_URL="))!.slice("DATABASE_URL=".length).replace(/^["']|["']$/g,"");
for (let i=0;i<120;i++){
  try{
    const c=new Client({connectionString:url,ssl:{rejectUnauthorized:false}});
    await c.connect();
    const r=(await c.query("select count(*) filter (where embedding is not null) emb, count(*) tot from corpus_chunks")).rows[0];
    await c.end();
    if(r.emb===r.tot){ console.log(`EMBED COMPLETE ${r.emb}/${r.tot}`); process.exit(0); }
    if(i%3===0) console.log(`  ${r.emb}/${r.tot}`);
  }catch(e){ console.log("check err (retry)"); }
  await new Promise(r=>setTimeout(r,30000));
}
console.log("TIMEOUT waiting for embed");
