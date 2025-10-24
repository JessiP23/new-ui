// REFACTORED by GPT-5 — optimized for clarity and performance
// Purpose: Coordinates labels, helper text, and errors for complex form controls.
import { createContext, useContext, useId } from "react";
import type { HTMLAttributes, ReactNode } from "react";
import { cn } from "../../utils/cn";

interface FieldContextValue {
  id: string;
  required?: boolean;
  error?: string;
}

const FieldContext = createContext<FieldContextValue | null>(null);

export interface FieldProps extends HTMLAttributes<HTMLDivElement> {
  label: string;
  required?: boolean;
  helperText?: string;
  error?: string;
  inputId?: string;
  children: ReactNode;
}

export const Field = ({
  label,
  required,
  helperText,
  error,
  className,
  inputId,
  children,
  ...props
}: FieldProps) => {
  const generatedId = useId();
  const id = inputId ?? generatedId;

  return (
    <FieldContext.Provider value={{ id, required, error }}>
      <div className={cn("flex flex-col gap-2", className)} {...props}>
        <label htmlFor={id} className="text-sm font-medium text-white/90">
          {label}
          {required && <span className="ml-1 text-[var(--color-error)]">*</span>}
        </label>
        {children}
        {helperText && !error && <p className="text-xs text-muted-foreground">{helperText}</p>}
        {error && <p className="text-xs text-[var(--color-error)]">{error}</p>}
      </div>
    </FieldContext.Provider>
  );
};

export const useFieldContext = () => {
  const context = useContext(FieldContext);
  if (!context) {
    throw new Error("useFieldContext must be used within Field");
  }
  return context;
};
