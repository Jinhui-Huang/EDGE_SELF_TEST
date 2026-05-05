import { ComponentProps } from "react";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import { ModelConfigScreen } from "./ModelConfigScreen";
import { ModelProvider, ModelRoutingRule, MutationState } from "../types";

const providers: ModelProvider[] = [
  {
    id: "openai-responses",
    name: "OpenAI Responses API",
    displayName: "OpenAI Responses API",
    model: "gpt-4.1-mini",
    endpoint: "https://api.openai.com/v1",
    apiKey: "",
    modality: "browser automation",
    contextWindow: "128k",
    maxOutputTokens: "4096",
    temperature: "0.2",
    timeoutMs: "45000",
    status: "active",
    role: "primary",
    region: "global",
    notes: "Primary provider.",
    usage: "24%",
    latency: "640ms",
    cost: "$0.009/call",
    accent: "accent"
  }
];

const routingRules: ModelRoutingRule[] = [
  {
    id: "route-case-generation",
    task: "case generation",
    primary: "gpt-4.1-mini",
    fallback: ["claude-4.5-sonnet"],
    reason: "Fast default for structured generation."
  }
];

const idleState: MutationState = { kind: "idle", message: "" };

function renderScreen(overrides?: Partial<ComponentProps<typeof ModelConfigScreen>>) {
  return render(
    <ModelConfigScreen
      navigationLabel="Models"
      title="Model Config"
      hint="Save to persist."
      locale="en"
      providers={providers}
      routingRules={routingRules}
      state={idleState}
      testState={idleState}
      submitLabel="Save model config"
      onProvidersChange={vi.fn()}
      onRoutingRulesChange={vi.fn()}
      onTestConnection={vi.fn()}
      onSave={vi.fn()}
      {...overrides}
    />
  );
}

describe("ModelConfigScreen", () => {
  it("opens the routing rule editor from the edit icon", async () => {
    renderScreen();

    await userEvent.click(screen.getByRole("button", { name: /Edit routing rule for case generation/i }));

    expect(await screen.findByRole("dialog", { name: "Routing rule editor" })).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: "Edit routing rule" })).toBeInTheDocument();
    expect(screen.getByDisplayValue("case generation")).toBeInTheDocument();
  });

  it("writes edited routing rule fields back to the local draft", async () => {
    const onRoutingRulesChange = vi.fn();
    renderScreen({ onRoutingRulesChange });

    await userEvent.click(screen.getByRole("button", { name: /Edit routing rule for case generation/i }));

    const taskInput = screen.getByDisplayValue("case generation");
    const primaryInput = screen.getByDisplayValue("gpt-4.1-mini");
    const fallbackInput = screen.getByDisplayValue("claude-4.5-sonnet");
    const reasonInput = screen.getByDisplayValue("Fast default for structured generation.");

    await userEvent.clear(taskInput);
    await userEvent.type(taskInput, "repair locator");
    await userEvent.clear(primaryInput);
    await userEvent.type(primaryInput, "gpt-4.1");
    await userEvent.clear(fallbackInput);
    await userEvent.type(fallbackInput, "claude-4.5-sonnet, gpt-4.1-mini");
    await userEvent.clear(reasonInput);
    await userEvent.type(reasonInput, "Prefer higher quality for locator repair.");

    await userEvent.click(screen.getByRole("button", { name: "Apply" }));

    expect(onRoutingRulesChange).toHaveBeenCalledWith([
      {
        id: "route-case-generation",
        task: "repair locator",
        primary: "gpt-4.1",
        fallback: ["claude-4.5-sonnet", "gpt-4.1-mini"],
        reason: "Prefer higher quality for locator repair."
      }
    ]);
    expect(screen.queryByRole("dialog", { name: "Routing rule editor" })).not.toBeInTheDocument();
  });

  it("closes without mutating the draft when cancel is clicked", async () => {
    const onRoutingRulesChange = vi.fn();
    renderScreen({ onRoutingRulesChange });

    await userEvent.click(screen.getByRole("button", { name: /Edit routing rule for case generation/i }));
    await userEvent.clear(screen.getByDisplayValue("case generation"));
    await userEvent.type(screen.getByRole("textbox", { name: "Task" }), "do not save");
    await userEvent.click(screen.getByRole("button", { name: "Cancel" }));

    expect(onRoutingRulesChange).not.toHaveBeenCalled();
    expect(screen.queryByRole("dialog", { name: "Routing rule editor" })).not.toBeInTheDocument();
  });
});
