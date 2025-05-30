import React, { useState, useEffect } from "react";
import { Text, Box, useInput, useApp } from "ink";
import TextInput from "ink-text-input";
import Spinner from "ink-spinner";
import { experimental_createMCPClient as createMCPClient } from "ai";
import { Experimental_StdioMCPTransport as StdioMCPTransport } from "ai/mcp-stdio";
import { anthropic } from "@ai-sdk/anthropic";
import { google } from "@ai-sdk/google";
import { openai } from "@ai-sdk/openai";
import type { CoreMessage } from "ai";
import { generateText } from "ai";

interface Message {
  role: "user" | "assistant" | "system";
  content: string;
  timestamp: Date;
}

interface AppProps {
  targetPath: string;
  provider: string;
  model: string;
}

export const App: React.FC<AppProps> = ({ targetPath, provider, model }) => {
  const { exit } = useApp();
  const [messages, setMessages] = useState<Message[]>([]);
  const [coreMessages, setCoreMessages] = useState<CoreMessage[]>([]);
  const [input, setInput] = useState("");
  const [isProcessing, setIsProcessing] = useState(false);
  const [isPasted, setIsPasted] = useState(false);
  const [pastedPreview, setPastedPreview] = useState("");
  const [mcpClients, setMcpClients] = useState<any>(null);
  const [aiModel, setAiModel] = useState<any>(null);
  const [tools, setTools] = useState<any>(null);
  const [isInitializing, setIsInitializing] = useState(true);

  // Initialize MCP clients and AI model
  useEffect(() => {
    const initialize = async () => {
      try {
        // Initialize AI model
        let modelInstance;
        switch (provider) {
          case "google":
            modelInstance = google(model || "gemini-2.5-pro-preview-05-06");
            break;
          case "anthropic":
            modelInstance = anthropic(model || "claude-3-5-sonnet-20241022");
            break;
          case "openai":
            modelInstance = openai(model || "gpt-4o-mini");
            break;
          default:
            modelInstance = google("gemini-2.0-flash-exp");
        }
        setAiModel(modelInstance);

        // Initialize MCP clients
        const filesystemMCP = await createMCPClient({
          transport: new StdioMCPTransport({
            command: "npx",
            args: ["@modelcontextprotocol/server-filesystem", targetPath],
          }),
        });

        const terminalMCP = await createMCPClient({
          transport: new StdioMCPTransport({
            command: "npx",
            args: ["@setkyar/terminal-mcp", targetPath],
          }),
        });

        setMcpClients({ filesystemMCP, terminalMCP });

        // Get tools
        const filesystemTools = await filesystemMCP.tools();
        const terminalTools = await terminalMCP.tools();
        const combinedTools = {
          ...filesystemTools,
          ...terminalTools,
        };
        setTools(combinedTools);

        setCoreMessages([]);
        setMessages([
          {
            role: "system",
            content: "🚀 Code Editing Agent initialized",
            timestamp: new Date(),
          },
        ]);
      } catch (error) {
        setMessages([
          {
            role: "system",
            content: `❌ Error initializing: ${error.message}`,
            timestamp: new Date(),
          },
        ]);
      } finally {
        setIsInitializing(false);
      }
    };

    initialize();

    return () => {
      // Cleanup MCP clients on unmount
      if (mcpClients) {
        mcpClients.filesystemMCP.close();
        mcpClients.terminalMCP.close();
      }
    };
  }, [targetPath, provider, model]);

  // Handle input changes with paste detection
  const handleInputChange = (value: string) => {
    // Detect paste by checking for newlines or large input
    const lines = value.split("\n");
    const wasPasted = lines.length > 1 || value.length - input.length > 10;

    if (wasPasted && value.length > 50) {
      setIsPasted(true);
      setPastedPreview(value.substring(0, 30) + "...");
      // Show truncated version in input
      setInput(value);
    } else {
      setIsPasted(false);
      setPastedPreview("");
      setInput(value);
    }
  };

  // Handle form submission
  const handleSubmit = async (value: string) => {
    if (!value.trim() || !aiModel || !tools) return;

    // Handle exit commands
    if (value.toLowerCase() === "exit" || value.toLowerCase() === "quit") {
      if (mcpClients) {
        await mcpClients.filesystemMCP.close();
        await mcpClients.terminalMCP.close();
      }
      exit();
      return;
    }

    // Add user message
    const userMessage: Message = {
      role: "user",
      content: value,
      timestamp: new Date(),
    };
    setMessages((prev) => [...prev, userMessage]);

    // Clear input and paste state
    setInput("");
    setIsPasted(false);
    setPastedPreview("");
    setIsProcessing(true);

    try {
      // Get fresh date/time for each request
      const currentDate = new Date();
      const dateStr = currentDate.toLocaleDateString();
      const timeStr = currentDate.toLocaleTimeString();

      // Determine model info
      const modelInfo = {
        google: `Gemini (${model || "gemini-2.0-flash-exp"})`,
        anthropic: `Claude (${model || "claude-3-5-sonnet-20241022"})`,
        openai: `OpenAI (${model || "gpt-4o-mini"})`,
      };
      const modelName = modelInfo[provider] || modelInfo.google;

      // Create fresh system message with updated context
      const freshSystemMessage: CoreMessage = {
        role: "system",
        content: `You are an advanced code editing assistant and CLI tool designed to help users with software engineering tasks. You have access to powerful filesystem and terminal tools that are your primary means of interaction with code and systems.

# Core Identity and Purpose
- You are a professional coding assistant powered by ${modelName}
- Your workspace is: ${targetPath}
- Current date: ${dateStr} | Current time: ${timeStr}
- You operate EXCLUSIVELY through tool usage - always use your available tools rather than making assumptions

# MANDATORY TOOL-FIRST APPROACH - YOU MUST FOLLOW THIS:

1. **ALWAYS START WITH TOOLS** - For ANY user request:
   - IMMEDIATELY use list_directory to explore project structure
   - Use read_file to examine configuration files (package.json, README.md, etc.)
   - Use execute_command to run diagnostics (git status, npm run scripts, etc.)
   - NEVER provide responses based on assumptions - always investigate first

2. **COMPREHENSIVE PROJECT ANALYSIS** - Before responding to any request:
   - Execute: list_directory to understand the project layout
   - Read: package.json for dependencies and scripts
   - Read: README.md for project context
   - Execute: git status to understand current state
   - Search for relevant files based on user's question

3. **AGGRESSIVE TOOL USAGE** - When users mention ANY issue:
   - IMMEDIATELY search for the mentioned text/error using tools
   - Use execute_command to reproduce issues or test solutions
   - Read all potentially relevant files
   - Use write_file or edit tools to implement fixes
   - Test changes using appropriate commands

# TOOL USAGE PATTERNS

## For Bug Reports/Issues:
1. Search for error messages or symptoms in codebase
2. Read relevant files to understand context
3. Execute commands to reproduce issues
4. Implement fixes using edit/write tools
5. Test fixes with appropriate commands

## For Feature Requests:
1. Analyze existing codebase structure
2. Find similar implementations for patterns
3. Read documentation and dependencies
4. Implement features using edit/write tools
5. Test implementation with execute_command

## For Questions About Code:
1. Search for mentioned components/functions
2. Read all relevant files
3. Trace dependencies and relationships
4. Provide comprehensive analysis based on actual code

# CLI COMMAND INTEGRATION
- Use execute_command for ALL system operations:
  - Package management: npm install, yarn add, etc.
  - Testing: npm test, yarn test, pytest, etc.
  - Building: npm run build, make, cargo build, etc.
  - Git operations: git status, git log, git diff, etc.
  - File operations: find, grep, ls -la, etc.
  - Process management: ps aux, kill, etc.

# CRITICAL BEHAVIORAL RULES:

1. **TOOL-DRIVEN INVESTIGATION**:
   - NEVER ask "which file" or "where is this" - find it yourself
   - Use tools to search before asking for clarification
   - Chain tool operations to build complete understanding

2. **ASSUME NOTHING, VERIFY EVERYTHING**:
   - Don't assume file locations - search for them
   - Don't assume project structure - explore it
   - Don't assume dependencies - read package.json
   - Don't assume current state - use git status

3. **PROACTIVE PROBLEM SOLVING**:
   - When user mentions any issue, immediately start investigating with tools
   - Use multiple tools in sequence to build comprehensive understanding
   - Implement and test solutions using appropriate tools

# EXAMPLE WORKFLOWS:

## User reports: "The build is failing"
YOUR RESPONSE:
1. execute_command: "npm run build" (or equivalent)
2. read_file: package.json to understand build scripts
3. list_directory: check for build-related files
4. execute_command: check for error logs
5. Implement fixes and re-test

## User asks: "How does authentication work?"
YOUR RESPONSE:
1. list_directory: explore project structure
2. Search for auth-related files
3. read_file: examine authentication implementation
4. execute_command: grep for auth patterns
5. Provide comprehensive analysis based on actual code

## User requests: "Add a new feature X"
YOUR RESPONSE:
1. list_directory: understand current structure
2. read_file: examine similar existing features
3. read_file: check dependencies and patterns
4. write_file/edit: implement the feature
5. execute_command: test the implementation

Remember: You are a CLI-native assistant. Your strength lies in your ability to interact directly with the filesystem and execute commands. ALWAYS use your tools first, investigate thoroughly, and provide solutions based on actual code analysis rather than assumptions.

NEVER say you cannot find something without using your tools to search for it first. Your tools are your primary interface - use them liberally and systematically.`,
      };

      // Process with AI
      let continueLoop = true;
      let updatedCoreMessages = [
        freshSystemMessage,
        ...coreMessages.filter((msg) => msg.role !== "system"), // Remove any existing system messages
        { role: "user", content: value },
      ] as CoreMessage[];

      while (continueLoop) {
        const result = await generateText({
          model: aiModel,
          messages: updatedCoreMessages,
          tools,
        });

        // Add assistant response if there's text
        if (result.text) {
          const assistantMessage: Message = {
            role: "assistant",
            content: result.text,
            timestamp: new Date(),
          };
          setMessages((prev) => [...prev, assistantMessage]);
        }

        // Show tool executions
        for (const toolCall of result.toolCalls) {
          const toolMessage: Message = {
            role: "system",
            content: `🔧 Executing: ${toolCall.toolName}`,
            timestamp: new Date(),
          };
          setMessages((prev) => [...prev, toolMessage]);
        }

        // Update core messages for next iteration
        updatedCoreMessages.push(...result.response.messages);
        // Update coreMessages state but keep only non-system messages (fresh system message will be created next time)
        setCoreMessages(
          updatedCoreMessages.filter((msg) => msg.role !== "system")
        );

        continueLoop = result.toolCalls.length > 0;
      }
    } catch (error) {
      const errorMessage: Message = {
        role: "system",
        content: `❌ Error: ${error.message}`,
        timestamp: new Date(),
      };
      setMessages((prev) => [...prev, errorMessage]);
    } finally {
      setIsProcessing(false);
    }
  };

  // Handle keyboard shortcuts - only if stdin supports raw mode
  useInput(
    (input, key) => {
      if (key.ctrl && input === "c") {
        if (mcpClients) {
          mcpClients.filesystemMCP.close();
          mcpClients.terminalMCP.close();
        }
        exit();
      }
    },
    {
      isActive: process.stdin.isTTY && process.stdin.setRawMode !== undefined,
    }
  );

  // Show loading state while initializing
  if (isInitializing) {
    return (
      <Box flexDirection="column" padding={1} key="initializing">
        <Box>
          <Text color="blue">
            <Spinner type="dots" />
          </Text>
          <Text> Initializing Code Editing Agent...</Text>
        </Box>
      </Box>
    );
  }

  return (
    <Box flexDirection="column" padding={1}>
      <Box marginBottom={1}>
        <Text bold color="green">
          🚀 Code Editing Agent
        </Text>
        <Text> | </Text>
        <Text color="blue">📁 {targetPath}</Text>
        <Text> | </Text>
        <Text color="yellow">
          🤖 {provider}/{model || "default"}
        </Text>
      </Box>

      <Box flexDirection="column" marginBottom={1}>
        {messages.slice(-10).map((msg, i) => (
          <Box key={`msg-${i}-${msg.timestamp.getTime()}`} marginBottom={0}>
            {msg.role === "user" && (
              <Text color="cyan">👤 You: {msg.content}</Text>
            )}
            {msg.role === "assistant" && (
              <Text color="green">🤖 Assistant: {msg.content}</Text>
            )}
            {msg.role === "system" && <Text color="yellow">{msg.content}</Text>}
          </Box>
        ))}
      </Box>

      {isPasted && (
        <Box marginBottom={1}>
          <Text color="magenta">
            📋 Pasted content ({input.length} chars): "{pastedPreview}"
          </Text>
        </Box>
      )}

      <Box>
        {isProcessing ? (
          <Box>
            <Text color="blue">
              <Spinner type="dots" />
            </Text>
            <Text> Processing...</Text>
          </Box>
        ) : (
          <Box>
            <Text color="cyan">👤 You: </Text>
            <TextInput
              value={input}
              onChange={handleInputChange}
              onSubmit={handleSubmit}
              placeholder="Type your request or 'exit' to quit..."
            />
          </Box>
        )}
      </Box>

      <Box marginTop={1}>
        <Text dimColor>Press Ctrl+C to exit</Text>
      </Box>
    </Box>
  );
};
