"use client";

import { useState, useTransition } from "react";
import { toast } from "sonner";
import { MessageSquare, Mail, Building2, Bell, FileText, Loader2 } from "lucide-react";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { SectionCard } from "@/components/shared/section-card";
import { savePrescriptionTemplateAction } from "@/server/actions/settings.actions";
import type { PrescriptionTemplate } from "@/server/demo/settings-store";

const fieldClass =
  "h-9 w-full rounded-lg border border-input bg-transparent px-3 text-sm outline-none transition-colors focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50";

function Field({ label, defaultValue, placeholder, type = "text" }: { label: string; defaultValue?: string; placeholder?: string; type?: string }) {
  return (
    <div className="grid gap-2">
      <Label>{label}</Label>
      <input type={type} defaultValue={defaultValue} placeholder={placeholder} className={fieldClass} />
    </div>
  );
}

function ToggleRow({ label, desc, defaultChecked }: { label: string; desc: string; defaultChecked?: boolean }) {
  return (
    <div className="flex items-center justify-between gap-4 py-3">
      <div>
        <p className="text-sm font-medium">{label}</p>
        <p className="text-xs text-muted-foreground">{desc}</p>
      </div>
      <Switch defaultChecked={defaultChecked} />
    </div>
  );
}

export function SettingsView({ rxTemplate }: { rxTemplate: PrescriptionTemplate }) {
  const save = (what: string) => toast.success(`${what} settings saved (demo)`);

  const [header, setHeader] = useState(rxTemplate.headerNote);
  const [footer, setFooter] = useState(rxTemplate.footerNote);
  const [showQr, setShowQr] = useState(rxTemplate.showQr);
  const [showVitals, setShowVitals] = useState(rxTemplate.showVitals);
  const [pending, startTransition] = useTransition();

  function saveRx() {
    startTransition(async () => {
      const res = await savePrescriptionTemplateAction({ headerNote: header, footerNote: footer, showQr, showVitals });
      if (res.ok) toast.success(res.message);
      else toast.error(res.message ?? "Could not save");
    });
  }

  return (
    <Tabs defaultValue="general">
      <TabsList>
        <TabsTrigger value="general"><Building2 className="size-4" /> General</TabsTrigger>
        <TabsTrigger value="prescription"><FileText className="size-4" /> Prescription</TabsTrigger>
        <TabsTrigger value="whatsapp"><MessageSquare className="size-4" /> WhatsApp</TabsTrigger>
        <TabsTrigger value="email"><Mail className="size-4" /> Email</TabsTrigger>
        <TabsTrigger value="notifications"><Bell className="size-4" /> Notifications</TabsTrigger>
      </TabsList>

      <TabsContent value="general" className="mt-4">
        <SectionCard title="Organisation">
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Clinic name" defaultValue="Clinicore" />
            <Field label="Legal name" defaultValue="Clinicore Health Pvt Ltd" />
            <Field label="Support email" defaultValue="support@clinicore.app" type="email" />
            <Field label="Phone" defaultValue="+91 80 4123 0000" />
            <Field label="Timezone" defaultValue="Asia/Kolkata" />
            <Field label="Currency" defaultValue="INR" />
          </div>
          <div className="mt-5 flex justify-end">
            <Button onClick={() => save("General")}>Save changes</Button>
          </div>
        </SectionCard>
      </TabsContent>

      <TabsContent value="prescription" className="mt-4">
        <SectionCard title="Prescription template" description="Customize the header, footer and layout of printed prescriptions.">
          <div className="grid gap-4">
            <div className="grid gap-2">
              <Label htmlFor="rxHeader">Header note</Label>
              <textarea
                id="rxHeader"
                value={header}
                onChange={(e) => setHeader(e.target.value)}
                rows={2}
                className="w-full rounded-lg border border-input bg-transparent px-3 py-2 text-sm outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50"
                placeholder="Shown under the clinic details, e.g. timings or tagline"
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="rxFooter">Footer note</Label>
              <textarea
                id="rxFooter"
                value={footer}
                onChange={(e) => setFooter(e.target.value)}
                rows={3}
                className="w-full rounded-lg border border-input bg-transparent px-3 py-2 text-sm outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50"
                placeholder="Shown at the bottom, e.g. validity and disclaimers"
              />
            </div>
            <div className="divide-y border-t">
              <div className="flex items-center justify-between py-3">
                <div>
                  <p className="text-sm font-medium">Show verification QR</p>
                  <p className="text-xs text-muted-foreground">Adds a scannable QR to verify authenticity</p>
                </div>
                <Switch checked={showQr} onCheckedChange={setShowQr} />
              </div>
              <div className="flex items-center justify-between py-3">
                <div>
                  <p className="text-sm font-medium">Show vitals</p>
                  <p className="text-xs text-muted-foreground">Print recorded vitals (BP, pulse, etc.)</p>
                </div>
                <Switch checked={showVitals} onCheckedChange={setShowVitals} />
              </div>
            </div>
          </div>
          <div className="mt-5 flex justify-end">
            <Button onClick={saveRx} disabled={pending}>
              {pending && <Loader2 className="size-4 animate-spin" />} Save template
            </Button>
          </div>
        </SectionCard>
      </TabsContent>

      <TabsContent value="whatsapp" className="mt-4">
        <SectionCard title="WhatsApp Business API">
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Provider" defaultValue="Meta Cloud API" />
            <Field label="Sender number" placeholder="+91…" />
            <Field label="API key" placeholder="••••••••••••" type="password" />
            <Field label="Business account ID" placeholder="WABA ID" />
          </div>
          <div className="mt-4 border-t pt-2">
            <ToggleRow label="Appointment confirmations" desc="Send on booking" defaultChecked />
            <ToggleRow label="Reminders" desc="24h before appointment" defaultChecked />
            <ToggleRow label="Prescription & invoice sharing" desc="On generation" defaultChecked />
          </div>
          <div className="mt-5 flex justify-end">
            <Button onClick={() => save("WhatsApp")}>Save changes</Button>
          </div>
        </SectionCard>
      </TabsContent>

      <TabsContent value="email" className="mt-4">
        <SectionCard title="Email (SMTP)">
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="SMTP host" defaultValue="smtp.sendgrid.net" />
            <Field label="Port" defaultValue="587" />
            <Field label="From name" defaultValue="Clinicore" />
            <Field label="From email" defaultValue="no-reply@clinicore.app" type="email" />
            <Field label="Username" placeholder="apikey" />
            <Field label="Password" placeholder="••••••••" type="password" />
          </div>
          <div className="mt-5 flex justify-end">
            <Button onClick={() => save("Email")}>Save changes</Button>
          </div>
        </SectionCard>
      </TabsContent>

      <TabsContent value="notifications" className="mt-4">
        <SectionCard title="Notification preferences">
          <div className="divide-y">
            <ToggleRow label="Appointment booked" desc="Notify patient + doctor" defaultChecked />
            <ToggleRow label="Appointment reminder" desc="Send reminder before visit" defaultChecked />
            <ToggleRow label="Follow-up reminder" desc="On due date" defaultChecked />
            <ToggleRow label="Payment confirmation" desc="After collection" defaultChecked />
            <ToggleRow label="Low stock alerts" desc="To admins" defaultChecked />
            <ToggleRow label="Daily summary" desc="End-of-day report to admins" />
          </div>
          <div className="mt-5 flex justify-end">
            <Button onClick={() => save("Notification")}>Save changes</Button>
          </div>
        </SectionCard>
      </TabsContent>
    </Tabs>
  );
}
