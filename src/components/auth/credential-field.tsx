import type { InputHTMLAttributes } from "react";

import { cn } from "@/lib/utils";

type CredentialFieldProps = {
  label: string;
  hint?: string;
} & InputHTMLAttributes<HTMLInputElement>;

export function CredentialField({
  label,
  hint,
  className,
  id,
  ...props
}: CredentialFieldProps) {
  const fieldId = id ?? props.name;

  return (
    <label htmlFor={fieldId} className="block space-y-2 text-sm">
      <span className="flex items-center justify-between gap-4 font-medium text-stone-200">
        <span>{label}</span>
        {hint ? <span className="text-xs text-stone-500">{hint}</span> : null}
      </span>

      <input
        id={fieldId}
        className={cn(
          "w-full rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-sm text-stone-50 outline-none transition duration-200 placeholder:text-stone-500 focus:border-orange-300/60 focus:bg-white/10 focus:ring-2 focus:ring-orange-400/20",
          className,
        )}
        {...props}
      />
    </label>
  );
}
