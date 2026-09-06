import { defineConfig } from "astro/config";
import starlight from "@astrojs/starlight";

/* Code is the one place a documentation site is most tempted to introduce a
   second palette. These two carry the application's own values and colour only
   what changes meaning: a comment, a string, and the rest is ink. */

const ink = (name, type, fg, muted, accent, bg) => ({
  name,
  type,
  settings: [
    { settings: { foreground: fg, background: bg } },
    { scope: ["comment", "punctuation.definition.comment"], settings: { foreground: muted, fontStyle: "italic" } },
    { scope: ["string", "string.quoted", "constant.other.symbol"], settings: { foreground: accent } },
    { scope: ["variable", "variable.other", "entity.name", "support"], settings: { foreground: fg } },
    { scope: ["keyword", "storage", "constant.language", "entity.name.function"], settings: { foreground: fg, fontStyle: "bold" } },
    { scope: ["constant.numeric", "constant.language.boolean"], settings: { foreground: accent } },
    { scope: ["punctuation", "meta.brace"], settings: { foreground: muted } },
  ],
  colors: {
    "editor.background": bg,
    "editor.foreground": fg,
  },
});

const sealDark = ink("seal-dark", "dark", "#e8e9e6", "#9ba1a8", "#4e9b8b", "#1e2125");
const sealLight = ink("seal-light", "light", "#22262b", "#5f636b", "#2f6f63", "#f7f7f4");

export default defineConfig({
  site: "https://7scholar.github.io",
  base: "/seal",
  integrations: [
    starlight({
      title: "Seal",
      description:
        "Seal encrypts the secret files in your repositories in place, opened only by a password that exists nowhere on the machine.",
      social: {
        github: "https://github.com/7scholar/seal",
      },
      editLink: {
        baseUrl: "https://github.com/7scholar/seal/edit/main/site/",
      },
      lastUpdated: true,
      customCss: ["./src/styles/seal.css"],
      expressiveCode: {
        themes: [sealDark, sealLight],
        themeCssSelector: (theme) =>
          theme.name === "seal-light" ? '[data-theme="light"]' : ":root",
        styleOverrides: {
          borderRadius: "3px",
          borderWidth: "1px",
          borderColor: "var(--sl-color-hairline)",
          codeFontFamily: "var(--sl-font-mono)",
          codeFontSize: "0.8125rem",
          uiFontFamily: "var(--sl-font-mono)",
          uiFontSize: "0.656rem",
          frames: {
            shadowColor: "transparent",
            editorTabBarBorderBottomColor: "var(--sl-color-hairline)",
            editorActiveTabIndicatorTopColor: "transparent",
            terminalTitlebarDotsForeground: "transparent",
            terminalTitlebarDotsOpacity: "0",
            terminalTitlebarBorderBottomColor: "var(--sl-color-hairline)",
            terminalTitlebarForeground: "var(--sl-color-gray-3)",
            inlineButtonBorder: "var(--sl-color-hairline)",
          },
        },
      },
      components: {
        PageTitle: "./src/components/PageTitle.astro",
        Header: "./src/components/Header.astro",
        Sidebar: "./src/components/Sidebar.astro",
        Pagination: "./src/components/Pagination.astro",
        ThemeSelect: "./src/components/ThemeSelect.astro",
        ThemeProvider: "./src/components/ThemeProvider.astro",
      },
      sidebar: [
        {
          label: "Get started",
          items: [
            { label: "Install", slug: "get-started/install" },
            { label: "Your first sealed file", slug: "get-started/first-sealed-file" },
          ],
        },
        {
          label: "Guides",
          items: [
            { label: "Using Seal from scripts", slug: "guides/scripts" },
            { label: "Managing files in the application", slug: "guides/managing-files" },
          ],
        },
        {
          label: "Understand",
          items: [
            { label: "How it works", slug: "understand/how-it-works" },
            { label: "What Seal does not protect", slug: "understand/limits" },
          ],
        },
        {
          label: "Reference",
          items: [
            { label: "Command line", slug: "reference/cli" },
            { label: "Security policy", slug: "reference/security" },
            { label: "Contributing", slug: "reference/contributing" },
          ],
        },
      ],
    }),
  ],
});
