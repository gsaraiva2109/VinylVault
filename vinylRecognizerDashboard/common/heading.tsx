import { ReactNode } from "react";

interface HeadingProps {
  children: ReactNode;
  subtitle?: string;
  tag?: string;
}

export function Heading({ children, subtitle, tag }: HeadingProps) {
  return (
    <div className="mb-6">
      {tag && <span className="text-sm font-semibold text-gray-500">{tag}</span>}
      {children}
      {subtitle && <p className="mt-2 text-gray-600">{subtitle}</p>}
    </div>
  );
}
