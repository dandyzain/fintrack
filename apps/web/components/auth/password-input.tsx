"use client";

import * as React from "react";
import { ArrowBigUp, Eye, EyeOff } from "lucide-react";
import { useLanguage } from "@/context/language-context";
import { Input } from "@/components/ui/field";

/** Password field with show/hide toggle and a Caps Lock warning. */
export const PasswordInput = React.forwardRef<HTMLInputElement, React.InputHTMLAttributes<HTMLInputElement>>(
  (props, ref) => {
    const { t } = useLanguage();
    const [visible, setVisible] = React.useState(false);
    const [caps, setCaps] = React.useState(false);
    const check = (e: React.KeyboardEvent<HTMLInputElement>) => setCaps(e.getModifierState?.("CapsLock") ?? false);

    return (
      <div>
        <div className="relative">
          <Input
            ref={ref}
            type={visible ? "text" : "password"}
            className="pr-12"
            onKeyDown={check}
            onKeyUp={check}
            onBlur={() => setCaps(false)}
            {...props}
          />
          <button
            type="button"
            onClick={() => setVisible((v) => !v)}
            aria-label={visible ? t.auth.hidePassword : t.auth.showPassword}
            aria-pressed={visible}
            className="absolute right-1.5 top-1/2 grid size-9 -translate-y-1/2 place-items-center rounded-lg text-fg-subtle transition hover:bg-surface-2 hover:text-fg coarse:size-10"
          >
            {visible ? <EyeOff className="size-4" aria-hidden /> : <Eye className="size-4" aria-hidden />}
          </button>
        </div>
        {caps && (
          <p role="status" className="mt-1.5 flex items-center gap-1 text-xs font-medium text-warning-fg">
            <ArrowBigUp className="size-3.5" aria-hidden />
            {t.auth.capsLock}
          </p>
        )}
      </div>
    );
  }
);
PasswordInput.displayName = "PasswordInput";
