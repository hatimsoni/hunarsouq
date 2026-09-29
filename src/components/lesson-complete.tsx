"use client";
import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { markLessonComplete } from "@/app/courses/actions";
export function LessonComplete({lessonId,done}:{lessonId:string;done:boolean}){
 const router=useRouter();const[pending,start]=useTransition();const[message,setMessage]=useState(done?"Lesson complete.":"");
 return <div className="mt-8"><Button disabled={done||pending} onClick={()=>start(async()=>{const r=await markLessonComplete(lessonId);setMessage(r.error??(r.certificate?"Course complete — your certificate is ready.":"Progress saved."));router.refresh()})}>{done?"Completed":"Mark lesson complete"}</Button><p role="status" className="mt-2 text-sm text-muted-foreground">{message}</p></div>;
}
