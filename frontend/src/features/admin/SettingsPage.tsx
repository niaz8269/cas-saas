import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import { Bot, Mail, MessageSquare, Server, ShieldAlert, Zap } from "lucide-react"

import { Skeleton } from "@/components/ui/skeleton"
import {
  listAutomationRules,
  listMessageTemplates,
  updateAutomationRule,
  type AutomationRule,
} from "@/features/admin/api"
import TemplateTestDialog from "@/features/admin/TemplateTestDialog"
import { useCan } from "@/features/auth/useCan"
import { cn } from "@/lib/utils"

function Section({ icon: Icon, title, description, children }: { icon: typeof Zap; title: string; description: string; children: React.ReactNode }) {
  return (
    <section className="rounded-xl border bg-card shadow-sm">
      <header className="flex items-start gap-3 border-b px-5 py-4">
        <Icon className="mt-0.5 size-5 text-cas-navy" aria-hidden="true" />
        <div>
          <h2 className="text-[15px] font-semibold">{title}</h2>
          <p className="text-sm text-muted-foreground">{description}</p>
        </div>
      </header>
      <div className="px-5 py-4">{children}</div>
    </section>
  )
}

const label = (s?: string | null) => (s ?? "").replace(/[._]/g, " ")

function ruleSummary(rule: AutomationRule): string {
  const to = rule.trigger_def?.to ? ` → ${label(rule.trigger_def.to)}` : ""
  const actions = (rule.actions ?? []).map((a) =>
    a.type === "communication" ? `email “${label(a.template)}” to ${a.target}` : `${label(a.type)} ${a.target ?? ""}`.trim(),
  ).join(", ")

  return `When ${label(rule.trigger_def?.event)}${to} → ${actions || "—"}`
}

export default function SettingsPage() {
  const can = useCan()
  const canManage = can("settings.manage.global")
  const queryClient = useQueryClient()
  const rules = useQuery({ queryKey: ["automation-rules"], queryFn: listAutomationRules })
  const templates = useQuery({ queryKey: ["message-templates"], queryFn: listMessageTemplates })

  const toggleRule = useMutation({
    mutationFn: ({ id, is_active }: { id: number; is_active: boolean }) => updateAutomationRule(id, { is_active }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["automation-rules"] }),
  })

  const denied = rules.isError || templates.isError

  if (denied) {
    return (
      <div className="rounded-xl border bg-card p-10 text-center shadow-sm">
        <ShieldAlert className="mx-auto size-8 text-muted-foreground" />
        <p className="mt-3 text-sm font-medium">Access denied</p>
        <p className="mt-1 text-sm text-muted-foreground">You need settings-management access to view this.</p>
      </div>
    )
  }

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-2xl font-semibold text-foreground">Settings</h1>
        <p className="mt-1 text-sm text-muted-foreground">Automations, message templates and system configuration.</p>
      </div>

      <Section icon={Zap} title="Automations" description="Rules that fire on domain events. Toggle a rule to enable or pause it.">
        {rules.isPending && <Skeleton className="h-16 w-full" />}
        {rules.data && rules.data.data.length === 0 && <p className="text-sm text-muted-foreground">No automations configured.</p>}
        <ul className="divide-y">
          {rules.data?.data.map((rule) => {
            const busy = toggleRule.isPending && toggleRule.variables?.id === rule.id

            return (
              <li key={rule.id} className="flex items-center justify-between gap-3 py-3">
                <div>
                  <p className="text-sm font-medium">{rule.name}</p>
                  <p className="text-xs text-muted-foreground">{ruleSummary(rule)}</p>
                </div>
                <div className="flex items-center gap-3">
                  <span className={cn("text-xs font-medium", rule.is_active ? "text-green-700" : "text-muted-foreground")}>
                    {rule.is_active ? "Active" : "Off"}
                  </span>
                  <button
                    type="button"
                    role="switch"
                    aria-checked={rule.is_active}
                    aria-label={`${rule.is_active ? "Disable" : "Enable"} ${rule.name}`}
                    disabled={!canManage || busy}
                    onClick={() => toggleRule.mutate({ id: rule.id, is_active: !rule.is_active })}
                    className={cn(
                      "relative inline-flex h-5 w-9 shrink-0 items-center rounded-full transition-colors focus-visible:ring-2 focus-visible:ring-cas-navy focus-visible:ring-offset-2 focus-visible:outline-none",
                      rule.is_active ? "bg-cas-navy" : "bg-muted-foreground/30",
                      (!canManage || busy) && "cursor-not-allowed opacity-60",
                    )}
                  >
                    <span
                      className={cn(
                        "inline-block size-4 transform rounded-full bg-white shadow transition-transform",
                        rule.is_active ? "translate-x-4" : "translate-x-0.5",
                      )}
                    />
                  </button>
                </div>
              </li>
            )
          })}
        </ul>
      </Section>

      <Section icon={MessageSquare} title="Message templates" description="Templated copy available to counselors and automations.">
        {templates.isPending && <Skeleton className="h-16 w-full" />}
        <ul className="divide-y">
          {templates.data?.data.map((t) => (
            <li key={t.key} className="flex items-start justify-between gap-3 py-3">
              <div className="min-w-0">
                <div className="flex items-center gap-2">
                  <Bot className="size-3.5 shrink-0 text-muted-foreground" />
                  <p className="text-sm font-medium">{t.subject}</p>
                  <span className="font-mono text-xs text-muted-foreground">{t.key}</span>
                </div>
                <p className="mt-1 text-xs text-muted-foreground">{t.preview}</p>
              </div>
              <TemplateTestDialog templateKey={t.key} subject={t.subject} />
            </li>
          ))}
        </ul>
      </Section>

      <Section icon={Server} title="Channels & system" description="How outbound messages are delivered in this environment.">
        <dl className="grid gap-4 sm:grid-cols-2">
          <div className="flex items-center gap-2 text-sm">
            <Mail className="size-4 text-cas-navy" />
            <span><span className="font-medium">Email</span> — SMTP (Mailpit locally; SES/SMTP in production)</span>
          </div>
          <div className="flex items-center gap-2 text-sm">
            <MessageSquare className="size-4 text-cas-navy" />
            <span><span className="font-medium">WhatsApp / SMS</span> — log driver (provider integration pending)</span>
          </div>
          <div className="flex items-center gap-2 text-sm">
            <Zap className="size-4 text-cas-navy" />
            <span><span className="font-medium">Queue</span> — database worker processes sends asynchronously</span>
          </div>
          <div className="flex items-center gap-2 text-sm">
            <Server className="size-4 text-cas-navy" />
            <span><span className="font-medium">Scheduler</span> — hourly SLA / escalation sweeps</span>
          </div>
        </dl>
      </Section>
    </div>
  )
}
