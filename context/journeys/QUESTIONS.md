# Questions

Design forks this axis surfaced that the journeys cannot settle themselves. Each blocks the work named. Answer in place, under **ANSWER**.

## 1. What does a first run actually look like?

**Status:** awaiting an answer. Blocks [first-run.md](first-run.md), and everything downstream of it.

**Why this needs you.** The product has no concept of a first run at all — it cannot tell a new user from a returning one, so it asks someone who has never used it to unlock a vault that does not exist. That is a missing concern rather than a defect, so it needs designing rather than fixing, and the shape of it is a genuine fork.

The stakes are unusually high for a first screen: the password chosen here cannot be recovered, and everything the user later protects depends on it. Get this wrong and people either bounce off immediately or lose data months later.

**A. A guided setup, once.** The first launch is a short sequence: what this is, choose your password (twice, with the consequences stated), and then straight into importing a first repository. Afterwards the product never shows it again. This is what password managers and disk-encryption tools do, because the stakes match.

**B. Just a password-creation screen.** Same as today's unlock screen but aware it is creating rather than entering: a confirmation field, and the irreversibility facts stated. Cheapest honest fix. The user then lands in the empty state and finds their own way.

**C. Defer the password until it is first needed.** Open into the product, let someone import a repository and look around, and only ask for a password at the moment they first protect something. Nothing irreversible happens until there is a reason for it.

**My recommendation: A.** B leaves someone alone in an empty product immediately after the highest-stakes decision it asks of them, and the empty state is already a known weak point. C sounds friendlier but splits the irreversibility warning away from the password choice, so someone commits to an unrecoverable password without the context that makes it meaningful — and it adds a state where the product holds repositories but no password.

The fork matters beyond the screen: A implies the product knows it has never been set up, which is state that has to live somewhere and survive a restart.

**ANSWER**

## 2. What drives the harness?

**Status:** awaiting an answer. Blocks [HARNESS.md](HARNESS.md), and therefore every journey's automated demonstration.

**Why this needs you.** Journeys are satisfied by driving the real application, and the framework's own driver has no macOS support — which is the primary development platform here. This is a constraint with no clean answer, and the choice sets what can be automated for the life of the project.

**A. The framework's WebDriver support, Linux-only in continuous integration.** The supported path. Automated journeys gate on Linux; macOS is verified by hand at release and recorded. Catches everything platform-independent, which is most of what journeys catch — dead controls, unreachable screens, missing states.

**B. Drive the webview directly, cross-platform.** Bypass the framework's driver and automate the interface layer against the real binary. Would cover macOS, but it is a bespoke harness with no upstream support, and a harness nobody maintains is worse than none.

**C. No automation. Manual demonstration only, recorded per journey.** Cheapest now. Proves the past rather than the present, so journeys silently rot back to broken — which is precisely how the product reached its current state.

**My recommendation: A.** It is the maintained path, and the Linux gap on macOS-specific behaviour is real but small compared to having no gate at all. C is how this happened in the first place.

**ANSWER**
