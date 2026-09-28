import 'server-only';
import {createClient} from '@supabase/supabase-js';
import {siteOrigin} from './auth';
import {getSupabaseEnv} from './supabase/env';
import type {Database,Json} from './supabase/database.types';
import {statusEmailPayload,sendResendEmail} from './email-message';
export function emailConfigured() {return !!(getSupabaseEnv()&&process.env.SUPABASE_SERVICE_ROLE_KEY&&process.env.RESEND_API_KEY&&process.env.RESEND_FROM_EMAIL&&process.env.NEXT_PUBLIC_SITE_URL);}
// Call only after checking the member/admin identity, or validating the worker secret.
export async function dispatchStatusEmails(profileId?:string):Promise<{sent:number;message:string}> {
  if(!emailConfigured()) return {sent:0,message:'Status saved. Email is queued until the email service is configured.'};
  let sent=0;
  try {
    const env=getSupabaseEnv()!;
    const db=createClient<Database>(env.url,process.env.SUPABASE_SERVICE_ROLE_KEY!,{auth:{persistSession:false,autoRefreshToken:false}});
    let query=db.from('profile_status_emails').select('*').is('sent_at',null).eq('needs_attention',false).order('created_at').order('id').limit(3);
    if(profileId)query=query.eq('profile_id',profileId);
    const {data:events,error}=await query;
    if(error) return {sent,message:'Status saved. Email delivery is queued; check the notification queue.'};
    for(const event of events??[]) {
      if(!event.to_email) {await db.from('profile_status_emails').update({needs_attention:true,last_error:'This account has no email address.'}).eq('id',event.id);continue;}
      const payload=statusEmailPayload(event,process.env.RESEND_FROM_EMAIL!,siteOrigin());
      const {data:claimed,error:claimError}=await db.rpc('claim_status_email',{event_id:event.id,email_payload:payload as Json});
      const claim=claimed?.[0];if(claimError||!claim)continue;
      const response=await sendResendEmail(process.env.RESEND_API_KEY!,claim.payload,claim.id);
      const update=response.id?{sent_at:new Date().toISOString(),provider_id:response.id,last_error:null,locked_until:null,lease_token:null}:{last_error:response.error??'Delivery failed.',locked_until:null,lease_token:null};
      const {error:saveError}=await db.from('profile_status_emails').update(update).eq('id',claim.id).eq('lease_token',claim.lease_token!);
      if(response.id&&!saveError)sent++;
    }
    return {sent,message:sent?`${sent} status email${sent===1?'':'s'} accepted by Resend.`:'Status saved. Any unsent email remains in the notification queue.'};
  }catch{return {sent,message:'Status saved. Email delivery is queued; check the notification queue.'};}
}
