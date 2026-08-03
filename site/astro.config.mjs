import { defineConfig } from "astro/config";
import starlight from "@astrojs/starlight";

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
