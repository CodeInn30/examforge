"use client";

import { useState } from "react";
import { useAuth } from "@/components/admin/AuthProvider";
import { apiFetch } from "@/lib/apiClient";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { User, KeyRound, CheckCircle2 } from "lucide-react";

export default function SettingsPage() {
  const { admin } = useAuth();
  const [name, setName] = useState(admin?.name ?? "");
  const [email, setEmail] = useState(admin?.email ?? "");
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  async function handleSave(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    setMessage("");
    setError("");

    const res = await apiFetch("/api/admin/me", {
      method: "PATCH",
      json: { name, email },
    });
    const data = await res.json();

    if (res.ok) {
      setMessage("Profile updated successfully");
    } else {
      setError(data.error ?? "Update failed");
    }
    setSaving(false);
  }

  return (
    <div className="flex flex-col flex-1 p-6 gap-6">
      {/* Page header */}
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Settings</h1>
        <p className="text-sm text-muted-foreground mt-1">
          Manage your admin profile and account
        </p>
      </div>

      <div className="max-w-2xl flex flex-col gap-6">
        {/* Profile card */}
        <div className="bg-card border rounded-xl overflow-hidden">
          {/* Card header section */}
          <div className="flex items-center gap-3 px-5 py-4 border-b bg-muted/30">
            <div className="rounded-lg bg-primary/10 p-2">
              <User className="size-4 text-primary" />
            </div>
            <div>
              <p className="font-semibold text-sm">Profile</p>
              <p className="text-xs text-muted-foreground">
                Update your display name and email address
              </p>
            </div>
          </div>

          <form onSubmit={handleSave} className="p-5 space-y-5">
            <div className="space-y-2">
              <Label htmlFor="name">Name</Label>
              <Input
                id="name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Your name"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="you@example.com"
              />
            </div>

            {message && (
              <div className="flex items-center gap-2 text-sm text-emerald-700 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-900/20 border border-emerald-200 dark:border-emerald-800 px-3 py-2.5 rounded-lg">
                <CheckCircle2 className="size-4 shrink-0" />
                {message}
              </div>
            )}
            {error && (
              <p className="text-sm text-destructive bg-destructive/8 border border-destructive/20 px-3 py-2.5 rounded-lg">
                {error}
              </p>
            )}

            <div className="pt-1">
              <Button type="submit" disabled={saving}>
                {saving ? "Saving…" : "Save Changes"}
              </Button>
            </div>
          </form>
        </div>

        {/* Password card */}
        <div className="bg-card border rounded-xl overflow-hidden">
          <div className="flex items-center gap-3 px-5 py-4 border-b bg-muted/30">
            <div className="rounded-lg bg-muted p-2">
              <KeyRound className="size-4 text-muted-foreground" />
            </div>
            <div>
              <p className="font-semibold text-sm">Change Password</p>
              <p className="text-xs text-muted-foreground">
                Reset your password via email
              </p>
            </div>
          </div>

          <div className="p-5 flex items-center justify-between gap-4">
            <p className="text-sm text-muted-foreground">
              Use the forgot password flow to change your password securely. A
              reset link will be sent to your email address.
            </p>
            <a
              href="/admin/forgot-password"
              className="shrink-0 inline-flex items-center justify-center rounded-lg border border-border bg-background px-4 py-2 text-sm font-medium hover:bg-accent/40 transition-colors"
            >
              Send reset email
            </a>
          </div>
        </div>
      </div>
    </div>
  );
}
