import { Confirm } from "../components/Confirm";

interface Props {
  onAcknowledge: () => void | Promise<void>;
  onCancel: () => void;
}

export function Acknowledge({ onAcknowledge, onCancel }: Props) {
  return (
    <Confirm
      title="Before Seal encrypts anything"
      confirmLabel="I understand — start sealing"
      cancelLabel="Not yet"
      typeToConfirm="I UNDERSTAND"
      onConfirm={onAcknowledge}
      onCancel={onCancel}
    >
      <p>
        <strong>If you forget your password, your sealed files are gone.</strong>{" "}
        Seal keeps no copy of it, anywhere. There is no reset, no recovery key,
        and no way for anyone — including us — to open your files without it.
        This is what makes the protection real, and it has no exceptions.
      </p>
      <p>
        <strong>Sealing protects from now on. It cannot reach backwards.</strong>{" "}
        A secret that has already sat unencrypted on this disk may still exist
        in backups, snapshots, or unallocated space that no program can reach.
        Sealing it now does not undo that.
      </p>
      <p>
        So for any credential that has been sitting in the clear:{" "}
        <strong>rotate it</strong>. Sealing the file protects the next secret,
        not the one that was already exposed.
      </p>
    </Confirm>
  );
}
