# MCP Code Editing Agent

A command-line application that enables AI-assisted file system operations using the Model Context Protocol (MCP).

## Overview

This project implements a chat interface where users can interact with AI models (including Google Gemini, Anthropic Claude, and OpenAI GPT), which have the ability to read, write, and manipulate files in the specified directory. The AI can help with various file operations based on natural language instructions.

## Features

- Interactive command-line chat interface
- AI-powered file system operations
- Support for reading, writing, and editing files
- Directory management capabilities
- File search functionality

## Prerequisites

- [Bun](https://bun.sh/) - A fast JavaScript runtime, bundler, transpiler, and package manager

## Installation

1. Clone the repository
2. Install dependencies:
   ```
   bun install
   ```
3. Set up environment variables (create a `.env` file with required API keys)

   Example `.env` file:

   ```
   ANTHROPIC_API_KEY=your_anthropic_api_key_here
   GOOGLE_API_KEY=your_google_api_key_here
   OPENAI_API_KEY=your_openai_api_key_here
   ```

## Usage

Start the application:

```
bun start
```

You can also specify the AI provider, model, and target path:

```
bun start --provider <google|anthropic|openai> --model <model_name> --path /path/to/your/project
```

Default provider is Google, default model varies by provider. If no path is specified, it uses the current directory.

Then interact with the AI by typing commands. For example:

- "Check the content of a file"
- "Create a new file"
- "Edit an existing file"
- "Search for files matching a pattern"

Type "exit" or "quit" to end the session.

## How It Works

The application uses the Model Context Protocol (MCP) to give the AI model access to file system operations. The main components are:

- MCP clients for filesystem and terminal operations (using `@modelcontextprotocol/server-filesystem` and `@setkyar/terminal-mcp`)
- Configurable AI models (Google Gemini, Anthropic Claude, OpenAI GPT)
- Terminal interface for user interaction built with Ink

## Development

This project uses Bun as the JavaScript runtime and package manager. Key files:

- `index.tsx` - Main application entry point, handles argument parsing and initializes the UI.
- `app.tsx` - Core application logic, including UI rendering (Ink), MCP client management, and AI interaction.
- `package.json` - Project configuration and dependencies

To make changes to the code, edit the TypeScript files and run with `bun start`.
