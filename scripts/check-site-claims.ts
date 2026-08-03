import { readFileSync } from "node:fs";

const root = new URL("../", import.meta.url).pathname;
const read = (path: string) => readFileSync(root + path, "utf8");

const failures: string[] = [];

function check(name: string, ok: boolean, detail: string) {
  if (!ok) failures.push(`${name}\n    ${detail}`);
}

const readme = read("README.md");
const security = read("SECURITY.md");
const landing = read("site/src/content/docs/index.mdx");
const limits = read("site/src/content/docs/understand/limits.md");
const install = read("site/src/content/docs/get-started/install.md");
const installScript = read("scripts/install.sh");

const INSTALL_COMMANDS = [
  "brew install 7scholar/tap/seal",
  "curl -fsSL https://raw.githubusercontent.com/7scholar/seal/main/scripts/install.sh | sh",
  "cargo build --release --manifest-path src-tauri/Cargo.toml --features custom-protocol",
];

for (const command of INSTALL_COMMANDS) {
  check(
    `install command present in README: ${command.slice(0, 40)}…`,
    readme.includes(command),
    "A README without the install commands is a broken README.",
  );
  check(
    `install command present on the site: ${command.slice(0, 40)}…`,
    install.includes(command),
    "The site's install page is the most-visited page and must carry the same commands.",
  );
}

check(
  "the installer script is reachable at the path both surfaces publish",
  installScript.length > 0,
  "Both surfaces tell a reader to curl scripts/install.sh; it must exist.",
);

const ROTATE =
  "A credential that has already sat unprotected on disk, in a backup, or in a snapshot should be";
const FORGOTTEN_README =
  "There is no recovery key, no escrow, no backdoor";
const FORGOTTEN_SECURITY =
  "There is no escrow, no recovery key, and no backdoor";
const FORGOTTEN_SITE = "There is no recovery path, no escrow, and no backdoor";

check(
  "the cannot-reach-backwards limit is on the landing page",
  landing.includes("cannot reach backwards") && landing.includes("rotated"),
  "A site that only links to the limits has softened them by relegation.",
);
check(
  "the cannot-reach-backwards limit is in the README",
  readme.includes("cannot reach backwards") && readme.includes(ROTATE),
  "The README is where a reader on GitHub meets the limit.",
);
check(
  "the cannot-reach-backwards limit is on the threat-model page",
  limits.includes("cannot reach backwards") && limits.includes("rotated"),
  "The threat-model page states every limit in full.",
);
check(
  "the cannot-reach-backwards limit is in the security policy",
  security.includes("Sealing cannot reach backwards"),
  "A reporter must not have to guess whether this is a bug.",
);

check(
  "the forgotten-password limit is on the landing page",
  landing.includes("A forgotten password means the data is gone"),
  "This is the decision a user cannot undo later; it is not a footnote.",
);
check(
  "the forgotten-password limit is in the README",
  readme.includes(FORGOTTEN_README),
  "Stated as a limit, not a caveat.",
);
check(
  "the forgotten-password limit is on the threat-model page",
  limits.includes(FORGOTTEN_SITE),
  "Stated as a limit, not a caveat.",
);
check(
  "the forgotten-password limit is in the security policy",
  security.includes(FORGOTTEN_SECURITY),
  "Stated as a limit, not a caveat.",
);

const SOFTENING = [
  "unbreakable",
  "military-grade",
  "100% secure",
  "completely secure",
  "guaranteed secure",
  "bank-grade",
];
const sitePages = [landing, limits, install, read("site/src/content/docs/understand/how-it-works.md")];
for (const page of sitePages) {
  for (const phrase of SOFTENING) {
    check(
      `no overclaiming: "${phrase}"`,
      !page.toLowerCase().includes(phrase),
      "The site may never claim a protection Seal does not have.",
    );
  }
}

check(
  "the site links the threat model from the landing page",
  landing.includes("/seal/understand/limits/"),
  "The limits page must be reachable from the first screen.",
);

if (failures.length > 0) {
  console.error("Site claim checks failed:\n");
  for (const failure of failures) console.error(`  ✗ ${failure}\n`);
  process.exit(1);
}

console.log(`Site claim checks passed (${INSTALL_COMMANDS.length} install commands, both absolute limits across four surfaces).`);
