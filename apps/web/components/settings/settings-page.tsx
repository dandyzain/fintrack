"use client";

import * as React from "react";
import Link from "next/link";
import { useQueryClient } from "@tanstack/react-query";
import { Download, KeyRound, LogOut, MailCheck, ShieldAlert, UserRound } from "lucide-react";
import { toast } from "sonner";
import { PASSWORD_MIN_LENGTH } from "@fintrack/shared";
import { useLanguage } from "@/context/language-context";
import { useMe, queryKeys } from "@/lib/api/queries";
import { endpoints, transactionsCsvUrl, type MeResponse } from "@/lib/api/client";
import { Button } from "@/components/ui/button";
import { Card, CardHeader } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Field, Input } from "@/components/ui/field";
import { InlineAlert, Skeleton } from "@/components/ui/feedback";
import { ResponsiveModal } from "@/components/ui/responsive-modal";
import { PasswordInput } from "@/components/auth/password-input";
import { CategoriesSection } from "./categories-section";

export function SettingsPage() {
  const { t } = useLanguage();
  const me = useMe();

  return (
    <div className="mx-auto max-w-3xl space-y-5 pb-4 pt-2 sm:space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-fg sm:text-3xl">{t.settings.title}</h1>
        <p className="mt-1 text-sm text-fg-subtle sm:text-base">{t.settings.subtitle}</p>
      </div>

      {!me.data ? (
        <Skeleton className="h-96 rounded-3xl" />
      ) : (
        <>
          {me.data.user.isDemo ? (
            <InlineAlert tone="ai">
              {t.settings.demoNotice}{" "}
              <Link href="/register" className="font-semibold underline underline-offset-4">
                {t.banners.demoCta}
              </Link>
            </InlineAlert>
          ) : (
            <>
              <ProfileSection me={me.data} />
              <PasswordSection />
            </>
          )}
          <CategoriesSection userId={me.data.user.id} />
          <SessionsSection />
          <DataSection />
          <DangerSection isDemo={Boolean(me.data.user.isDemo)} />
        </>
      )}
    </div>
  );
}

function ProfileSection({ me }: { me: MeResponse }) {
  const { t } = useLanguage();
  const qc = useQueryClient();
  const [name, setName] = React.useState(me.user.name);
  const [email, setEmail] = React.useState(me.user.email);
  const [currentPassword, setCurrentPassword] = React.useState("");
  const [saving, setSaving] = React.useState(false);
  const [sending, setSending] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);
  const emailChanged = email.trim().toLowerCase() !== me.user.email;
  const dirty = name.trim() !== me.user.name || emailChanged;

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSaving(true);
    try {
      await endpoints.updateProfile({
        ...(name.trim() !== me.user.name ? { name: name.trim() } : {}),
        ...(emailChanged ? { email: email.trim(), currentPassword } : {}),
      });
      await qc.invalidateQueries({ queryKey: queryKeys.me });
      setCurrentPassword("");
      toast.success(t.settings.profileSaved);
    } catch (err) {
      setError((err as Error).message || t.settings.saveFailed);
    } finally {
      setSaving(false);
    }
  };

  const resend = async () => {
    setSending(true);
    try {
      await endpoints.resendVerification();
      toast.success(t.banners.verifySent);
    } catch (err) {
      toast.error((err as Error).message);
    } finally {
      setSending(false);
    }
  };

  return (
    <Card as="section" aria-labelledby="profile-heading" className="p-5 sm:p-6">
      <CardHeader id="profile-heading" icon={<UserRound />} title={t.settings.profileTitle} description={t.settings.profileDesc} />
      <form onSubmit={submit} noValidate className="mt-5 space-y-4">
        {error && <InlineAlert>{error}</InlineAlert>}
        <Field label={t.settings.name}>
          <Input value={name} maxLength={50} autoComplete="name" onChange={(e) => setName(e.target.value)} />
        </Field>
        <Field
          label={t.settings.email}
          badge={
            <Badge tone={me.user.emailVerified ? "positive" : "warning"}>
              {me.user.emailVerified ? t.settings.emailVerified : t.settings.emailUnverified}
            </Badge>
          }
        >
          <Input type="email" inputMode="email" autoComplete="email" value={email} onChange={(e) => setEmail(e.target.value)} />
        </Field>
        {emailChanged && (
          <Field label={t.settings.currentPassword} hint={t.settings.currentPasswordHint}>
            <PasswordInput autoComplete="current-password" value={currentPassword} onChange={(e) => setCurrentPassword(e.target.value)} />
          </Field>
        )}
        <div className="flex flex-wrap justify-end gap-2">
          {!me.user.emailVerified && me.emailDelivery && !emailChanged && (
            <Button type="button" variant="outline" onClick={resend} loading={sending}>
              {!sending && <MailCheck aria-hidden />}
              {t.settings.resend}
            </Button>
          )}
          <Button type="submit" loading={saving} disabled={!dirty}>
            {t.settings.saveProfile}
          </Button>
        </div>
      </form>
    </Card>
  );
}

function PasswordSection() {
  const { t } = useLanguage();
  const [current, setCurrent] = React.useState("");
  const [next, setNext] = React.useState("");
  const [saving, setSaving] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (next.length < PASSWORD_MIN_LENGTH) return setError(t.auth.passwordTooShort);
    setError(null);
    setSaving(true);
    try {
      await endpoints.changePassword(current, next);
      setCurrent("");
      setNext("");
      toast.success(t.settings.passwordChanged);
    } catch (err) {
      setError((err as Error).message || t.settings.saveFailed);
    } finally {
      setSaving(false);
    }
  };

  return (
    <Card as="section" aria-labelledby="password-heading" className="p-5 sm:p-6">
      <CardHeader id="password-heading" icon={<KeyRound />} title={t.settings.passwordTitle} description={t.settings.passwordDesc} />
      <form onSubmit={submit} noValidate className="mt-5 space-y-4">
        {error && <InlineAlert>{error}</InlineAlert>}
        {/* Hidden username helps password managers update the right entry. */}
        <input type="text" autoComplete="username" className="hidden" readOnly aria-hidden tabIndex={-1} />
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label={t.settings.currentPassword}>
            <PasswordInput autoComplete="current-password" value={current} onChange={(e) => setCurrent(e.target.value)} />
          </Field>
          <Field label={t.auth.newPassword}>
            <PasswordInput autoComplete="new-password" value={next} onChange={(e) => setNext(e.target.value)} placeholder={t.auth.passwordRegisterPlaceholder} />
          </Field>
        </div>
        <div className="flex justify-end">
          <Button type="submit" loading={saving} disabled={!current || !next}>
            {t.settings.changePassword}
          </Button>
        </div>
      </form>
    </Card>
  );
}

function SessionsSection() {
  const { t } = useLanguage();
  const [busy, setBusy] = React.useState(false);
  const signOutEverywhere = async () => {
    setBusy(true);
    try {
      await endpoints.logout(true);
    } finally {
      window.location.href = "/login";
    }
  };
  return (
    <Card as="section" aria-labelledby="sessions-heading" className="p-5 sm:p-6">
      <CardHeader
        id="sessions-heading"
        icon={<LogOut />}
        title={t.settings.sessionsTitle}
        description={t.settings.sessionsDesc}
        action={
          <Button variant="outline" size="sm" onClick={signOutEverywhere} loading={busy}>
            {t.settings.signOutEverywhere}
          </Button>
        }
      />
    </Card>
  );
}

function DataSection() {
  const { t, language } = useLanguage();
  return (
    <Card as="section" aria-labelledby="data-heading" className="p-5 sm:p-6">
      <CardHeader id="data-heading" icon={<Download />} title={t.settings.dataTitle} description={t.settings.dataDesc} />
      <div className="mt-5 flex flex-wrap gap-2">
        <Button asChild variant="outline">
          <a href="/api/account/export" download>
            <Download aria-hidden />
            {t.settings.exportJson}
          </a>
        </Button>
        <Button asChild variant="outline">
          <a href={transactionsCsvUrl({}, language)} download>
            <Download aria-hidden />
            {t.settings.exportCsv}
          </a>
        </Button>
      </div>
    </Card>
  );
}

function DangerSection({ isDemo }: { isDemo: boolean }) {
  const { t } = useLanguage();
  const [open, setOpen] = React.useState(false);
  const [password, setPassword] = React.useState("");
  const [confirm, setConfirm] = React.useState("");
  const [busy, setBusy] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);

  React.useEffect(() => {
    if (!open) {
      setPassword("");
      setConfirm("");
      setError(null);
    }
  }, [open]);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setBusy(true);
    try {
      await endpoints.deleteAccount(isDemo ? undefined : password);
      window.location.href = "/";
    } catch (err) {
      setError((err as Error).message);
      setBusy(false);
    }
  };

  return (
    <Card as="section" aria-labelledby="danger-heading" className="border-negative/30 p-5 sm:p-6">
      <CardHeader
        id="danger-heading"
        icon={<ShieldAlert />}
        title={t.settings.dangerTitle}
        description={t.settings.dangerDesc}
        action={
          <Button variant="danger" size="sm" onClick={() => setOpen(true)}>
            {t.settings.deleteAccount}
          </Button>
        }
      />
      <ResponsiveModal
        open={open}
        onOpenChange={setOpen}
        title={t.settings.deleteTitle}
        description={t.settings.deleteDesc}
        icon={<ShieldAlert className="text-negative-fg" />}
        closeLabel={t.common.close}
        size="sm"
        dismissible={!busy}
        footer={
          <>
            <Button variant="ghost" onClick={() => setOpen(false)} disabled={busy}>
              {t.common.cancel}
            </Button>
            <Button type="submit" form="delete-account-form" variant="danger" loading={busy} disabled={confirm !== "DELETE" || (!isDemo && !password)}>
              {busy ? t.settings.deleting : t.settings.deleteConfirmBtn}
            </Button>
          </>
        }
      >
        <form id="delete-account-form" onSubmit={submit} noValidate className="space-y-4">
          {error && <InlineAlert>{error}</InlineAlert>}
          {!isDemo && (
            <Field label={t.settings.currentPassword}>
              <PasswordInput autoComplete="current-password" value={password} onChange={(e) => setPassword(e.target.value)} />
            </Field>
          )}
          <Field label={t.settings.deleteTypeConfirm}>
            <Input value={confirm} onChange={(e) => setConfirm(e.target.value)} autoComplete="off" autoCapitalize="characters" placeholder="DELETE" />
          </Field>
        </form>
      </ResponsiveModal>
    </Card>
  );
}
