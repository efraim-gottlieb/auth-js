# תיעוד הפרויקט (עברית)

מסמך זה מתאר את מבנה, הארכיטקטורה, והשימוש בפרויקט Node.js קטן למערכת אימות (Auth).

---

## מבוא

הפרויקט הוא שירות API מבוסס Express שמספק רישום (`signin`) והתחברות (`login`) של משתמשים, שמירת משתמשים בבסיס נתונים MongoDB ושימוש ב-JWT עבור אימות. הקוד מופרד לשכבות: נתיבים (routes), בקרים (controllers), לוגיקה עסקית (services), repos ותשתית (infra).

---

## ארכיטקטורה גבוהה

### דיאגרמת זרימה

```
┌─────────┐      ┌─────────────┐      ┌────────────────┐      ┌─────────────────┐      ┌──────────────┐      ┌─────────┐
│ Client  │ ──▶  │  server.js  │ ──▶  │ auth.route.js  │ ──▶  │ auth.controller │ ──▶  │ auth.service │ ──▶  │  repo   │
│ (HTTP)  │      │  (Express)  │      │   (Router)     │      │    (Handler)    │      │  (Logic)     │      │ (Mongo) │
└─────────┘      └─────────────┘      └────────────────┘      └─────────────────┘      └──────────────┘      └─────────┘
                        │                                                                                         │
                        │                                                                                         ▼
                        └─────────────────────────────────────────────────────────────────────────────────▶  MongoDB
```

### עקרונות עיצוב

| שכבה | תפקיד | קבצים |
|------|-------|-------|
| **Routes** | הגדרת נתיבי API וחיבור ל-handlers | `routes/auth.route.js` |
| **Controllers** | קבלת בקשות HTTP, ולידציה בסיסית, קריאה ל-services | `controllers/auth.controller.js` |
| **Services** | לוגיקה עסקית, הצפנה, יצירת טוקנים | `services/auth.service.js` |
| **Repos** | גישה ישירה למסד נתונים | `repos/users.repo.js` |
| **Infra** | חיבורים חיצוניים (DB) | `infra/mongoConnection.js` |
| **Utils** | כלים משותפים | `utils/utils.js` |

---

## פירוט קבצים ופונקציות

---

### 📄 `server.js` — נקודת הכניסה

**מיקום:** שורש הפרויקט

**תפקיד:** אתחול האפליקציה, חיבור ל-MongoDB, הגדרת middleware והפעלת השרת.

**ייבואים:**
- `express` — framework לשרת HTTP
- `authRoutes` — הנתיבים מ-`routes/auth.route.js`
- `connectToMongo` — פונקציית החיבור מ-`infra/mongoConnection.js`

**קוד מפורט:**

```javascript
const app = express();
const PORT = 8000;
```
- יוצר אובייקט Express ומגדיר פורט 8000.

```javascript
await connectToMongo();
```
- מחבר למסד MongoDB לפני שהשרת מתחיל להאזין.

```javascript
app.use(express.json());
```
- Middleware לפענוח גוף בקשות JSON.

```javascript
app.use('/', async (req, res, next) => {
  console.log(`${req.method} ${req.url}`);
  next();
});
```
- Middleware ללוגים — מדפיס כל בקשה נכנסת (method + URL).

```javascript
app.use("/api/auth", authRoutes);
```
- מחבר את כל נתיבי האותנטיקציה תחת `/api/auth`.

```javascript
app.listen(PORT, async () => {
  console.log(`server run on ${PORT}...`);
});
```
- מפעיל את השרת להאזנה על הפורט.

---

### 📄 `routes/auth.route.js` — נתיבי אותנטיקציה

**מיקום:** `routes/auth.route.js`

**תפקיד:** הגדרת נקודות הקצה (endpoints) של מערכת האימות.

**ייבואים:**
- `Router` מ-express — יצירת router מודולרי
- `authController` — הבקר עם הפונקציות לטיפול בבקשות

**נתיבים מוגדרים:**

| Method | Path | Handler | תיאור |
|--------|------|---------|-------|
| POST | `/signin` | `authController.signin` | רישום משתמש חדש |
| POST | `/login` | `authController.login` | התחברות וקבלת טוקן |

**קוד:**
```javascript
router.post("/signin", authController.signin)
router.post("/login", authController.login)
```

---

### 📄 `controllers/auth.controller.js` — בקר אותנטיקציה

**מיקום:** `controllers/auth.controller.js`

**תפקיד:** עיבוד בקשות HTTP, חילוץ נתונים מהבקשה, קריאה ל-service והחזרת תשובה.

**ייבואים:**
- `createUsersRepo` — יצירת repository
- `createUsersServices` — יצירת service (מקבל repo כתלות)

**אתחול:**
```javascript
const usersRepo = createUsersRepo();
const usersServices = createUsersServices(usersRepo);
```
- יוצר instance של ה-repo וה-service עם Dependency Injection.

---

#### 🔹 פונקציה: `signin(req, res)`

**תפקיד:** טיפול בבקשת רישום משתמש חדש.

**פרמטרים:**
- `req` — אובייקט הבקשה (Express Request)
- `res` — אובייקט התשובה (Express Response)

**שדות נדרשים ב-body:**
- `username` (string) — שם המשתמש
- `password` (string) — הסיסמה

**זרימה:**
1. חילוץ `username` ו-`password` מ-`req.body`
2. קריאה ל-`usersServices.createUser(username, password)`
3. החזרת סטטוס `201` עם הודעת הצלחה ואובייקט המשתמש (ללא סיסמה)
4. במקרה של שגיאה — החזרת סטטוס השגיאה או `500`

**תשובות אפשריות:**
| Status | Body | מצב |
|--------|------|-----|
| 201 | `{ msg: "user created", user: {...} }` | הצלחה |
| 500 | `"Server internal error"` | שגיאה כללית |
| שגיאה מותאמת | `error.message` | שגיאה עם סטטוס מוגדר |

---

#### 🔹 פונקציה: `login(req, res)`

**תפקיד:** טיפול בבקשת התחברות.

**פרמטרים:**
- `req` — אובייקט הבקשה
- `res` — אובייקט התשובה

**שדות נדרשים ב-body:**
- `username` (string)
- `password` (string)

**זרימה:**
1. חילוץ `username` ו-`password` מ-`req.body`
2. קריאה ל-`usersServices.login(username, password)`
3. החזרת טוקן JWT כמחרוזת
4. במקרה של שגיאה — החזרת סטטוס מתאים

**תשובות אפשריות:**
| Status | Body | מצב |
|--------|------|-----|
| 200 | `"eyJhbGc..."` (JWT token) | הצלחה |
| 404 | `"User not found"` | משתמש לא קיים |
| 403 | `"Not authorized"` | סיסמה שגויה |
| 500 | `"Server internal error"` | שגיאה כללית |

---

### 📄 `services/auth.service.js` — לוגיקה עסקית

**מיקום:** `services/auth.service.js`

**תפקיד:** כל הלוגיקה העסקית — הצפנת סיסמאות, אימות משתמשים, יצירת טוקנים.

**ייבואים:**
- `bcrypt` מ-`bcryptjs` — הצפנת סיסמאות
- `jwt` מ-`jsonwebtoken` — יצירת JWT
- `ErrWithStatus` — מחלקת שגיאה מותאמת

**מבנה:** Factory function שמקבל `repo` ומחזיר אובייקט עם פונקציות.

```javascript
export default function createUsersServices(repo) { ... }
```

---

#### 🔹 פונקציה: `hashPassword(password)`

**תפקיד:** הצפנת סיסמה באמצעות bcrypt.

**פרמטרים:**
- `password` (string) — הסיסמה הגולמית

**מחזיר:** `Promise<string>` — הסיסמה המוצפנת (hash)

**פרטים טכניים:**
- Salt rounds: 12 (רמת אבטחה גבוהה)
- אלגוריתם: bcrypt

```javascript
function hashPassword(password) {
  return bcrypt.hash(password, 12);
}
```

---

#### 🔹 פונקציה: `createUser(username, password)`

**תפקיד:** יצירת משתמש חדש במערכת.

**פרמטרים:**
- `username` (string) — שם המשתמש
- `password` (string) — הסיסמה הגולמית

**מחזיר:** `Promise<Object>` — אובייקט המשתמש (ללא סיסמה)

**זרימה:**
1. הצפנת הסיסמה עם `hashPassword`
2. קריאה ל-`repo.createUser` עם username וסיסמה מוצפנת
3. מחיקת שדה `password` מהאובייקט המוחזר
4. החזרת האובייקט

```javascript
async function createUser(username, password){
   const hashedPassword = await hashPassword(password);
   const user = await repo.createUser({username, password: hashedPassword})
   delete user.password
   return user
}
```

---

#### 🔹 פונקציה: `validateUserCredetials(username, password)`

**תפקיד:** אימות פרטי התחברות של משתמש.

**פרמטרים:**
- `username` (string)
- `password` (string) — סיסמה גולמית לבדיקה

**מחזיר:** `Promise<{ id: string }>` — אובייקט עם מזהה המשתמש

**זרימה:**
1. חיפוש משתמש לפי username
2. אם לא נמצא — זריקת `ErrWithStatus('User not found', 404)`
3. השוואת סיסמה עם bcrypt.compare
4. אם לא תואמת — זריקת `ErrWithStatus('Not authorized', 403)`
5. החזרת אובייקט עם `id`

```javascript
async function validateUserCredetials(username, password){
  const user = await repo.findByUsername(username);
  if(!user) throw new ErrWithStatus('User not found', 404);
  const valid = await bcrypt.compare(password, user.password);
  if(!valid) throw new ErrWithStatus('Not authorized', 403);
  return {id: user._id.toString()};
}
```

---

#### 🔹 פונקציה: `login(username, password)`

**תפקיד:** תהליך התחברות מלא — אימות ויצירת טוקן.

**פרמטרים:**
- `username` (string)
- `password` (string)

**מחזיר:** `Promise<string>` — טוקן JWT

**זרימה:**
1. קריאה ל-`validateUserCredetials` לקבלת payload
2. קריאה ל-`generateToken` עם ה-payload
3. החזרת הטוקן

```javascript
async function login(username, password){
    const payload = await validateUserCredetials(username, password)
    return generateToken(payload)
}
```

---

#### 🔹 פונקציה: `generateToken(payload)`

**תפקיד:** יצירת טוקן JWT חתום.

**פרמטרים:**
- `payload` (Object) — הנתונים להכללה בטוקן (למשל `{ id: "..." }`)

**מחזיר:** `string` — טוקן JWT חתום

**פרטים טכניים:**
- מפתח חתימה: `process.env.SECRET_KEY`
- תוקף: שעה אחת (`expiresIn: '1h'`)

```javascript
function generateToken(payload){
  return jwt.sign(payload, process.env.SECRET_KEY, {expiresIn:'1h'})
}
```

---

### 📄 `repos/users.repo.js` — שכבת הנתונים

**מיקום:** `repos/users.repo.js`

**תפקיד:** גישה ישירה למסד MongoDB — יצירה וחיפוש משתמשים.

**ייבואים:**
- `client` מ-`infra/mongoConnection.js`

**אתחול:**
```javascript
const collection = client.db('users').collection('users');
await collection.createIndex({username: 1}, {unique: true});
```
- מגדיר את ה-collection לעבודה
- יוצר אינדקס ייחודי על `username` למניעת כפילויות

**מבנה:** Factory function שמחזיר אובייקט עם פונקציות.

---

#### 🔹 פונקציה: `createUser(user)`

**תפקיד:** הוספת משתמש חדש למסד.

**פרמטרים:**
- `user` (Object) — `{ username: string, password: string }`

**מחזיר:** `Promise<Object>` — אובייקט המשתמש שנוצר (כולל `_id`)

**זרימה:**
1. הכנסת המשתמש ל-collection
2. שליפת המשתמש שנוצר לפי `insertedId`
3. החזרת האובייקט

```javascript
async function createUser(user){
  const result = await collection.insertOne(user);
  const newUser = await collection.findOne({_id: result.insertedId});
  return newUser
}
```

---

#### 🔹 פונקציה: `findByUsername(username)`

**תפקיד:** חיפוש משתמש לפי שם משתמש.

**פרמטרים:**
- `username` (string)

**מחזיר:** `Promise<Object|null>` — אובייקט המשתמש או `null` אם לא נמצא

```javascript
function findByUsername(username){
  return collection.findOne({username});
}
```

---

### 📄 `infra/mongoConnection.js` — חיבור MongoDB

**מיקום:** `infra/mongoConnection.js`

**תפקיד:** ניהול החיבור למסד MongoDB.

**ייבואים:**
- `MongoClient` מ-`mongodb`

**ייצואים:**
- `client` — אובייקט ה-MongoClient
- `connectToMongo` — פונקציית החיבור

---

#### 🔹 משתנה: `client`

```javascript
export const client = new MongoClient(process.env.MONGO_URI)
```
- יוצר MongoClient עם URI מ-environment variable
- מיוצא לשימוש בכל המודולים

---

#### 🔹 פונקציה: `connectToMongo()`

**תפקיד:** התחברות למסד והדפסת סטטוס.

**מחזיר:** `Promise<void>`

**זרימה:**
1. ניסיון התחברות עם `client.connect()`
2. הדפסת הודעת הצלחה
3. במקרה של שגיאה — הדפסת הודעת כישלון

```javascript
export async function connectToMongo(){
  try {
    await client.connect();
    console.log('Connected to MongoDB...');
  } catch (error) {
    console.log('Could not connect to mongo');
  }
}
```

---

### 📄 `utils/utils.js` — כלים משותפים

**מיקום:** `utils/utils.js`

**תפקיד:** מחלקות וכלים לשימוש בכל האפליקציה.

---

#### 🔹 מחלקה: `ErrWithStatus`

**תפקיד:** שגיאה מותאמת עם קוד סטטוס HTTP.

**יורשת מ:** `Error`

**Constructor:**
- `msg` (string) — הודעת השגיאה
- `status` (number) — קוד סטטוס HTTP

**שימוש:**
```javascript
throw new ErrWithStatus('User not found', 404);
throw new ErrWithStatus('Not authorized', 403);
```

**קוד:**
```javascript
export class ErrWithStatus extends Error{
  constructor(msg, status){
    super(msg);
    this.status = status;
  }
}
```

---

### 📄 `createsecretkey.js` — יצירת מפתח סודי

**מיקום:** שורש הפרויקט

**תפקיד:** סקריפט עזר ליצירת מפתח סודי אקראי ל-JWT.

**ייבואים:**
- `crypto` — מודול קריפטוגרפיה מובנה של Node.js

**פעולה:**
1. יוצר 64 bytes אקראיים
2. ממיר ל-hex string
3. מדפיס ל-console

**שימוש:**
```bash
node createsecretkey.js
```

**פלט לדוגמה:**
```
a3f8d2b1c4e5f6a7b8c9d0e1f2a3b4c5d6e7f8a9b0c1d2e3f4a5b6c7d8e9f0a1...
```

**קוד:**
```javascript
import crypto from 'crypto';
const secret = crypto.randomBytes(64).toString('hex');
console.log(secret)
```

---

### 📄 `package.json` — הגדרות הפרויקט

**תלויות (dependencies):**

| חבילה | גרסה | תפקיד |
|-------|------|-------|
| `express` | ^5.2.1 | Framework לשרת HTTP |
| `mongodb` | ^7.0.0 | דרייבר MongoDB |
| `bcryptjs` | ^3.0.3 | הצפנת סיסמאות |
| `jsonwebtoken` | ^9.0.3 | יצירת ואימות JWT |
| `dotenv` | ^17.2.3 | טעינת משתני סביבה |
| `nodemon` | ^3.1.11 | הפעלה מחדש אוטומטית בפיתוח |
| `mysql2` | ^3.16.0 | (לא בשימוש כרגע) |

**סקריפטים:**

| Script | פקודה | תיאור |
|--------|-------|-------|
| `dev` | `node --watch --env-file=.env server.js` | הרצה בפיתוח עם hot-reload וטעינת .env |
| `start` | `node server.js` | הרצה בייצור |

**הגדרות:**
- `"type": "module"` — שימוש ב-ES Modules (import/export)

---

### 📁 `tests/` — בדיקות

**מיקום:** `tests/`

**קבצים:**
- `index.js` — פונקציות לבדיקה
- `index.test.js` — קובץ הבדיקות
- `package.json` — הגדרות נפרדות לתיקייה

**הערה:** הבדיקות הקיימות הן דוגמאות כלליות ולא קשורות ישירות למערכת האימות.

**הרצת בדיקות:**
```bash
node --test tests/
```

---

## משתני סביבה דרושים

| משתנה | תיאור | דוגמה |
|-------|-------|-------|
| `MONGO_URI` | מחרוזת החיבור ל-MongoDB | `mongodb://localhost:27017` |
| `SECRET_KEY` | המפתח הסודי ליצירת JWT | מחרוזת hex ארוכה |

**דוגמת קובץ `.env`:**
```
MONGO_URI=mongodb://localhost:27017
SECRET_KEY=a3f8d2b1c4e5f6a7b8c9d0e1f2a3b4c5...
```

---

## API — נקודות קצה

### POST `/api/auth/signin`

**תיאור:** רישום משתמש חדש

**Request Body:**
```json
{
  "username": "john_doe",
  "password": "mySecurePassword123"
}
```

**Response (201):**
```json
{
  "msg": "user created",
  "user": {
    "_id": "64a1b2c3d4e5f6g7h8i9j0k1",
    "username": "john_doe"
  }
}
```

**שגיאות:**
- `500` — שגיאת שרת / שם משתמש כבר קיים

---

### POST `/api/auth/login`

**תיאור:** התחברות וקבלת טוקן

**Request Body:**
```json
{
  "username": "john_doe",
  "password": "mySecurePassword123"
}
```

**Response (200):**
```
eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpZCI6IjY0YTFiMmMzZDRlNWY2ZzdoOGk5ajBrMSIsImlhdCI6MTY4ODQzMjAwMCwiZXhwIjoxNjg4NDM1NjAwfQ.abc123...
```

**שגיאות:**
- `404` — User not found
- `403` — Not authorized
- `500` — Server internal error

---

## דוגמאות curl

### רישום משתמש
```bash
curl -X POST http://localhost:8000/api/auth/signin \
  -H "Content-Type: application/json" \
  -d '{"username": "test_user", "password": "test123"}'
```

### התחברות
```bash
curl -X POST http://localhost:8000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"username": "test_user", "password": "test123"}'
```

---

## איך להפעיל מקומית

1. **התקנת תלויות:**
```bash
npm install
```

2. **יצירת מפתח סודי:**
```bash
node createsecretkey.js
```

3. **יצירת קובץ `.env`:**
```bash
echo "MONGO_URI=mongodb://localhost:27017" > .env
echo "SECRET_KEY=YOUR_GENERATED_KEY" >> .env
```

4. **הפעלת MongoDB** (וודא שרץ מקומית או בענן)

5. **הפעלת השרת:**
```bash
npm run dev
```

---

## נקודות אבטחה והמלצות

- ✅ סיסמאות מוצפנות עם bcrypt (salt rounds = 12)
- ✅ שימוש ב-JWT עם תוקף מוגבל (1 שעה)
- ✅ אינדקס ייחודי על username

**המלצות לשיפור:**
- 🔒 הוספת rate limiting למניעת brute-force
- 🔒 ולידציה חזקה יותר על שדות הקלט (Joi/Zod)
- 🔒 שימוש ב-HTTPS בייצור
- 🔒 הוספת refresh tokens לזרימות ארוכות טווח
- 🔒 middleware לטיפול בשגיאות מרכזי
- 🔒 לוגים מובנים (Winston/Pino)

---

## קבצים לעיון מהיר

- [server.js](server.js)
- [routes/auth.route.js](routes/auth.route.js)
- [controllers/auth.controller.js](controllers/auth.controller.js)
- [services/auth.service.js](services/auth.service.js)
- [repos/users.repo.js](repos/users.repo.js)
- [infra/mongoConnection.js](infra/mongoConnection.js)
- [utils/utils.js](utils/utils.js)
- [createsecretkey.js](createsecretkey.js)
