import { user,settings,github,ingest,failure } from '@/lib/server';
export const maxDuration=60;
export async function POST(){try{await user();const s=await settings();const list=await github(`${s.repo}/commits?sha=${encodeURIComponent(s.branch)}&per_page=20`);const added=await ingest(s.repo,s.branch,list.map((c:{sha:string})=>c.sha));return Response.json({added});}catch(e){return failure(e);}}
