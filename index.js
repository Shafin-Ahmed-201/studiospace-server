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
const studios=db.collection('studios')


//set Studio
app.post('/studios',async(req,res)=>{
  const newStudio=req.body
  console.log('Adding new studio:',newStudio)
  const result=await studios.insertOne(newStudio)
  res.status(201).send(result)
})
//get all studio
app.get('/studios',async(req,res)=>{
  const cursor=studios.find({})
  const allStudios=await cursor.toArray()
  res.send(allStudios)
})
//get one studio
app.get('/studios/:id',async(req,res)=>{
    
  try {
    const id=req.params.id
    const query={_id:new ObjectId(id)}
    const studio=await studios.findOne(query)
    if(!studio) return res.status(404).send({message:'Studio not found'})
    res.send(studio)
  } catch (error) {
    res.status(400).send({message:'Invalid studio id'})
  }
})

// get one category

app.get("/studio", async (req, res) => {
  try {
    const category = req.query.category;

    const filter = category ? { category } : {};

    // Fetch matching documents
    const studioList = await studios
      .find(filter)
      .toArray();

    res.status(200).send(studioList);
  } catch (error) {
    console.error("Error fetching studios:", error);
    res.status(500).send({ message: "Failed to fetch studios" });
  }
});
//get using email
app.get('/my-listings/:email', async(req,res)=>{
  const {email}=req.params
  const result=await studios.find({userEmail:email}).toArray()
  res.send(result)
})
//Delete My-Listing data
app.delete('/my-listings/:id',async(req,res)=>{
  const {id}=req.params
  const result=await studios.deleteOne({_id:new ObjectId(id)})
  res.send(result)
})
app.listen(PORT, () => {
  console.log(`Example app listening on port ${PORT}`)
})