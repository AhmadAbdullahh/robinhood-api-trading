# Standard library imports for working with various data formats and utilities
import base64  # For encoding/decoding Base64 data (used for cryptographic signatures)
import datetime  # For handling timestamps required in API authentication
import json  # For parsing and creating JSON data to communicate with the API
import os  # For accessing environment variables (currently not used but available)
from typing import Any, Dict, Optional  # Type hints for better code readability and IDE support
import uuid  # For generating unique IDs for API requests
import requests  # For making HTTP API calls to the Robinhood server
from nacl.signing import SigningKey  # Cryptographic library for creating secure signatures
# from colorama import Fore, Style  # For colored output
from dotenv import load_dotenv
load_dotenv()
# Your Robinhood API credentials (hardcoded for simplicity)


API_KEY = os.environ.get("API_KEY")
BASE64_PRIVATE_KEY = os.environ.get("BASE64_PRIVATE_KEY")

# ANSI color codes
CYAN = "\033[36m"
GREEN = "\033[32m"
YELLOW = "\033[33m"
RED = "\033[31m"
WHITE = "\033[37m"
RESET = "\033[0m"

# Alternative way to get credentials from environment variables (currently disabled)
# API_KEY = os.getenv("API_KEY")
# BASE64_PRIVATE_KEY = os.getenv("BASE64_PRIVATE_KEY")

class CryptoAPITrading:
    def __init__(self):
        # Initialize the API client with your credentials
        self.api_key = API_KEY  # Store API key for authentication
        private_key_seed = base64.b64decode(BASE64_PRIVATE_KEY)  # Decode Base64 private key to bytes
        # PyNaCl expects a 32-byte seed, the first 32 bytes of the private key are the seed
        seed = private_key_seed[:32]  # Extract the first 32 bytes as required by NaCl
        self.private_key = SigningKey(seed)  # Create a signing key for request authentication
        self.base_url = "https://trading.robinhood.com"  # API endpoint base URL

    @staticmethod
    def _get_current_timestamp() -> int:
        # Get current UTC timestamp in seconds (required for API request signing)
        return int(datetime.datetime.now(tz=datetime.timezone.utc).timestamp())

    @staticmethod
    def get_query_params(key: str, *args: Optional[str]) -> str:
        # Helper method to build URL query parameters in format ?key=value&key=value2
        if not args:
            return ""  # Return empty string if no parameters

        params = []
        for arg in args:
            params.append(f"{key}={arg}")  # Format each parameter as key=value

        return "?" + "&".join(params)  # Join parameters with & and add ? prefix

    def make_api_request(self, method: str, path: str, body: str = "") -> Any:
        # Central method for making API requests with proper authentication
        timestamp = self._get_current_timestamp()  # Get current time for request
        headers = self.get_authorization_header(method, path, body, timestamp)  # Generate auth headers
        url = self.base_url + path  # Combine base URL with specific endpoint path

        try:
            response = {}
            if method == "GET":
                # Make GET request with headers and 10-second timeout
                response = requests.get(url, headers=headers, timeout=10)
            elif method == "POST":
                # Make POST request with headers, JSON body, and 10-second timeout
                response = requests.post(url, headers=headers, json=json.loads(body), timeout=10)
            
            # Debug information about the response
            print(f"Response status: {response.status_code}")
            print(f"Response headers: {response.headers}")
            print(f"Response content: {response.text[:200]}")  # Print first 200 chars of response
            
            if response.status_code != 200:
                # Handle non-200 status codes as errors
                print(f"Error: API returned status code {response.status_code}")
                return None
                
            return response.json()  # Parse and return JSON response
        except requests.RequestException as e:
            # Handle network-related errors
            print(f"Error making API request: {e}")
            return None
        except json.JSONDecodeError as e:
            # Handle invalid JSON responses
            print(f"Error decoding JSON response: {e}")
            print(f"Raw response: {response.text[:200]}")  # Print first 200 chars
            return None

    def get_authorization_header(
            self, method: str, path: str, body: str, timestamp: int
    ) -> Dict[str, str]:
        # Generate authentication headers required by Robinhood API
        # Create message string to sign with specific format required by the API
        message_to_sign = f"{self.api_key}{timestamp}{path}{method}{body}"
        # Sign the message using the private key
        signed = self.private_key.sign(message_to_sign.encode("utf-8"))

        # Return all required headers for authentication
        return {
            "x-api-key": self.api_key,  # Your API key
            "x-signature": base64.b64encode(signed.signature).decode("utf-8"),  # Cryptographic signature
            "x-timestamp": str(timestamp),  # Current timestamp
        }

    def get_account(self) -> Any:
        # Get account information (balance, status, etc.)
        path = "/api/v1/crypto/trading/accounts/"
        return self.make_api_request("GET", path)

    # The symbols argument must be formatted in trading pairs, e.g "BTC-USD", "ETH-USD". If no symbols are provided,
    # all supported symbols will be returned
    def get_trading_pairs(self, *symbols: Optional[str]) -> Any:
        # Get information about available trading pairs (e.g., BTC-USD)
        query_params = self.get_query_params("symbol", *symbols)  # Build query string for specific symbols
        path = f"/api/v1/crypto/trading/trading_pairs/{query_params}"
        return self.make_api_request("GET", path)

    # The asset_codes argument must be formatted as the short form name for a crypto, e.g "BTC", "ETH". If no asset
    # codes are provided, all crypto holdings will be returned
    def get_holdings(self, *asset_codes: Optional[str]) -> Any:
        # Get information about your current crypto holdings
        query_params = self.get_query_params("asset_code", *asset_codes)  # Build query for specific assets
        path = f"/api/v1/crypto/trading/holdings/{query_params}"
        return self.make_api_request("GET", path)

    # The symbols argument must be formatted in trading pairs, e.g "BTC-USD", "ETH-USD". If no symbols are provided,
    # the best bid and ask for all supported symbols will be returned
    def get_best_bid_ask(self, *symbols: Optional[str]) -> Any:
        # Get current best bid and ask prices for trading pairs
        query_params = self.get_query_params("symbol", *symbols)  # Build query for specific symbols
        path = f"/api/v1/crypto/marketdata/best_bid_ask/{query_params}"
        return self.make_api_request("GET", path)

    # The symbol argument must be formatted in a trading pair, e.g "BTC-USD", "ETH-USD"
    # The side argument must be "bid", "ask", or "both".
    # Multiple quantities can be specified in the quantity argument, e.g. "0.1,1,1.999".
    def get_estimated_price(self, symbol: str, side: str, quantity: str) -> Any:
        # Get estimated execution price for a potential order
        path = f"/api/v1/crypto/marketdata/estimated_price/?symbol={symbol}&side={side}&quantity={quantity}"
        return self.make_api_request("GET", path)

    def place_order(
            self,
            client_order_id: str,
            side: str,
            order_type: str,
            symbol: str,
            order_config: Dict[str, str],
    ) -> Any:
        # Place a buy or sell order for cryptocurrency
        # Build order request body with all required parameters
        body = {
            "client_order_id": client_order_id,  # Unique ID for this order (use UUID)
            "side": side,  # "buy" or "sell"
            "type": order_type,  # "market" or "limit"
            "symbol": symbol,  # Trading pair like "BTC-USD"
            f"{order_type}_order_config": order_config,  # Configuration specific to order type
        }
        path = "/api/v1/crypto/trading/orders/"
        return self.make_api_request("POST", path, json.dumps(body))

    def cancel_order(self, order_id: str) -> Any:
        # Cancel a previously placed order that hasn't executed yet
        path = f"/api/v1/crypto/trading/orders/{order_id}/cancel/"
        return self.make_api_request("POST", path)

    def get_order(self, order_id: str) -> Any:
        # Get information about a specific order by ID
        path = f"/api/v1/crypto/trading/orders/{order_id}/"
        return self.make_api_request("GET", path)

    def get_orders(self) -> Any:
        # Get information about all your orders
        path = "/api/v1/crypto/trading/orders/"
        return self.make_api_request("GET", path)
    
    def show_holdings(self):
        holdings = self.get_holdings()
        if holdings:
            print("\n=== YOUR CRYPTO HOLDINGS ===\n")
            # Pretty print with indentation and colors
            formatted_json = json.dumps(holdings, indent=4)
            
            # Add colors to the JSON output
            colored_json = ""
            for line in formatted_json.splitlines():
                if ":" in line:
                    # Color the keys in cyan and values in green
                    key, value = line.split(":", 1)
                    colored_json += f"{CYAN}{key}{WHITE}:{GREEN}{value}{RESET}\n"
                else:
                    # Color braces and brackets in yellow
                    if "{" in line or "}" in line or "[" in line or "]" in line:
                        colored_json += f"{YELLOW}{line}{RESET}\n"
                    else:
                        colored_json += f"{line}\n"
            
            print(colored_json)
             
            print(f"{WHITE}\n=== SIMPLIFIED HOLDINGS ==={RESET}\n")
            for holding in holdings:
                if 'quantity' in holding and 'asset_code' in holding:
                    print(f"{CYAN}Asset: {YELLOW}{holding['asset_code']:<8}{WHITE} | "
                          f"{CYAN}Quantity: {GREEN}{holding['quantity']:<15}{WHITE} | "
                          f"{CYAN}Value: {GREEN}${holding.get('cost_basis', 'N/A')}{RESET}")
                else:
                    print(f"{RED}No holdings found or error occurred{RESET}")
        else:
            print(f"{RED}No holdings found or error occurred{RESET}")


def main():
    # Create an instance of the API client
    api_trading_client = CryptoAPITrading()
    api_trading_client.show_holdings()
    # Get and print account information as a simple test
    # print(api_trading_client.get_account())
    
    # Get holdings data
    # holdings = api_trading_client.get_holdings()
    
    # # Format and print holdings in a more readable way
    # if holdings:
    #     print("\n=== YOUR CRYPTO HOLDINGS ===\n")
    #     # Pretty print with indentation
    #     print(json.dumps(holdings, indent=8))
        
    #     # Alternative: Display just essential info for each holding
    #     print("\n=== SIMPLIFIED HOLDINGS ===\n")
    #     for holding in holdings:
    #         if 'quantity' in holding and 'asset_code' in holding:
    #             print(f"Asset: {holding['asset_code']:<8} | Quantity: {holding['quantity']:<15} | Value: ${holding.get('cost_basis', 'N/A')}")
    # else:
    #     print("No holdings found or error occurred")
     


    # order = api_trading_client.place_order(
    #     str(uuid.uuid4()),
    #     "buy",
    #     "market",
    #     "DOGE-USD",
    #     {"asset_quantity": "1"}
    # )
    """
    BUILD YOUR TRADING STRATEGY HERE

    Example of how to place a buy order for 1 DOGE:
    order = api_trading_client.place_order(
          str(uuid.uuid4()),  # Generate a random unique ID
          "buy",              # Side (buy/sell)
          "market",           # Order type (market/limit)
          "DOGE-USD",         # Trading pair
          {"asset_quantity": "1"}  # Order quantity
    )
    """


# Standard Python idiom to run the main function only when executed directly
if __name__ == "__main__":
    main()