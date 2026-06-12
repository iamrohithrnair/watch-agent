import { createOpenAICompatible } from "@ai-sdk/openai-compatible";
import { generateText, type ModelMessage } from "ai";
import type { AgentAdapter } from "./interfaces.js";
import type { WatchAgentConfig } from "../config.js";

export class VercelAiGatewayAdapter implements AgentAdapter {
  constructor(private readonly config: WatchAgentConfig) {}

  async respond(input: Parameters<AgentAdapter["respond"]>[0]): Promise<string> {
    const endpoint = this.config.OPENAI_COMPATIBLE_BASE_URL || "https://ai-gateway.vercel.sh/v1";
    const apiKey = this.config.OPENAI_COMPATIBLE_API_KEY || this.config.AI_GATEWAY_API_KEY;
    const model = input.profile.model || this.config.OPENAI_COMPATIBLE_MODEL || this.config.LLM_MODEL;
    const system = buildSystemPrompt(input.profile.persona, input.context);
    const gateway = createOpenAICompatible({
      name: "vercel-ai-gateway",
      apiKey,
      baseURL: endpoint.replace(/\/$/, "")
    });

    const messages: ModelMessage[] = [];
    for (const message of input.messages) {
      if (message.role === "user") {
        messages.push({ role: "user", content: message.content });
      } else if (message.role === "assistant") {
        messages.push({ role: "assistant", content: message.content });
      }
    }

    const result = await generateText({
      model: gateway.chatModel(model),
      temperature: input.profile.temperature,
      system,
      messages
    });
    const content = result.text.trim();
    if (!content) {
      throw new Error("AI Gateway response did not include assistant content");
    }
    return content;
  }
}

function buildSystemPrompt(persona: string, context: Parameters<AgentAdapter["respond"]>[0]["context"]): string {
  const sections = [
    persona,
    "You are speaking through a small watch speaker. Keep responses concise unless the user asks for detail."
  ];
  if (context.memories.length > 0) {
    sections.push(`Relevant memory:\n${context.memories.map((item) => `- ${item}`).join("\n")}`);
  }
  if (context.knowledge.length > 0) {
    sections.push(`Relevant knowledge:\n${context.knowledge.map((item) => `- ${item}`).join("\n")}`);
  }
  if (context.skills.length > 0) {
    sections.push(`Enabled skills:\n${context.skills.map((skill) => `## ${skill.name}\n${skill.instructions}`).join("\n\n")}`);
  }
  if (context.mcpServers.length > 0) {
    sections.push(`Available MCP servers:\n${context.mcpServers.map((server) => `- ${server.name}: ${server.url}`).join("\n")}`);
  }
  return sections.join("\n\n");
}
