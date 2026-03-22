import { ThemeProvider } from "next-themes";
import { BaseHubThemeProvider } from "../context/basehub-theme-provider";
import { TooltipProvider } from "../common/tooltip";
import { BaseHubTheme } from "../context/basehub-theme-provider";

export function Providers({ children, theme }: { children: React.ReactNode; theme: BaseHubTheme }) {
  return (
    <ThemeProvider enableSystem attribute="class" defaultTheme="system">
      <BaseHubThemeProvider theme={theme} />
      <TooltipProvider>{children}</TooltipProvider>
    </ThemeProvider>
  );
}
