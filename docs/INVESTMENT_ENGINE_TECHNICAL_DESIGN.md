# תכנון טכני – מנוע השקעות אוטומטי

## עקרון מנחה

**Backtesting ראשון** – המערכת תיבנה כך שניתן להריץ ולבדוק את האסטרטגיה על נתוני עבר **לפני** כל חיבור לברוקר או מסחר חי. רק לאחר אימות יעילות המודל – מעבר ל־live.

---

## 1. ארכיטקטורה כללית

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                        PHASE 1: BACKTESTING (ראשון)                         │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                             │
│   ┌──────────────┐    ┌──────────────┐    ┌──────────────┐                │
│   │  Data Layer  │───▶│  Pandas      │───▶│  Backtrader  │                │
│   │  (yfinance)  │    │  Analysis    │    │  Engine      │                │
│   └──────────────┘    └──────────────┘    └──────┬───────┘                │
│          │                      │                  │                        │
│          │                      │                  ▼                        │
│          │                      │           ┌──────────────┐               │
│          │                      │           │  Strategy     │               │
│          │                      │           │  + Rules     │               │
│          │                      │           └──────┬───────┘               │
│          │                      │                  │                        │
│          ▼                      ▼                  ▼                        │
│   ┌──────────────────────────────────────────────────────────────┐         │
│   │              Results: Sharpe, CAGR, Drawdown, Trades          │         │
│   └──────────────────────────────────────────────────────────────┘         │
│                                                                             │
└─────────────────────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────────────────────┐
│                        PHASE 2: LIVE (עתידי)                               │
├─────────────────────────────────────────────────────────────────────────────┤
│   אותה לוגיקת Strategy + Rules → חיבור ל-Alpaca API                        │
└─────────────────────────────────────────────────────────────────────────────┘
```

---

## 2. מבנה הפרויקט

```
investment-engine/
├── pyproject.toml              # או requirements.txt
├── .env.example
├── README.md
│
├── src/
│   ├── __init__.py
│   │
│   ├── data/                   # שכבת נתונים
│   │   ├── __init__.py
│   │   ├── fetcher.py          # שליפת נתונים (yfinance)
│   │   ├── storage.py          # שמירה/טעינה מקומית (cache)
│   │   └── converters.py       # המרה ל-Backtrader format
│   │
│   ├── analysis/               # ניתוח עם Pandas
│   │   ├── __init__.py
│   │   ├── indicators.py       # SMA, RSI, וכו' (אופציונלי)
│   │   └── metrics.py          # חישוב מדדי ביצועים
│   │
│   ├── strategy/               # אסטרטגיה ו- Rules
│   │   ├── __init__.py
│   │   ├── rules_engine.py     # מנוע כללים (לוגיקה טהורה)
│   │   └── index_strategy.py   # Backtrader Strategy
│   │
│   ├── backtest/               # הרצת Backtesting
│   │   ├── __init__.py
│   │   ├── runner.py           # Cerebro setup + run
│   │   └── analyzers.py        # Custom analyzers
│   │
│   └── config/
│       ├── __init__.py
│       ├── symbols.py          # SPY, QQQ, VOO...
│       └── rules_config.py     # הגדרות כללים (20%, וכו')
│
├── scripts/
│   ├── run_backtest.py        # הרצת backtest מהמשתמש
│   └── download_data.py       # הורדת נתונים מראש
│
├── tests/
│   ├── test_rules_engine.py
│   ├── test_strategy.py
│   └── fixtures/              # נתוני בדיקה
│
└── output/                    # תוצאות backtest
    ├── reports/
    └── plots/
```

---

## 3. שכבת נתונים (Data Layer)

### 3.1 מקור נתונים – yfinance

**בחירה:** `yfinance` – חינמי, ללא API key, נתונים היסטוריים טובים ל־ETF.

```python
# fetcher.py
import yfinance as yf
import pandas as pd
from datetime import datetime

def fetch_ohlcv(symbols: list[str], start: str, end: str) -> dict[str, pd.DataFrame]:
    """מחזיר dict: symbol -> DataFrame עם Open, High, Low, Close, Volume"""
    data = {}
    for sym in symbols:
        df = yf.download(sym, start=start, end=end, progress=False, auto_adjust=True)
        if not df.empty:
            df.columns = [c.lower() for c in df.columns]
            data[sym] = df
    return data
```

### 3.2 פורמט Backtrader

Backtrader מצפה ל־DataFrame עם:
- **Index:** DatetimeIndex
- **Columns:** `open`, `high`, `low`, `close`, `volume` (lowercase)

```python
# converters.py
import backtrader as bt

def df_to_backtrader_feed(df: pd.DataFrame) -> bt.feeds.PandasData:
    """המרת DataFrame ל-PandasData של Backtrader"""
    return bt.feeds.PandasData(dataname=df)
```

### 3.3 Cache מקומי

שמירת נתונים ב־`data/cache/` כדי למנוע קריאות חוזרות ל־yfinance:

```python
# storage.py
def save_to_cache(symbol: str, df: pd.DataFrame, cache_dir: str = "data/cache"):
    path = f"{cache_dir}/{symbol}.parquet"
    df.to_parquet(path)

def load_from_cache(symbol: str, cache_dir: str) -> pd.DataFrame | None:
    path = f"{cache_dir}/{symbol}.parquet"
    if Path(path).exists():
        return pd.read_parquet(path)
    return None
```

---

## 4. מנוע כללים (Rules Engine)

### 4.1 לוגיקה טהורה – ללא תלות ב-Backtrader

הכללים מוגדרים כפונקציות שניתן לבדוק גם ביחידות:

```python
# rules_engine.py
from dataclasses import dataclass
from enum import Enum

class RuleAction(Enum):
    HOLD = "hold"
    SELL_ALL = "sell_all"           # Stop-Loss: מכור הכל
    SELL_PROFIT = "sell_profit"     # Take-Profit: מכור רווח, השאר השקעה

@dataclass
class PositionState:
    symbol: str
    entry_price: float
    current_price: float
    quantity: float
    entry_date: str

def evaluate_rules(position: PositionState, rules_config: dict) -> RuleAction:
    """
    בודק כללים על פוזיציה בודדת.
    rules_config: { "stop_loss_pct": 0.20, "take_profit_pct": 0.20 }
    """
    pct_change = (position.current_price - position.entry_price) / position.entry_price
    
    if pct_change <= -rules_config["stop_loss_pct"]:
        return RuleAction.SELL_ALL
    if pct_change >= rules_config["take_profit_pct"]:
        return RuleAction.SELL_PROFIT
    
    return RuleAction.HOLD
```

### 4.2 חישוב כמות למכירה (Take-Profit)

במקרה של `SELL_PROFIT` – למכור רק את הרווח, להשאיר את סכום ההשקעה המקורי:

```python
def calc_sell_profit_quantity(position: PositionState) -> float:
    """
    מחזיר כמות למכירה כך שהערך המה שנמכר = רווח (העודף מעל ההשקעה).
    השארית נשארת בתיק.
    """
    invested = position.entry_price * position.quantity
    current_value = position.current_price * position.quantity
    profit = current_value - invested
    if profit <= 0:
        return 0
    # כמות למכירה = רווח / מחיר נוכחי
    return profit / position.current_price
```

---

## 5. Backtrader Strategy

### 5.1 אסטרטגיה – Index Rules Strategy

```python
# index_strategy.py
import backtrader as bt
from .rules_engine import evaluate_rules, RuleAction, calc_sell_profit_quantity, PositionState

class IndexRulesStrategy(bt.Strategy):
    params = (
        ('stop_loss_pct', 0.20),   # 20% ירידה -> מכור הכל
        ('take_profit_pct', 0.20), # 20% עלייה -> מכור רווח
        ('allocation_per_asset', 0.25),  # 25% לכל נכס (4 נכסים)
    )

    def __init__(self):
        self.orders = {}  # symbol -> order
        self.entry_prices = {}  # symbol -> entry price
        self.entry_dates = {}

    def next(self):
        """נקרא בכל בר (יום)"""
        for i, data in enumerate(self.datas):
            symbol = data._name
            if not data or not data.close[0]:
                continue
            
            pos = self.getposition(data)
            current_price = float(data.close[0])
            
            if pos.size > 0:
                # יש פוזיציה – בדוק כללים
                entry_price = self.entry_prices.get(symbol, current_price)
                state = PositionState(
                    symbol=symbol, entry_price=entry_price,
                    current_price=current_price, quantity=pos.size,
                    entry_date=self.entry_dates.get(symbol, "")
                )
                rules = {"stop_loss_pct": self.p.stop_loss_pct, "take_profit_pct": self.p.take_profit_pct}
                action = evaluate_rules(state, rules)
                
                if action == RuleAction.SELL_ALL:
                    self.close(data=data)
                    self.entry_prices.pop(symbol, None)
                elif action == RuleAction.SELL_PROFIT:
                    qty = calc_sell_profit_quantity(state)
                    if qty > 0:
                        self.sell(data=data, size=qty)
            else:
                # אין פוזיציה – בדוק אם לקנות (למשל DCA / Rebalance)
                self._check_buy_signal(data, symbol)

    def notify_order(self, order):
        if order.isbuy() and order.status == order.Completed:
            self.entry_prices[order.data._name] = order.executed.price
            self.entry_dates[order.data._name] = self.data.datetime.date(0).isoformat()
```

### 5.2 לוגיקת קנייה (DCA / Rebalance)

בשלב ראשון – קנייה פשוטה בהקצאה שווה בתחילת התקופה:

```python
def _check_buy_signal(self, data, symbol):
    # דוגמה: קנה אם אין פוזיציה ויש מזומן
    cash = self.broker.getcash()
    if cash > 1000:  # מינימום
        value_per_trade = cash * self.p.allocation_per_asset
        size = value_per_trade / data.close[0]
        self.buy(data=data, size=size)
```

ניתן להחליף ללוגיקת DCA (תאריך קבוע) או Rebalance (סטייה מההקצאה).

---

## 6. הרצת Backtest (Runner)

```python
# runner.py
import backtrader as bt
from datetime import datetime
from ..data.fetcher import fetch_ohlcv
from ..data.converters import df_to_backtrader_feed
from ..strategy.index_strategy import IndexRulesStrategy

def run_backtest(
    symbols: list[str] = ["SPY", "QQQ", "VOO", "VTI"],
    start: str = "2020-01-01",
    end: str = "2024-12-31",
    initial_cash: float = 10000,
    stop_loss_pct: float = 0.20,
    take_profit_pct: float = 0.20,
) -> bt.Cerebro:
    
    cerebro = bt.Cerebro()
    cerebro.broker.setcash(initial_cash)
    
    # טען נתונים
    data_dict = fetch_ohlcv(symbols, start, end)
    for sym, df in data_dict.items():
        feed = df_to_backtrader_feed(df)
        feed.set_genre(bt.feeds.PandasData.Genre.OHLCV)
        cerebro.adddata(feed, name=sym)
    
    # אסטרטגיה
    cerebro.addstrategy(
        IndexRulesStrategy,
        stop_loss_pct=stop_loss_pct,
        take_profit_pct=take_profit_pct,
    )
    
    # Analyzers
    cerebro.addanalyzer(bt.analyzers.SharpeRatio, _name='sharpe')
    cerebro.addanalyzer(bt.analyzers.DrawDown, _name='drawdown')
    cerebro.addanalyzer(bt.analyzers.Returns, _name='returns')
    cerebro.addanalyzer(bt.analyzers.TradeAnalyzer, _name='trades')
    
    results = cerebro.run()
    return cerebro, results
```

---

## 7. ניתוח תוצאות (Pandas)

### 7.1 חישוב מדדים

```python
# metrics.py
import pandas as pd

def compute_metrics(cerebro, results) -> dict:
    strat = results[0]
    sharpe = strat.analyzers.sharpe.get_analysis()
    dd = strat.analyzers.drawdown.get_analysis()
    ret = strat.analyzers.returns.get_analysis()
    trades = strat.analyzers.trades.get_analysis()
    
    return {
        "sharpe_ratio": sharpe.get("sharperatio", 0),
        "max_drawdown_pct": dd.get("max", {}).get("drawdown", 0),
        "total_return_pct": ret.get("rtot", 0) * 100,
        "num_trades": trades.get("total", {}).get("closed", 0),
        "final_value": cerebro.broker.getvalue(),
    }
```

### 7.2 ייצוא ל-DataFrame

```python
def equity_curve_to_dataframe(strat) -> pd.DataFrame:
    """המרת עקומת equity ל-DataFrame לניתוח ב-Pandas"""
    # Backtrader שומר equity ב-broker - ניתן לחלץ דרך observers
    ...
```

---

## 8. תלויות (requirements.txt)

```
# Data
yfinance>=0.2.40
pandas>=2.0
numpy>=1.24

# Backtesting
backtrader>=1.9.78

# Storage (cache)
pyarrow>=14.0   # for parquet

# Utils
python-dotenv>=1.0
```

---

## 9. זרימת עבודה – Backtest מלא

```
1. download_data.py
   └─> הורדת SPY, QQQ, VOO, VTI מ-2020 עד היום
   └─> שמירה ב-data/cache/*.parquet

2. run_backtest.py
   └─> טעינת נתונים מ-cache (או yfinance אם אין)
   └─> המרה ל-Backtrader feeds
   └─> הרצת IndexRulesStrategy
   └─> חישוב Sharpe, Drawdown, Returns
   └─> הדפסת דוח + שמירת plot

3. אופציונלי: אופטימיזציה
   └─> cerebro.optstrategy(IndexRulesStrategy, stop_loss_pct=[0.15, 0.20, 0.25], ...)
```

---

## 10. בדיקות (Tests)

### 10.1 Rules Engine

```python
# test_rules_engine.py
def test_stop_loss_triggers_at_minus_20():
    state = PositionState("SPY", 100, 79, 10, "2024-01-01")
    rules = {"stop_loss_pct": 0.20, "take_profit_pct": 0.20}
    assert evaluate_rules(state, rules) == RuleAction.SELL_ALL

def test_take_profit_triggers_at_plus_20():
    state = PositionState("SPY", 100, 121, 10, "2024-01-01")
    rules = {"stop_loss_pct": 0.20, "take_profit_pct": 0.20}
    assert evaluate_rules(state, rules) == RuleAction.SELL_PROFIT
```

### 10.2 Strategy (עם נתונים סינתטיים)

יצירת DataFrame סינתטי עם תנועות ידועות ובדיקה שהאסטרטגיה מגיבה נכון.

---

## 11. סדר פיתוח מומלץ

| שלב | משימה | תוצר |
|-----|------|------|
| 1 | הגדרת פרויקט + requirements | מבנה תיקיות, venv |
| 2 | Data: fetcher + storage + converters | טעינת נתונים, המרה ל-BT |
| 3 | Rules Engine (לוגיקה טהורה) | `evaluate_rules`, `calc_sell_profit_quantity` |
| 4 | Tests ל-Rules Engine | אימות לוגיקה |
| 5 | IndexRulesStrategy ב-Backtrader | אסטרטגיה מלאה |
| 6 | Runner + Analyzers | `run_backtest.py` עובד |
| 7 | ניתוח תוצאות (Pandas metrics) | דוח Sharpe, DD, Returns |
| 8 | אופטימיזציה (optstrategy) | מציאת פרמטרים אופטימליים |

---

## 12. הערות חשובות

1. **Walk-Forward:** לאחר backtest ראשוני – לשקול Walk-Forward Analysis (אימון על תקופה, בדיקה על תקופה עוקבת).
2. **Overfitting:** להימנע מאופטימיזציה מוגזמת – פחות פרמטרים, יותר יציבות.
3. **עמלות:** Backtrader תומך ב-`commission` – להוסיף עמלה ריאליסטית (0 ל-Alpaca).
4. **Slippage:** אופציונלי – `cerebro.broker.set_slippage_percent(0.001)`.

---

*מסמך תכנון טכני – מוכן ליישום.*
