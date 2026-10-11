"use client";

import type { ReactNode } from "react";
import { Card, CardBody } from "@/components/ui/Card";

/** Welcome/login card shell with mascot + value statement (spec §8.1). */
export function LoginCard({ title, subtitle, children, footer }: {
  title: string;
  subtitle?: string;
  children: ReactNode;
  footer?: ReactNode;
}) {
  return (
    <div className="relative mx-auto w-full max-w-md">
      <div className="absolute -right-6 -top-6 size-16 rounded-full bg-secondary" aria-hidden />
      <div className="absolute -left-8 bottom-10 size-10 rotate-12 rounded-md bg-quaternary" aria-hidden />
      <Card featured className="relative">
        <CardBody className="p-6 sm:p-8">
          <div className="mb-4 flex items-center gap-3">
            <span className="grid size-14 shrink-0 place-items-center rounded-full border-2 border-ink bg-tertiary font-display text-3xl font-extrabold shadow-pop-sm" aria-hidden>
              প
            </span>
            <div>
              <h1 className="font-display text-2xl font-extrabold">{title}</h1>
              {subtitle && <p className="text-sm text-mutedfg">{subtitle}</p>}
            </div>
          </div>
          {children}
          {footer && <div className="mt-4 border-t-2 border-dashed border-line pt-4 text-center text-sm">{footer}</div>}
        </CardBody>
      </Card>
    </div>
  );
}
