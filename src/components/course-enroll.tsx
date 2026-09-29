"use client";
import Script from "next/script";
import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { createCourseOrder, enrollFree } from "@/app/courses/actions";

declare global { interface Window { Razorpay?: new (options: Record<string, unknown>) => { open: () => void } } }
export function CourseEnroll({ courseId, slug, title, price, razorpayKeyId, enrolled = false }: { courseId: string; slug: string; title: string; price: number; razorpayKeyId?: string; enrolled?: boolean }) {
  const router = useRouter(); const [pending,start]=useTransition(); const [message,setMessage]=useState("");
  if (enrolled) return <Button asChild><a href={`/learn/${encodeURIComponent(slug)}`}>Continue learning</a></Button>;
  return <div><Script src="https://checkout.razorpay.com/v1/checkout.js" strategy="afterInteractive" onError={()=>setMessage("Checkout could not load. Please try again later.")}/>
    <Button disabled={pending} onClick={()=>start(async()=>{
      setMessage("");
      if(price===0){const r=await enrollFree(courseId);setMessage(r.error??r.message??"");if(!r.error)router.refresh();return;}
      if(!razorpayKeyId){setMessage("Online payments are not configured yet.");return;}
      const result=await createCourseOrder(courseId);if(result.error||!result.order){setMessage(result.error??"Could not start checkout.");return;}
      if(!window.Razorpay){setMessage("Checkout is still loading. Try again in a moment.");return;}
      const checkout=new window.Razorpay({key:razorpayKeyId,amount:result.order.amount,currency:result.order.currency,name:"Hunar Souq",description:title,order_id:result.order.id,handler:()=>{setMessage("Payment received. Your enrollment will appear here as soon as it is confirmed.");setTimeout(()=>router.refresh(),2500);},modal:{ondismiss:()=>setMessage("Checkout closed. No enrollment was created.")}});
      checkout.open();
    })}>{pending?"Please wait…":price===0?"Enroll for free":`Enroll · ₹${price.toLocaleString("en-IN")}`}</Button>
    <p role="status" className="mt-2 text-sm text-muted-foreground">{message}</p>
  </div>;
}
