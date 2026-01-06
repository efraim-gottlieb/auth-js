import { client } from "../infra/mongoConnection.js";

const collection = client.db('users').collection('users');

await collection.createIndex({username: 1}, {unique: true});


export function createUsersRepo(){
  async function createUser(user){
    const result = await collection.insertOne(user);
    const newUser = await collection.findOne({_id: result.insertedId});
    return newUser
  }

  function findByUsername(username){
    return collection.findOne({username});
  }
  return {createUser, findByUsername}
}
