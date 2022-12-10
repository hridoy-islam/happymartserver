const express = require('express')
const { MongoClient, ServerApiVersion, ObjectId } = require('mongodb');
const cors = require('cors');
const jwt = require('jsonwebtoken');
require('dotenv').config();
const app = express()
const port = process.env.PORT || 5000;

app.use(cors());
app.use(express.json());


const uri = `mongodb+srv://${process.env.DB_USER}:${process.env.DB_PASS}@cluster0.ol73drk.mongodb.net/?retryWrites=true&w=majority`;
const client = new MongoClient(uri, { useNewUrlParser: true, useUnifiedTopology: true, serverApi: ServerApiVersion.v1 });


// JWT MiddleWare
function checkToken(req, res, next) {

  const authHeader = req.headers.authorization;
  if (!authHeader) {
    return res.status(401).send('unauthorized access');
  }

  const token = authHeader.split(' ')[1];

  jwt.verify(token, process.env.SECRATE_ACCESS_TOKEN, function (err, decoded) {
    if (err) {
      return res.status(403).send({ message: 'forbidden access' })
    }
    req.decoded = decoded;
    next();
  })

}


const checkRole = async (req, res, next) => {
  const decodedEmail = req.decoded.email;
  const query = { email: decodedEmail };
  const user = await usersCollection.findOne(query);

  if (user?.role !== 'admin') {
    return res.status(403).send({ message: 'forbidden access' })
  }
  next();
}




async function run() {
  try {
    const categoryCollection = client.db('happymart').collection('categories');
    const usersCollection = client.db('happymart').collection('users');
    const productsCollection = client.db('happymart').collection('products');
    const bookingsCollection = client.db('happymart').collection('bookings');


    // save User
    app.post('/users', async (req, res) => {
      const user = req.body;
      console.log(user);
      const result = await usersCollection.insertOne(user);
      res.send(result);
    });


    // check user role 
    app.get('/checkrole/:email', async (req, res) => {
      const email = req.params.email
      const query = { email: email }
      const user = await usersCollection.findOne(query);
      res.send(user)
    })

    app.get('/user/verify/:email', async(req, res)=> {
      const email = req.params.email;
      const query = {email: email}
      const result = await usersCollection.findOne(query);
      const verified = result.user?.verified ? true : false;
      res.send({verified});
    })

    // verify seller

    app.put('/seller/:id', checkToken, async (req, res) => {
      const id = req.params.id;
      const filter = { _id: ObjectId(id) }
      const options = { upsert: true };
      const updatedDoc = {
        $set: {
          verified: true,
        }
      }
      const result = await usersCollection.updateOne(filter, updatedDoc, options);
      res.send(result);
    })

    app.delete('/users/:id', checkToken, async (req, res) => {
      const id = req.params.id;
      const filter = { _id: ObjectId(id) }
      const result = await usersCollection.deleteOne(filter);
      res.send(result);
    });


    // Categories

    app.get('/categories', async (req, res) => {
      const query = {};
      const categories = await categoryCollection.find(query).toArray();
      return res.send(categories);
    })
    app.get('/category/:id', async (req, res) => {
      const id = req.params.id;
      const query = { _id: ObjectId(id) };
      const category = await categoryCollection.findOne(query);
      return res.send(category);
    })

    // app.get('/categories/insert', async(req, res) => {
    //   const query = { category: 'Walton' };
    //   const categories = await categoryCollection.insertOne(query);
    //   return res.send(categories);
    // })


    // products

    app.get('/products/featured', async (req, res) => {
      const query = { addvertise: true, status: 'available' };
      const result = await productsCollection.find(query).limit(3).toArray();
      return res.send(result);
    })


    // addvertise Product 
    app.put('/products/addvertise/:id', async (req, res) => {
      const id = req.params.id;
      const filter = { _id: ObjectId(id) }
      const options = { upsert: true };
      const updatedDoc = {
        $set: {
          addvertise: true,
        }
      }
      const result = await productsCollection.updateOne(filter, updatedDoc, options);
      res.send(result);
    })


    app.delete('/products/delete/:id', async (req, res) => {
      const id = req.params.id;
      const filter = { _id: ObjectId(id) }
      const result = await productsCollection.deleteOne(filter);
      console.log(result);
      res.send(result);
    })




    app.post('/addproducts', async (req, res) => {
      const product = req.body;
      const result = await productsCollection.insertOne(product);
      return res.send(result)
    })

    app.get('/products/category/:id', async (req, res) => {
      const categoryid = req.params.id;
      const query = { categoryid: categoryid }
      const products = await productsCollection.find(query).toArray();
      res.send(products);
    })

    app.get('/products/seller/:email', async (req, res) => {
      const selleremail = req.params.email;
      const query = { selleremail: selleremail }
      const products = await productsCollection.find(query).toArray();
      res.send(products);
    })


    // app.get('/products/insert', async(req, res)=> {
    //   const query = {
    //     name: 'Yamaha FZS',
    //     image: 'https://static-01.daraz.com.bd/p/50619c9f86dc3270d6104ec16ecf442a.jpg',
    //     location: 'Dhaka',
    //     resale: '50000',
    //     original: '75000',
    //     used: '1 year',
    //   }
    // })





    // Admin ( checkToken )
    app.get('/allseller', async (req, res) => {
      const query = { role: 'seller' }
      const sellers = await usersCollection.find(query).toArray();
      return res.send(sellers)
    })

    app.get('/allbuyer', async (req, res) => {
      const query = { role: 'buyer' }
      const buyers = await usersCollection.find(query).toArray();
      return res.send(buyers)
    })

    // Token
    app.get('/jwt', async (req, res) => {
      const email = req.query.email;
      const query = { email: email };
      const user = await usersCollection.findOne(query);
      if (user) {
        const token = jwt.sign({ email }, process.env.SECRATE_ACCESS_TOKEN, { expiresIn: '1h' })
        return res.send({ accessToken: token });
      }
      res.status(403).send({ accessToken: '' })
    });


    // Check Role

    app.get('/users/admin/:email', async (req, res) => {
      const email = req.params.email;
      const query = { email }
      const user = await usersCollection.findOne(query);
      res.send({ isAdmin: user?.role === 'admin' });
    })

    app.get('/users/seller/:email', async (req, res) => {
      const email = req.params.email;
      const query = { email }
      const user = await usersCollection.findOne(query);
      res.send({ isSeller: user?.role === 'seller' });
    })

    app.get('/users/buyer/:email', async (req, res) => {
      const email = req.params.email;
      const query = { email }
      const user = await usersCollection.findOne(query);
      res.send({ isBuyer: user?.role === 'buyer' });
    })

    app.post('/bookings', async (req, res) => {
      const booking = req.body;
      const result = await bookingsCollection.insertOne(booking);
      res.send(result);
    })



  } finally {

  }
}

run().catch(console.log);

app.get('/', (req, res) => {
  res.send('Hello World!')
})

app.listen(port, () => {
  console.log(`Example app listening on port ${port}`)
})