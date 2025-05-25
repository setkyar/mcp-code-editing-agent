import { experimental_createMCPClient as createMCPClient } from "ai";
import { Experimental_StdioMCPTransport as StdioMCPTransport } from "ai/mcp-stdio";
import { anthropic } from "@ai-sdk/anthropic";
import type { CoreMessage } from "ai";
import { generateText } from "ai";
import dotenv from "dotenv";
import * as readline from "node:readline/promises";
import { parseArgs } from "node:util";

dotenv.config();

const terminal = readline.createInterface({
  input: process.stdin,
  output: process.stdout,
});

const messages: CoreMessage[] = [];

async function main() {
  // Parse command line arguments
  const { values } = parseArgs({
    options: {
      path: { type: "string" },
    },
    allowPositionals: true,
  });

  // Use provided path or default to current directory
  const targetPath = values.path || process.cwd();
  console.log(`Using directory: ${targetPath}`);

  const mcpClient = await createMCPClient({
    transport: new StdioMCPTransport({
      command: "bunx",
      args: ["@modelcontextprotocol/server-filesystem", targetPath],
    }),
  });

  try {
    const tools = await mcpClient.tools();

    while (true) {
      const userInput = await terminal.question("You: ");
      if (
        userInput.toLowerCase() === "exit" ||
        userInput.toLowerCase() === "quit"
      ) {
        console.log("Exiting the chat...");
        await mcpClient.close();
        terminal.close();
        process.exit(0);
      }

      messages.push({ role: "user", content: userInput });

      let continueLoop = true;
      while (continueLoop) {
        const result = await generateText({
          model: anthropic("claude-3-7-sonnet-20250219"),
          messages,
          tools,
        });

        console.log(`\nAssistant: ${result.text}\n`);

        for (const toolCall of result.toolCalls) {
          console.log(
            `Tool call: ${toolCall.toolName} with args: ${JSON.stringify(
              toolCall.args
            )}`
          );
        }

        messages.push(...result.response.messages);
        continueLoop = result.toolCalls.length > 0;
      }
    }
  } finally {
    await mcpClient.close();
    terminal.close();
  }
}

main().catch((error) => {
  console.error("Error:", error);
  process.exit(1);
});
