import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { z } from "zod";
import { exec } from "child_process";
import { promisify } from "util";
import path from "path";
import fs from "fs";
import os from "os";
require('dotenv').config();
const execAsync = promisify(exec);

// Get current working directory
const currentDir = process.cwd();
console.log(`Current working directory: ${currentDir}`);
const API1 = process.env.ALPACA_API_KEY
const API2 = process.env.ALPACA_API_SECRET

// Create an MCP server
const server = new McpServer({
  name: "AlpacaTrading",
  version: "1.0.0"
});

// Get account information tool
server.tool("Get-account-info",
  {}, 
  async() => {
    try {
      console.log("Getting account info...");
      
      // Create a temporary Python script
      const pythonScript = path.join(os.tmpdir(), "get_account.py");
      
      // Create a script that matches Alpaca.py structure
      const scriptContent = `
from alpaca.trading.client import TradingClient
from alpaca.trading.requests import MarketOrderRequest
from alpaca.trading.enums import OrderSide, TimeInForce

client = TradingClient("${API1}","${API2}")

account = client.get_account()

print(f"Account Number: {account.account_number}")
print(f"Buying Power: ${account.buying_power}")
print(f"Cash: ${account.cash}")
print(f"Portfolio Value: ${account.portfolio_value}")
print(f"Equity: ${account.equity}")
print(f"Status: {account.status}")
      `;
      
      // Save the script to a temporary file
      fs.writeFileSync(pythonScript, scriptContent);
      
      // Execute the Python script
      const { stdout, stderr } = await execAsync(
        `python3 ${pythonScript}`
      );
      
      // Clean up the temporary file
      fs.unlinkSync(pythonScript);
      
      // Check for errors
      if (stderr && stderr.trim() !== "" && !stderr.includes('pip is available')) {
        return { content: [{ type: "text", text: `Error getting account info: ${stderr}` }] };
      }
      
      // Return account information
      return {
        content: [{ 
          type: "text", 
          text: `Account Information:\n${stdout}` 
        }]
      };
    } catch (error) {
      // Return any other errors
      return {
        content: [{ type: "text", text: `Error getting account info: ${error.message}` }]
      };
    }
  }
);

// Buy stock tool - exactly matching Alpaca.py
server.tool("Buy-a-stock",
  { stock: z.string(), qty: z.number() }, 
  async({stock, qty}) => {
    try {
      console.log(`Attempting to buy ${qty} of ${stock}...`);
      
      const pythonScript = path.join(os.tmpdir(), "buy_stock.py");
      
      // Create a script that EXACTLY matches Alpaca.py structure
      const scriptContent = `
from alpaca.trading.client import TradingClient
from alpaca.trading.requests import MarketOrderRequest
from alpaca.trading.enums import OrderSide, TimeInForce


client = TradingClient("${API1}","${API2}")

account = client.get_account().account_number
buying_power = client.get_account().buying_power

market_order = MarketOrderRequest(
    symbol="${stock}",
    qty=${qty},
    side=OrderSide.BUY,
    time_in_force=TimeInForce.DAY
)

order = client.submit_order(market_order)


print(account)
print(buying_power)
print(order)
      `;
      
      fs.writeFileSync(pythonScript, scriptContent);
      
      const { stdout, stderr } = await execAsync(`python3 ${pythonScript}`);
      
      fs.unlinkSync(pythonScript);
      
      if (stderr && stderr.trim() !== "" && !stderr.includes('pip is available')) {
        return { content: [{ type: "text", text: `Error placing order: ${stderr}` }] };
      }
      
      return {
        content: [{ 
          type: "text", 
          text: `Order placed successfully for ${qty} shares of ${stock}.\n${stdout}` 
        }]
      };
    } catch (error) {
      return {
        content: [{ type: "text", text: `Error placing order: ${error.message}` }]
      };
    }
  }
);

// Sell stock tool - following same pattern as Alpaca.py
server.tool("Sell-a-stock",
  { stock: z.string(), qty: z.number() }, 
  async({stock, qty}) => {
    try {
      console.log(`Attempting to sell ${qty} of ${stock}...`);
      
      const pythonScript = path.join(os.tmpdir(), "sell_stock.py");
      
      // Create a script that matches Alpaca.py structure
      const scriptContent = `
from alpaca.trading.client import TradingClient
from alpaca.trading.requests import MarketOrderRequest
from alpaca.trading.enums import OrderSide, TimeInForce


client = TradingClient("${API1}","${API2}")

account = client.get_account().account_number
buying_power = client.get_account().buying_power

market_order = MarketOrderRequest(
    symbol="${stock}",
    qty=${qty},
    side=OrderSide.SELL,
    time_in_force=TimeInForce.DAY
)

order = client.submit_order(market_order)


print(account)
print(buying_power)
print(order)
      `;
      
      fs.writeFileSync(pythonScript, scriptContent);
      
      const { stdout, stderr } = await execAsync(`python3 ${pythonScript}`);
      
      fs.unlinkSync(pythonScript);
      
      if (stderr && stderr.trim() !== "" && !stderr.includes('pip is available')) {
        return { content: [{ type: "text", text: `Error placing order: ${stderr}` }] };
      }
      
      return {
        content: [{ 
          type: "text", 
          text: `Order placed successfully for selling ${qty} shares of ${stock}.\n${stdout}` 
        }]
      };
    } catch (error) {
      return {
        content: [{ type: "text", text: `Error placing order: ${error.message}` }]
      };
    }
  }
);

// Scrape Stock News tool - gets news and trends from financial websites
server.tool("Scrape-stock-news",
  { stock: z.string() }, 
  async({stock}) => {
    try {
      console.log(`Scraping news for ${stock}...`);
      
      const pythonScript = path.join(os.tmpdir(), "scrape_news.py");
      
      // Create a script for web scraping
      const scriptContent = `
import requests
from bs4 import BeautifulSoup
import json

def scrape_finviz(ticker):
    url = f"https://finviz.com/quote.ashx?t={ticker}"
    headers = {'User-Agent': 'Mozilla/5.0'}
    response = requests.get(url, headers=headers)
    soup = BeautifulSoup(response.text, 'html.parser')
    
    # Extract news headlines
    news_table = soup.find(id='news-table')
    news_data = []
    
    if news_table:
        rows = news_table.findAll('tr')
        for row in rows:
            title = row.a.text
            date_data = row.td.text.split(' ')
            if len(date_data) > 1:
                date = date_data[0]
                time = date_data[1]
            else:
                time = date_data[0]
            news_data.append({'title': title, 'time': time})
    
    # Extract basic stock data
    snapshot_table = soup.find('table', {'class': 'snapshot-table2'})
    stock_data = {}
    
    if snapshot_table:
        rows = snapshot_table.findAll('tr')
        for row in rows:
            cells = row.findAll('td')
            for i in range(0, len(cells), 2):
                if i+1 < len(cells):
                    key = cells[i].text.strip()
                    value = cells[i+1].text.strip()
                    stock_data[key] = value
    
    return {'news': news_data[:5], 'data': stock_data}

# Main execution
try:
    result = scrape_finviz("${stock}")
    print(json.dumps(result, indent=2))
except Exception as e:
    print(json.dumps({"error": str(e)}))
      `;
      
      fs.writeFileSync(pythonScript, scriptContent);
      
      // Install required Python packages if not already installed
      await execAsync('pip install requests beautifulsoup4 --quiet');
      
      const { stdout, stderr } = await execAsync(`python3 ${pythonScript}`);
      
      fs.unlinkSync(pythonScript);
      
      if (stderr && stderr.trim() !== "" && !stderr.includes('pip is available')) {
        return { content: [{ type: "text", text: `Error scraping news: ${stderr}` }] };
      }
      
      // Parse the JSON output
      const scrapedData = JSON.parse(stdout);
      
      // Format the output for display
      let formattedOutput = `News and Data for ${stock}:\n\n`;
      
      if (scrapedData.news && scrapedData.news.length > 0) {
        formattedOutput += "Recent News:\n";
        scrapedData.news.forEach((item, index) => {
          formattedOutput += `${index + 1}. [${item.time}] ${item.title}\n`;
        });
        formattedOutput += "\n";
      }
      
      if (scrapedData.data) {
        formattedOutput += "Stock Data:\n";
        for (const [key, value] of Object.entries(scrapedData.data)) {
          formattedOutput += `${key}: ${value}\n`;
        }
      }
      
      return {
        content: [{ type: "text", text: formattedOutput }]
      };
    } catch (error) {
      return {
        content: [{ type: "text", text: `Error scraping stock news: ${error.message}` }]
      };
    }
  }
);

// Get Yahoo Finance Data tool
server.tool("Get-yahoo-finance-data",
  { stock: z.string(), period: z.string().default("1mo") }, 
  async({stock, period}) => {
    try {
      console.log(`Getting Yahoo Finance data for ${stock} over ${period}...`);
      
      const pythonScript = path.join(os.tmpdir(), "yahoo_finance.py");
      
      // Create a script to fetch Yahoo Finance data
      const scriptContent = `
import yfinance as yf
import pandas as pd
import json
from datetime import datetime

# Get stock data
ticker = yf.Ticker("${stock}")
hist = ticker.history(period="${period}")

# Convert to JSON serializable format
hist_reset = hist.reset_index()
dates = hist_reset['Date'].dt.strftime('%Y-%m-%d').tolist()
data = {
    'dates': dates,
    'open': hist_reset['Open'].tolist(),
    'high': hist_reset['High'].tolist(),
    'low': hist_reset['Low'].tolist(),
    'close': hist_reset['Close'].tolist(),
    'volume': hist_reset['Volume'].tolist()
}

# Get additional info
info = ticker.info
key_stats = {k: info.get(k) for k in [
    'shortName', 'sector', 'industry', 'marketCap', 
    'trailingPE', 'forwardPE', 'dividendYield', 'beta',
    'fiftyTwoWeekHigh', 'fiftyTwoWeekLow', 'targetMeanPrice'
] if k in info}

# Calculate some basic indicators
data['sma_5'] = hist_reset['Close'].rolling(window=5).mean().tolist()
data['sma_20'] = hist_reset['Close'].rolling(window=20).mean().tolist()

# Combine everything
result = {
    'ticker': "${stock}",
    'historical_data': data,
    'stats': key_stats
}

print(json.dumps(result))
      `;
      
      fs.writeFileSync(pythonScript, scriptContent);
      
      // Install required Python packages if not already installed
      await execAsync('pip install yfinance pandas --quiet');
      
      const { stdout, stderr } = await execAsync(`python3 ${pythonScript}`);
      
      fs.unlinkSync(pythonScript);
      
      if (stderr && stderr.trim() !== "" && !stderr.includes('pip is available')) {
        return { content: [{ type: "text", text: `Error getting Yahoo Finance data: ${stderr}` }] };
      }
      
      // Parse the JSON output
      const yfinanceData = JSON.parse(stdout);
      
      // Format key statistics for display
      let statsOutput = "Key Statistics:\n";
      for (const [key, value] of Object.entries(yfinanceData.stats)) {
        statsOutput += `${key}: ${value}\n`;
      }
      
      // Calculate recent performance
      const prices = yfinanceData.historical_data.close;
      const latestPrice = prices[prices.length - 1];
      const earliestPrice = prices[0];
      const percentChange = ((latestPrice - earliestPrice) / earliestPrice * 100).toFixed(2);
      
      return {
        content: [{ 
          type: "text", 
          text: `Yahoo Finance Data for ${stock} (${period}):\n\n${statsOutput}\nRecent Performance: ${percentChange}% change\nLatest Close: $${latestPrice.toFixed(2)}\n\nFull historical data retrieved with ${yfinanceData.historical_data.dates.length} data points.`
        }]
      };
    } catch (error) {
      return {
        content: [{ type: "text", text: `Error getting Yahoo Finance data: ${error.message}` }]
      };
    }
  }
);

// Run Trading Algorithm tool
server.tool("Run-trading-algorithm",
  { 
    stock: z.string(), 
    investment_amount: z.number().default(1000),
    strategy: z.enum(["momentum", "sma_crossover", "rsi"]).default("sma_crossover")
  }, 
  async({stock, investment_amount, strategy}) => {
    try {
      console.log(`Running ${strategy} trading algorithm for ${stock} with $${investment_amount}...`);
      
      const pythonScript = path.join(os.tmpdir(), "trading_algorithm.py");
      
      // Create a script for the trading algorithm
      const scriptContent = `
import yfinance as yf
import pandas as pd
import numpy as np
import json
from alpaca.trading.client import TradingClient
from alpaca.trading.requests import MarketOrderRequest
from alpaca.trading.enums import OrderSide, TimeInForce

# Strategy implementations
def momentum_strategy(df, lookback=14):
    # Simple momentum strategy based on price change over lookback period
    df['momentum'] = df['Close'].pct_change(lookback)
    signal = 'buy' if df['momentum'].iloc[-1] > 0.02 else 'sell' if df['momentum'].iloc[-1] < -0.02 else 'hold'
    strength = abs(df['momentum'].iloc[-1])
    return signal, strength, df

def sma_crossover_strategy(df):
    # SMA crossover strategy
    df['SMA20'] = df['Close'].rolling(window=20).mean()
    df['SMA50'] = df['Close'].rolling(window=50).mean()
    
    # Current and previous day indicators
    current_cross = df['SMA20'].iloc[-1] > df['SMA50'].iloc[-1]
    prev_cross = df['SMA20'].iloc[-2] > df['SMA50'].iloc[-2]
    
    if current_cross and not prev_cross:
        signal = 'buy'  # Bullish crossover
    elif not current_cross and prev_cross:
        signal = 'sell'  # Bearish crossover
    else:
        signal = 'hold'
    
    # Strength based on distance between SMAs
    strength = abs(df['SMA20'].iloc[-1] - df['SMA50'].iloc[-1]) / df['Close'].iloc[-1]
    return signal, strength, df

def rsi_strategy(df, period=14, overbought=70, oversold=30):
    # RSI strategy
    delta = df['Close'].diff()
    gain = delta.where(delta > 0, 0).rolling(window=period).mean()
    loss = -delta.where(delta < 0, 0).rolling(window=period).mean()
    
    rs = gain / loss
    df['RSI'] = 100 - (100 / (1 + rs))
    
    if df['RSI'].iloc[-1] < oversold:
        signal = 'buy'
    elif df['RSI'].iloc[-1] > overbought:
        signal = 'sell'
    else:
        signal = 'hold'
    
    # Strength based on distance from thresholds
    if signal == 'buy':
        strength = (oversold - df['RSI'].iloc[-1]) / oversold
    elif signal == 'sell':
        strength = (df['RSI'].iloc[-1] - overbought) / (100 - overbought)
    else:
        strength = 0
    
    return signal, strength, df

# Get stock data
ticker = yf.Ticker("${stock}")
df = ticker.history(period="3mo")

# Apply selected strategy
if "${strategy}" == "momentum":
    signal, strength, df = momentum_strategy(df)
elif "${strategy}" == "sma_crossover":
    signal, strength, df = sma_crossover_strategy(df)
elif "${strategy}" == "rsi":
    signal, strength, df = rsi_strategy(df)

# Calculate position size
latest_price = df['Close'].iloc[-1]
shares = int(${investment_amount} / latest_price)

result = {
    "ticker": "${stock}",
    "strategy": "${strategy}",
    "signal": signal,
    "signal_strength": float(strength),
    "latest_price": float(latest_price),
    "recommended_shares": shares,
    "investment_amount": ${investment_amount},
    "estimated_cost": float(shares * latest_price)
}

# If we have a buy or sell signal, execute the trade
if signal in ['buy', 'sell'] and shares > 0:
    try:
        client = TradingClient("${API1}", "${API2}")
        
        # Check account status
        account = client.get_account()
        buying_power = float(account.buying_power)
        
        # Add account info to result
        result["account_buying_power"] = buying_power
        
        # Only proceed if we have enough buying power
        if signal == 'buy' and buying_power >= (shares * latest_price):
            market_order = MarketOrderRequest(
                symbol="${stock}",
                qty=shares,
                side=OrderSide.BUY,
                time_in_force=TimeInForce.DAY
            )
            
            order = client.submit_order(market_order)
            result["order_submitted"] = True
            result["order_id"] = order.id
            result["order_status"] = order.status
            
        elif signal == 'sell':
            # Check if we own the stock before selling
            positions = client.get_all_positions()
            stock_position = next((p for p in positions if p.symbol == "${stock}"), None)
            
            if stock_position:
                sell_shares = min(shares, int(stock_position.qty))
                
                if sell_shares > 0:
                    market_order = MarketOrderRequest(
                        symbol="${stock}",
                        qty=sell_shares,
                        side=OrderSide.SELL,
                        time_in_force=TimeInForce.DAY
                    )
                    
                    order = client.submit_order(market_order)
                    result["order_submitted"] = True
                    result["order_id"] = order.id
                    result["order_status"] = order.status
                    result["actual_shares_sold"] = sell_shares
            else:
                result["order_submitted"] = False
                result["reason"] = "No position found to sell"
        
    except Exception as e:
        result["order_submitted"] = False
        result["error"] = str(e)

print(json.dumps(result))
      `;
      
      fs.writeFileSync(pythonScript, scriptContent);
      
      // Install required Python packages if not already installed
      await execAsync('pip install yfinance pandas numpy alpaca-py --quiet');
      
      const { stdout, stderr } = await execAsync(`python3 ${pythonScript}`);
      
      fs.unlinkSync(pythonScript);
      
      if (stderr && stderr.trim() !== "" && !stderr.includes('pip is available')) {
        return { content: [{ type: "text", text: `Error running trading algorithm: ${stderr}` }] };
      }
      
      // Parse the JSON output
      const algorithmResult = JSON.parse(stdout);
      
      // Construct a readable summary
      let summary = `Trading Algorithm Results (${strategy} strategy):\n\n`;
      summary += `Stock: ${algorithmResult.ticker}\n`;
      summary += `Current Price: $${algorithmResult.latest_price.toFixed(2)}\n`;
      summary += `Signal: ${algorithmResult.signal.toUpperCase()}\n`;
      summary += `Signal Strength: ${(algorithmResult.signal_strength * 100).toFixed(2)}%\n\n`;
      
      summary += `Recommended Position: ${algorithmResult.recommended_shares} shares\n`;
      summary += `Estimated Cost: $${algorithmResult.estimated_cost.toFixed(2)}\n\n`;
      
      if (algorithmResult.order_submitted) {
        summary += `✅ ORDER EXECUTED!\n`;
        summary += `Order ID: ${algorithmResult.order_id}\n`;
        summary += `Status: ${algorithmResult.order_status}\n`;
        
        if (algorithmResult.actual_shares_sold) {
          summary += `Actual Shares Sold: ${algorithmResult.actual_shares_sold}\n`;
        }
      } else if (algorithmResult.signal === 'hold') {
        summary += `No order placed - hold recommendation.\n`;
      } else if (algorithmResult.reason) {
        summary += `No order placed: ${algorithmResult.reason}\n`;
      } else if (algorithmResult.error) {
        summary += `Error placing order: ${algorithmResult.error}\n`;
      }
      
      return {
        content: [{ type: "text", text: summary }]
      };
    } catch (error) {
      return {
        content: [{ type: "text", text: `Error running trading algorithm: ${error.message}` }]
      };
    }
  }
);

// Historical Backtesting tool
server.tool("Backtest-strategy",
  { 
    stock: z.string(), 
    strategy: z.enum(["momentum", "sma_crossover", "rsi"]).default("sma_crossover"),
    period: z.string().default("1y"),
    initial_investment: z.number().default(10000)
  }, 
  async({stock, strategy, period, initial_investment}) => {
    try {
      console.log(`Backtesting ${strategy} strategy on ${stock} over ${period} with $${initial_investment} initial investment...`);
      
      const pythonScript = path.join(os.tmpdir(), "backtest.py");
      
      // Create a script for backtesting
      const scriptContent = `
import yfinance as yf
import pandas as pd
import numpy as np
import json
import matplotlib.pyplot as plt
from datetime import datetime
import os

# Strategy implementations (same as in the trading algorithm)
def momentum_strategy(df, lookback=14):
    df['momentum'] = df['Close'].pct_change(lookback)
    df['signal'] = 0
    df.loc[df['momentum'] > 0.02, 'signal'] = 1  # Buy signal
    df.loc[df['momentum'] < -0.02, 'signal'] = -1  # Sell signal
    return df

def sma_crossover_strategy(df):
    df['SMA20'] = df['Close'].rolling(window=20).mean()
    df['SMA50'] = df['Close'].rolling(window=50).mean()
    df['signal'] = 0
    
    # Bullish signal when short MA crosses above long MA
    df.loc[(df['SMA20'] > df['SMA50']) & (df['SMA20'].shift(1) <= df['SMA50'].shift(1)), 'signal'] = 1
    
    # Bearish signal when short MA crosses below long MA
    df.loc[(df['SMA20'] < df['SMA50']) & (df['SMA20'].shift(1) >= df['SMA50'].shift(1)), 'signal'] = -1
    
    return df

def rsi_strategy(df, period=14, overbought=70, oversold=30):
    delta = df['Close'].diff()
    gain = delta.where(delta > 0, 0).rolling(window=period).mean()
    loss = -delta.where(delta < 0, 0).rolling(window=period).mean()
    
    rs = gain / loss
    df['RSI'] = 100 - (100 / (1 + rs))
    
    df['signal'] = 0
    df.loc[df['RSI'] < oversold, 'signal'] = 1  # Buy when oversold
    df.loc[df['RSI'] > overbought, 'signal'] = -1  # Sell when overbought
    
    return df

# Backtest function
def backtest(df, initial_investment=10000):
    # Initialize portfolio metrics
    df['position'] = 0
    df['cash'] = initial_investment
    df['holdings'] = 0
    df['portfolio_value'] = initial_investment
    
    position = 0
    cash = initial_investment
    
    # Loop through each day
    for i in range(1, len(df)):
        # Default is to maintain previous position
        df.loc[df.index[i], 'position'] = position
        df.loc[df.index[i], 'cash'] = cash
        
        # Process signals
        if df['signal'].iloc[i] == 1 and position == 0:  # Buy signal and no position
            shares_to_buy = int(cash / df['Close'].iloc[i])
            cost = shares_to_buy * df['Close'].iloc[i]
            
            if shares_to_buy > 0:
                position = shares_to_buy
                cash -= cost
                
                # Update position and cash
                df.loc[df.index[i], 'position'] = position
                df.loc[df.index[i], 'cash'] = cash
        
        elif df['signal'].iloc[i] == -1 and position > 0:  # Sell signal and has position
            proceeds = position * df['Close'].iloc[i]
            position = 0
            cash += proceeds
            
            # Update position and cash
            df.loc[df.index[i], 'position'] = position
            df.loc[df.index[i], 'cash'] = cash
        
        # Calculate holdings value and total portfolio value
        df.loc[df.index[i], 'holdings'] = position * df['Close'].iloc[i]
        df.loc[df.index[i], 'portfolio_value'] = df.loc[df.index[i], 'cash'] + df.loc[df.index[i], 'holdings']
    
    # Calculate performance metrics
    df['daily_returns'] = df['portfolio_value'].pct_change()
    
    start_value = df['portfolio_value'].iloc[0]
    end_value = df['portfolio_value'].iloc[-1]
    total_return = (end_value / start_value - 1) * 100
    
    # Calculate annualized return
    days = (df.index[-1] - df.index[0]).days
    annualized_return = ((1 + total_return/100) ** (365/days) - 1) * 100
    
    # Calculate Sharpe ratio (assuming risk-free rate of 0 for simplicity)
    sharpe_ratio = np.sqrt(252) * df['daily_returns'].mean() / df['daily_returns'].std()
    
    # Count trades
    buy_signals = df[df['signal'] == 1].shape[0]
    sell_signals = df[df['signal'] == -1].shape[0]
    
    # Calculate maximum drawdown
    df['cummax'] = df['portfolio_value'].cummax()
    df['drawdown'] = df['portfolio_value'] / df['cummax'] - 1
    max_drawdown = df['drawdown'].min() * 100
    
    # Calculate buy & hold performance for comparison
    shares_bought = int(initial_investment / df['Close'].iloc[0])
    buy_hold_value = shares_bought * df['Close'] + (initial_investment - shares_bought * df['Close'].iloc[0])
    buy_hold_return = (buy_hold_value.iloc[-1] / initial_investment - 1) * 100
    
    # Create a plot of portfolio value vs buy & hold
    plt.figure(figsize=(10, 6))
    plt.plot(df.index, df['portfolio_value'], label='Strategy')
    plt.plot(df.index, buy_hold_value, label='Buy & Hold')
    plt.title(f'Backtest Results: {strategy} on {stock}')
    plt.xlabel('Date')
    plt.ylabel('Portfolio Value ($)')
    plt.legend()
    plt.grid(True)
    
    # Save plot to a temporary file
    plot_path = os.path.join(os.path.dirname(os.path.realpath(__file__)), 'backtest_plot.png')
    plt.savefig(plot_path)
    
    # Return performance metrics
    results = {
        'initial_investment': initial_investment,
        'final_value': float(end_value),
        'total_return_pct': float(total_return),
        'annualized_return_pct': float(annualized_return),
        'sharpe_ratio': float(sharpe_ratio),
        'max_drawdown_pct': float(max_drawdown),
        'buy_signals': buy_signals,
        'sell_signals': sell_signals,
        'buy_hold_return_pct': float(buy_hold_return),
        'period': '${period}',
        'outperformance': float(total_return - buy_hold_return),
        'plot_path': plot_path
    }
    
    return results

# Get stock data
ticker = yf.Ticker("${stock}")
df = ticker.history(period="${period}")

# Apply selected strategy
if "${strategy}" == "momentum":
    df = momentum_strategy(df)
elif "${strategy}" == "sma_crossover":
    df = sma_crossover_strategy(df)
elif "${strategy}" == "rsi":
    df = rsi_strategy(df)

# Run backtest
results = backtest(df, ${initial_investment})

print(json.dumps(results))
      `;
      
      fs.writeFileSync(pythonScript, scriptContent);
      
      // Install required Python packages if not already installed
      await execAsync('pip install yfinance pandas numpy matplotlib --quiet');
      
      const { stdout, stderr } = await execAsync(`python3 ${pythonScript}`);
      
      // Don't delete the script immediately as we need to access the generated plot
      
      if (stderr && stderr.trim() !== "" && !stderr.includes('pip is available')) {
        fs.unlinkSync(pythonScript);
        return { content: [{ type: "text", text: `Error running backtest: ${stderr}` }] };
      }
      
      // Parse the JSON output
      const backtestResults = JSON.parse(stdout);
      
      // Construct a readable summary
      let summary = `Backtest Results (${strategy} strategy on ${stock} over ${period}):\n\n`;
      summary += `Initial Investment: $${backtestResults.initial_investment.toFixed(2)}\n`;
      summary += `Final Value: $${backtestResults.final_value.toFixed(2)}\n\n`;
      
      summary += `Performance Metrics:\n`;
      summary += `- Total Return: ${backtestResults.total_return_pct.toFixed(2)}%\n`;
      summary += `- Annualized Return: ${backtestResults.annualized_return_pct.toFixed(2)}%\n`;
      summary += `- Sharpe Ratio: ${backtestResults.sharpe_ratio.toFixed(2)}\n`;
      summary += `- Maximum Drawdown: ${Math.abs(backtestResults.max_drawdown_pct).toFixed(2)}%\n\n`;
      
      summary += `Trading Activity:\n`;
      summary += `- Buy Signals: ${backtestResults.buy_signals}\n`;
      summary += `- Sell Signals: ${backtestResults.sell_signals}\n\n`;
      
      summary += `Benchmark Comparison:\n`;
      summary += `- Buy & Hold Return: ${backtestResults.buy_hold_return_pct.toFixed(2)}%\n`;
      summary += `- Strategy Outperformance: ${backtestResults.outperformance.toFixed(2)}%\n`;
      
      // Clean up
      fs.unlinkSync(pythonScript);
      
      return {
        content: [{ type: "text", text: summary }]
      };
    } catch (error) {
      return {
        content: [{ type: "text", text: `Error running backtest: ${error.message}` }]
      };
    }
  }
);

const transport = new StdioServerTransport();
await server.connect(transport);