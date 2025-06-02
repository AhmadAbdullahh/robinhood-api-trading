#Do not remove the 3 lines below in any promots these are how to chnage from Alpaca to Robinhood 

Claude dekstop file  command should be node for both beause both have .js files 
for Robinhood in args use  "/Users/ahmedabdullah/robinhood-api-trading/mcpClaude-Code.js"
for Alpaca in args use  "/Users/ahmedabdullah/robinhood-api-trading/mcpAlpacaClaude.js"



# Algorithmic Trading System with Web Scraping and Yahoo Finance

This project combines web scraping, Yahoo Finance data, and Alpaca trading to create an automated trading system.

## Features

- **Web Scraping**: Get the latest news and trends for any stock symbol
- **Yahoo Finance Integration**: Retrieve historical data and key statistics
- **Trading Algorithms**:
  - Momentum Trading
  - SMA Crossover Strategy
  - RSI (Relative Strength Index) Strategy
- **Alpaca Trading API**: Directly execute buy/sell orders based on algorithm signals
- **Strategy Backtesting**: Test your trading strategies against historical data

## Components

This project contains two main files:

1. **mcpAlpacaClaude.js**: The original Alpaca trading integration with basic buy/sell functionality
2. **stockAlgorithms.js**: Advanced trading algorithms with web scraping, Yahoo Finance integration, and backtesting

## Setup

1. Install required Python packages:
```bash
pip install requests beautifulsoup4 yfinance pandas numpy alpaca-py matplotlib
```

2. Make sure you have your Alpaca API credentials:
   - For `mcpAlpacaClaude.js`, the API keys are already in the file
   - For `stockAlgorithms.js`, replace the placeholder API credentials with your own

3. Run either MCP server:
```bash
# For basic Alpaca trading
node mcpAlpacaClaude.js

# For advanced algorithms and web scraping
node stockAlgorithms.js
```

## Using the Trading Tools

### Get Account Information
Retrieve your Alpaca account details including buying power and portfolio value.

### Scrape Stock News
Get the latest news and market data for a specific stock symbol from Finviz.

### Get Yahoo Finance Data
Retrieve historical price data and key statistics for any stock over a specified period.

### Run Trading Algorithm
Execute one of the trading strategies (momentum, SMA crossover, or RSI) on a stock with a specified investment amount. The system will:
1. Analyze the stock using the selected strategy
2. Generate a buy, sell, or hold signal
3. Calculate the recommended position size
4. Automatically execute the trade if conditions are met

### Backtest Trading Strategy
Test how your trading strategy would have performed historically:
1. Run a simulation of your strategy over historical data
2. See total returns, annualized returns, and Sharpe ratio
3. Compare performance against a simple buy & hold approach

### Buy/Sell Stocks Manually
You can also manually place buy or sell orders for specific stocks.

## Trading Strategies

1. **Momentum**: Looks at price change over a lookback period to identify trending stocks
2. **SMA Crossover**: Uses 20-day and 50-day moving averages to identify trend shifts
3. **RSI**: Identifies overbought or oversold conditions using the Relative Strength Index

## Example Usage

To run the SMA crossover strategy on AAPL with a $2000 investment:
```
Run-trading-algorithm with AAPL, $2000, and the SMA crossover strategy
```

To backtest the RSI strategy on TSLA over the past year:
```
Backtest-strategy with TSLA, the RSI strategy, "1y" period, and $10000 investment
```

## Warning

This is a trading system that can execute real trades with real money. Always monitor the system and use proper risk management. 