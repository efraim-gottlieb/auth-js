# תיעוד הפרויקט (עברית)

מסמך זה מתאר את מבנה, הארכיטקטורה, והשימוש בפרויקט Node.js קטן למערכת אימות (Auth).

## מבוא

הפרויקט הוא שירות API מבוסס Express שמספק רישום (`signin`) והתחברות (`login`) של משתמשים, שמירת משתמשים בבסיס נתונים MongoDB ושימוש ב-JWT עבור אימות. הקוד מופרד לשכבות: נתיבים (routes), בקרים (controllers), לוגיקה עסקית (services), репו (repos) ותשתית (infra).

## ארכיטקטורה גבוהה

Flow בסיסי של בקשת HTTP:

- לקוח → `Express` → `routes` → `controllers` → `services` → `repos` → `infra (MongoDB)`
- שגיאות מודליות ממוינות באמצעות חריגים (`ErrWithStatus`) המוגדר ב-`utils/utils.js`.
- אימות משתמשים מתבצע באמצעות `bcryptjs` לאחסון סיסמאות ו-`jsonwebtoken` ליצירת טוקנים.

## קבצים מרכזיים ותפקידם

- `server.js` — נקודת הכניסה של האפליקציה. מקימה חיבור למסד, מפעילה תיקנוֹת JSON, רושמת בקשות ומחברת את הנתיבים (`/api/auth`).
- `routes/auth.route.js` — מגדיר את הנתיבים של האותנטיקציה: `POST /api/auth/signin` ו-`POST /api/auth/login`.
- `controllers/auth.controller.js` — מבצע עיבוד בקשות HTTP פשוט: מקבל נתונים מהגוף (`req.body`) וקורא ל-`services` המתאים; מחזיר תשובות HTTP מתאימות.
- `services/auth.service.js` — לוגיקה עסקית של משתמשים: יצירת משתמשים (הצפנת סיסמה), אימות פרטי התחברות ויצירת JWT. משתמש ב-`bcryptjs` וב-`jsonwebtoken`.
- `repos/users.repo.js` — גישת הנתונים ל-MongoDB. יוצר אינדקס ייחודי על `username`, מספק `createUser` ו-`findByUsername`.
- `infra/mongoConnection.js` — חיבור ל-MongoDB באמצעות `MongoClient`. מייבא `process.env.MONGO_URI` ומספק הפונקציה `connectToMongo` והאובייקט `client` לשימוש שאר המודולים.
- `utils/utils.js` — מכיל `ErrWithStatus` (שגיאה עם סטטוס HTTP) לשימוש בכל היישום.
- `createsecretkey.js` — סקריפט קטן ליצירת `SECRET_KEY` אקראי (מדפיס hex ל-console). שימושי ליצירת ערך סודי לאימות JWT.
- `package.json` — תלויות וסקריפטים. סקריפט פיתוח: `npm run dev` (מפעיל `node --watch --env-file=.env server.js`).
- `tests/` — בדיקות פשוטות לדוגמא הנמצאות בפרויקט (לא קשורות ישירות ל-auth).

## נקודות חשובות ביישום

- סיסמאות נשמרות בצורה מוצפנת באמצעות `bcryptjs` (salt rounds = 12).
- בעת יצירת משתמש, הסיסמה המוצפנת נשמרת ב-DB; בקר השירות מוחק את השדה `password` מהאובייקט המוחזר כדי לא לשלוח אותו חזרה ללקוח.
- התחברות יוצרת טוקן JWT עם `process.env.SECRET_KEY` ותקופת חיים של שעה (`expiresIn: '1h'`).
- יש אינדקס ייחודי על `username` כדי למנוע רישום כפול.
- כל התקשרות למסד נעשית דרך `infra/mongoConnection.js` שמייצא `client` גלובלי ומחבר אותו בהפעלה.

## משתני סביבה דרושים

- `MONGO_URI` — מחרוזת החיבור ל-MongoDB.
- `SECRET_KEY` — המפתח הסודי ליצירת JWT (ניתן ליצור בעזרת `node createsecretkey.js`).

לדוגמה של `.env`:

```
MONGO_URI=mongodb://localhost:27017
SECRET_KEY=...הדבק_כאן_את_הסודית...
```

## נקודות אבטחה והמלצות

- יש לאחסן את `SECRET_KEY` במקום בטוח (env של השרת / secret manager), ולא בקוד.
- מומלץ להוסיף ולידציה חזקה יותר ל-`username` ו-`password` (אורך מינימלי, תווים מיועדים וכו').
- להוסיף מנגנון למניעת ניסיונות brute-force (rate limiting, lockouts).
- לשקול שימוש ב-HTTPS, וניהול טוקנים (refresh tokens) אם יש צורך בזרימות ארוכות טווח.

## API — נקודות קצה

- POST `/api/auth/signin`
  - גוף בקשת JSON: `{ "username": "...", "password": "..." }`
  - פעולה: יוצר משתמש חדש; מחזיר סטטוס `201` והודעה `user created` עם אובייקט המשתמש (ללא סיסמה).
  - שגיאות אפשריות: `409`/DB error (במקרה של שם משתמש קיים) או `500`.

- POST `/api/auth/login`
  - גוף בקשת JSON: `{ "username": "...", "password": "..." }`
  - פעולה: בודק פרטי התחברות; מחזיר מחרוזת טוקן JWT במקרה של הצלחה.
  - שגיאות אפשריות: `404` (user not found), `403` (not authorized), `500`.

התגובה לקבלת טוקן היא המחרוזת עצמה (כפי שמוחזרת כיום מה-`service`).

## איך להפעיל מקומית

1. להתקין תלויות:

```bash
npm install
```

2. ליצור קובץ `.env` עם המשתנים המצוינים למעלה.

3. להפעיל את השרת בסביבת פיתוח:

```bash
npm run dev
```

4. הרצת הסקריפט ליצירת `SECRET_KEY` (אופציונלי):

```bash
node createsecretkey.js
```

5. לקרוא לנתיבים בעזרת Postman / curl.

## בדיקות

התקייה כוללת כמה בדיקות דוגמא ב-`tests/`. הן משתמשות ב-`node:test` ונותנות דוגמה לפונקציות שאינן תלויות ב-DB. להריץ אותן ניתן ישירות בעזרת Node (לא מוגדר כרגע script ב-`package.json`):

```bash
node --test
```

או להריץ קובץ ספציפי עם `node`.

## הערות נוספות ושיפורים עתידיים

- הפרדת סכמה/ולידציה: כדאי להוסיף ספרייה כמו `Joi` או `zod` לולידציית בקשות.
- טיפול בשגיאות מרכזי (middleware) במקום טיפול מפוזר בבקרים.
- לוגים מובנים (logger) במקום `console.log`.
- הוספת תיעוד מוסמך ל-API כגון OpenAPI / Swagger.

---

קבצים לעיון מהיר:

- [server.js](server.js)
- [routes/auth.route.js](routes/auth.route.js)
- [controllers/auth.controller.js](controllers/auth.controller.js)
- [services/auth.service.js](services/auth.service.js)
- [repos/users.repo.js](repos/users.repo.js)
- [infra/mongoConnection.js](infra/mongoConnection.js)
- [utils/utils.js](utils/utils.js)
- [createsecretkey.js](createsecretkey.js)

אם תרצה, אשלים את התיעוד עם דוגמאות `curl` מלאות, דיאגרמת ארכיטקטורה ASCII, או אוסיף תרחישי בדיקה/CI. 
