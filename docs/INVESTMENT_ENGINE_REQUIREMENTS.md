# מנוע השקעות בשוק ההון – מסמך דרישות וניתוח מערכות

## 📋 סקירה כללית

מסמך זה כולל ניתוח דרישות וארכיטקטורה למערכת מנוע השקעות בשוק ההון.  
**חשוב:** הפרויקט הנוכחי (ebay-deals) הוא פלטפורמת דילים מאיביי – **לא מערכת השקעות**. נדרש להחליט אם לבנות את מנוע ההשקעות כפרויקט חדש או כמודול נוסף.

---

## 1. רכיבי ליבה של מנוע השקעות

### 1.1 צינור נתונים (Data Pipeline)
- **איסוף נתוני שוק** ממקורות מרובים: בורסות, נתוני ייחוס, נתונים חלופיים
- **אימות ונרמול** נתונים לפני אחסון
- **שכבות אחסון:**
  - Raw – נתונים גולמיים
  - Processed – מעובדים
  - Curated – מעוצבים לשימוש

### 1.2 יצירת סיגנלים (Signal Generation)
- מודלים לחיזוי
- מנועי אסטרטגיה שממירים נתוני שוק לסיגנלי מסחר
- אפשרויות: 19 מודלי חיזוי + 14 אסטרטגיות הקצאת תיק

### 1.3 ניהול סיכונים (Risk Management)
- מעקב רציף על פוזיציות
- ציות לחוקים
- מניעת כשלים קטסטרופליים

### 1.4 ביצוע עסקאות (Execution Infrastructure)
- ניתוב פקודות
- ביצוע ומעקב
- מהירות ואמינות

---

## 2. דרישות טכניות מרכזיות

| דרישות | תיאור |
|--------|--------|
| **עיבוד נתונים** | Real-time + היסטורי – Stream Processing (Apache Flink) + Batch |
| **מדרגיות** | פתרון Cloud עם חיבור ישיר לבורסות (למשל AWS Outposts) |
| **ביצועים** | תמיכה ב־4 סוגי עומסים: ingestion (מהיר), analytics (כבד), ML inference, backtesting |
| **בדיקות** | Walk-forward backtesting לפני פרודקשן |

---

## 3. מודל דומיין – Portfolios, Positions, Valuation, Risk

### 3.1 Portfolio Ledger
- חשבונות, תיקים, פוזיציות
- אירועים: עסקאות, העברות, עמלות, פעולות תאגידיות
- **אלמוניות (immutability)** – כל שינוי נרשם ולא ניתן לשינוי

### 3.2 Position Accounting
- ניהול lots
- P&L
- הצמדת עמלות
- המרת מטבעות

### 3.3 Valuation Logic
- כללי תמחור ברורים
- מחזורי רענון
- אסטרטגיית fallback כשאין נתונים

### 3.4 Risk Calculations
- VaR, Stress Testing
- חשיפה וריכוזיות
- רגישות לתרחישים

---

## 4. מקורות נתונים רלוונטיים

### 4.1 ישראל – בורסת ת"א (TASE)
| ספק | תיאור |
|-----|--------|
| **TASE Data Hub** | ממשק רשמי של הבורסה – נתונים יומיים, היסטוריים, הודעות, הרכב מדדים |
| **ICE Data Services** | Real-time TASE – Level 2, נתונים ברמת עסקה |
| **Twelve Data** | API לציון TASE, fundamentals, נתוני מסחר |

### 4.2 עולמי – APIs חינמיים
| ספק | יתרונות | הגבלות |
|-----|---------|---------|
| **Alpha Vantage** | 25 בקשות/יום חינם, JSON/Excel, 60+ אינדיקטורים, חדשות, fundamentals | Real-time בתשלום |
| **Yahoo Finance** | חינמי, ללא key רשמי (בשימוש יahoo-finance2) | ללא SLA, עלול להשתנות |
| **Twelve Data** | 800 בקשות/יום חינם | – |

### 4.3 שעות מסחר בישראל
- **א'–ה':** 09:59–17:14 (שעון קיץ)
- **ו':** 09:59–13:34
- **מערכת:** TACT (Tel-Aviv Continuous Trading)

---

## 5. ארכיטקטורה מומלצת

### 5.1 MVP (Minimum Viable Product)
לשלב ראשון – פלטפורמת ניהול תיק השקעות פשוטה:

```
┌─────────────────┐     ┌──────────────────┐     ┌─────────────────┐
│  Market Data    │────▶│  Backend API      │────▶│  Frontend       │
│  (Alpha Vantage │     │  - Portfolios     │     │  - Dashboard    │
│   / Twelve Data)│     │  - Positions      │     │  - Charts       │
└─────────────────┘     │  - Valuation      │     │  - Reports      │
                        └──────────────────┘     └─────────────────┘
```

### 5.2 Tech Stack מומלץ (בהתבסס על ebay-deals)
| רכיב | טכנולוגיה | הערה |
|------|-----------|------|
| **Backend** | Node.js + Express | התאמה לפרויקט הקיים |
| **Database** | SQLite / PostgreSQL | SQLite ל־MVP, PostgreSQL לפרודקשן |
| **Frontend** | React + Vite | כמו בפרויקט הקיים |
| **Market Data** | Alpha Vantage / Twelve Data | חינמי ל־MVP |
| **Scheduler** | node-cron | לתזמון עדכוני מחירים |
| **Charts** | Recharts / Chart.js | להצגת ביצועים |

### 5.3 הרחבה לעתיד
- **Real-time:** WebSockets + Redis Pub/Sub
- **ML/Analytics:** Python microservice
- **Backtesting:** מנוע Python נפרד (QuantConnect, Backtrader)
- **Execution:** אינטגרציה עם ברוקר (Interactive Brokers API וכו')

---

## 6. שלבי פיתוח מומלצים (12 שלבים)

עפ"י [Computools – Investment Management Platform](https://computools.com/how-to-build-investment-management-platform/):

1. **הגדרת Scope** – משתמשים, עומס, דרישות latency
2. **רגולציה ואבטחה** – KYC, RBAC, audit trail
3. **אסטרטגיית Market Data** – מקורות, ingestion, נרמול
4. **מודל דומיין** – portfolios, positions, valuation, risk
5. **בחירת ארכיטקטורה** – גבולות רכיבים, event-driven
6. **Portfolio Ledger + Calculation Engines** – ledger אלמוני, מנועי חישוב
7. **UI/UX** – דשבורד, גרפים, דוחות
8. **אינטגרציות** – ברוקרים, בנקים, KYC
9. **אבטחה ו־Compliance**
10. **אסטרטגיית בדיקות** – correctness, performance, security
11. **Deployment ו־Operations**
12. **Scaling ו־Roadmap**

---

## 7. תכונות MVP מוצעות

### 7.1 Phase 1 – בסיס
- [ ] ניהול תיקים (יצירה, עדכון, מחיקה)
- [ ] הזנת/סנכרון פוזיציות (מניות, ETF)
- [ ] עדכון מחירים יומי (Alpha Vantage / Twelve Data)
- [ ] חישוב שווי תיק
- [ ] דשבורד בסיסי עם גרפים

### 7.2 Phase 2 – אנליטיקה
- [ ] ביצועים היסטוריים
- [ ] אינדיקטורים טכניים (SMA, RSI, MACD)
- [ ] דוחות P&L
- [ ] התראות (מתחת ל־X%, מעל ל־Y%)

### 7.3 Phase 3 – מתקדם
- [ ] Backtesting אסטרטגיות
- [ ] חיזוי/סיגנלים (ML)
- [ ] אינטגרציה עם ברוקר
- [ ] ניוד רב-מטבעי

---

## 8. שאלות להבהרה לפני פיתוח

1. **פרויקט חדש או מודול?**  
   - פרויקט חדש נפרד, או מודול בתוך ebay-deals?

2. **שוק יעד?**  
   - ישראל (TASE בלבד), גלובלי, או שניהם?

3. **רמת מורכבות?**  
   - מעקב תיק בלבד, או גם ביצוע עסקאות?

4. **מקור נתונים מועדף?**  
   - Alpha Vantage, Twelve Data, TASE Data Hub (בתשלום)?

5. **אימות משתמשים?**  
   - שימוש במערכת הקיימת (JWT, roles) או מערכת חדשה?

---

## 9. מסקנות והמלצות

1. **להתחיל ב־MVP** – ניהול תיק + עדכון מחירים + דשבורד בסיסי.
2. **להשתמש ב־APIs חינמיים** – Alpha Vantage או Twelve Data לשלב ראשון.
3. **לשמור על מודולריות** – הפרדה ברורה בין data, calculation ו־presentation.
4. **לעצב ledger אלמוני** – כל שינוי בתיק מתועד ולא ניתן לשינוי.
5. **לבדוק היטב חישובים** – correctness testing מול נתונים ידועים לפני פרודקשן.

---

*מסמך זה הוכן כבסיס ללימוד הדרישות והמערכות. יש לאשר את השאלות בסעיף 8 לפני תחילת הפיתוח.*
