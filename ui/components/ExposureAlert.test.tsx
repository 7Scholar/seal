import { describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { ExposureAlert } from "./ExposureAlert";

const one = [
  { path: "/repo/.env.production", relativePath: ".env.production", repoName: "app" },
];
const two = [
  ...one,
  { path: "/repo/.env.staging", relativePath: ".env.staging", repoName: "app" },
];

describe("ExposureAlert", () => {
  it("renders nothing at all when no file is exposed", () => {
    const { container } = render(<ExposureAlert exposures={[]} onSeal={vi.fn()} />);
    expect(container).toBeEmptyDOMElement();
  });

  it("has no dismiss control, because it is resolved rather than dismissed", () => {
    render(<ExposureAlert exposures={one} onSeal={vi.fn()} />);
    expect(
      screen.queryByRole("button", { name: /dismiss|close|ignore|snooze|later/i }),
    ).not.toBeInTheDocument();
  });

  it("carries the fix inline for each exposed file", async () => {
    const user = userEvent.setup();
    const onSeal = vi.fn();
    render(<ExposureAlert exposures={one} onSeal={onSeal} />);

    await user.click(screen.getByRole("button", { name: "Seal now" }));
    expect(onSeal).toHaveBeenCalledWith("/repo/.env.production");
  });

  it("announces itself as an alert", () => {
    render(<ExposureAlert exposures={one} onSeal={vi.fn()} />);
    expect(screen.getByRole("alert")).toBeInTheDocument();
  });

  it("names every exposed file rather than only counting them", () => {
    render(<ExposureAlert exposures={two} onSeal={vi.fn()} />);
    expect(screen.getByText(/app \/ \.env\.production/)).toBeInTheDocument();
    expect(screen.getByText(/app \/ \.env\.staging/)).toBeInTheDocument();
    expect(screen.getAllByRole("button", { name: "Seal now" })).toHaveLength(2);
  });

  it("tells the user to rotate, since sealing cannot undo an exposure", () => {
    render(<ExposureAlert exposures={one} onSeal={vi.fn()} />);
    expect(screen.getByText(/rotate/i)).toBeInTheDocument();
  });
});
