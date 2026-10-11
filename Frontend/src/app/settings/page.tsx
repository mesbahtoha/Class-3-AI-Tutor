"use client";

import { useState } from "react";
import { useAuth } from "@/features/auth/AuthContext";
import { useTheme } from "@/components/layout/ThemeProvider";
import { Card, CardBody } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Select, Label } from "@/components/ui/Input";
import type { LanguagePreference } from "@/lib/api/contracts";

export default function SettingsPage() {
  const { user, me, signOut, refreshMe } = useAuth();
  const { theme, toggle } = useTheme();
  const [lang, setLang] = useState<LanguagePreference>(() => {
    try {
      return (localStorage.getItem("tutor_lang") as LanguagePreference) || "auto";
    } catch {
      return "auto";
    }
  });

  function saveLang(v: LanguagePreference) {
    setLang(v);
    try {
      localStorage.setItem("tutor_lang", v);
    } catch {
      /* ignore */
    }
  }

  return (
    <div className="mx-auto max-w-2xl space-y-4">
      <h1 className="font-display text-2xl font-extrabold">সেটিংস ⚙️</h1>
      <Card>
        <CardBody className="space-y-4">
          <div>
            <Label htmlFor="theme">থিম</Label>
            <div className="flex items-center gap-2">
              <span className="font-bold">{theme === "dark" ? "🌙 ডার্ক" : "☀️ লাইট"}</span>
              <Button size="sm" variant="secondary" onClick={toggle}>বদলাও</Button>
            </div>
          </div>
          <div>
            <Label htmlFor="set-lang">উত্তরের ভাষা</Label>
            <Select id="set-lang" value={lang} onChange={(e) => saveLang(e.target.value as LanguagePreference)}>
              <option value="auto">অটো (স্মার্ট)</option>
              <option value="bn">বাংলা</option>
              <option value="en">English</option>
              <option value="banglish">Banglish</option>
            </Select>
          </div>
          <div className="border-t-2 border-dashed border-line pt-4">
            <h2 className="font-display font-bold">অ্যাকাউন্ট</h2>
            {user ? (
              <div className="mt-1 text-sm">
                <p>ইমেইল: {user.email ?? "—"}</p>
                <p>ভূমিকা: {me?.role ?? "লোড হচ্ছে…"}</p>
                <div className="mt-2 flex gap-2">
                  <Button size="sm" variant="secondary" onClick={refreshMe}>তথ্য রিফ্রেশ</Button>
                  <Button size="sm" variant="danger" onClick={signOut}>সাইন আউট</Button>
                </div>
                <p className="mt-2 text-xs text-mutedfg">সাইন আউটে এই ডিভাইসের সব সংরক্ষিত শেখার তথ্য মুছে যায়।</p>
              </div>
            ) : (
              <a href="/welcome"><Button size="sm">সাইন ইন করো</Button></a>
            )}
          </div>
        </CardBody>
      </Card>
    </div>
  );
}
