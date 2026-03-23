import Link from "next/link";
import { ReactNode } from "react";

interface ButtonLinkProps {
  href: string;
  intent?: "primary" | "secondary";
  children: ReactNode;
}

export function ButtonLink({ href, intent = "primary", children }: ButtonLinkProps) {
  const baseStyles = "inline-block px-4 py-2 rounded-md font-medium transition-colors";
  const intentStyles =
    intent === "primary"
      ? "bg-blue-600 text-white hover:bg-blue-700"
      : "bg-gray-200 text-gray-900 hover:bg-gray-300";

  return (
    <Link href={href} className={`${baseStyles} ${intentStyles}`}>
      {children}
    </Link>
  );
}
