# 🤖 Telegram Bot Setup Guide

## Step 1: Create a Bot

1. Open Telegram and search for `@BotFather`
2. Send `/newbot`
3. Choose a name: `Dealsluxy Deals`
4. Choose a username: `dealsluxy_deals_bot` (must end with `_bot`)
5. You'll receive a **Bot Token** like: `7123456789:AAHxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx`
6. **Save this token!**

## Step 2: Create a Channel

1. In Telegram, tap "New Channel"
2. Name it: `Dealsluxy Hot Deals` (or any name)
3. Make it **Public** and set username: `@dealsluxy_deals`
4. Add your bot as **Administrator** with "Post Messages" permission

## Step 3: Get Channel ID

Your channel ID is: `@dealsluxy_deals` (the username you set)
Or for private channels, use the numeric ID (starts with -100)

## Step 4: Add to Render Environment Variables

In Render Dashboard → Your Service → Environment:

```
TELEGRAM_BOT_TOKEN=7123456789:AAHxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
TELEGRAM_CHANNEL_ID=@dealsluxy_deals
```

## Step 5: Test

After deploy, go to Admin → Social Hub and the bot will auto-post!

---

## Automatic Posting Schedule

The system will automatically post:
- **Every 4 hours**: Top 3 new deals
- **Daily at 9:00 AM**: "Daily Deals" summary
- **Instantly**: Deals with 50%+ discount

---

## Manual Posting

From Admin panel, you can also trigger posts manually:
- Admin → Social Hub → Click Telegram icon on any banner
- Or use API: `POST /api/admin/social/post`



