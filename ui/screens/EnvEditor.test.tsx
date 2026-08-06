import { describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { EnvEditor } from "./EnvEditor";
import { MASK } from "../format";
import type { EditOp, EnvView } from "../ipc";

const file: EnvView = {
  path: "/repo/.env.production",
  variables: [
    { id: 1, key: "DATABASE_URL", masked: MASK, empty: false, disabled: false },
    { id: 2, key: "API_KEY", masked: MASK, empty: false, disabled: false },
  ],
  malformed: [],
  duplicateKeys: [],
  unparseableLines: 0,
};

const encode = (text: string) => new TextEncoder().encode(text);

function setup(overrides: Partial<EnvView> = {}) {
  const onReveal = vi.fn(async (_row: number, key: string) =>
    encode(key === "API_KEY" ? "sk-live-42" : "postgres://real"),
  );
  const sent: EditOp[][] = [];
  const onSave = vi.fn(async (ops: EditOp[]) => {
    sent.push(ops);
  });
  const onSeal = vi.fn();
  const onUnseal = vi.fn();
  const onLeave = vi.fn();

  const draw = (view: EnvView) => (
    <EnvEditor
      file={view}
      relativePath=".env.production"
      state="sealed"
      onReveal={onReveal}
      onSave={onSave}
      onSeal={onSeal}
      onUnseal={onUnseal}
      onLeave={onLeave}
    />
  );

  const view = { ...file, ...overrides };
  const rendered = render(draw(view));

  return {
    onReveal,
    onSave,
    onSeal,
    onUnseal,
    onLeave,
    saved: () => sent,
    rerender: (next: EnvView) => rendered.rerender(draw(next)),
  };
}

async function menu(user: ReturnType<typeof userEvent.setup>, key: string, item: string) {
  await user.click(screen.getByRole("button", { name: `More actions for ${key}` }));
  await user.click(screen.getByRole("button", { name: item }));
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
    expect(onReveal).toHaveBeenCalledWith(2, "API_KEY");
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

    expect(onSave).toHaveBeenCalledWith([
      { kind: "setValue", row: 2, value: "rotated" },
    ]);
  });

  it("returns to clean when the save hands back the reparsed file", async () => {
    const user = userEvent.setup();
    const { rerender, saved } = setup();

    await user.click(screen.getByRole("button", { name: "Edit API_KEY" }));
    const field = await screen.findByRole("textbox", { name: "Value for API_KEY" });
    await user.clear(field);
    await user.type(field, "rotated");
    await user.click(screen.getByRole("button", { name: "Save and seal" }));
    expect(saved()).toHaveLength(1);

    rerender({ ...file, variables: [...file.variables] });

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

  it("draws a malformed line as a row that can be corrected, not a count", async () => {
    const user = userEvent.setup();
    setup({
      malformed: [{ id: 7, text: "this line makes no sense" }],
      unparseableLines: 1,
    });

    const raw = screen.getByRole("textbox", { name: "Malformed line" });
    expect(raw).toHaveValue("this line makes no sense");
    expect(screen.queryByText(/not variable assignments/)).not.toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: "Correct" }));
    expect(await screen.findByRole("alert")).toHaveTextContent(/still not a variable/i);
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

describe("EnvEditor: creating", () => {
  it("adds a row and sends it as an insert", async () => {
    const user = userEvent.setup();
    const { onSave } = setup();

    await user.click(screen.getByRole("button", { name: "Add variable" }));
    await user.type(
      screen.getByRole("textbox", { name: /Name for the new variable/ }),
      "REDIS_URL",
    );
    await user.type(screen.getByRole("textbox", { name: "Value for REDIS_URL" }), "redis://x");
    await user.click(screen.getByRole("button", { name: "Save and seal" }));

    expect(onSave).toHaveBeenCalledWith([
      { kind: "insert", after: 2, key: "REDIS_URL", value: "redis://x", disabled: false },
    ]);
  });

  it("anchors consecutive new rows to a row the file actually has", async () => {
    const user = userEvent.setup();
    const { onSave } = setup();

    for (const name of ["FIRST", "SECOND", "THIRD"]) {
      await user.click(screen.getByRole("button", { name: "Add variable" }));
      await user.type(
        screen.getByRole("textbox", { name: "Name for the new variable, not named yet" }),
        name,
      );
    }
    await user.click(screen.getByRole("button", { name: "Save and seal" }));

    const ops = onSave.mock.calls[0]?.[0] as EditOp[];
    const inserts = ops.filter((op) => op.kind === "insert");
    expect(inserts).toHaveLength(3);

    for (const op of inserts) {
      if (op.kind !== "insert") continue;
      expect(
        op.after === null || file.variables.some((variable) => variable.id === op.after),
        `insert of ${op.key} anchors to ${op.after}, which the file does not hold`,
      ).toBe(true);
    }

    expect(inserts.map((op) => (op.kind === "insert" ? op.key : ""))).toEqual([
      "THIRD",
      "SECOND",
      "FIRST",
    ]);
  });

  it("refuses to save while a key is not usable, and says why", async () => {
    const user = userEvent.setup();
    setup();

    await user.click(screen.getByRole("button", { name: "Add variable" }));
    const name = screen.getByRole("textbox", { name: /Name for the new variable/ });
    await user.type(name, "not a key");

    expect(name).toHaveAttribute("aria-invalid", "true");
    expect(screen.getByRole("alert")).toHaveTextContent(/cannot contain spaces/i);
    expect(screen.getByRole("button", { name: "Save and seal" })).toBeDisabled();
  });
});

describe("EnvEditor: deleting", () => {
  it("marks a row rather than removing it, and offers a way back", async () => {
    const user = userEvent.setup();
    const { onSave } = setup();

    await menu(user, "API_KEY", "Delete");

    expect(screen.getByText("API_KEY")).toBeInTheDocument();
    expect(screen.getByText(/will be deleted when you save/i)).toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: "Keep API_KEY" }));
    expect(screen.getByRole("button", { name: "Save and seal" })).toBeDisabled();
    expect(onSave).not.toHaveBeenCalled();
  });

  it("sends a remove for a row the user deleted", async () => {
    const user = userEvent.setup();
    const { onSave } = setup();

    await menu(user, "API_KEY", "Delete");
    await user.click(screen.getByRole("button", { name: "Save and seal" }));
    await user.click(screen.getByRole("button", { name: "Delete and save" }));

    expect(onSave).toHaveBeenCalledWith([{ kind: "remove", row: 2 }]);
  });

  it("drops a row the user created without ever sending anything", async () => {
    const user = userEvent.setup();
    setup();

    await user.click(screen.getByRole("button", { name: "Add variable" }));
    await user.type(
      screen.getByRole("textbox", { name: /Name for the new variable/ }),
      "TEMPORARY",
    );
    await menu(user, "TEMPORARY", "Delete");

    expect(screen.queryByText(/will be deleted/i)).not.toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Save and seal" })).toBeDisabled();
  });
});

describe("EnvEditor: renaming and toggling", () => {
  it("renames in place, keeping the row rather than replacing it", async () => {
    const user = userEvent.setup();
    const { onSave } = setup();

    await menu(user, "API_KEY", "Rename");
    const field = screen.getByRole("textbox", { name: "Rename API_KEY" });
    await user.clear(field);
    await user.type(field, "STRIPE_KEY");
    await user.click(screen.getByRole("button", { name: "Save and seal" }));

    expect(onSave).toHaveBeenCalledWith([
      { kind: "setKey", row: 2, key: "STRIPE_KEY" },
    ]);
  });

  it("carries a disabled variable as a row with its own state", () => {
    setup({
      variables: [
        { id: 1, key: "LIVE", masked: MASK, empty: false, disabled: false },
        { id: 2, key: "PAUSED", masked: MASK, empty: false, disabled: true },
      ],
    });

    expect(screen.getByRole("switch", { name: /LIVE is enabled/ })).toHaveAttribute(
      "aria-checked",
      "true",
    );
    expect(screen.getByRole("switch", { name: /PAUSED is disabled/ })).toHaveAttribute(
      "aria-checked",
      "false",
    );
  });

  it("keeps a disabled variable's value masked and revealable", async () => {
    const user = userEvent.setup();
    const { onReveal } = setup({
      variables: [{ id: 2, key: "API_KEY", masked: MASK, empty: false, disabled: true }],
    });

    expect(screen.getByText(MASK)).toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: "Reveal value for API_KEY" }));

    expect(onReveal).toHaveBeenCalledWith(2, "API_KEY");
    expect(await screen.findByText("sk-live-42")).toBeInTheDocument();
  });

  it("sends a toggle as its own change", async () => {
    const user = userEvent.setup();
    const { onSave } = setup();

    await user.click(screen.getByRole("switch", { name: /API_KEY is enabled/ }));
    await user.click(screen.getByRole("button", { name: "Save and seal" }));

    expect(onSave).toHaveBeenCalledWith([
      { kind: "setDisabled", row: 2, disabled: true },
    ]);
  });

  it("toggling twice leaves nothing to save", async () => {
    const user = userEvent.setup();
    setup();

    await user.click(screen.getByRole("switch", { name: /API_KEY is enabled/ }));
    await user.click(screen.getByRole("switch", { name: /API_KEY is disabled/ }));

    expect(screen.getByRole("button", { name: "Save and seal" })).toBeDisabled();
  });
});

describe("EnvEditor: duplicating", () => {
  it("anchors a duplicate of a duplicate to a row the file actually holds", async () => {
    const user = userEvent.setup();
    const { onSave } = setup();

    await menu(user, "API_KEY", "Duplicate");
    await menu(user, "API_KEY_COPY", "Duplicate");
    await user.click(screen.getByRole("button", { name: "Save and seal" }));

    const ops = onSave.mock.calls[0]?.[0] as EditOp[];
    for (const op of ops) {
      if (op.kind !== "insert") continue;
      expect(
        op.after === null || file.variables.some((variable) => variable.id === op.after),
        `insert of ${op.key} anchors to ${op.after}, which the file does not hold`,
      ).toBe(true);
    }
  });

  it("creates a sibling with a free key rather than an invalid one", async () => {
    const user = userEvent.setup();
    setup();

    await menu(user, "API_KEY", "Duplicate");

    expect(
      screen.getByRole("textbox", { name: /Name for the new variable/ }),
    ).toHaveValue("API_KEY_COPY");
    expect(screen.getByRole("button", { name: "Save and seal" })).toBeEnabled();
  });
});

describe("EnvEditor: correcting a malformed line", () => {
  it("turns a corrected line into an ordinary variable row", async () => {
    const user = userEvent.setup();
    const { onSave } = setup({
      malformed: [{ id: 7, text: "API_KEY sk-live" }],
      unparseableLines: 1,
    });

    const raw = screen.getByRole("textbox", { name: "Malformed line" });
    await user.clear(raw);
    await user.type(raw, "FIXED=value");
    await user.click(screen.getByRole("button", { name: "Correct" }));

    expect(screen.getByText("FIXED")).toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: "Save and seal" }));
    expect(onSave).toHaveBeenCalledWith([
      { kind: "replaceMalformed", row: 7, text: "FIXED=value" },
    ]);
  });

  it("can delete a line Seal cannot parse", async () => {
    const user = userEvent.setup();
    const { onSave } = setup({
      malformed: [{ id: 7, text: "nonsense" }],
      unparseableLines: 1,
    });

    await user.click(screen.getByRole("button", { name: "Delete this line" }));
    await user.click(screen.getByRole("button", { name: "Save and seal" }));
    await user.click(screen.getByRole("button", { name: "Delete and save" }));

    expect(onSave).toHaveBeenCalledWith([{ kind: "remove", row: 7 }]);
  });
});

describe("EnvEditor: an empty file", () => {
  it("offers the one thing possible rather than a bare sentence", () => {
    setup({ variables: [] });

    expect(screen.getByRole("button", { name: "Add variable" })).toBeInTheDocument();
    expect(screen.queryByText(/defines no variables/i)).not.toBeInTheDocument();
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
    expect(onReveal).toHaveBeenCalledWith(2, "API_KEY");
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

describe("EnvEditor: a save that destroys", () => {
  it("confirms once for the batch, naming what goes", async () => {
    const user = userEvent.setup();
    const { onSave } = setup();

    await menu(user, "API_KEY", "Delete");
    await menu(user, "DATABASE_URL", "Delete");
    await user.click(screen.getByRole("button", { name: "Save and seal" }));

    expect(onSave).not.toHaveBeenCalled();
    const dialog = await screen.findByRole("dialog");
    expect(dialog).toHaveTextContent("Delete 2 variables?");
    expect(dialog).toHaveTextContent("API_KEY");
    expect(dialog).toHaveTextContent("DATABASE_URL");
    expect(dialog).toHaveTextContent(/cannot be recovered/i);

    await user.click(screen.getByRole("button", { name: "Delete and save" }));
    expect(onSave).toHaveBeenCalledOnce();
  });

  it("asks for no typed phrase, since removing a variable is routine", async () => {
    const user = userEvent.setup();
    setup();

    await menu(user, "API_KEY", "Delete");
    await user.click(screen.getByRole("button", { name: "Save and seal" }));

    await screen.findByRole("dialog");
    expect(screen.queryByRole("textbox", { name: /type/i })).not.toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Delete and save" })).toBeEnabled();
  });

  it("does not confirm a save that destroys nothing", async () => {
    const user = userEvent.setup();
    const { onSave } = setup();

    await user.click(screen.getByRole("button", { name: "Edit API_KEY" }));
    const field = await screen.findByRole("textbox", { name: "Value for API_KEY" });
    await user.clear(field);
    await user.type(field, "rotated");
    await user.click(screen.getByRole("button", { name: "Save and seal" }));

    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
    expect(onSave).toHaveBeenCalledOnce();
  });

  it("does not confirm when a created row is dropped before saving", async () => {
    const user = userEvent.setup();
    const { onSave } = setup();

    await user.click(screen.getByRole("button", { name: "Add variable" }));
    await user.type(
      screen.getByRole("textbox", { name: /Name for the new variable/ }),
      "TEMPORARY",
    );
    await menu(user, "TEMPORARY", "Delete");
    await user.click(screen.getByRole("switch", { name: /API_KEY is enabled/ }));
    await user.click(screen.getByRole("button", { name: "Save and seal" }));

    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
    expect(onSave).toHaveBeenCalledOnce();
  });

  it("declining leaves the whole draft intact, deletions included", async () => {
    const user = userEvent.setup();
    const { onSave } = setup();

    await menu(user, "API_KEY", "Delete");
    await user.click(screen.getByRole("button", { name: "Save and seal" }));
    await user.click(screen.getByRole("button", { name: "Keep editing" }));

    expect(onSave).not.toHaveBeenCalled();
    expect(screen.getByText(/will be deleted when you save/i)).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Save and seal" })).toBeEnabled();
  });
});

describe("EnvEditor: reordering", () => {
  it("moves a row and sends the whole permutation", async () => {
    const user = userEvent.setup();
    const { onSave } = setup();

    await menu(user, "API_KEY", "Move up");
    await user.click(screen.getByRole("button", { name: "Save and seal" }));

    expect(onSave).toHaveBeenCalledWith([{ kind: "reorder", rows: [2, 1] }]);
  });

  it("names the row on the menu that carries its moves", async () => {
    const user = userEvent.setup();
    setup();

    expect(
      screen.getByRole("button", { name: "More actions for DATABASE_URL" }),
    ).toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: "More actions for API_KEY" }));
    expect(screen.getByRole("button", { name: "Move up" })).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Move down" })).not.toBeInTheDocument();
  });

  it("omits a move that cannot happen rather than disabling it", () => {
    setup();

    expect(
      screen.queryByRole("button", { name: "Move DATABASE_URL up" }),
    ).not.toBeInTheDocument();
    expect(
      screen.queryByRole("button", { name: "Move API_KEY down" }),
    ).not.toBeInTheDocument();
  });

  it("moving a row back where it started leaves nothing to save", async () => {
    const user = userEvent.setup();
    setup();

    await menu(user, "API_KEY", "Move up");
    await menu(user, "API_KEY", "Move down");

    expect(screen.getByRole("button", { name: "Save and seal" })).toBeDisabled();
  });

  it("carries every managed row, so omission can never delete one", async () => {
    const user = userEvent.setup();
    const { onSave } = setup({
      variables: [
        { id: 1, key: "ONE", masked: MASK, empty: false, disabled: false },
        { id: 2, key: "TWO", masked: MASK, empty: false, disabled: false },
        { id: 3, key: "THREE", masked: MASK, empty: false, disabled: false },
      ],
      malformed: [{ id: 4, text: "nonsense" }],
      unparseableLines: 1,
    });

    await menu(user, "THREE", "Move up");
    await user.click(screen.getByRole("button", { name: "Save and seal" }));

    const ops = onSave.mock.calls[0]?.[0] as EditOp[];
    const reorder = ops.find((op) => op.kind === "reorder");
    expect(reorder).toBeDefined();
    if (reorder?.kind === "reorder") {
      expect([...reorder.rows].sort((a, b) => a - b)).toEqual([1, 2, 3, 4]);
      expect(reorder.rows).toEqual([1, 3, 2, 4]);
    }
  });

  it("orders the permutation before the removals it accompanies", async () => {
    const user = userEvent.setup();
    const { onSave } = setup({
      variables: [
        { id: 1, key: "ONE", masked: MASK, empty: false, disabled: false },
        { id: 2, key: "TWO", masked: MASK, empty: false, disabled: false },
        { id: 3, key: "THREE", masked: MASK, empty: false, disabled: false },
      ],
    });

    await menu(user, "THREE", "Move up");
    await menu(user, "ONE", "Delete");
    await user.click(screen.getByRole("button", { name: "Save and seal" }));
    await user.click(screen.getByRole("button", { name: "Delete and save" }));

    const ops = onSave.mock.calls[0]?.[0] as EditOp[];
    const reorderAt = ops.findIndex((op) => op.kind === "reorder");
    const removeAt = ops.findIndex((op) => op.kind === "remove");
    expect(reorderAt).toBeGreaterThanOrEqual(0);
    expect(removeAt).toBeGreaterThanOrEqual(0);
    expect(reorderAt).toBeLessThan(removeAt);
  });
});

describe("EnvEditor: the row's density", () => {
  it("keeps at most three controls in the row itself", () => {
    setup();

    const row = screen.getByText("API_KEY").closest("li") as HTMLElement;
    const inRow = [...row.querySelectorAll("button")].filter(
      (button) => !button.closest(".overflow__menu"),
    );

    expect(inRow.length).toBeLessThanOrEqual(4);
    const names = inRow.map((b) => b.getAttribute("aria-label") ?? b.textContent);
    expect(names.some((n) => n?.includes("Reveal"))).toBe(true);
    expect(names.some((n) => n?.startsWith("Edit"))).toBe(true);
    expect(names.some((n) => n?.includes("is enabled"))).toBe(true);
    expect(names.some((n) => n?.includes("More actions"))).toBe(true);
  });

  it("keeps the destructive verb out of the row, behind the menu", async () => {
    const user = userEvent.setup();
    setup();

    const row = screen.getByText("API_KEY").closest("li") as HTMLElement;
    const inRow = [...row.querySelectorAll("button")].filter(
      (button) => !button.closest(".overflow__menu"),
    );
    for (const button of inRow) {
      const name = button.getAttribute("aria-label") ?? button.textContent ?? "";
      expect(name).not.toMatch(/delete/i);
    }

    await user.click(screen.getByRole("button", { name: "More actions for API_KEY" }));
    const remove = screen.getByRole("button", { name: "Delete" });
    expect(remove).toHaveClass("overflow__danger");
    expect(remove.closest(".overflow__menu")).not.toBeNull();
  });

  it("is one tab stop per row, whatever the row can do", () => {
    setup();

    const row = screen.getByText("API_KEY").closest("li") as HTMLElement;
    const reachable = [...row.querySelectorAll("button, input")].filter(
      (element) => (element as HTMLElement).tabIndex === 0,
    );

    expect(reachable).toHaveLength(1);
  });

  it("moves between a row's controls with the arrow keys", async () => {
    const user = userEvent.setup();
    setup();

    const row = screen.getByText("API_KEY").closest("li") as HTMLElement;
    const toolbar = row.querySelector('[role="toolbar"]') as HTMLElement;
    const first = toolbar.querySelector("button") as HTMLElement;

    first.focus();
    expect(document.activeElement).toBe(first);

    await user.keyboard("{ArrowRight}");
    expect(document.activeElement).not.toBe(first);
    expect(toolbar.contains(document.activeElement)).toBe(true);

    await user.keyboard("{ArrowLeft}");
    expect(document.activeElement).toBe(first);
  });

  it("offers the absolute moves as named outcomes", async () => {
    const user = userEvent.setup();
    const { onSave } = setup({
      variables: [
        { id: 1, key: "ONE", masked: MASK, empty: false, disabled: false },
        { id: 2, key: "TWO", masked: MASK, empty: false, disabled: false },
        { id: 3, key: "THREE", masked: MASK, empty: false, disabled: false },
      ],
    });

    await menu(user, "THREE", "Move to top");
    await user.click(screen.getByRole("button", { name: "Save and seal" }));

    expect(onSave).toHaveBeenCalledWith([{ kind: "reorder", rows: [3, 1, 2] }]);
  });

  it("does not offer a move that cannot happen", async () => {
    const user = userEvent.setup();
    setup();

    await user.click(screen.getByRole("button", { name: "More actions for DATABASE_URL" }));
    expect(screen.queryByRole("button", { name: "Move up" })).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Move to top" })).not.toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Move down" })).toBeInTheDocument();
  });

  it("marks the row itself as being edited, not just its value", async () => {
    const user = userEvent.setup();
    setup();

    const row = screen.getByText("API_KEY").closest("li") as HTMLElement;
    expect(row.className).not.toContain("editing");

    await user.click(screen.getByRole("button", { name: "Edit API_KEY" }));
    await screen.findByRole("textbox", { name: "Value for API_KEY" });

    const editing = screen.getByLabelText("Value for API_KEY").closest("li") as HTMLElement;
    expect(editing.className).toContain("editing");
  });

  it("hides no control behind a hover gesture", () => {
    setup();

    const row = screen.getByText("API_KEY").closest("li") as HTMLElement;
    for (const button of row.querySelectorAll("button")) {
      const style = window.getComputedStyle(button);
      expect(style.display).not.toBe("none");
      expect(style.visibility).not.toBe("hidden");
    }
  });
});
