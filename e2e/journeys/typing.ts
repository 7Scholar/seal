import { browser, $, expect } from "@wdio/globals";

export async function typeInto(selector: string, text: string) {
  const field = $(selector);
  await field.waitForDisplayed();
  await field.click();
  await field.setValue(text);
  await expect(field).toHaveValue(text);
}

export async function enterPassphrase(text: string) {
  await typeInto("#passphrase", text);
  await browser.keys("Enter");
}
