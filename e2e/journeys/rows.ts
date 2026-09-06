import { $ } from "@wdio/globals";

export async function sealFromRow(relativePath: string) {
  const seal = $(`button[aria-label="Seal ${relativePath}"]`);
  await seal.waitForClickable({ timeout: 30000 });
  await seal.click();
}

export async function editVariable(key: string) {
  const reveal = $(`button[aria-label="Reveal value for ${key}"]`);
  await reveal.waitForClickable({ timeout: 30000 });
  await reveal.click();
  const edit = $(`button[aria-label="Edit ${key}"]`);
  await edit.waitForClickable({ timeout: 15000 });
  await edit.click();
  return $(`input[aria-label="Value for ${key}"]`);
}
