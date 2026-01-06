import bcrypt from "bcryptjs";
import jwt from 'jsonwebtoken';
import { ErrWithStatus } from "../utils/utils.js";

export default function createUsersServices(repo) {
  function hashPassword(password) {
    return bcrypt.hash(password, 12);
  }

  async function createUser(username, password){
     const hashedPassword = await hashPassword(password);
     const user = await repo.createUser({username, password: hashedPassword})
     delete user.password
     return user
  }

  async function validateUserCredetials(username, password){
    const user = await repo.findByUsername(username);
    if(!user) throw new ErrWithStatus('User not found', 404);
    const valid = await bcrypt.compare(password, user.password);
    if(!valid) throw new ErrWithStatus('Not authorized', 403);
    return {id: user._id.toString()};
  }

  async function login(username, password){
      const payload = await validateUserCredetials(username, password)
      return generateToken(payload)
  }


  function generateToken(payload){
    return jwt.sign(payload, process.env.SECRET_KEY, {expiresIn:'1h'})
  }

  


  return { hashPassword, generateToken, createUser, validateUserCredetials, login};
}
