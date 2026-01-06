import { createUsersRepo } from "../repos/users.repo.js";
import createUsersServices from "../services/auth.service.js";

const usersRepo = createUsersRepo();
const usersServices = createUsersServices(usersRepo);

async function signin(req, res) {
  try {
    const { username, password } = req.body;
    const user = await usersServices.createUser(username, password);
    res.status(201).send({ msg: "user created", user: user });
  } catch (error) {
    res
      .status(error.status || 500)
      .send(error.message || "Server internal error");
  }
}

async function login(req, res) {
  try {
    const { username, password } = req.body;
    const token = await usersServices.login(username, password);
    res.send(token);
  } catch (error) {
    res
      .status(error.status || 500)
      .send(error.message || "Server internal error");
  }
}

export default { signin, login };
