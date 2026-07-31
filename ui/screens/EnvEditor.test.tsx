import { describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { EnvEditor } from "./EnvEditor";
import { MASK } from "../format";
import type { EnvView } from "../ipc";

const file: EnvView = {
  path: "/repo/.env.production",
  variables: [
    { key: "DATABASE_URL", masked: MASK, empty: false },
    { key: "API_KEY", masked: MASK, empty: false },
  ],
  duplicateKeys: [],
  unparseableLines: 0,
};

const encode = (text: string) => new TextEncoder().encode(text);

function setup(overrides: Partial<EnvView> = {}) {
  const onReveal = vi.fn(async (key: string) =>
    encode(key === "API_KEY" ? "sk-live-42" : "postgres://real"),
  );
  const onSave = vi.fn(async () => {});
  const onSeal = vi.fn();
  const onClose = vi.fn();
  render(
    <EnvEditor
      file={{ ...file, ...overrides }}
      onReveal={onReveal}
      onSave={onSave}
      onSeal={onSeal}
      onClose={onClose}
    />,
  );
  return { onReveal, onSave, onSeal, onClose };
}

describe("EnvEditor", () => {
  it("shows every variable masked and no value on open", () => {
    setup();
    expect(screen.getByText("DATABASE_URL")).toBeInTheDocument();
    expect(screen.getAllByText(MASK)).toHaveLength(2);
    expect(screen.queryByText("sk-live-42")).not.toBeInTheDocument();
  });

  it("fetches a value only for the row asked for", async () => {
    const user = userEvent.setup();
    const { onReveal } = setup();

    await user.click(screen.getByRole("button", { name: "Reveal value for API_KEY" }));

    expect(onReveal).toHaveBeenCalledOnce();
    expect(onReveal).toHaveBeenCalledWith("API_KEY");
    expect(await screen.findByText("sk-live-42")).toBeInTheDocument();
    expect(screen.queryByText("postgres://real")).not.toBeInTheDocument();
  });

  it("REVEALING IS NOT AN EDIT: it must not make the file dirty", async () => {
    const user = userEvent.setup();
    setup();

    expect(screen.getByRole("status", { name: "Unsaved changes" })).toHaveTextContent("No unsaved changes");

    await user.click(screen.getByRole("button", { name: "Reveal value for API_KEY" }));
    await screen.findByText("sk-live-42");

    expect(screen.getByRole("status", { name: "Unsaved changes" })).toHaveTextContent("No unsaved changes");
    expect(screen.getByRole("button", { name: "Save" })).toBeDisabled();
  });

  it("counts only genuinely changed variables as unsaved", async () => {
    const user = userEvent.setup();
    setup();

    await user.click(screen.getByRole("button", { name: "Edit API_KEY" }));
    const field = await screen.findByRole("textbox", { name: "Value for API_KEY" });
    await user.clear(field);
    await user.type(field, "rotated");

    expect(screen.getByRole("status", { name: "Unsaved changes" })).toHaveTextContent("1 unsaved change");
  });

  it("sends only the edited pairs on save, never the whole file", async () => {
    const user = userEvent.setup();
    const { onSave } = setup();

    await user.click(screen.getByRole("button", { name: "Edit API_KEY" }));
    const field = await screen.findByRole("textbox", { name: "Value for API_KEY" });
    await user.clear(field);
    await user.type(field, "rotated");
    await user.click(screen.getByRole("button", { name: "Save" }));

    expect(onSave).toHaveBeenCalledWith([["API_KEY", "rotated"]]);
  });

  it("returns to clean after a successful save", async () => {
    const user = userEvent.setup();
    setup();

    await user.click(screen.getByRole("button", { name: "Edit API_KEY" }));
    const field = await screen.findByRole("textbox", { name: "Value for API_KEY" });
    await user.clear(field);
    await user.type(field, "rotated");
    await user.click(screen.getByRole("button", { name: "Save" }));

    expect(await screen.findByText("No unsaved changes")).toBeInTheDocument();
  });

  it("cannot save when nothing has changed", () => {
    setup();
    expect(screen.getByRole("button", { name: "Save" })).toBeDisabled();
  });

  it("explains duplicate keys rather than hiding them", () => {
    setup({ duplicateKeys: ["DUPLICATE"] });
    expect(screen.getByText(/DUPLICATE/)).toBeInTheDocument();
    expect(screen.getByText(/more than once/)).toBeInTheDocument();
  });

  it("reports preserved unparseable lines rather than erroring", () => {
    setup({ unparseableLines: 2 });
    expect(screen.getByText(/2 lines are not variable assignments/)).toBeInTheDocument();
    expect(screen.getByText(/preserved untouched/)).toBeInTheDocument();
  });

  it("secret inputs opt out of spellcheck and autocomplete", async () => {
    const user = userEvent.setup();
    setup();

    await user.click(screen.getByRole("button", { name: "Edit API_KEY" }));
    const field = await screen.findByRole("textbox", { name: "Value for API_KEY" });

    expect(field).toHaveAttribute("spellcheck", "false");
    expect(field).toHaveAttribute("autocomplete", "off");
  });

  it("offers sealing straight from the editor", async () => {
    const user = userEvent.setup();
    const { onSeal } = setup();
    await user.click(screen.getByRole("button", { name: "Seal and close" }));
    expect(onSeal).toHaveBeenCalledOnce();
  });
});

describe("EnvEditor, when saving fails", () => {
  it("keeps the edits so nothing typed is lost", async () => {
    const user = userEvent.setup();
    const onSave = vi.fn(async () => {
      throw { kind: "io", path: null };
    });
    render(
      <EnvEditor
        file={file}
        onReveal={vi.fn(async () => encode("postgres://real"))}
        onSave={onSave}
        onSeal={vi.fn()}
        onClose={vi.fn()}
      />,
    );

    await user.click(screen.getByRole("button", { name: "Edit API_KEY" }));
    await user.clear(screen.getByLabelText("Value for API_KEY"));
    await user.type(screen.getByLabelText("Value for API_KEY"), "rotated");
    await user.click(screen.getByRole("button", { name: "Save" }));

    expect(screen.getByRole("status", { name: "Unsaved changes" })).toHaveTextContent(
      "1 unsaved change",
    );
    expect(screen.getByLabelText("Value for API_KEY")).toHaveValue("rotated");
    expect(screen.getByRole("button", { name: "Save" })).toBeEnabled();
  });
});
