# Questions

## 1. How does Seal get installed?

**Status:** open.

**Why this needs you.** Research settled most of this, but what remains is a real fork about how much of the product a stranger can install without compiling — and one option costs money. That is yours, not mine.

**What the research established** (measured on this machine, not taken from documentation):

macOS has **two independent gates**, and conflating them is what made the earlier answer only half-right.

- The **execution gate** on Apple Silicon kills arm64 code carrying no signature at all. A free **ad-hoc signature** satisfies it — no Apple account involved. Verified: Homebrew's own `ripgrep` is `Signature=adhoc`, `TeamIdentifier=not set`, and runs perfectly.
- The **Gatekeeper gate** fires only on files carrying `com.apple.quarantine`, and only a paid Developer ID plus notarisation passes it.

The second gate is the one avoidable for free, because **quarantine is set by how the bits arrive, not by what they are**. Browsers set it; `curl` and `tar` do not; and Homebrew never adds it.

**Measured directly:** an unsigned `seal` binary, packaged in a tarball that was then quarantined to simulate a download, installed through a real Homebrew formula, arrives carrying **only `com.apple.provenance`** — no quarantine — and runs. So `brew install` solves the unsigned problem for the command-line tool completely.

**The finding that changes the plan:** it does **not** solve it for the desktop application, and that door is closing. A cask cannot strip quarantine on the user's behalf — the `quarantine false` stanza does not exist, and the user-side `--no-quarantine` flag has already been **removed** (Homebrew 6.0.14, confirmed in the release notes and absent from this machine's source). Homebrew is **ending support for all casks that fail Gatekeeper on 1 September 2026** — about five weeks away. Building the GUI's installation on a cask would be building on something with a published expiry date. Separately, homebrew-core will not take the application under any circumstances: *"A formula whose primary output is a native macOS `.app` bundle is not eligible."*

**What I propose regardless of your answer**, because it is free, strictly better than today, and forecloses nothing:

- A **custom tap** (`7scholar/homebrew-tap`) so the command-line tool installs with `brew install 7scholar/tap/seal`. A tap is a plain public repo with no registration and no notability gate; homebrew-core's ≥75-stars threshold does not apply.
- A **`curl | sh` installer** for people without Homebrew and for Linux, which also avoids quarantine.
- **Ad-hoc signing in CI** so the artefacts satisfy the Apple Silicon execution gate.

**The fork is what happens to the desktop application:**

**A. Leave it build-from-source.** Costs nothing and is honest. The command-line tool installs in one command; the application needs Rust, Node, and a documented build. Anyone forking the project is already set up for this, so it costs contributors little — but it means an ordinary user cannot get the application at all, and the application is the reason this is not just a CLI.

**B. Sign and notarise (99 USD/year).** An Apple Developer Program membership. The application then installs by double-clicking a `.dmg`, or by a cask that will still be permitted after September. This is the only option that makes the GUI genuinely installable by a stranger, and it also future-proofs the cask route. It needs the certificate and an app-specific password as repository secrets — I would not need the secrets themselves, only to know they exist so I can write the workflow against them.

**C. Ship the application unsigned and document the `xattr -cr` override.** Costs nothing and technically delivers a downloadable app. I recommend against it: it trains users of a security tool to disarm a security warning, and the plan already rejected this reasoning once.

**My recommendation: A now, B when you are ready to spend on it.** A is not a compromise for the audience you have today — forkers and developers already build from source, and the tap plus installer script gives them a one-command CLI. B is the upgrade that turns Seal into something a non-developer can install, and it is worth the 99 USD at the point where you want that audience. C I would avoid for the same reason it was avoided before.

If you pick B, tell me whether you have or want an Apple Developer account; everything else about it I can write.

**ANSWER**
