import { createUsersRepo } from "./repos/users.repo.js";
import createUsersService from './services/auth.service.js'

function createContainer(){
  const usersRepo = createUsersRepo()
  const usersService = createUsersService(usersRepo)
  return {usersRepo, usersService}
}
const container = createContainer()
export default container;