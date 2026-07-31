import { useCallback, useEffect, useState } from "react";
import * as ipc from "./ipc";
import { explain } from "./errors";
import { Acknowledge } from "./screens/Acknowledge";
import { EnvEditor } from "./screens/EnvEditor";
import { ImportFlow } from "./screens/ImportFlow";
import { RepoList } from "./screens/RepoList";
import { Unlock } from "./screens/Unlock";
import { PasswordChange } from "./screens/PasswordChange";
import { Confirm } from "./components/Confirm";
import { Problem } from "./components/Problem";
import { fileName } from "./format";

type Screen =
  | { name: "repos" }
  | { name: "import"; scan: ipc.ScanView }
  | { name: "editor"; file: ipc.EnvView }
  | { name: "opaque"; path: string; bytes: number }
  | { name: "rekey" };

export function App() {
  const [unlocked, setUnlocked] = useState(false);
  const [established, setEstablished] = useState<boolean | null>(null);
  const [lockNote, setLockNote] = useState<string | null>(null);
  const [problem, setProblem] = useState<string | null>(null);
  const [repos, setRepos] = useState<ipc.RepoView[]>([]);
  const [screen, setScreen] = useState<Screen>({ name: "repos" });
  const [acknowledging, setAcknowledging] = useState<null | (() => void)>(null);
  const [releasing, setReleasing] = useState<string | null>(null);
  const [sealing, setSealing] = useState<null | { path: string; secondsAgo: number }>(null);
  const [rekey, setRekey] = useState<ipc.Manifest | null>(null);

  const refresh = useCallback(async () => {
    setRepos(await ipc.overview());
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
    void refresh();
    ipc.rekeyStatus().then(setRekey).catch(() => setRekey(null));
  }, [unlocked, refresh]);

  function relock() {
    setLockNote(
      "Seal locked itself while you were away. Everything stayed sealed — unlock to continue.",
    );
    setUnlocked(false);
    setScreen({ name: "repos" });
    setAcknowledging(null);
    setReleasing(null);
    setSealing(null);
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

  async function sealNow(path: string) {
    await withAcknowledgement(`seal ${fileName(path)}`, async () => {
      await ipc.sealFile(path);
      await refresh();
      setScreen({ name: "repos" });
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

  async function open(path: string) {
    await attempt(`open ${fileName(path)}`, async () => {
      const opened = await ipc.openFile(path);
      if (opened.kind === "env") {
        setScreen({ name: "editor", file: opened });
      } else {
        setScreen({ name: "opaque", path: opened.path, bytes: opened.bytes });
      }
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

  return (
    <>
      {problem ? (
        <Problem message={problem} onDismiss={() => setProblem(null)} />
      ) : null}

      {screen.name === "repos" ? (
        <RepoList
          repos={repos}
          onImport={() =>
            attempt("open the folder picker", async () => {
              const root = await ipc.pickFolder();
              if (!root) return;
              setScreen({ name: "import", scan: await ipc.scanFolder(root) });
            })
          }
          onOpen={open}
          onSeal={seal}
          onRelease={setReleasing}
          unfinishedRekey={rekey !== null}
          onChangePassword={() => setScreen({ name: "rekey" })}
          onLock={() =>
            attempt("lock Seal", async () => {
              await ipc.lock();
              setUnlocked(false);
              setScreen({ name: "repos" });
            })
          }
        />
      ) : null}

      {screen.name === "import" ? (
        <ImportFlow
          scan={screen.scan}
          onCancel={() => setScreen({ name: "repos" })}
          onConfirm={(selected) =>
            attempt("import the folder", async () => {
              await ipc.importRepo(screen.scan.root, selected);
              await refresh();
              setScreen({ name: "repos" });
            })
          }
        />
      ) : null}

      {screen.name === "editor" ? (
        <EnvEditor
          file={screen.file}
          onReveal={async (key) => {
            try {
              return await ipc.reveal(screen.file.path, key);
            } catch (error) {
              fail(`reveal ${key}`, error);
              throw error;
            }
          }}
          onSave={async (edits) => {
            try {
              await withAcknowledgement("save the changes", async () => {
                await ipc.save(screen.file.path, edits);
                await refresh();
              });
            } catch (error) {
              fail("save the changes", error);
              throw error;
            }
          }}
          onSeal={() => seal(screen.file.path)}
          onClose={() =>
            attempt("close the file", async () => {
              await ipc.closeFile(screen.file.path);
              setScreen({ name: "repos" });
            })
          }
        />
      ) : null}

      {screen.name === "opaque" ? (
        <section className="opaque">
          <h1>{fileName(screen.path)}</h1>
          <p>
            Seal manages this file and encrypts it as it is. It is not an env
            file, so there is nothing to edit here — {screen.bytes} bytes,
            stored exactly as you wrote them.
          </p>
          <button
            type="button"
            onClick={() =>
              attempt("close the file", async () => {
                await ipc.closeFile(screen.path);
                setScreen({ name: "repos" });
              })
            }
          >
            Close
          </button>
        </section>
      ) : null}

      {screen.name === "rekey" ? (
        <PasswordChange
          manifest={rekey}
          onBegin={async () => {
            setRekey(await ipc.rekeyBegin());
          }}
          onRun={async (current, replacement) => {
            const outcome = await ipc.rekeyRun(current, replacement);
            const done = outcome.entries.every((e) => e.standing === "converted");
            setRekey(done ? null : outcome);
            if (done) setScreen({ name: "repos" });
          }}
          onAbandon={() =>
            attempt("forget the password change", async () => {
              await ipc.rekeyAbandon();
              setRekey(null);
            })
          }
          onClose={() => setScreen({ name: "repos" })}
        />
      ) : null}

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
              await refresh();
            });
          }}
        >
          <p>
            Seal will forget this file and leave its readable contents at the
            same path. The file itself is not deleted.
          </p>
        </Confirm>
      ) : null}
    </>
  );
}
