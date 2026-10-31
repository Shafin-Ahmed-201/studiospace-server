import express from 'express'
import cors from 'cors'
import { MongoClient, ObjectId } from 'mongodb';
import 'dotenv/config'

const app=express()
const PORT=process.env.PORT||5000

app.use(cors())
app.use(express.json())

//MongoDB connection->
const client = new MongoClient(`mongodb://${process.env.DB_USER}:${process.env.DB_PASSWORD}@ac-php7rd4-shard-00-00.8bihj8d.mongodb.net:27017,ac-php7rd4-shard-00-01.8bihj8d.mongodb.net:27017,ac-php7rd4-shard-00-02.8bihj8d.mongodb.net:27017/?ssl=true&replicaSet=atlas-fmvmrf-shard-0&authSource=admin`);
export async function connectToMongoDB() {
  try {
    await client.connect();
    console.log("You successfully connected to MongoDB!");
    return client;
  } catch (err) {
    console.dir(err);
  }
}
const connectedClient=await connectToMongoDB()
const db=connectedClient.db('studiospaceDB')





app.listen(PORT, () => {
  console.log(`Example app listening on port ${PORT}`)
})