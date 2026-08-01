import { useCallback, useEffect, useState } from "react";
import * as ipc from "./ipc";
import { explain } from "./errors";
import { Acknowledge } from "./screens/Acknowledge";
import { EnvEditor } from "./screens/EnvEditor";
import { ImportFlow } from "./screens/ImportFlow";
import { RepoDetail } from "./screens/RepoDetail";
import { Sidebar, type Selection } from "./screens/Sidebar";
import { Unlock } from "./screens/Unlock";
import { PasswordChange } from "./screens/PasswordChange";
import { Confirm } from "./components/Confirm";
import { Problem } from "./components/Problem";
import { Overflow } from "./components/Overflow";
import { fileName } from "./format";

type Overlay =
  | { name: "none" }
  | { name: "import"; scan: ipc.ScanView }
  | { name: "rekey" };

type Opened =
  | { kind: "env"; file: ipc.EnvView }
  | { kind: "opaque"; path: string; bytes: number };

export function App() {
  const [unlocked, setUnlocked] = useState(false);
  const [established, setEstablished] = useState<boolean | null>(null);
  const [lockNote, setLockNote] = useState<string | null>(null);
  const [problem, setProblem] = useState<string | null>(null);
  const [repos, setRepos] = useState<ipc.RepoView[]>([]);
  const [selection, setSelection] = useState<Selection>({ kind: "none" });
  const [expanded, setExpanded] = useState<ReadonlySet<string>>(new Set());
  const [opened, setOpened] = useState<Opened | null>(null);
  const [overlay, setOverlay] = useState<Overlay>({ name: "none" });
  const [acknowledging, setAcknowledging] = useState<null | (() => void)>(null);
  const [releasing, setReleasing] = useState<string | null>(null);
  const [releasingRepo, setReleasingRepo] = useState<ipc.RepoView | null>(null);
  const [sealing, setSealing] = useState<null | { path: string; secondsAgo: number }>(null);
  const [outcomes, setOutcomes] = useState<ipc.SealOutcome[] | null>(null);
  const [rekey, setRekey] = useState<ipc.Manifest | null>(null);

  const refresh = useCallback(async () => {
    const fresh = await ipc.overview();
    setRepos(fresh);
    return fresh;
  }, []);

  useEffect(() => {
    ipc
      .isUnlocked()
      .then(setUnlocked)
      .catch(() => setUnlocked(false));
    ipc
      .isEstablished()
      .then(setEstablished)
      .catch(() => setEstablished(true));
  }, []);

  useEffect(() => {
    if (!unlocked) return;
    void refresh().then((fresh) => {
      setExpanded(
        new Set(
          fresh
            .filter((repo) => repo.files.some((file) => file.alert))
            .map((repo) => repo.root),
        ),
      );
    });
    ipc.rekeyStatus().then(setRekey).catch(() => setRekey(null));
  }, [unlocked, refresh]);

  function relock() {
    setLockNote(
      "Seal locked itself while you were away. Everything stayed sealed — unlock to continue.",
    );
    setUnlocked(false);
    setSelection({ kind: "none" });
    setOpened(null);
    setOverlay({ name: "none" });
    setAcknowledging(null);
    setReleasing(null);
    setReleasingRepo(null);
    setSealing(null);
    setOutcomes(null);
  }

  function fail(doing: string, error: unknown) {
    if (ipc.isCommandError(error) && error.kind === "locked") {
      relock();
      return;
    }
    setProblem(explain(doing, error));
  }

  async function attempt(doing: string, action: () => Promise<void>) {
    try {
      await action();
    } catch (error) {
      fail(doing, error);
    }
  }

  async function withAcknowledgement(doing: string, action: () => Promise<void>) {
    if (await ipc.hasAcknowledged()) {
      await action();
      return;
    }
    setAcknowledging(() => () =>
      attempt(doing, async () => {
        await ipc.acknowledge();
        setAcknowledging(null);
        await action();
      }),
    );
  }

  const selectedRepo =
    selection.kind === "none"
      ? null
      : (repos.find((repo) => repo.root === selection.root) ?? null);

  function reconcile(fresh: ipc.RepoView[]) {
    if (selection.kind === "none") return;
    const repo = fresh.find((entry) => entry.root === selection.root);
    if (!repo) {
      setSelection({ kind: "none" });
      setOpened(null);
      return;
    }
    if (selection.kind !== "file") return;
    const stillThere = repo.files.some(
      (file) => `${repo.root}/${file.relativePath}` === selection.path,
    );
    if (!stillThere) {
      setSelection({ kind: "repo", root: repo.root });
      setOpened(null);
    }
  }

  async function refreshAndReconcile() {
    reconcile(await refresh());
  }

  async function sealNow(path: string) {
    await withAcknowledgement(`seal ${fileName(path)}`, async () => {
      await ipc.sealFile(path);
      await refreshAndReconcile();
    });
  }

  async function seal(path: string) {
    await attempt(`seal ${fileName(path)}`, async () => {
      const warning = await ipc.sealWarning(path);
      if (warning) {
        setSealing({ path, secondsAgo: warning.modifiedSecondsAgo });
        return;
      }
      await sealNow(path);
    });
  }

  async function sealMany(paths: string[]) {
    if (paths.length === 0) return;
    await attempt(`seal ${paths.length} files`, async () => {
      await withAcknowledgement(`seal ${paths.length} files`, async () => {
        setOutcomes(await ipc.sealFiles(paths));
        await refreshAndReconcile();
      });
    });
  }

  async function select(next: Selection) {
    setSelection(next);
    setOutcomes(null);
    if (next.kind !== "file") {
      setOpened(null);
      return;
    }
    await attempt(`open ${fileName(next.path)}`, async () => {
      const file = await ipc.openFile(next.path);
      setOpened(
        file.kind === "env"
          ? { kind: "env", file }
          : { kind: "opaque", path: file.path, bytes: file.bytes },
      );
    });
  }

  function toggleExpand(root: string) {
    setExpanded((was) => {
      const next = new Set(was);
      if (next.has(root)) {
        next.delete(root);
      } else {
        next.add(root);
      }
      return next;
    });
  }

  async function startImport() {
    await attempt("open the folder picker", async () => {
      const root = await ipc.pickFolder();
      if (!root) return;
      setOverlay({ name: "import", scan: await ipc.scanFolder(root) });
    });
  }

  if (!unlocked) {
    if (established === null) return null;
    return (
      <Unlock
        mode={established ? "verify" : "create"}
        notice={lockNote ?? undefined}
        onSubmit={async (passphrase) => {
          if (established) {
            await ipc.unlock(passphrase);
          } else {
            await ipc.establish(passphrase);
            setEstablished(true);
          }
          setLockNote(null);
          setUnlocked(true);
        }}
      />
    );
  }

  if (overlay.name === "import") {
    return (
      <ImportFlow
        scan={overlay.scan}
        onCancel={() => setOverlay({ name: "none" })}
        onConfirm={(selected) =>
          attempt("import the folder", async () => {
            const root = overlay.scan.root;
            await ipc.importRepo(root, selected);
            const fresh = await refresh();
            setOverlay({ name: "none" });
            if (fresh.some((repo) => repo.root === root)) {
              setSelection({ kind: "repo", root });
              setExpanded((was) => new Set(was).add(root));
            }
          })
        }
      />
    );
  }

  if (overlay.name === "rekey") {
    return (
      <PasswordChange
        manifest={rekey}
        onBegin={async () => {
          setRekey(await ipc.rekeyBegin());
        }}
        onRun={async (current, replacement) => {
          const outcome = await ipc.rekeyRun(current, replacement);
          const done = outcome.entries.every((e) => e.standing === "converted");
          setRekey(done ? null : outcome);
          if (done) setOverlay({ name: "none" });
        }}
        onAbandon={() =>
          attempt("forget the password change", async () => {
            await ipc.rekeyAbandon();
            setRekey(null);
          })
        }
        onClose={() => setOverlay({ name: "none" })}
      />
    );
  }

  return (
    <div className="shell">
      <header className="shell__titlebar" data-tauri-drag-region>
        <span className="shell__brand">Seal</span>

        <span className="shell__spacer" />

        <button
          type="button"
          className="shell__lock"
          onClick={() =>
            attempt("lock Seal", async () => {
              await ipc.lock();
              setUnlocked(false);
              setSelection({ kind: "none" });
              setOpened(null);
            })
          }
        >
          Lock
        </button>

        <Overflow label="Seal settings">
          <button type="button" onClick={() => setOverlay({ name: "rekey" })}>
            Change master password
          </button>
        </Overflow>
      </header>

      <Sidebar
        repos={repos}
        selection={selection}
        expanded={expanded}
        onToggleExpand={toggleExpand}
        onSelect={select}
        onImport={startImport}
      />

      <main className="shell__main">
        {rekey !== null ? (
          <div className="shell__rekey" role="alert">
            <span>
              A password change was not finished. Some files are on the old
              password and some on the new — keep both until it completes.
            </span>
            <button type="button" onClick={() => setOverlay({ name: "rekey" })}>
              Finish it
            </button>
          </div>
        ) : null}

        {problem ? (
          <Problem message={problem} onDismiss={() => setProblem(null)} />
        ) : null}

        {selection.kind === "none" ? (
          <section className="detail detail--empty">
            <h1>
              {repos.length === 0
                ? "Seal manages nothing yet"
                : "Nothing selected"}
            </h1>
            <p>
              {repos.length === 0
                ? "Point Seal at a repository and it will look for secret files you may want to protect. Nothing is encrypted until you choose to seal it."
                : "Choose a repository on the left to see the files Seal is watching there."}
            </p>
            {repos.length === 0 ? (
              <button type="button" onClick={startImport}>
                Import a folder
              </button>
            ) : null}
          </section>
        ) : null}

        {selection.kind === "repo" && selectedRepo ? (
          <RepoDetail
            repo={selectedRepo}
            onOpen={(path) =>
              select({ kind: "file", root: selectedRepo.root, path })
            }
            onSeal={seal}
            onSealMany={sealMany}
            onRelease={setReleasing}
            onReleaseRepo={() => setReleasingRepo(selectedRepo)}
            onRescan={() =>
              attempt("scan the repository", async () => {
                setOverlay({
                  name: "import",
                  scan: await ipc.scanFolder(selectedRepo.root),
                });
              })
            }
            outcomes={outcomes}
            onDismissOutcomes={() => setOutcomes(null)}
          />
        ) : null}

        {selection.kind === "file" && opened?.kind === "env" ? (
          <EnvEditor
            file={opened.file}
            onReveal={async (key) => {
              try {
                return await ipc.reveal(opened.file.path, key);
              } catch (error) {
                fail(`reveal ${key}`, error);
                throw error;
              }
            }}
            onSave={async (edits) => {
              try {
                await withAcknowledgement("save the changes", async () => {
                  await ipc.save(opened.file.path, edits);
                  await refreshAndReconcile();
                });
              } catch (error) {
                fail("save the changes", error);
                throw error;
              }
            }}
            onSeal={() => seal(opened.file.path)}
            onClose={() =>
              attempt("close the file", async () => {
                await ipc.closeFile(opened.file.path);
                setSelection({ kind: "repo", root: selection.root });
                setOpened(null);
              })
            }
          />
        ) : null}

        {selection.kind === "file" && opened?.kind === "opaque" ? (
          <section className="detail opaque">
            <h1>{fileName(opened.path)}</h1>
            <p>
              Seal manages this file and encrypts it as it is. It is not an env
              file, so there is nothing to edit here — {opened.bytes} bytes,
              stored exactly as you wrote them.
            </p>
            <button
              type="button"
              onClick={() =>
                attempt("close the file", async () => {
                  await ipc.closeFile(opened.path);
                  setSelection({ kind: "repo", root: selection.root });
                  setOpened(null);
                })
              }
            >
              Close
            </button>
          </section>
        ) : null}
      </main>

      {acknowledging ? (
        <Acknowledge
          onAcknowledge={acknowledging}
          onCancel={() => setAcknowledging(null)}
        />
      ) : null}

      {sealing ? (
        <Confirm
          title={`Seal ${fileName(sealing.path)} while something may be editing it?`}
          confirmLabel="Seal it anyway"
          cancelLabel="Not yet"
          onCancel={() => setSealing(null)}
          onConfirm={async () => {
            const path = sealing.path;
            setSealing(null);
            await attempt(`seal ${fileName(path)}`, () => sealNow(path));
          }}
        >
          <p>
            This file changed {sealing.secondsAgo} seconds ago, so a program may
            be working in it right now. Seal cannot see an editor's unsaved
            buffer: if one is open, its next save will overwrite the sealed file
            with readable text. Close the file in your editor first, then seal.
          </p>
        </Confirm>
      ) : null}

      {releasing ? (
        <Confirm
          title={`Stop managing ${fileName(releasing)}?`}
          confirmLabel="Stop managing it"
          cancelLabel="Keep managing it"
          onCancel={() => setReleasing(null)}
          onConfirm={async () => {
            const path = releasing;
            setReleasing(null);
            await attempt(`stop managing ${fileName(path)}`, async () => {
              await ipc.release(path, "restorePlaintext");
              await refreshAndReconcile();
            });
          }}
        >
          <p>
            Seal will forget this file and leave its readable contents at the
            same path. The file itself is not deleted.
          </p>
        </Confirm>
      ) : null}

      {releasingRepo ? (
        <Confirm
          title={`Stop managing ${releasingRepo.name}?`}
          confirmLabel="Stop managing it"
          cancelLabel="Keep managing it"
          onCancel={() => setReleasingRepo(null)}
          onConfirm={async () => {
            const root = releasingRepo.root;
            setReleasingRepo(null);
            await attempt(`stop managing ${fileName(root)}`, async () => {
              await ipc.releaseRepo(root, "restorePlaintext");
              const fresh = await refresh();
              if (!fresh.some((repo) => repo.root === root)) {
                setSelection({ kind: "none" });
                setOpened(null);
              }
            });
          }}
        >
          <p>
            Seal will forget all {releasingRepo.files.length}{" "}
            {releasingRepo.files.length === 1 ? "file" : "files"} in{" "}
            {releasingRepo.name} and leave their readable contents at their own
            paths. No file is deleted, and the repository itself is untouched.
          </p>
        </Confirm>
      ) : null}
    </div>
  );
}
