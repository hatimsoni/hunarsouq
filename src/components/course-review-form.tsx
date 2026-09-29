"use client";
import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { submitCourseReview } from "@/app/courses/actions";
import { Button } from "@/components/ui/button";
import { inputClass } from "@/components/form-field";
export function CourseReviewForm({courseId}:{courseId:string}) {
 const router=useRouter();const [pending,start]=useTransition();const [rating,setRating]=useState(5);const [comment,setComment]=useState("");const [message,setMessage]=useState("");
 return <form className="space-y-3 rounded-xl border bg-background p-5" onSubmit={e=>{e.preventDefault();start(async()=>{const r=await submitCourseReview(courseId,rating,comment);setMessage(r.error??r.message??"");if(!r.error)router.refresh()})}}>
  <h3 className="text-xl">Share a review</h3><label className="block text-sm">Rating <select className={`${inputClass} mt-2`} value={rating} onChange={e=>setRating(Number(e.target.value))}>{[5,4,3,2,1].map(n=><option key={n} value={n}>{n} out of 5</option>)}</select></label><label className="block text-sm">Comment <textarea className={`${inputClass} mt-2`} rows={3} maxLength={1200} value={comment} onChange={e=>setComment(e.target.value)}/></label><Button disabled={pending}>Post review</Button><p role="status" className="text-sm">{message}</p>
 </form>;
}
