/** @vitest-environment jsdom */

import { act, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { BeaconRouteContentTransition } from "./beacon-route-content-transition";

function innerSurface(container: HTMLElement): HTMLElement {
  const outer = container.querySelector('[data-slot="beacon_route_content_transition"]');
  const inner = outer?.firstElementChild;
  if (!(inner instanceof HTMLElement)) {
    throw new Error("transition inner surface not found");
  }
  return inner;
}

describe("BeaconRouteContentTransition", () => {
  beforeEach(() => {
    vi.useFakeTimers();
    // Stub rAF so the enter fallback timer is the only path that flips visibility — deterministic under fake timers.
    vi.stubGlobal("requestAnimationFrame", () => 0);
    vi.stubGlobal("cancelAnimationFrame", () => {});
  });

  afterEach(() => {
    vi.useRealTimers();
    vi.unstubAllGlobals();
  });

  function flushEnter() {
    // enter fallback = DELAY(16) + TRANSITION(120) + 48 = 184ms
    act(() => {
      vi.advanceTimersByTime(200);
    });
  }

  it("fades the entering panel in once ready", () => {
    const { container } = render(
      <BeaconRouteContentTransition contentKey="a" contentReady>
        <div>Panel A</div>
      </BeaconRouteContentTransition>
    );
    // Starts hidden, becomes visible after the enter settles.
    expect(innerSurface(container).className).toContain("opacity-0");
    flushEnter();
    expect(innerSurface(container).className).toContain("opacity-100");
    expect(screen.getByText("Panel A")).toBeInTheDocument();
  });

  it("keeps the outgoing panel mounted until the exit fade ends (no instant swap)", () => {
    const { container, rerender } = render(
      <BeaconRouteContentTransition contentKey="a" contentReady>
        <div>Panel A</div>
      </BeaconRouteContentTransition>
    );
    flushEnter();
    expect(innerSurface(container).className).toContain("opacity-100");

    // Navigate to a new key. This must NOT swap instantly — the re-entrant setVisible(false) render
    // previously hit the `!visible` instant-commit branch and aborted the exit fade.
    rerender(
      <BeaconRouteContentTransition contentKey="b" contentReady={false}>
        <div>Panel B</div>
      </BeaconRouteContentTransition>
    );
    expect(screen.getByText("Panel A")).toBeInTheDocument();
    expect(screen.queryByText("Panel B")).toBeNull();
    expect(innerSurface(container).className).toContain("opacity-0");

    // Exit fade completes -> commit.
    act(() => {
      fireEvent.transitionEnd(innerSurface(container), { propertyName: "opacity" });
    });
    expect(screen.queryByText("Panel A")).toBeNull();
    expect(screen.getByText("Panel B")).toBeInTheDocument();
  });

  it("commits the latest pending key when the target changes mid fade-out", () => {
    const { container, rerender } = render(
      <BeaconRouteContentTransition contentKey="a" contentReady>
        <div>Panel A</div>
      </BeaconRouteContentTransition>
    );
    flushEnter();

    rerender(
      <BeaconRouteContentTransition contentKey="b" contentReady={false}>
        <div>Panel B</div>
      </BeaconRouteContentTransition>
    );
    // A second navigation lands before the fade-out finishes.
    rerender(
      <BeaconRouteContentTransition contentKey="c" contentReady={false}>
        <div>Panel C</div>
      </BeaconRouteContentTransition>
    );
    // Still showing the original until the fade ends — neither intermediate B nor C flashed in.
    expect(screen.getByText("Panel A")).toBeInTheDocument();
    expect(screen.queryByText("Panel B")).toBeNull();
    expect(screen.queryByText("Panel C")).toBeNull();

    act(() => {
      fireEvent.transitionEnd(innerSurface(container), { propertyName: "opacity" });
    });
    // Commits the LATEST target, skipping the stale intermediate entirely.
    expect(screen.getByText("Panel C")).toBeInTheDocument();
    expect(screen.queryByText("Panel B")).toBeNull();
  });

  it("commits via the fallback timer when no transitionend fires (reduced motion)", () => {
    const { rerender } = render(
      <BeaconRouteContentTransition contentKey="a" contentReady>
        <div>Panel A</div>
      </BeaconRouteContentTransition>
    );
    flushEnter();

    rerender(
      <BeaconRouteContentTransition contentKey="b" contentReady>
        <div>Panel B</div>
      </BeaconRouteContentTransition>
    );
    expect(screen.getByText("Panel A")).toBeInTheDocument();

    // No transitionend (e.g. prefers-reduced-motion). The exit fallback must still commit, never strand the panel.
    act(() => {
      vi.advanceTimersByTime(300);
    });
    expect(screen.queryByText("Panel A")).toBeNull();
    expect(screen.getByText("Panel B")).toBeInTheDocument();
  });
});
