import 'server-only';
import {requireAdmin} from './admin';
import {parsePage,searchTerm} from './admin-validation';
import type {Profile} from './supabase/database.types';
export const profileStatuses:Profile['status'][]=['draft','pending','approved','rejected','changes_requested','suspended'];
export async function listMembers(params:{q?:string;status?:string;page?:string},pendingOnly=false) {
  const {supabase}=await requireAdmin();const page=parsePage(params.page);const term=searchTerm(params.q);
  const status=pendingOnly?'pending':profileStatuses.includes(params.status as Profile['status'])?params.status:'';
  let query=supabase.from('profiles').select('id,full_name,username,city,status,role,updated_at',{count:'exact'});
  if(status)query=query.eq('status',status);
  if(term)query=query.or(`full_name.ilike.%${term.replaceAll('_','\\_')}%,username.ilike.%${term.replaceAll('_','\\_')}%,city.ilike.%${term.replaceAll('_','\\_')}%`);
  const {data,count,error}=await query.order('updated_at',{ascending:pendingOnly}).order('id').range((page-1)*20,page*20-1);
  if(error)throw new Error('Members could not be loaded.');
  return {profiles:data??[],total:count??0,page,query:term,status};
}
