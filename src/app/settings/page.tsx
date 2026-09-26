import { CheckCircle2, LockKeyhole } from "lucide-react";
import { ModuleHeader } from "@/features/operations/module-header";
import {
  eyebrow,
  eyebrowAccent,
  heading,
  headingCopy,
  headingLead,
  headingTitle,
  settingsList,
  settingsRow,
  shell,
} from "@/features/operations/module-styles";

export default function SettingsPage() {
  return <main className={shell}><ModuleHeader /><div className={heading}><div className={headingCopy}><p className={`${eyebrow} ${eyebrowAccent}`}>CONTROL / SETTINGS</p><h1 className={headingTitle}>System settings</h1><p className={headingLead}>Security and environment guidance for the ForgeOps workspace.</p></div></div><div className={settingsList}><div className={settingsRow}><CheckCircle2 size={18} /><span><strong className="block text-xs">Supabase Authentication</strong><small className="mt-1 block text-[11px] text-muted">Password login and session refresh are handled server-side.</small></span></div><div className={settingsRow}><LockKeyhole size={18} /><span><strong className="block text-xs">Environment variables</strong><small className="mt-1 block text-[11px] text-muted">Keep the URL and anon key in Vercel Environment Variables; never commit secrets.</small></span></div><div className={settingsRow}><CheckCircle2 size={18} /><span><strong className="block text-xs">Row Level Security</strong><small className="mt-1 block text-[11px] text-muted">Admin and Technician permissions are enforced by database policies.</small></span></div></div></main>;
}
