"use client";

import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { api } from "@/lib/api/client";
import { useAuth } from "@/features/auth/AuthContext";
import { Card, CardBody } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Input, Label } from "@/components/ui/Input";
import { Badge } from "@/components/ui/Badge";
import { ConfirmDialog } from "@/components/ui/Dialog";
import { SkeletonList, EmptyState } from "@/components/ui/States";

interface AiConfig {
  active: { provider: string; model: string };
  fallback?: { provider: string | null; model: string | null };
  allowlistedProviders: string[];
  embedding: { provider: string; model: string; dimension: number };
  media?: Record<string, { provider: string; configured: boolean }>;
  limits?: Record<string, number>;
}

/** AI settings: allowlisted provider/model only. Secrets never shown/asked. */
export default function AiSettingsPage() {
  const { token } = useAuth();
  const queryClient = useQueryClient();
  const [provider, setProvider] = useState("");
  const [model, setModel] = useState("");
  const [confirm, setConfirm] = useState(false);

  const cfg = useQuery({
    queryKey: ["admin", "ai-config"],
    queryFn: () => api.get<AiConfig>("/admin/ai-config", { token }).then((r) => r.data),
  });

  const save = useMutation({
    mutationFn: () => api.patch("/admin/ai-config", { token, body: { ...(provider ? { provider } : {}), ...(model ? { model } : {}) } }).then((r) => r.data),
    onSuccess: () => {
      setConfirm(false);
      setProvider("");
      setModel("");
      queryClient.invalidateQueries({ queryKey: ["admin", "ai-config"] });
    },
  });

  return (
    <div className="mx-auto max-w-3xl space-y-4">
      <h1 className="font-display text-2xl font-extrabold">AI সেটিংস 🤖</h1>
      {cfg.isLoading && <SkeletonList rows={3} />}
      {cfg.isError && <EmptyState title="লোড হয়নি" message="আবার চেষ্টা করো।" />}
      {cfg.data && (
        <>
          <Card featured>
            <CardBody>
              <p className="text-sm text-mutedfg">বর্তমান</p>
              <p className="font-display text-xl font-extrabold">{cfg.data.active.provider} <span className="text-mutedfg">/</span> {cfg.data.active.model}</p>
              <div className="mt-2 flex flex-wrap gap-2">
                <Badge tone="gray">এমবেডিং: {cfg.data.embedding.provider}/{cfg.data.embedding.model}</Badge>
                {Object.entries(cfg.data.media ?? {}).map(([k, v]) => (
                  <Badge key={k} tone={v.configured ? "green" : "amber"}>{k}: {v.provider}</Badge>
                ))}
              </div>
            </CardBody>
          </Card>
          <Card>
            <CardBody className="space-y-3">
              <h2 className="font-display font-bold">প্রোভাইডার বদলাও (অনুমোদিত তালিকা থেকে)</h2>
              <div>
                <Label htmlFor="p">প্রোভাইডার</Label>
                <Input id="p" list="providers" value={provider} onChange={(e) => setProvider(e.target.value)} placeholder="যেমন: openrouter" />
                <datalist id="providers">
                  {(cfg.data.allowlistedProviders ?? []).map((p) => (
                    <option key={p} value={p} />
                  ))}
                </datalist>
              </div>
              <div>
                <Label htmlFor="m">মডেল</Label>
                <Input id="m" value={model} onChange={(e) => setModel(e.target.value)} placeholder="মডেল ID" />
              </div>
              <p className="text-xs text-mutedfg">⚠️ বদলালে উত্তর দেওয়া বা খরচে প্রভাব পড়তে পারে। গোপন কী এখানে চাওয়া হয় না — সেগুলো সার্ভারে থাকে।</p>
              <Button size="sm" disabled={(!provider && !model) || save.isPending} onClick={() => setConfirm(true)}>
                সংরক্ষণ করো
              </Button>
              {save.isError && <p role="alert" className="text-sm font-bold text-secondary">সংরক্ষণ হয়নি।</p>}
              {save.isSuccess && <p role="status" className="text-sm font-bold text-quaternary">✅ সংরক্ষিত! কার্যকর হতে রিস্টার্ট লাগতে পারে।</p>}
            </CardBody>
          </Card>
        </>
      )}
      <ConfirmDialog
        open={confirm}
        onClose={() => setConfirm(false)}
        onConfirm={() => save.mutate()}
        busy={save.isPending}
        title="সেটিং বদলাবে?"
        message="এতে টিউটরের উত্তর দেওয়া বা খরচ বদলাতে পারে।"
      />
    </div>
  );
}
