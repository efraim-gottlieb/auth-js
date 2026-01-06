import express from "express";

import authRoutes from "./routes/auth.route.js";
import { connectToMongo } from "./infra/mongoConnection.js";



const app = express();
const PORT = 8000;

await connectToMongo();

app.use(express.json());

app.use('/', async (req, res, next) => {
  console.log(`${req.method} ${req.url}`);
  next();
});

app.use("/api/auth", authRoutes);


app.listen(PORT, async () => {
  console.log(`server run on ${PORT}...`);
});