import { ReactNode } from "react";

interface SectionProps {
  children: ReactNode;
  className?: string;
}

export function Section({ children, className }: SectionProps) {
  return (
    <section className={`px-4 py-8 ${className || ""}`}>
      {children}
    </section>
  );
}
