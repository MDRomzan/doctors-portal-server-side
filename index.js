const express = require('express');
const { MongoClient } = require('mongodb');
const cors =require("cors");
const ObjectId=require("mongodb").ObjectId;
const admin = require("firebase-admin");
const fileUpload=require("express-fileupload");
const app = express();
require('dotenv').config()

const port =process.env.PORT || 5000;




const serviceAccount = JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT);

admin.initializeApp({
    credential: admin.credential.cert(serviceAccount)
});

// middle ware
app.use(cors());
app.use(express.json());
app.use(fileUpload());
const uri = `mongodb+srv://${process.env.DB_USER}:${process.env.DB_PASS}@cluster0.ej29o.mongodb.net/myFirstDatabase?retryWrites=true&w=majority`;
const client = new MongoClient(uri, { useNewUrlParser: true, useUnifiedTopology: true });
// console.log(uri)
async function verifyToken(req, res, next){
    if(req.headers?.authorization?.startsWith("Bearer ")){
        const token = req.headers.authorization.split(' ')[1];
        // console.log(token);
         try{
        const decodedUser= await admin.auth().verifyIdToken(token); 
        req.decodedEmail=decodedUser.email;
  
    }
    catch{

    }
    }
   

    next();
}

async function run(){
    try{
        await client.connect();
        const database=client.db("doctors-portal");
        const appointmentsCollection=database.collection("appointments");
        const usersCollection=database.collection("users");
        const doctorsCollection=database.collection("doctors");
        // get all appointments
        app.get("/appointments",verifyToken,async(req,res)=>{
            const email =req.query.email;
            const date = req.query.date;
            // console.log(date)
            const query ={email:email, date:date}
            const cursor =appointmentsCollection.find(query);
            const appointments=await cursor.toArray();
            res.json(appointments); 
        });
        app.get("/appoitments/:id",async (req,res)=>{
            const id= req.params.id;
            const query={_id: ObjectId(id)};
            const result=await appointmentsCollection.findOne(query);
            console.log(result);
            res.json(result);
        })
        // get email add
        app.get("/users/:email",async(req,res)=>{
            const email=req.params.email;
            const query={email:email};
            const user=await usersCollection.findOne(query);
            let isAdmin=false;
            if(user?.role ==="admin"){
                isAdmin=true;
            }
            res.json({admin:isAdmin});
        })
        // app post use
        app.post("/appointments",async(req,res)=>{
            const appointment=req.body;
            const result = await appointmentsCollection.insertOne(appointment);
            // console.log(result);
            res.json(result)
        });
// doctors getall
        app.get("/doctors",async(req,res)=>{
            const cursor=doctorsCollection.find({});
            const doctors=await cursor.toArray();
            res.json(doctors);
        })


// doctors post
        app.post("/doctors",async(req,res)=>{
           const name=req.body.name;
           const email=req.body.email;
           const pic=req.files.image;
           const picData=pic.data;
           const encodedPic=picData.toString("base64");
           const imageBuffer=Buffer.from(encodedPic,"base64");
           const doctors={
               name,
               email,
               image:imageBuffer
           }
           const result =await doctorsCollection.insertOne(doctors);

            res.json(result);
        })

        // add databaseusers
        app.post("/users",async(req,res)=>{
            const user=req.body;
            const result=await usersCollection.insertOne(user);
            console.log(result);
            res.json(result);

        })
        // update user google
        app.put("/users",async(req,res)=>{
            const user= req.body;
            // console.log("Put", user);
            const filter={email:user.email}
            const options = { upsert: true };
            const updateDoc ={$set:user};
            const result=await usersCollection.updateOne(filter,updateDoc,options);
            res.json(result);
        } );
        // admin put add
        app.put("/users/admin",verifyToken,async(req,res)=>{
            const user=req.body;
            //  console.log("Put",req.decodedEmail);
            const requester=req.decodedEmail;
            if(requester){
                const requesterAccount=await usersCollection.findOne({email:requester});
                if(requesterAccount.role==="admin" ){
                    const filter={email:user.email};
                    const updateDoc={$set:{role:"admin"}};
                    const result=await usersCollection.updateOne(filter,updateDoc);
           
                    res.json(result);

                }

            }
            else{
                res.status(403).json({message:"You do not have access to make Admin"})
            }


            
        })
    }
    finally{
        // await client.close();
    }
}
run().catch(console.dir);

app.get('/', (req, res) => {
    res.send('Hello Doctors Portal!')
})

app.listen(port, () => {
    console.log(`Doctors Portals Runnig On :${port}`)
})