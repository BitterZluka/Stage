import type { ReactNode } from "react";
import { CheckIcon } from "../icons";

export interface CheckboxProps {
  id: string;
  checked: boolean;
  onChange: (checked: boolean) => void;
  children: ReactNode;
}

export function Checkbox({ id, checked, onChange, children }: CheckboxProps) {
  return (
    <label
      htmlFor={id}
      className="flex cursor-pointer items-center gap-2.5 rounded-lg px-1 py-1.5 text-sm font-medium select-none hover:bg-black/5"
    >
      <span
        className={`relative flex h-5 w-5 shrink-0 items-center justify-center rounded-md border-2 border-black ${
          checked ? "bg-stage-cyan" : "bg-white"
        }`}
      >
        <input
          id={id}
          type="checkbox"
          checked={checked}
          onChange={(event) => onChange(event.target.checked)}
          className="absolute inset-0 h-full w-full cursor-pointer appearance-none rounded-md focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-black"
        />
        {checked && (
          <CheckIcon size={13} className="pointer-events-none text-black" />
        )}
      </span>
      <span>{children}</span>
    </label>
  );
}
