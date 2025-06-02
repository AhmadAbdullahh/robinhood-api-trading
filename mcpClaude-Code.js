import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { z } from "zod";
import { exec } from "child_process";
import { promisify } from "util";
import path from "path";
import fs from "fs";
import os from "os"; // For accessing temp directory
require('dotenv').config();

const execAsync = promisify(exec);

// Get current working directory
const currentDir = process.cwd();
console.log(`Current working directory: ${currentDir}`);

// Create an MCP server
const server = new McpServer({
  name: "RobinhoodTrading",
  version: "1.0.0"
});

// Add a tool to execute the Python trading script
// server.tool("getAccount",
//   {}, // No parameters needed for this example
//   async () => {
//     try {
//       // Execute the Python script with the virtual environment
//       const { stdout, stderr } = await execAsync('source venv/bin/activate && python robinhood_api_trading.py');
      
//       if (stderr) {
//         return {
//           content: [{ type: "text", text: `Error: ${stderr}` }]
//         };
//       }
      
//       return {
//         content: [{ type: "text", text: stdout }]
//       };
//     } catch (error) {
//       return {
//         content: [{ type: "text", text: `Execution error: ${error.message}` }]
//       };
//     }
//   }
// );

// Add more specific trading functions as needed
// server.tool("getHoldings",
//   {}, 
//   async () => {
//     try {
//       // Modify the Python script to output only holdings
//       const { stdout, stderr } = await execAsync(
//         'source venv/bin/activate && python -c "import robinhood_api_trading; client = robinhood_api_trading.CryptoAPITrading(); print(client.get_holdings())"'
//       );
      
//       if (stderr) {
//         return {
//           content: [{ type: "text", text: `Error: ${stderr}` }]
//         };
//       }
      
//       return {
//         content: [{ type: "text", text: stdout }]
//       };
//     } catch (error) {
//       return {
//         content: [{ type: "text", text: `Execution error: ${error.message}` }]
//       };
//     }
//   }
// );
server.tool("Buy-a-stock",
  { stock: z.string(), qty: z.number() }, 
  async({stock, qty}) => {
    try {
      // Log the buy request
      console.log(`Attempting to buy ${qty} of ${stock}...`);
      
      // Find the robinhood_api_trading.py file
      const possiblePaths = [
        path.join(currentDir, "robinhood_api_trading.py"),
        "/Users/ahmedabdullah/robinhood-api-trading/robinhood_api_trading.py"
      ];
      
      // Check each possible path and use the first one that exists
      let robinhoodFilePath = null;
      for (const p of possiblePaths) {
        if (fs.existsSync(p)) {
          robinhoodFilePath = p;
          break;
        }
      }
      
      // Return error if file not found
      if (!robinhoodFilePath) {
        return {
          content: [{ 
            type: "text", 
            text: `Error: Could not find robinhood_api_trading.py file.` 
          }]
        };
      }
      
      // Create a temporary Python script for the order
      const pythonScript = path.join(os.tmpdir(), "buy_stock.py");
      
      // Write a simple script to place the order
      const scriptContent = `
import sys
import os
import importlib.util
import json
import uuid

# Define input parameters
STOCK = "${stock}"
QTY = ${qty}

# Import the trading module
spec = importlib.util.spec_from_file_location("robinhood_api_trading", "${robinhoodFilePath.replace(/\\/g, '\\\\')}")
robinhood_module = importlib.util.module_from_spec(spec)
sys.modules["robinhood_api_trading"] = robinhood_module
spec.loader.exec_module(robinhood_module)

# Create trading client
client = robinhood_module.CryptoAPITrading()

# Place the order
print(f"Placing order for {QTY} units of {STOCK}...")
order = client.place_order(
    str(uuid.uuid4()),    # Generate a random unique ID
    "buy",                # Side (buy/sell)
    "market",             # Order type (market/limit)
    STOCK,                # Trading pair
    {"asset_quantity": str(QTY)}  # Order quantity
)

# Print order results
print(json.dumps(order, indent=2) if order else "No order data returned")
      `;
      
      // Save the script to a temporary file
      fs.writeFileSync(pythonScript, scriptContent);
      
      // Execute the Python script
      const { stdout, stderr } = await execAsync(
        `cd "${path.dirname(robinhoodFilePath)}" && /opt/homebrew/opt/python@3.12/bin/python3.12 ${pythonScript}`
      );
      
      // Clean up the temporary file
      fs.unlinkSync(pythonScript);
      
      // Check for errors
      if (stderr && stderr.trim() !== "" && !stderr.includes('pip is available')) {
        return { content: [{ type: "text", text: `Error placing order: ${stderr}` }] };
      }
      
      if (stdout.includes("Error:")) {
        return { content: [{ type: "text", text: `Error placing order: ${stdout}` }] };
      }
      
      // Return success message
      return {
        content: [{ 
          type: "text", 
          text: `Stock ${stock} has been bought (${qty} units). Order details:\n${stdout}` 
        }]
      };
    } catch (error) {
      // Return any other errors
      return {
        content: [{ type: "text", text: `Error placing order: ${error.message}` }]
      };
    }
  }
);

server.tool("Sell-a-stock",
  { stock: z.string(), qty: z.number() }, 
  async({stock, qty}) => {
    try {
      // Log the buy request
      console.log(`Attempting to Sell ${qty} of ${stock}...`);
      
      // Find the robinhood_api_trading.py file
      const possiblePaths = [
        path.join(currentDir, "robinhood_api_trading.py"),
        "/Users/ahmedabdullah/robinhood-api-trading/robinhood_api_trading.py"
      ];
      
      // Check each possible path and use the first one that exists
      let robinhoodFilePath = null;
      for (const p of possiblePaths) {
        if (fs.existsSync(p)) {
          robinhoodFilePath = p;
          break;
        }
      }
      
      // Return error if file not found
      if (!robinhoodFilePath) {
        return {
          content: [{ 
            type: "text", 
            text: `Error: Could not find robinhood_api_trading.py file.` 
          }]
        };
      }
      
      // Create a temporary Python script for the order
      const pythonScript = path.join(os.tmpdir(), "sell_stock.py");
      
      // Write a simple script to place the order
      const scriptContent = `
import sys
import os
import importlib.util
import json
import uuid

# Define input parameters
STOCK = "${stock}"
QTY = ${qty}

# Import the trading module
spec = importlib.util.spec_from_file_location("robinhood_api_trading", "${robinhoodFilePath.replace(/\\/g, '\\\\')}")
robinhood_module = importlib.util.module_from_spec(spec)
sys.modules["robinhood_api_trading"] = robinhood_module
spec.loader.exec_module(robinhood_module)

# Create trading client
client = robinhood_module.CryptoAPITrading()

# Place the order
print(f"Placing order for {QTY} units of {STOCK}...")
order = client.place_order(
    str(uuid.uuid4()),    # Generate a random unique ID
    "sell",                # Side (buy/sell)
    "market",             # Order type (market/limit)
    STOCK,                # Trading pair
    {"asset_quantity": str(QTY)}  # Order quantity
)

# Print order results
print(json.dumps(order, indent=2) if order else "No order data returned")
      `;
      
      // Save the script to a temporary file
      fs.writeFileSync(pythonScript, scriptContent);
      
      // Execute the Python script
      const { stdout, stderr } = await execAsync(
        `cd "${path.dirname(robinhoodFilePath)}" && /opt/homebrew/opt/python@3.12/bin/python3.12 ${pythonScript}`
      );
      
      // Clean up the temporary file
      fs.unlinkSync(pythonScript);
      
      // Check for errors
      if (stderr && stderr.trim() !== "" && !stderr.includes('pip is available')) {
        return { content: [{ type: "text", text: `Error placing order: ${stderr}` }] };
      }
      
      if (stdout.includes("Error:")) {
        return { content: [{ type: "text", text: `Error placing order: ${stdout}` }] };
      }
      
      // Return success message
      return {
        content: [{ 
          type: "text", 
          text: `Stock ${stock} has been sold (${qty} units). Order details:\n${stdout}` 
        }]
      };
    } catch (error) {
      // Return any other errors
      return {
        content: [{ type: "text", text: `Error placing order: ${error.message}` }]
      };
    }
  }
);

const transport = new StdioServerTransport();
await server.connect(transport);