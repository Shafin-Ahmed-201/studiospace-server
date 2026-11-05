import express from 'express'
import cors from 'cors'
import { MongoClient, ObjectId } from 'mongodb';
import 'dotenv/config'
import { createRemoteJWKSet, jwtVerify } from 'jose';

const app=express()
const PORT=process.env.PORT||5000

app.use(cors())
app.use(express.json())

//MongoDB connection->
const client = new MongoClient(process.env.MONGO_URL);
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
const bookingsCollection = db.collection("bookings");

//Jwt Security
const verifyToken=async(req,res,next)=>{
  const authHeader=req.headers.authorization
  if(!authHeader){
    return res.status(401).send({ message: "Unauthorized!" })
  }
  const token=authHeader.split(' ')[1]
  if(!token){
    return res.status(401).send({ message: "Unauthorized!" })
  }
  const JWKS=createRemoteJWKSet(new URL (`${process.env.CLIENT_URL}/api/auth/jwks`))
  
  try{
const {payload}=await jwtVerify(token,JWKS)
 next()
  }catch(error){
    return res.status(500).send({ message: "Server Error!" })
  }
 
}

//set Studio
app.post('/studios',verifyToken,async(req,res)=>{
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
app.get('/my-listings/:email',verifyToken, async(req,res)=>{
  const {email}=req.params
  const result=await studios.find({userEmail:email}).toArray()
  res.send(result)
})
//Delete My-Listing data
app.delete('/my-listings/:id',verifyToken,async(req,res)=>{
  const {id}=req.params
  const result=await studios.deleteOne({_id:new ObjectId(id)})
  res.send(result)
})
//Edit studio
app.put("/studios/:id",verifyToken, async (req, res) => {
  try {
    const { id } = req.params;

    // Validate MongoDB ObjectId
    if (!ObjectId.isValid(id)) {
      return res.status(400).send({
        success: false,
        message: "Invalid studio ID.",
      });
    }

    const {
      title,
      category,
      hourlyRate,
      securityDeposit,
      maxCapacity,
      location,
      address,
      imageUrl,
      overview,
      amenities,
    } = req.body;

    // Validate required fields
    if (
      !title ||
      !category ||
      !location ||
      !address ||
      !imageUrl ||
      !overview ||
      !Array.isArray(amenities) ||
      amenities.length === 0
    ) {
      return res.status(400).send({
        success: false,
        message: "Please provide all required studio information.",
      });
    }

    const updatedStudio = {
      title,
      category,
      hourlyRate: Number(hourlyRate),
      securityDeposit: Number(securityDeposit),
      maxCapacity: Number(maxCapacity),
      location,
      address,
      imageUrl,
      overview,
      amenities,
      updatedAt: new Date(),
    };

    const result = await studios.updateOne(
      { _id: new ObjectId(id) },
      {
        $set: updatedStudio,
      }
    );

    if (result.matchedCount === 0) {
      return res.status(404).send({
        success: false,
        message: "Studio not found.",
      });
    }

    res.status(200).send({
      success: true,
      message: "Studio updated successfully!",
    });
  } catch (error) {
    console.error("Update studio error:", error);

    res.status(500).send({
      success: false,
      message: "Failed to update studio.",
    });
  }
});

//Booking Related Api
app.post("/bookings", async (req, res) => {
  try {
    const {
      studioId,
      userName,
      userEmail,
      bookingDate,
      startTime,
      endTime,
      guests,
      note,
    } = req.body;

    if (
      !studioId ||
      !userName ||
      !userEmail ||
      !bookingDate ||
      !startTime ||
      !endTime ||
      !guests
    ) {
      return res.status(400).send({
        message: "Please provide all required booking information.",
      });
    }

    if (!ObjectId.isValid(studioId)) {
      return res.status(400).send({
        message: "Invalid studio ID.",
      });
    }

    const studio = await studios.findOne({
  _id: new ObjectId(studioId),
});

if (!studio) {
  return res.status(404).send({
    message: "Studio not found.",
  });
}
//Duplicate Booking checker
// Check whether this user already has a confirmed booking
// for the same studio.
const existingBooking = await bookingsCollection.findOne({
  studioId: studioId,
  userEmail: userEmail,
  status: "confirmed",
});

if (existingBooking) {
  return res.status(409).send({
    success: false,
    message: "You have already booked this studio!",
  });
}

    const start = new Date(`${bookingDate}T${startTime}:00`);
    const end = new Date(`${bookingDate}T${endTime}:00`);

    if (
      Number.isNaN(start.getTime()) ||
      Number.isNaN(end.getTime()) ||
      end <= start ||
      start <= new Date()
    ) {
      return res.status(400).send({
        message: "Please select a valid future booking time.",
      });
    }

    const duration = (end - start) / (1000 * 60 * 60);

    if (
      !Number.isInteger(Number(guests)) ||
      Number(guests) < 1 ||
      Number(guests) > studio.maxCapacity
    ) {
      return res.status(400).send({
        message: "Invalid number of guests.",
      });
    }

    // Check for overlapping bookings
    const existingBookings = await bookingsCollection.find({
      studioId,
      bookingDate,
      status: "confirmed",
    }).toArray();

    const hasConflict = existingBookings.some((booking) => {
      return (
        startTime < booking.endTime &&
        endTime > booking.startTime
      );
    });

    if (hasConflict) {
      return res.status(409).send({
        message: "This studio is already booked for that time.",
      });
    }

    const totalPrice = duration * studio.hourlyRate;

    const newBooking = {
      studioId,
      studioTitle: studio.title,
      studioImage: studio.imageUrl,
      studioLocation: `${studio.address}, ${studio.location}`,
      hourlyRate: studio.hourlyRate,

      userName,
      userEmail,

      bookingDate,
      startTime,
      endTime,
      duration,
      guests: Number(guests),
      note: note || "",

      totalPrice,
      securityDeposit: studio.securityDeposit,

      status: "confirmed",
      createdAt: new Date(),
    };

    const result = await bookingsCollection.insertOne(newBooking);

    res.status(201).send({
      success: true,
      message: "Booking confirmed successfully!",
      bookingId: result.insertedId,
    });
  } catch (error) {
    console.error("Create booking error:", error);

    res.status(500).send({
      message: "Failed to create booking.",
    });
  }
});

app.get("/my-bookings/:email",verifyToken, async (req, res) => {
  try {
    const { email } = req.params;

    const bookings = await bookingsCollection
      .find({ userEmail: email })
      .sort({ createdAt: -1 })
      .toArray();

    res.status(200).send(bookings);
  } catch (error) {
    console.error("Fetch bookings error:", error);

    res.status(500).send({
      message: "Failed to fetch bookings.",
    });
  }
});

app.delete("/bookings/:id", verifyToken, async (req, res) => {
  try {
    const { id } = req.params;
    const { userEmail } = req.body;

    // Validate booking ID
    if (!ObjectId.isValid(id)) {
      return res.status(400).send({
        message: "Invalid booking ID.",
      });
    }

    // Validate user email
    if (!userEmail) {
      return res.status(400).send({
        message: "User email is required.",
      });
    }

    // Find booking belonging to this user
    const booking = await bookingsCollection.findOne({
      _id: new ObjectId(id),
      userEmail,
    });

    if (!booking) {
      return res.status(404).send({
        message: "Booking not found.",
      });
    }

    // Only confirmed bookings can be cancelled
    if (booking.status !== "confirmed") {
      return res.status(400).send({
        message: "This booking cannot be cancelled.",
      });
    }

    // Check booking start time
    const bookingStart = new Date(
      `${booking.bookingDate}T${booking.startTime}:00`
    );

    if (bookingStart <= new Date()) {
      return res.status(400).send({
        message: "You can only cancel before the booking starts.",
      });
    }

    // Permanently delete booking from MongoDB
    const result = await bookingsCollection.deleteOne({
      _id: new ObjectId(id),
      userEmail,
    });

    if (result.deletedCount === 0) {
      return res.status(404).send({
        message: "Booking could not be deleted.",
      });
    }

    res.status(200).send({
      success: true,
      message: "Booking cancelled and deleted successfully.",
    });

  } catch (error) {
    console.error("Delete booking error:", error);

    res.status(500).send({
      message: "Failed to cancel booking.",
    });
  }
});
app.listen(PORT, () => {
  console.log(`Example app listening on port ${PORT}`)
})

export default app