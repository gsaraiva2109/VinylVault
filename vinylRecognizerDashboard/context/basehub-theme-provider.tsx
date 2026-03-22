import { fragmentOn } from "basehub";
import colors from "tailwindcss/colors";
import { oklch, rgb } from "culori";

function anyColorToRgb(color: string) {
  const parsed = oklch(color); // or use parse() for any format
  const converted = rgb(parsed);
  if (!converted) throw new Error(`Invalid color format: ${color}`);
  return {
    r: Math.round(converted.r * 255),
    g: Math.round(converted.g * 255),
    b: Math.round(converted.b * 255),
  };
}

export const themeFragment = fragmentOn("Theme", { accent: true, grayScale: true });
export type BaseHubTheme = fragmentOn.infer<typeof themeFragment>;

const CONTRAST_WARNING_COLORS: (keyof typeof colors)[] = [
  "amber",
  "cyan",
  "green",
  "lime",
  "yellow",
];

// Semantic color mappings
const SEMANTIC_GRAYSCALE_MAPPING = {
  // Light Mode
  "text-primary": "950",
  "text-secondary": "600",
  "text-tertiary": "500",
  "surface-primary": "50",
  "surface-secondary": "100",
  "surface-tertiary": "200",
  border: "300",

  // Dark Mode
  "dark-text-primary": "50",
  "dark-text-secondary": "400",
  "dark-text-tertiary": "500",
  "dark-surface-primary": "950",
  "dark-surface-secondary": "900",
  "dark-surface-tertiary": "800",
  "dark-border": "800",
} as const;

const SEMANTIC_ACCENT_MAPPING = {
  control: "500",
  "dark-control": "500",
} as const;

// Generate opacity levels: 5, 10, 20, 30, 40, 50, 60, 70, 80, 90, 95, 100
const OPACITY_LEVELS = [5, 10, 20, 30, 40, 50, 60, 70, 80, 90, 95, 100];

function generateOpacityVariants(baseName: string, rgbVarName: string): string[] {
  return OPACITY_LEVELS.map((opacity) => {
    const opacityDecimal = opacity / 100;
    return `--${baseName}-${opacity}: rgba(var(--${rgbVarName}), ${opacityDecimal});`;
  });
}

export function BaseHubThemeProvider({ theme }: { theme: BaseHubTheme }) {
  const accent = colors[theme.accent];
  const grayScale = colors[theme.grayScale];

  const css = Object.entries(accent).map(([key, value]) => {
    const rgb = anyColorToRgb(value);
    const result = [
      `--accent-${key}: ${value}; --accent-rgb-${key}: ${rgb.r}, ${rgb.g}, ${rgb.b};`,
    ];

    // Add opacity variants for accent colors
    result.push(...generateOpacityVariants(`accent-${key}`, `accent-rgb-${key}`));

    // Add semantic mappings for this accent key
    Object.entries(SEMANTIC_ACCENT_MAPPING).forEach(([semanticKey, accentKey]) => {
      if (key === accentKey) {
        result.push(`--${semanticKey}: var(--accent-${key});`);
        result.push(`--${semanticKey}-rgb: var(--accent-rgb-${key});`);
        // Add opacity variants for semantic accent colors
        result.push(...generateOpacityVariants(semanticKey, `${semanticKey}-rgb`));
      }
    });

    return result.join(" ");
  });

  Object.entries(grayScale).forEach(([key, value]) => {
    const rgb = anyColorToRgb(value);
    const result = [
      `--grayscale-${key}: ${value}; --grayscale-rgb-${key}: ${rgb.r}, ${rgb.g}, ${rgb.b};`,
    ];

    // Add opacity variants for grayscale colors
    result.push(...generateOpacityVariants(`grayscale-${key}`, `grayscale-rgb-${key}`));

    // Add semantic mappings for this grayscale key
    Object.entries(SEMANTIC_GRAYSCALE_MAPPING).forEach(([semanticKey, grayscaleKey]) => {
      if (key === grayscaleKey) {
        result.push(`--${semanticKey}: var(--grayscale-${key});`);
        result.push(`--${semanticKey}-rgb: var(--grayscale-rgb-${key});`);
        // Add opacity variants for semantic grayscale colors
        result.push(...generateOpacityVariants(semanticKey, `${semanticKey}-rgb`));
      }
    });

    css.push(result.join(" "));
  });

  if (CONTRAST_WARNING_COLORS.includes(theme.accent)) {
    css.push(`--text-on-accent: ${colors.gray[950]};`);
    css.push(`--text-on-accent-rgb: 3, 7, 18;`); // gray-950 RGB values
  }

  // Status Colors (hardcoded)
  css.push(`--error: #ff453a;`);
  css.push(`--success: #14c9a2;`);

  // Text on Accent (with fallbacks)
  css.push(`--text-on-accent-primary: var(--text-on-accent, var(--grayscale-50));`);
  css.push(`--text-on-accent-secondary: var(--text-on-accent, var(--grayscale-950));`);

  // Text on Accent RGB variants
  css.push(`--text-on-accent-primary-rgb: var(--text-on-accent-rgb, var(--grayscale-rgb-50));`);
  css.push(`--text-on-accent-secondary-rgb: var(--text-on-accent-rgb, var(--grayscale-rgb-950));`);

  // Status Colors RGB (hardcoded)
  css.push(`--error-rgb: 255, 69, 58;`);
  css.push(`--success-rgb: 20, 201, 162;`);

  // Add opacity variants for status colors
  css.push(...generateOpacityVariants("error", "error-rgb"));
  css.push(...generateOpacityVariants("success", "success-rgb"));

  // Add opacity variants for text-on-accent colors
  css.push(...generateOpacityVariants("text-on-accent-primary", "text-on-accent-primary-rgb"));
  css.push(...generateOpacityVariants("text-on-accent-secondary", "text-on-accent-secondary-rgb"));

  return (
    <style>{`
      :root {
        ${css.join("\n        ")}
      }
      `}</style>
  );
}
