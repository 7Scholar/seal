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
  const onUnseal = vi.fn();
  const onLeave = vi.fn();
  render(
    <EnvEditor
      file={{ ...file, ...overrides }}
      relativePath=".env.production"
      state="sealed"
      onReveal={onReveal}
      onSave={onSave}
      onSeal={onSeal}
      onUnseal={onUnseal}
      onLeave={onLeave}
    />,
  );
  return { onReveal, onSave, onSeal, onUnseal, onLeave };
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
    expect(screen.getByRole("button", { name: "Save and seal" })).toBeDisabled();
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
    await user.click(screen.getByRole("button", { name: "Save and seal" }));

    expect(onSave).toHaveBeenCalledWith([["API_KEY", "rotated"]]);
  });

  it("returns to clean after a successful save", async () => {
    const user = userEvent.setup();
    setup();

    await user.click(screen.getByRole("button", { name: "Edit API_KEY" }));
    const field = await screen.findByRole("textbox", { name: "Value for API_KEY" });
    await user.clear(field);
    await user.type(field, "rotated");
    await user.click(screen.getByRole("button", { name: "Save and seal" }));

    expect(await screen.findByText("No unsaved changes")).toBeInTheDocument();
  });

  it("cannot save when nothing has changed", () => {
    setup();
    expect(screen.getByRole("button", { name: "Save and seal" })).toBeDisabled();
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

  it("offers unsealing from the header of a sealed file", async () => {
    const user = userEvent.setup();
    const { onUnseal } = setup();
    await user.click(screen.getByRole("button", { name: "Unseal" }));
    expect(onUnseal).toHaveBeenCalledOnce();
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
        relativePath=".env.production"
        state="sealed"
        onReveal={vi.fn(async () => encode("postgres://real"))}
        onSave={onSave}
        onSeal={vi.fn()}
        onUnseal={vi.fn()}
        onLeave={vi.fn()}
      />,
    );

    await user.click(screen.getByRole("button", { name: "Edit API_KEY" }));
    await user.clear(screen.getByLabelText("Value for API_KEY"));
    await user.type(screen.getByLabelText("Value for API_KEY"), "rotated");
    await user.click(screen.getByRole("button", { name: "Save and seal" }));

    expect(screen.getByRole("status", { name: "Unsaved changes" })).toHaveTextContent(
      "1 unsaved change",
    );
    expect(screen.getByLabelText("Value for API_KEY")).toHaveValue("rotated");
    expect(screen.getByRole("button", { name: "Save and seal" })).toBeEnabled();
  });

  it("re-masks a revealed value when Seal stops holding the plaintext", async () => {
    const user = userEvent.setup();
    const onReveal = vi.fn(async () => encode("sk-live-42"));
    const props = {
      file,
      relativePath: ".env.production",
      state: "sealed" as const,
      onReveal,
      onSave: vi.fn(async () => {}),
      onSeal: vi.fn(),
      onUnseal: vi.fn(),
      onLeave: vi.fn(),
    };

    const { rerender } = render(<EnvEditor {...props} expired={false} />);

    await user.click(screen.getByRole("button", { name: "Reveal value for API_KEY" }));
    expect(await screen.findByText("sk-live-42")).toBeInTheDocument();

    rerender(<EnvEditor {...props} expired={true} />);

    expect(screen.queryByText("sk-live-42")).not.toBeInTheDocument();
  });

  it("says why the value vanished, rather than blanking it silently", async () => {
    const user = userEvent.setup();
    const onReveal = vi.fn(async () => encode("sk-live-42"));
    const props = {
      file,
      relativePath: ".env.production",
      state: "sealed" as const,
      onReveal,
      onSave: vi.fn(async () => {}),
      onSeal: vi.fn(),
      onUnseal: vi.fn(),
      onLeave: vi.fn(),
    };

    const { rerender } = render(<EnvEditor {...props} expired={false} />);
    await user.click(screen.getByRole("button", { name: "Reveal value for API_KEY" }));
    await screen.findByText("sk-live-42");

    rerender(<EnvEditor {...props} expired={true} />);

    expect(
      screen.getByText(/stopped holding this file/i),
    ).toBeInTheDocument();
  });

  it("says nothing when the plaintext expires with no value on show", () => {
    const props = {
      file,
      relativePath: ".env.production",
      state: "sealed" as const,
      onReveal: vi.fn(async () => encode("sk-live-42")),
      onSave: vi.fn(async () => {}),
      onSeal: vi.fn(),
      onUnseal: vi.fn(),
      onLeave: vi.fn(),
    };

    const { rerender } = render(<EnvEditor {...props} expired={false} />);
    rerender(<EnvEditor {...props} expired={true} />);

    expect(screen.queryByText(/stopped holding this file/i)).not.toBeInTheDocument();
  });
});

describe("EnvEditor's footer", () => {
  it("offers exactly Cancel and Save, and nothing else", () => {
    setup();
    const footer = document.querySelector(".env-editor__actions")!;
    const labels = [...footer.querySelectorAll("button")].map((b) => b.textContent);
    expect(labels).toEqual(["Cancel", "Save and seal"]);
  });

  it("says Save and seal on a sealed file, and Save on a readable one", () => {
    const props = {
      file,
      relativePath: ".env.production",
      onReveal: vi.fn(async () => encode("v")),
      onSave: vi.fn(async () => {}),
      onSeal: vi.fn(),
      onUnseal: vi.fn(),
      onLeave: vi.fn(),
    };
    const { rerender } = render(<EnvEditor {...props} state="sealed" />);
    expect(screen.getByRole("button", { name: "Save and seal" })).toBeInTheDocument();

    rerender(<EnvEditor {...props} state="plaintext" />);
    expect(screen.getByRole("button", { name: "Save" })).toBeInTheDocument();
    expect(
      screen.queryByRole("button", { name: "Save and seal" }),
    ).not.toBeInTheDocument();
  });

  it("keeps Cancel enabled even with nothing to discard", () => {
    setup();
    expect(screen.getByRole("button", { name: "Cancel" })).toBeEnabled();
    expect(screen.getByRole("button", { name: "Save and seal" })).toBeDisabled();
  });

  it("leaves immediately on Cancel when nothing has changed", async () => {
    const user = userEvent.setup();
    const { onLeave } = setup();

    await user.click(screen.getByRole("button", { name: "Cancel" }));

    expect(onLeave).toHaveBeenCalledOnce();
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
  });

  it("asks before discarding pending changes, and leaves only on confirming", async () => {
    const user = userEvent.setup();
    const { onLeave } = setup();

    await user.click(screen.getByRole("button", { name: "Edit API_KEY" }));
    await user.click(screen.getByRole("button", { name: "Cancel" }));

    expect(onLeave).not.toHaveBeenCalled();
    const dialog = screen.getByRole("dialog");
    expect(dialog).toHaveTextContent("Discard your changes?");

    await user.click(screen.getByRole("button", { name: "Discard them" }));
    expect(onLeave).toHaveBeenCalledOnce();
  });

  it("keeps the edits when the discard is declined", async () => {
    const user = userEvent.setup();
    const { onLeave } = setup();

    await user.click(screen.getByRole("button", { name: "Edit API_KEY" }));
    await user.click(screen.getByRole("button", { name: "Cancel" }));
    await user.click(screen.getByRole("button", { name: "Keep editing" }));

    expect(onLeave).not.toHaveBeenCalled();
    expect(screen.getByText("1 unsaved change")).toBeInTheDocument();
  });
});

describe("EnvEditor resuming after a re-lock", () => {
  it("reopens the row the user had been editing", async () => {
    const onReveal = vi.fn(async () => encode("sk-live-42"));
    render(
      <EnvEditor
        file={file}
        relativePath=".env.production"
        state="sealed"
        resumeEditing="API_KEY"
        onReveal={onReveal}
        onSave={vi.fn(async () => {})}
        onSeal={vi.fn()}
        onUnseal={vi.fn()}
        onLeave={vi.fn()}
      />,
    );

    expect(
      await screen.findByRole("textbox", { name: "Value for API_KEY" }),
    ).toHaveValue("sk-live-42");
    expect(onReveal).toHaveBeenCalledWith("API_KEY");
  });

  it("resumes nothing when no row was being edited", () => {
    const onReveal = vi.fn(async () => encode("sk-live-42"));
    render(
      <EnvEditor
        file={file}
        relativePath=".env.production"
        state="sealed"
        resumeEditing={null}
        onReveal={onReveal}
        onSave={vi.fn(async () => {})}
        onSeal={vi.fn()}
        onUnseal={vi.fn()}
        onLeave={vi.fn()}
      />,
    );

    expect(onReveal).not.toHaveBeenCalled();
    expect(screen.queryByRole("textbox")).not.toBeInTheDocument();
  });

  it("survives a resume naming a variable the file no longer has", () => {
    const onResumed = vi.fn();
    render(
      <EnvEditor
        file={file}
        relativePath=".env.production"
        state="sealed"
        resumeEditing="GONE_AWAY"
        onReveal={vi.fn(async () => encode("x"))}
        onSave={vi.fn(async () => {})}
        onSeal={vi.fn()}
        onUnseal={vi.fn()}
        onLeave={vi.fn()}
        onResumed={onResumed}
      />,
    );

    expect(screen.queryByRole("textbox")).not.toBeInTheDocument();
    expect(onResumed).toHaveBeenCalledOnce();
  });
});
