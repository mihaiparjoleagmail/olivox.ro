import { createClient } from "@supabase/supabase-js";
import { readFileSync, existsSync, writeFileSync } from "fs"; import { resolve } from "path";
const e=resolve(process.cwd(),".env.local");
if(existsSync(e))for(const l of readFileSync(e,"utf8").split("\n")){const m=l.match(/^([A-Z0-9_]+)=(.*)$/);if(m&&!process.env[m[1]])process.env[m[1]]=m[2];}
const s=createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!,process.env.SUPABASE_SECRET_KEY||process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,{auth:{persistSession:false}});
async function main(){const {data}=await s.from("products").select("id,slug,name,price,category_slugs,meta_title").order("id");
const lines=(data||[]).map(p=>`${p.slug}\t${p.name}\t${p.price}\t${(p.category_slugs||[])[0]}\t${p.meta_title}`);
writeFileSync("scripts/_dump.tsv", lines.join("\n"));
console.log("scris", lines.length);
// pattern check
const generic=(data||[]).filter(p=>/\|\s*olivox\.ro\s*$/i.test(p.meta_title||"")).length;
console.log("titluri cu sufix:",generic);
}
main();
