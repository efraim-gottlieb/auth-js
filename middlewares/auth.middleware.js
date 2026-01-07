import jwt from "jsonwebtoken";
import { ErrWithStatus } from "../utils/utils.js";

export default async function auth(req, res, next) {
  try {
    const token = req.headers.authorization.split(" ")[1];
    console.log(token)
    if (!token) throw new ErrWithStatus("Not Authorized", 403);
    const decoded = jwt.verify(token, process.env.SECRET_KEY);
    if (!decoded || !decoded.id)
      throw new ErrWithStatus("Not Authorized", 403);
    req.user = decoded;
    next();
  } catch (error) {
    res
      .status(error.status || 500)
      .send(error.message || "Server internal error");
  }
}
