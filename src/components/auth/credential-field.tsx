import type { InputHTMLAttributes } from "react";

import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

type CredentialFieldProps = {
  label: string;
  hint?: string;
} & InputHTMLAttributes<HTMLInputElement>;

export function CredentialField({
  label,
  hint,
  id,
  ...props
}: CredentialFieldProps) {
  const fieldId = id ?? props.name;

  return (
    <Label htmlFor={fieldId} className="block space-y-2">
      <span className="flex items-center justify-between gap-4 font-medium text-stone-200">
        <span>{label}</span>
        {hint ? <span className="text-xs text-stone-500">{hint}</span> : null}
      </span>

      <Input id={fieldId} {...props} />
    </Label>
  );
}
