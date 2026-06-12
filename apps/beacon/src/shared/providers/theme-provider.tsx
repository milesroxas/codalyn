import * as React from "react";

type Theme = "dark" | "light" | "system";

type ThemeProviderProps = {
  children: React.ReactNode;
  defaultTheme?: Theme;
  storageKey?: string;
  /** Controlled theme (single source of truth); requires `onThemeChange`. */
  theme?: Theme;
  onThemeChange?: (theme: Theme) => void;
};

type ThemeProviderState = {
  theme: Theme;
  setTheme: (theme: Theme) => void;
};

const ThemeProviderContext = React.createContext<ThemeProviderState | undefined>(undefined);

export function ThemeProvider({
  children,
  defaultTheme = "system",
  storageKey = "ui-theme",
  theme: themeProp,
  onThemeChange,
  ...props
}: ThemeProviderProps) {
  const isControlled = themeProp !== undefined && onThemeChange !== undefined;

  const [internalTheme, setInternalTheme] = React.useState<Theme>(() => {
    if (isControlled) {
      return themeProp;
    }
    return (localStorage.getItem(storageKey) as Theme) || defaultTheme;
  });

  const theme = isControlled ? themeProp : internalTheme;

  React.useEffect(() => {
    const root = window.document.documentElement;

    root.classList.remove("light", "dark");

    if (theme === "system") {
      const systemTheme = window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light";

      root.classList.add(systemTheme);
      return;
    }

    root.classList.add(theme);
  }, [theme]);

  const setTheme = React.useCallback(
    (next: Theme) => {
      if (isControlled) {
        onThemeChange(next);
      } else {
        try {
          localStorage.setItem(storageKey, next);
        } catch {
          /* ignore */
        }
        setInternalTheme(next);
      }
    },
    [isControlled, onThemeChange, storageKey]
  );

  const value = {
    theme,
    setTheme,
  };

  return (
    <ThemeProviderContext.Provider {...props} value={value}>
      {children}
    </ThemeProviderContext.Provider>
  );
}
