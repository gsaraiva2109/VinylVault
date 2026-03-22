import { buttonFragment } from "../lib/basehub/fragments";
import { fragmentOn } from "basehub";
import { RichText, type RichTextProps } from "basehub/react-rich-text";
import Image from "next/image";
import Link, { type LinkProps } from "next/link";

export const formWrapperFragment = fragmentOn("FormWrapperComponent", {
  title: true,
  subtitle: {
    json: {
      content: true,
    },
  },
  cta: buttonFragment,
});
export type FormWrapperFragment = fragmentOn.infer<typeof formWrapperFragment>;
export const settingsLogoLiteFragment = fragmentOn("Settings", {
  logoLite: {
    url: true,
    width: true,
    height: true,
  },
});
export type SettingsLogoLiteFragment = fragmentOn.infer<typeof settingsLogoLiteFragment>;

export function FormLayout({
  children,
  title,
  subtitle,
  settingsLogoLite,
}: {
  title: string;
  subtitle: React.ReactNode;
  children: React.ReactNode;
  settingsLogoLite: SettingsLogoLiteFragment;
}) {
  const logoLite = settingsLogoLite.logoLite;

  return (
    <div className="mx-auto flex w-full max-w-xl flex-col gap-5 rounded-xl border border-[--surface-secondary] bg-[--surface-primary] p-5 shadow-md dark:border-[--dark-border] dark:bg-[--dark-surface-secondary] dark:shadow-none">
      <header className="flex flex-col gap-3">
        <Image
          priority
          alt="Logo"
          className="size-8 self-start"
          height={logoLite.height}
          src={logoLite.url}
          width={logoLite.width}
        />
        <div className="flex flex-col gap-1">
          <h1 className="text-xl font-medium">{title}</h1>
          <div className="text-sm text-[--text-secondary] dark:text-[--dark-text-secondary]">
            {subtitle}
          </div>
        </div>
      </header>
      {children}
    </div>
  );
}

export function RichTextFormWrapper({ children }: RichTextProps) {
  return (
    <RichText
      components={{
        a: CustomAnchor,
      }}
    >
      {children}
    </RichText>
  );
}

function CustomAnchor({
  children,
  ...props
}: React.AllHTMLAttributes<HTMLAnchorElement> & LinkProps) {
  return (
    <Link className="text-[--accent-500] hover:underline" {...props}>
      {children}
    </Link>
  );
}
