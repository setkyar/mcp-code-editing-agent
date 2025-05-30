#!/usr/bin/env bun
import { render } from "ink";
import { parseArgs } from "node:util";
import dotenv from "dotenv";
import { App } from "./app.js";

dotenv.config();

// Parse command line arguments
const { values } = parseArgs({
  options: {
    path: { type: "string" },
    provider: { type: "string", default: "google" },
    model: { type: "string" },
  },
  allowPositionals: true,
});

// Use provided path or default to current directory
const targetPath = values.path || process.cwd();

// Check if we're in a TTY environment
if (!process.stdin.isTTY) {
  console.error("❌ This application requires an interactive terminal (TTY)");
  process.exit(1);
}

// Clear console before starting
console.clear();

// Start the Ink app
render(
  <App
    targetPath={targetPath}
    provider={values.provider || "google"}
    model={values.model || ""}
  />
);
