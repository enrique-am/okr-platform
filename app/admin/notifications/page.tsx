import { getServerSession } from "next-auth"
import { redirect } from "next/navigation"
import { authOptions } from "@/lib/auth"
import { AppLayout } from "@/components/layout/app-layout"
import { AdminNav } from "@/components/admin/admin-nav"
import { NotificationSettingsForm } from "./notification-settings-form"
import { EmailTemplatesSection } from "./email-templates-section"
import { getNotificationSettings, getEmailTemplates } from "./actions"

export default async function AdminNotificationsPage() {
  const session = await getServerSession(authOptions)
  if (session?.user?.role !== "ADMIN") redirect("/dashboard")

  const [settings, templates] = await Promise.all([
    getNotificationSettings(),
    getEmailTemplates(),
  ])

  return (
    <AppLayout
      maxWidth="w-[1120px]"
    >
      <AdminNav />
      <div className="mb-6">
        <h1 className="text-lg font-semibold text-gray-900">Notificaciones</h1>
        <p className="text-sm text-gray-500 mt-1">
          Configura cuándo y cómo se envían los correos automáticos del sistema.
        </p>
      </div>
      <div className="space-y-8">
        <NotificationSettingsForm
          initialTemplates={templates}
          initial={{
            weeklyReminderEnabled: settings.weeklyReminderEnabled,
            deadlineReminderEnabled: settings.deadlineReminderEnabled,
            deadlineReminderDays: settings.deadlineReminderDays,
            weeklyDigestEnabled: settings.weeklyDigestEnabled,
            welcomeEmailEnabled: settings.welcomeEmailEnabled,
            secondReminderEnabled: settings.secondReminderEnabled,
            deadlineDay: settings.deadlineDay,
            deadlineHour: settings.deadlineHour,
            complianceReportEnabled: settings.complianceReportEnabled,
            customReminderMessage: settings.customReminderMessage,
            customDigestMessage: settings.customDigestMessage,
          }}
        />
        <EmailTemplatesSection initialTemplates={templates} />
      </div>
    </AppLayout>
  )
}
