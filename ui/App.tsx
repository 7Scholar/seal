import { useCallback, useEffect, useState } from "react";
import * as ipc from "./ipc";
import { Acknowledge } from "./screens/Acknowledge";
import { EnvEditor } from "./screens/EnvEditor";
import { ImportFlow } from "./screens/ImportFlow";
import { RepoList } from "./screens/RepoList";
import { Unlock } from "./screens/Unlock";
import { PasswordChange } from "./screens/PasswordChange";
import { Confirm } from "./components/Confirm";
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
  const [repos, setRepos] = useState<ipc.RepoView[]>([]);
  const [screen, setScreen] = useState<Screen>({ name: "repos" });
  const [acknowledging, setAcknowledging] = useState<null | (() => void)>(null);
  const [releasing, setReleasing] = useState<string | null>(null);
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

  async function withAcknowledgement(action: () => Promise<void>) {
    if (await ipc.hasAcknowledged()) {
      await action();
      return;
    }
    setAcknowledging(() => async () => {
      await ipc.acknowledge();
      setAcknowledging(null);
      await action();
    });
  }

  async function seal(path: string) {
    await withAcknowledgement(async () => {
      await ipc.sealFile(path);
      await refresh();
      setScreen({ name: "repos" });
    });
  }

  async function open(path: string) {
    const opened = await ipc.openFile(path);
    if (opened.kind === "env") {
      setScreen({ name: "editor", file: opened });
    } else {
      setScreen({ name: "opaque", path: opened.path, bytes: opened.bytes });
    }
  }

  if (!unlocked) {
    if (established === null) return null;
    return (
      <Unlock
        mode={established ? "verify" : "create"}
        onSubmit={async (passphrase) => {
          if (established) {
            await ipc.unlock(passphrase);
          } else {
            await ipc.establish(passphrase);
            setEstablished(true);
          }
          setUnlocked(true);
        }}
      />
    );
  }

  return (
    <>
      {screen.name === "repos" ? (
        <RepoList
          repos={repos}
          onImport={async () => {
            const root = window.prompt("Folder to import");
            if (!root) return;
            setScreen({ name: "import", scan: await ipc.scanFolder(root) });
          }}
          onOpen={open}
          onSeal={seal}
          onRelease={setReleasing}
          unfinishedRekey={rekey !== null}
          onChangePassword={() => setScreen({ name: "rekey" })}
          onLock={async () => {
            await ipc.lock();
            setUnlocked(false);
            setScreen({ name: "repos" });
          }}
        />
      ) : null}

      {screen.name === "import" ? (
        <ImportFlow
          scan={screen.scan}
          onCancel={() => setScreen({ name: "repos" })}
          onConfirm={async (selected) => {
            await ipc.importRepo(screen.scan.root, selected);
            await refresh();
            setScreen({ name: "repos" });
          }}
        />
      ) : null}

      {screen.name === "editor" ? (
        <EnvEditor
          file={screen.file}
          onReveal={(key) => ipc.reveal(screen.file.path, key)}
          onSave={async (edits) => {
            await withAcknowledgement(async () => {
              await ipc.save(screen.file.path, edits);
              await refresh();
            });
          }}
          onSeal={() => seal(screen.file.path)}
          onClose={async () => {
            await ipc.closeFile(screen.file.path);
            setScreen({ name: "repos" });
          }}
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
            onClick={async () => {
              await ipc.closeFile(screen.path);
              setScreen({ name: "repos" });
            }}
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
          onAbandon={async () => {
            await ipc.rekeyAbandon();
            setRekey(null);
          }}
          onClose={() => setScreen({ name: "repos" })}
        />
      ) : null}

      {acknowledging ? (
        <Acknowledge
          onAcknowledge={acknowledging}
          onCancel={() => setAcknowledging(null)}
        />
      ) : null}

      {releasing ? (
        <Confirm
          title={`Stop managing ${fileName(releasing)}?`}
          confirmLabel="Stop managing it"
          cancelLabel="Keep managing it"
          onCancel={() => setReleasing(null)}
          onConfirm={async () => {
            await ipc.release(releasing, "restorePlaintext");
            setReleasing(null);
            await refresh();
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
