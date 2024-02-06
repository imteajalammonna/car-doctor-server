const express = require('express');
const cors = require('cors');
const jwt = require('jsonwebtoken');
const cookieParser = require('cookie-parser');
const { MongoClient, ServerApiVersion, ObjectId } = require('mongodb');
require('dotenv').config()
const app = express();
const port = process.env.PORT || 5000;


//middleware
app.use(cors({
    origin: ['http://localhost:5173'],
    credentials: true
}));
app.use(express.json());
app.use(cookieParser())


const uri = `mongodb+srv://${process.env.DB_USER}:${process.env.DB_PASS}@starter.iwcfqvq.mongodb.net/?retryWrites=true&w=majority`;

// Create a MongoClient with a MongoClientOptions object to set the Stable API version
const client = new MongoClient(uri, {
    serverApi: {
        version: ServerApiVersion.v1,
        strict: true,
        deprecationErrors: true,
    }
});

// middlewares
const logger = async (req, res, next) => {
    console.log('called:', req.host, req.originalUrl)
    next();
}
const verifyToken = async (req, res, next) => {
    const token = req.cookies?.token;
    if (!token) {
        return res.status(401).send({ message: 'forbidden' })
    }
    jwt.verify(token, process.env.ACCESS_TOKEN_SECRET, (err, decoded) => {
        if (err) {
            console.log(err);
            return res.status(401).send({ message: 'unauthorized' })
        }
        console.log('value', decoded);
        req.user = decoded;
        next();
    })
}

async function run() {
    try {
        // Connect the client to the server	(optional starting in v4.7)
        await client.connect();

        const serviceCollection = client.db("carDoctor").collection("services");
        const bookingsCollection = client.db("carDoctor").collection("bookings");

        app.post("/jwt", logger, async (req, res) => {
            const user = req.body;
            console.log(user);
            const token = jwt.sign(user, process.env.ACCESS_TOKEN_SECRET, { expiresIn: '2h' })

            res
                .cookie('token', token, {
                    httpOnly: true,
                    secure: false
                })
                .send({ success: true });
        })

        app.get("/services", logger, async (req, res) => {
            const cursor = serviceCollection.find();
            const result = await cursor.toArray();
            res.send(result);
        });

        app.get("/services/:id", async (req, res) => {
            const id = req.params.id;
            const query = { _id: new ObjectId(id) };

            const options = {
                projection: { title: 1, price: 1, service_id: 1, img: 1 },
            }

            const result = await serviceCollection.findOne(query, options);
            res.send(result);
        })

        app.get("/bookings", logger, async (req, res) => {
            // if (req.query.email !== req.user.email) {
            //     return res.status(403).send({ message: 'Forbidden Access' })
            // }
            let query = {};
            // console.log(req.cookies.token);
            if (req.query?.email) {
                query = { email: req.query.email }
            };
            const result = await bookingsCollection.find(query).toArray();
            res.send(result);
        })

        app.post("/bookings", async (req, res) => {
            const bookings = req.body;
            const result = await bookingsCollection.insertOne(bookings);
            res.send(result);

        })
        app.patch("/bookings/:id", async (req, res) => {
            const id = req.params.id;
            const filter = { _id: new ObjectId(id) };
            const updatedBooking = req.body;
            const updateDoc = {
                $set: {
                    status: updatedBooking.status
                },

            }
            const result = await bookingsCollection.updateOne(filter, updateDoc)
            res.send(result);

        })

        app.delete("/bookings/:id", async (req, res) => {
            const id = req.params.id;
            const query = { _id: new ObjectId(id) };
            const result = await bookingsCollection.deleteOne(query);
            res.send(result);

        })




        // Send a ping to confirm a successful connection
        await client.db("admin").command({ ping: 1 });
        console.log("Pinged your deployment. You successfully connected to MongoDB!");
    } finally {
        // Ensures that the client will close when you finish/error
        // await client.close();
    }
}
run().catch(console.dir);


app.get('/', (req, res) => {
    res.send("Car Doctors Server is Running;")
})
app.listen(port, () => {
    console.log(`Car Doctors Server is Running on PORT ${port}`);
})