"use client";

import { useState, useTransition } from "react";
import { Send, Sparkles } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";

export function FounderMessageDialog({ startupId, startupName, founderId, founderName, disabled = false }: { startupId: string; startupName: string; founderId: string; founderName: string; disabled?: boolean }) {
  const [open, setOpen] = useState(false);
  const [intent, setIntent] = useState("PARTNERSHIP");
  const [pending, startTransition] = useTransition();

  function submit(formData: FormData) {
    const subject = String(formData.get("subject") ?? "").trim();
    const body = String(formData.get("body") ?? "").trim();
    if (subject.length < 4 || body.length < 30) {
      toast.error("Add a clear subject and at least 30 characters of context.");
      return;
    }

    startTransition(async () => {
      const response = await fetch("/api/messages", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ startupId, founderId, subject, body, intent }),
      });
      const result = (await response.json()) as { error?: string };
      if (!response.ok) {
        toast.error(result.error ?? "Message request could not be sent.");
        return;
      }
      toast.success(`Message request sent to ${founderName}.`);
      setOpen(false);
    });
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild><Button disabled={disabled}><Send /> Message {founderName.split(" ")[0]}</Button></DialogTrigger>
      <DialogContent className="sm:max-w-lg">
        <form action={submit}>
          <DialogHeader>
            <div className="mb-2 flex items-center gap-2 text-xs text-primary"><Sparkles className="size-3.5" /> Thoughtful outreach works better</div>
            <DialogTitle>Message {founderName}</DialogTitle>
            <DialogDescription>Your identity is included. Explain why the conversation would be useful to {startupName}.</DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-5">
            <div className="space-y-2"><Label htmlFor="intent">Reason for reaching out</Label><Select value={intent} onValueChange={setIntent}><SelectTrigger id="intent"><SelectValue /></SelectTrigger><SelectContent><SelectItem value="PARTNERSHIP">Partnership</SelectItem><SelectItem value="INVESTMENT">Investment</SelectItem><SelectItem value="CUSTOMER">Become a customer</SelectItem><SelectItem value="TALENT">Join the team</SelectItem><SelectItem value="PRESS">Press or research</SelectItem><SelectItem value="OTHER">Other</SelectItem></SelectContent></Select></div>
            <div className="space-y-2"><Label htmlFor="subject">Subject</Label><Input id="subject" name="subject" placeholder="A specific reason to connect" maxLength={100} required /></div>
            <div className="space-y-2"><Label htmlFor="body">Message</Label><Textarea id="body" name="body" placeholder="Introduce yourself, share the relevant context, and make a clear request…" className="min-h-36 resize-none" maxLength={1200} required /><p className="text-[10px] text-muted-foreground">Private contact information is never exposed.</p></div>
          </div>
          <DialogFooter><Button type="button" variant="outline" onClick={() => setOpen(false)}>Cancel</Button><Button type="submit" disabled={pending}>{pending ? "Sending…" : "Send request"} <Send data-icon="inline-end" /></Button></DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
