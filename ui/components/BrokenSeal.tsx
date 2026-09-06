import { Toggletip } from "./Toggletip";

interface Props {
  label: string;
  count?: number;
  place?: "left" | "right";
}

export function BrokenSeal({ label, count = 1, place = "left" }: Props) {
  const one = count === 1;

  return (
    <Toggletip label={label} place={place}>
      <strong>The seal broke</strong>
      <p>
        Seal encrypted {one ? "this file" : `${count} files here`}, and something
        later wrote plaintext over {one ? "it" : "them"} — usually an editor that
        still had {one ? "it" : "them"} open. Sealing again closes it. The secret
        has been readable on disk, so rotate it.
      </p>
    </Toggletip>
  );
}
