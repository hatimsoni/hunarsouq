'use server';
import {revalidatePath,updateTag} from 'next/cache';
import {requireAdmin} from '@/lib/admin';
import {reviewSchema,categorySchema,orderSchema} from '@/lib/admin-validation';
import {dispatchStatusEmails} from '@/lib/email-worker';
export type AdminResult={error?:string;message?:string};
function invalidate() {updateTag('home');updateTag('categories');revalidatePath('/');revalidatePath('/admin','layout');revalidatePath('/account','layout');}
export async function reviewProfile(input:unknown):Promise<AdminResult> {
  const {supabase}=await requireAdmin();
  const parsed=reviewSchema.safeParse(input);if(!parsed.success)return {error:parsed.error.issues[0].message};
  const value=parsed.data;
  const {error}=await supabase.rpc('review_profile',{target_id:value.profile_id,decision:value.decision,review_note:value.note,expected_updated_at:value.revision});
  if(error)return {error:error.code==='40001'?'This submission changed after you opened it. Reload before deciding.':error.code==='42501'?'You cannot review this profile.':error.code==='23514'?'This profile does not meet the requirements for approval.':'Unable to apply that decision. Refresh the submission and check its current status.'};
  invalidate();
  const delivery=await dispatchStatusEmails(value.profile_id);
  return {message:`Decision recorded. ${delivery.message}`};
}
export async function saveCategory(input:unknown):Promise<AdminResult> {
  const {supabase}=await requireAdmin();const parsed=categorySchema.safeParse(input);if(!parsed.success)return {error:parsed.error.issues[0].message};
  const v=parsed.data;
  const {error}=await supabase.rpc('save_category',{category_id:v.id||null,category_slug:v.slug,category_name:v.name,category_description:v.description,category_icon:v.icon,expected_updated_at:v.revision||null});
  if(error)return {error:error.code==='23505'?'That category slug already exists.':error.code==='40001'?'This category changed. Reload before saving.':'Unable to save this category.'};
  invalidate();return {message:'Category saved.'};
}
export async function reorderCategories(input:unknown):Promise<AdminResult> {
  const {supabase}=await requireAdmin();const parsed=orderSchema.safeParse(input);if(!parsed.success)return {error:'Invalid category order.'};
  const {error}=await supabase.rpc('reorder_categories',{ordered_ids:parsed.data.ids,expected_order:parsed.data.expected});
  if(error)return {error:error.code==='40001'?'The category list changed. Reload and try again.':'Unable to save this order.'};
  invalidate();return {message:'Category order updated.'};
}
export async function retryStatusEmails():Promise<AdminResult> {await requireAdmin();const result=await dispatchStatusEmails();revalidatePath('/admin/notifications');return {message:result.message};}
