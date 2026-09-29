import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "./ui/accordion";
const questions = [
  [
    "What is Hunar Souq?",
    "Hunar means skill or craft, and souq means marketplace. We’re building a community where people can share their expertise, discover local talent, and learn from one another.",
  ],
  [
    "Is it free to create a profile?",
    "Yes. Creating a Hunar profile and listing your skills will be free. Some instructor-led courses may have a fee, clearly shown before you enroll.",
  ],
  [
    "How does verification work?",
    "A human reviewer will check each submitted profile, business, and course before it goes public. A Verified badge means the listing passed community review; it is not a professional licence or a guarantee of work.",
  ],
  [
    "Will my phone number be visible to everyone?",
    "Your phone number will never appear as plain text on a public page. Visitors will use a Contact button to access the contact options you choose to share.",
  ],
  [
    "Can I list a business or teach a course?",
    "Yes. Members can list businesses, and verified instructors can submit courses for human review before publication.",
  ],
];
export function FAQ() {
  return (
    <Accordion type="single" collapsible className="w-full">
      {questions.map(([q, a], i) => (
        <AccordionItem key={q} value={`faq-${i}`}>
          <AccordionTrigger className="min-h-16 py-5 text-sm hover:no-underline">
            {q}
          </AccordionTrigger>
          <AccordionContent className="max-w-2xl leading-7 text-muted-foreground">
            {a}
          </AccordionContent>
        </AccordionItem>
      ))}
    </Accordion>
  );
}
