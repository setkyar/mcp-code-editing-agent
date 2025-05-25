# MCP Code Editing Agent

A command-line application that enables AI-assisted file system operations using the Model Context Protocol (MCP).

## Overview

This project implements a chat interface where users can interact with Claude 3.7 Sonnet AI model, which has the ability to read, write, and manipulate files in the specified directory. The AI can help with various file operations based on natural language instructions.

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
   ```

## Usage

Start the application:

```
bun start
```

Then interact with the AI by typing commands. For example:

- "Check the content of a file"
- "Create a new file"
- "Edit an existing file"
- "Search for files matching a pattern"

Type "exit" or "quit" to end the session.

## How It Works

The application uses the Model Context Protocol (MCP) to give the AI model access to file system operations. The main components are:

- MCP client with filesystem transport
- Claude 3.7 Sonnet AI model
- Terminal interface for user interaction

## Development

This project uses Bun as the JavaScript runtime and package manager. Key files:

- `index.ts` - Main application entry point
- `package.json` - Project configuration and dependencies

To make changes to the code, edit the TypeScript files and run with `bun start`.
