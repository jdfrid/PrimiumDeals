# Premium Deals - eBay Luxury Deals Platform

אתר דילים יוקרתיים מאיביי עם מערכת ניהול מלאה.

## 🚀 הרצה מהירה

### 1. התקנת תלויות

```bash
cd ebay-deals

# Backend
cd backend
npm install

# Frontend
cd ../frontend
npm install
```

### 2. הפעלה בסביבת פיתוח

פתח 2 טרמינלים:

**טרמינל 1 - Backend:**
```bash
cd ebay-deals/backend
npm run dev
```

**טרמינל 2 - Frontend:**
```bash
cd ebay-deals/frontend
npm run dev
```

### 3. גישה לאתר

- **אתר ציבורי:** http://localhost:5173
- **פאנל ניהול:** http://localhost:5173/admin
- **Voice Planner:** http://localhost:5173/voice-planner
- **API:** http://localhost:3001/api

### פרטי התחברות ברירת מחדל
- **Email:** admin@example.com
- **Password:** admin123

---

## 📦 Deployment לשרת

### אופציה 1: Docker (מומלץ)

```bash
# העתק את קובץ הסביבה
cp .env.example .env
# ערוך את .env עם הערכים הנכונים

# הרץ עם Docker
docker-compose up -d --build
```

### אופציה 2: הרצה ידנית

```bash
# Build frontend
cd frontend && npm run build

# Start production server
cd ../backend && npm start
```

האתר יהיה זמין בפורט 3001.

---

## 🔧 הגדרות

ערוך את קובץ `.env` בתיקיית backend:

```env
PORT=3001
JWT_SECRET=your-secret-key

# eBay API
EBAY_APP_ID=davidde-PrimiumD-PRD-26e774d48-9c51a1cc
EBAY_DEV_ID=062ae1a6-8695-4af1-9b66-9df03d5a1f
EBAY_CERT_ID=davidade-PrimiumD-PRD-26e774d48-9c51a1cc
EBAY_CAMPAIGN_ID=5339122678
EBAY_TOKEN=your-token

# Admin
ADMIN_EMAIL=admin@example.com
ADMIN_PASSWORD=admin123

# Voice Planner - שמירת פגישות ומשימות מהקלטה
OPENAI_API_KEY=your-openai-key
GOOGLE_CLIENT_ID=your-google-oauth-client-id
GOOGLE_CLIENT_SECRET=your-google-oauth-client-secret
# בפיתוח: http://localhost:3001/api/voice-planner/google/callback
# בפרודקשן: https://your-domain.com/api/voice-planner/google/callback
GOOGLE_REDIRECT_URI=http://localhost:3001/api/voice-planner/google/callback
# אופציונלי להגנה בסיסית על המסך הציבורי
VOICE_PLANNER_ACCESS_KEY=
# אופציונלי בפיתוח כדי שה-OAuth יחזור ל-Vite
VOICE_PLANNER_APP_URL=http://localhost:5173/voice-planner
```

## Voice Planner

המסך נמצא ב-`/voice-planner` ופועל בלי משתמשי מערכת. בפעם הראשונה לוחצים "התחבר עם Google", מאשרים הרשאות ל-Calendar ול-Tasks, והטוקן נשמר בקובץ מקומי תחת `DATA_DIR`.

ב-Google Cloud צריך ליצור OAuth Client מסוג Web Application ולהוסיף Redirect URI:
`http://localhost:3001/api/voice-planner/google/callback` לפיתוח, או `https://your-domain.com/api/voice-planner/google/callback` לפרודקשן.

פקודות קוליות צריכות להתחיל ב-`משימה` או `זימון`, למשל:
`זימון פגישת עבודה ביום שלישי ב-10 בבוקר במשרד`.

---

## 📋 תכונות

### אתר ציבורי
- ✅ עיצוב יוקרתי כהה עם זהב
- ✅ תצוגת דילים עם הנחה 30%+
- ✅ סינון לפי קטגוריה
- ✅ מיון לפי הנחה/מחיר/חדש
- ✅ קישורים עם affiliate לאיביי

### פאנל ניהול
- ✅ ניהול משתמשים והרשאות
- ✅ ניהול דילים
- ✅ ניהול קטגוריות
- ✅ כללי שאילתות אוטומטיות
- ✅ הפעלה ידנית של שאילתות
- ✅ לוגים של שאילתות

### אינטגרציה עם eBay
- ✅ חיפוש אוטומטי לפי מילות מפתח
- ✅ סינון לפי טווח מחירים ($500-$1000)
- ✅ סינון לפי אחוז הנחה
- ✅ תזמון שאילתות (כל 24 שעות)
- ✅ Campaign ID לעמלות שותפים

---

## 🌐 Git & Hosting

### העלאה ל-Git

```bash
cd ebay-deals
git init
git add .
git commit -m "Initial commit - Premium Deals Platform"
git remote add origin https://github.com/YOUR_USERNAME/ebay-deals.git
git push -u origin main
```

### אפשרויות Hosting מומלצות

1. **Railway.app** - פשוט ומהיר
2. **Render.com** - חינמי לפרויקטים קטנים
3. **DigitalOcean App Platform**
4. **VPS עם Docker**

---

Built with ❤️ for luxury deal hunters


