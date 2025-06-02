from alpaca.trading.client import TradingClient
from alpaca.trading.requests import MarketOrderRequest
from alpaca.trading.enums import OrderSide, TimeInForce


client = TradingClient("PKPEYUA9ON0QWLKBS8U3","KJcXGJyMbGsWq2xGzRHefxcrbbO6cqfql8t0dOej")

account = client.get_account().account_number
buying_power = client.get_account().buying_power

market_order = MarketOrderRequest(
    symbol="TSLA",
    qty=1,
    side=OrderSide.BUY,
    time_in_force=TimeInForce.DAY
)

order = client.submit_order(market_order)


print(account)
print(buying_power)
print(order)

