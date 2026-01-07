import container from "../container.js";
const { usersService } = container;

async function signin(req, res) {
  try {
    const { username, password } = req.body;
    const user = await usersService.createUser(username, password);
    res.status(201).send({ msg: "user created", user });
  } catch (error) {
    res
      .status(error.status || 500)
      .send(error.message || "internal server error");
  }
}

async function login(req, res) {
  try {
    const { username, password } = req.body;
    const token = await usersService.login(username, password);
    res.send(token);
  } catch (error) {
    res
      .status(error.status || 500)
      .send(error.message || "Server internal error");
  }
}

export default { signin, login };
