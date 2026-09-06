import { $ } from "@wdio/globals";

export async function sealFromRow(relativePath: string) {
  const seal = $(`button[aria-label="Seal ${relativePath}"]`);
  await seal.waitForClickable({ timeout: 30000 });
  await seal.click();
}
