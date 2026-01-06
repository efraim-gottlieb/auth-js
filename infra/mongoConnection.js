import { MongoClient } from "mongodb";

console.log(process.env.MONGO_URI)
export const client = new MongoClient(process.env.MONGO_URI)

export async function connectToMongo(){
  try {
    await client.connect();
    console.log('Connected to MongoDB...');
  } catch (error) {
    console.log('Could not connect to mongo');
  }
}

