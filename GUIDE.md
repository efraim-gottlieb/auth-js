# 📚 מדריך מפורט - Auth-JS

מדריך שלב-אחר-שלב שמסביר כל קובץ, פונקציה וייבוא בפרויקט.

---

## 📑 תוכן עניינים

1. [server.js - נקודת הכניסה](#1-serverjs---נקודת-הכניסה)
2. [container.js - ניהול תלויות](#2-containerjs---ניהול-תלויות)
3. [infra/mongoConnection.js - חיבור לדאטאבייס](#3-inframogoconnectionjs---חיבור-לדאטאבייס)
4. [routes/auth.route.js - הגדרת נתיבים](#4-routesauthroutejs---הגדרת-נתיבים)
5. [middlewares/auth.middleware.js - אימות טוקן](#5-middlewaresauthmiddlewarejs---אימות-טוקן)
6. [controllers/auth.controller.js - טיפול בבקשות](#6-controllersauthcontrollerjs---טיפול-בבקשות)
7. [services/auth.service.js - לוגיקה עסקית](#7-servicesauthservicejs---לוגיקה-עסקית)
8. [repos/users.repo.js - גישה לדאטאבייס](#8-reposusersrepojs---גישה-לדאטאבייס)
9. [utils/ - כלי עזר](#9-utils---כלי-עזר)

---

## 1. server.js - נקודת הכניסה

```javascript
import express from "express";
```
**מה זה עושה:** מייבא את Express - framework לבניית שרתי web ב-Node.js

```javascript
import authRoutes from "./routes/auth.route.js";
```
**מה זה עושה:** מייבא את כל הנתיבים (routes) של האימות

```javascript
import { connectToMongo } from "./infra/mongoConnection.js";
```
**מה זה עושה:** מייבא את הפונקציה שמתחברת ל-MongoDB

```javascript
const app = express();
```
**מה זה עושה:** יוצר instance של Express application

```javascript
const PORT = 8000;
```
**מה זה עושה:** מגדיר את הפורט שהשרת יאזין עליו

```javascript
await connectToMongo();
```
**מה זה עושה:** מתחבר ל-MongoDB לפני שהשרת מתחיל לקבל בקשות (Top-level await)

```javascript
app.use(express.json());
```
**מה זה עושה:** Middleware שמפענח JSON מגוף הבקשה (request body) והופך אותו לאובייקט JavaScript ב-`req.body`

```javascript
app.use('/', async (req, res, next) => {
  console.log(`${req.method} ${req.url}`);
  next();
});
```
**מה זה עושה:** Middleware לוגים - מדפיס כל בקשה שמגיעה (GET /api/auth/login וכו')
- `req.method` - סוג הבקשה (GET, POST, PUT, DELETE)
- `req.url` - הנתיב שנשלח
- `next()` - ממשיך ל-middleware/route הבא

```javascript
app.use("/api/auth", authRoutes);
```
**מה זה עושה:** מחבר את כל הנתיבים מ-authRoutes תחת הקידומת `/api/auth`

```javascript
app.listen(PORT, async () => {
  console.log(`server run on ${PORT}...`);
});
```
**מה זה עושה:** מפעיל את השרת ומאזין לבקשות על הפורט שהוגדר

---

## 2. container.js - ניהול תלויות

```javascript
import { createUsersRepo } from "./repos/users.repo.js";
```
**מה זה עושה:** מייבא את ה-factory function שיוצרת את שכבת הנתונים

```javascript
import createUsersService from './services/auth.service.js'
```
**מה זה עושה:** מייבא את ה-factory function שיוצרת את שכבת הלוגיקה העסקית

```javascript
function createContainer(){
  const usersRepo = createUsersRepo()
  const usersService = createUsersService(usersRepo)
  return {usersRepo, usersService}
}
```
**מה זה עושה:** 
- **Dependency Injection Pattern** - יוצר את כל האובייקטים במקום אחד
- קודם יוצר את `usersRepo` (שכבת הנתונים)
- אז מזריק אותו ל-`usersService` (כי הוא תלוי בו)
- מחזיר אובייקט עם שניהם

**למה זה טוב?**
- קל להחליף מימושים (למשל mock לבדיקות)
- התלויות מוגדרות במקום אחד
- קל לראות מי תלוי במי

```javascript
const container = createContainer()
export default container;
```
**מה זה עושה:** יוצר instance יחיד (Singleton) ומייצא אותו

---

## 3. infra/mongoConnection.js - חיבור לדאטאבייס

```javascript
import { MongoClient } from "mongodb";
```
**מה זה עושה:** מייבא את הקליינט של MongoDB מהספרייה הרשמית

```javascript
export const client = new MongoClient(process.env.MONGO_URI)
```
**מה זה עושה:** 
- יוצר instance של MongoClient
- `process.env.MONGO_URI` - קורא את כתובת החיבור ממשתני סביבה (.env)
- `export` - מאפשר לקבצים אחרים להשתמש באותו client

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
**מה זה עושה:**
- פונקציה אסינכרונית שמתחברת לדאטאבייס
- `await client.connect()` - מחכה עד שהחיבור יושלם
- `try/catch` - תופס שגיאות אם החיבור נכשל

---

## 4. routes/auth.route.js - הגדרת נתיבים

```javascript
import { Router } from "express";
```
**מה זה עושה:** מייבא את Router מ-Express - מאפשר ליצור קבוצת routes נפרדת

```javascript
import authController from "../controllers/auth.controller.js";
```
**מה זה עושה:** מייבא את ה-controller שמטפל בבקשות

```javascript
import auth from "../middlewares/auth.middleware.js";
```
**מה זה עושה:** מייבא את ה-middleware לאימות JWT

```javascript
const router = Router();
```
**מה זה עושה:** יוצר instance של Router

```javascript
router.post("/signin", authController.signin);
```
**מה זה עושה:**
- מגדיר route ל-POST בנתיב `/signin`
- כשמגיעה בקשה, מפעיל את `authController.signin`
- **שימוש:** הרשמת משתמש חדש

```javascript
router.post("/login", authController.login);
```
**מה זה עושה:**
- מגדיר route ל-POST בנתיב `/login`  
- **שימוש:** התחברות וקבלת טוקן

```javascript
router.get('/profile', auth, (req, res) => {
  res.send(req.user)
})
```
**מה זה עושה:**
- מגדיר route ל-GET בנתיב `/profile`
- `auth` - middleware שרץ **לפני** הפונקציה - בודק טוקן
- אם הטוקן תקין, `req.user` מכיל את המידע מהטוקן
- **שימוש:** קבלת פרטי המשתמש המחובר

```javascript
export default router;
```
**מה זה עושה:** מייצא את ה-router לשימוש ב-server.js

---

## 5. middlewares/auth.middleware.js - אימות טוקן

```javascript
import jwt from "jsonwebtoken";
```
**מה זה עושה:** מייבא את הספרייה ליצירה ואימות של JWT tokens

```javascript
import { ErrWithStatus } from "../utils/utils.js";
```
**מה זה עושה:** מייבא Custom Error class שכולל status code

```javascript
export default async function auth(req, res, next) {
```
**מה זה עושה:** מגדיר middleware function עם הפרמטרים הסטנדרטיים

```javascript
  const token = req.headers.authorization.split(" ")[1];
```
**מה זה עושה:**
- קורא את ה-header של Authorization
- הפורמט: `"Bearer eyJhbGciOi..."`
- `split(" ")` מפצל לפי רווח → `["Bearer", "eyJhbGciOi..."]`
- `[1]` לוקח את החלק השני (הטוקן עצמו)

```javascript
  if (!token) throw new ErrWithStatus("Not Authorized", 403);
```
**מה זה עושה:** אם אין טוקן, זורק שגיאה עם קוד 403 (Forbidden)

```javascript
  const decoded = jwt.verify(token, process.env.SECRET_KEY);
```
**מה זה עושה:**
- מאמת את הטוקן מול המפתח הסודי
- אם תקין - מחזיר את ה-payload (המידע שבתוך הטוקן)
- אם לא תקין - זורק שגיאה

```javascript
  if (!decoded || !decoded.id)
    throw new ErrWithStatus("Not Authorized", 403);
```
**מה זה עושה:** בדיקה נוספת - ווידוא שיש id ב-payload

```javascript
  req.user = decoded;
  next();
```
**מה זה עושה:**
- שומר את המידע מהטוקן ב-`req.user`
- `next()` - ממשיך לפונקציה הבאה בשרשרת

---

## 6. controllers/auth.controller.js - טיפול בבקשות

```javascript
import container from "../container.js";
const { usersService } = container;
```
**מה זה עושה:** 
- מייבא את ה-container
- Destructuring - שולף רק את usersService

### פונקציית signin

```javascript
async function signin(req, res) {
  try {
    const { username, password } = req.body;
```
**מה זה עושה:** שולף username ו-password מגוף הבקשה

```javascript
    const user = await usersService.createUser(username, password);
```
**מה זה עושה:** קורא לשירות ליצירת משתמש חדש

```javascript
    res.status(201).send({ msg: "user created", user });
```
**מה זה עושה:**
- `status(201)` - קוד HTTP לייצור משאב חדש (Created)
- שולח תשובה עם הודעה והמשתמש שנוצר

```javascript
  } catch (error) {
    res.status(error.status || 500)
       .send(error.message || "internal server error");
  }
```
**מה זה עושה:**
- תופס שגיאות
- משתמש בסטטוס מהשגיאה או 500 (ברירת מחדל)
- שולח את הודעת השגיאה

### פונקציית login

```javascript
async function login(req, res) {
  try {
    const { username, password } = req.body;
    const token = await usersService.login(username, password);
    res.send(token);
```
**מה זה עושה:**
- שולף את הפרטים מהבקשה
- קורא לשירות login שמאמת ומחזיר טוקן
- שולח את הטוקן ללקוח

---

## 7. services/auth.service.js - לוגיקה עסקית

```javascript
import bcrypt from "bcryptjs";
```
**מה זה עושה:** מייבא ספרייה להצפנת סיסמאות

```javascript
import jwt from 'jsonwebtoken';
```
**מה זה עושה:** מייבא ספרייה ליצירת JWT tokens

```javascript
import { ErrWithStatus } from "../utils/utils.js";
```
**מה זה עושה:** מייבא Custom Error class

```javascript
export default function createUsersServices(repo) {
```
**מה זה עושה:** 
- **Factory Function** - פונקציה שיוצרת ומחזירה אובייקט
- מקבלת את ה-repo כפרמטר (Dependency Injection)

### hashPassword

```javascript
function hashPassword(password) {
  return bcrypt.hash(password, 12);
}
```
**מה זה עושה:**
- מצפין סיסמה עם bcrypt
- `12` = salt rounds (כמה פעמים לעבד את ההצפנה)
- יותר גבוה = יותר בטוח אבל יותר איטי

### createUser

```javascript
async function createUser(username, password){
   const hashedPassword = await hashPassword(password);
```
**מה זה עושה:** מצפין את הסיסמה לפני שמירה

```javascript
   const user = await repo.createUser({username, password: hashedPassword})
```
**מה זה עושה:** שומר את המשתמש בדאטאבייס דרך ה-repo

```javascript
   delete user.password
   return user
}
```
**מה זה עושה:** מוחק את הסיסמה מהאובייקט לפני החזרה (אבטחה!)

### validateUserCredentials

```javascript
async function validateUserCredetials(username, password){
  const user = await repo.findByUsername(username);
```
**מה זה עושה:** מחפש משתמש לפי שם משתמש

```javascript
  if(!user) throw new ErrWithStatus('User not found', 404);
```
**מה זה עושה:** אם המשתמש לא נמצא - שגיאה 404

```javascript
  const valid = await bcrypt.compare(password, user.password);
```
**מה זה עושה:**
- משווה סיסמה רגילה לסיסמה מוצפנת
- bcrypt יודע להשוות כי הוא שומר את ה-salt בתוך ההצפנה

```javascript
  if(!valid) throw new ErrWithStatus('Not authorized', 403);
  return {id: user._id.toString()};
}
```
**מה זה עושה:**
- אם הסיסמה לא נכונה - שגיאה 403
- מחזיר רק את ה-id (מה שיישמר בטוקן)

### login

```javascript
async function login(username, password){
    const payload = await validateUserCredetials(username, password)
    return generateToken(payload)
}
```
**מה זה עושה:** מאמת credentials ויוצר טוקן

### generateToken

```javascript
function generateToken(payload){
  return jwt.sign(payload, process.env.SECRET_KEY, {expiresIn:'1h'})
}
```
**מה זה עושה:**
- `jwt.sign()` - יוצר טוקן חתום
- `payload` - המידע שיישמר בטוקן (id)
- `process.env.SECRET_KEY` - המפתח הסודי לחתימה
- `expiresIn:'1h'` - הטוקן יפוג אחרי שעה

```javascript
return { hashPassword, generateToken, createUser, validateUserCredetials, login};
```
**מה זה עושה:** מחזיר אובייקט עם כל הפונקציות (API של ה-service)

---

## 8. repos/users.repo.js - גישה לדאטאבייס

```javascript
import { client } from "../infra/mongoConnection.js";
```
**מה זה עושה:** מייבא את הקליינט של MongoDB

```javascript
const collection = client.db('users').collection('users');
```
**מה זה עושה:**
- `client.db('users')` - בוחר database בשם 'users'
- `.collection('users')` - בוחר collection בשם 'users'

```javascript
await collection.createIndex({username: 1}, {unique: true});
```
**מה זה עושה:**
- יוצר אינדקס על השדה username
- `{unique: true}` - מונע כפילויות (לא יכולים להיות 2 משתמשים עם אותו שם)
- `1` = סדר עולה

### createUsersRepo Factory

```javascript
export function createUsersRepo(){
```
**מה זה עושה:** Factory function שיוצרת את אובייקט ה-repo

### createUser

```javascript
async function createUser(user){
  const result = await collection.insertOne(user);
```
**מה זה עושה:** מכניס document חדש ל-collection

```javascript
  const newUser = await collection.findOne({_id: result.insertedId});
  return newUser
}
```
**מה זה עושה:**
- מחזיר את המשתמש שנוצר (כולל ה-_id שנוצר אוטומטית)
- `insertedId` - ה-ID שהדאטאבייס יצר

### findByUsername

```javascript
function findByUsername(username){
  return collection.findOne({username});
}
```
**מה זה עושה:**
- מחפש document לפי username
- `{username}` = `{username: username}` (ES6 shorthand)
- מחזיר Promise (לכן אפשר לקרוא עם await)

```javascript
return {createUser, findByUsername}
```
**מה זה עושה:** מחזיר את הפונקציות הציבוריות של ה-repo

---

## 9. utils/ - כלי עזר

### utils.js - Custom Error Class

```javascript
export class ErrWithStatus extends Error{
  constructor(msg, status){
    super(msg);
    this.status = status;
  }
}
```
**מה זה עושה:**
- **מרחיב** את Error המובנה של JavaScript
- `super(msg)` - קורא ל-constructor של Error עם ההודעה
- `this.status` - מוסיף שדה status code
- **למה?** כדי שנוכל לזרוק שגיאות עם קוד HTTP ולטפל בהן בצורה אחידה

**שימוש:**
```javascript
throw new ErrWithStatus('User not found', 404);
// error.message = 'User not found'
// error.status = 404
```

### createsecretkey.js - יצירת מפתח סודי

```javascript
import crypto from 'crypto';
```
**מה זה עושה:** מייבא את מודול ה-crypto המובנה של Node.js

```javascript
const secret = crypto.randomBytes(64).toString('hex');
console.log(secret)
```
**מה זה עושה:**
- `randomBytes(64)` - יוצר 64 bytes אקראיים
- `.toString('hex')` - ממיר ל-string של 128 תווים hex
- מדפיס את המפתח (להעתיק ל-.env)

---

## 🔄 זרימת בקשה מלאה

### הרשמה (POST /api/auth/signin)

```
1. Client שולח: { username: "john", password: "123" }
        ↓
2. server.js: express.json() מפענח את ה-body
        ↓
3. server.js: logging middleware מדפיס "POST /api/auth/signin"
        ↓
4. auth.route.js: router.post("/signin") תופס את הבקשה
        ↓
5. auth.controller.js: signin() שולף username, password
        ↓
6. auth.service.js: createUser() מצפין סיסמה
        ↓
7. users.repo.js: createUser() שומר ב-MongoDB
        ↓
8. auth.service.js: מוחק password מהתשובה
        ↓
9. auth.controller.js: שולח status 201 + user
        ↓
10. Client מקבל: { msg: "user created", user: {...} }
```

### התחברות (POST /api/auth/login)

```
1. Client שולח: { username: "john", password: "123" }
        ↓
2-4. [אותו תהליך כמו signin]
        ↓
5. auth.controller.js: login() שולף credentials
        ↓
6. auth.service.js: validateUserCredentials()
   - מחפש user ב-DB
   - משווה סיסמאות עם bcrypt
        ↓
7. auth.service.js: generateToken() יוצר JWT
        ↓
8. Client מקבל: "eyJhbGciOiJIUzI1NiIs..."
```

### גישה מוגנת (GET /api/auth/profile)

```
1. Client שולח: Header "Authorization: Bearer eyJ..."
        ↓
2-3. [logging]
        ↓
4. auth.route.js: router.get('/profile', auth, ...)
        ↓
5. auth.middleware.js: auth()
   - שולף token מ-header
   - מאמת עם jwt.verify()
   - שומר user ב-req.user
   - קורא next()
        ↓
6. Route handler: שולח req.user
        ↓
7. Client מקבל: { id: "..." }
```

---

## 📝 סיכום Imports

| קובץ | Import | מקור | שימוש |
|------|--------|------|-------|
| server.js | `express` | npm | Framework |
| server.js | `authRoutes` | local | נתיבים |
| server.js | `connectToMongo` | local | חיבור DB |
| container.js | `createUsersRepo` | local | Factory |
| container.js | `createUsersService` | local | Factory |
| mongoConnection.js | `MongoClient` | npm | DB client |
| auth.route.js | `Router` | npm | יצירת routes |
| auth.route.js | `authController` | local | handlers |
| auth.route.js | `auth` | local | middleware |
| auth.middleware.js | `jwt` | npm | אימות token |
| auth.middleware.js | `ErrWithStatus` | local | שגיאות |
| auth.controller.js | `container` | local | DI |
| auth.service.js | `bcrypt` | npm | הצפנה |
| auth.service.js | `jwt` | npm | tokens |
| auth.service.js | `ErrWithStatus` | local | שגיאות |
| users.repo.js | `client` | local | MongoDB |
| createsecretkey.js | `crypto` | node | אקראיות |

---

## 🎯 Design Patterns בפרויקט

| Pattern | איפה | למה |
|---------|------|-----|
| **Factory Function** | service, repo | יצירת אובייקטים מורכבים |
| **Dependency Injection** | container | הפרדת תלויות, בדיקות |
| **Singleton** | container, client | instance יחיד |
| **Middleware** | express | שרשור פעולות |
| **Repository** | users.repo | הפשטת גישה ל-DB |
| **Service Layer** | auth.service | הפרדת לוגיקה עסקית |
