const express = require('express');
const bodyParser = require('body-parser');
const MongoConnection = require('./utils/mongodb.connection');

// Create app
const app = express();
const port = 4000;

// Enable serving static files
app.use(express.static('public'));

// Use convenient middleware to extract fully-parse JSON body
app.use(bodyParser.json());

// Process mongo commands
app.post('/', async (req, res) => {
  const {
    url, method, collection, data,
  } = req.body;

  res.setHeader('Content-Type', 'application/json');

  // Connect to mongo instance
  const db = new MongoConnection(url);

  try {
    await db.open();
  } catch (e) {
    console.error(e);
    return res.status(500).json(e);
  }
console.log(data)
  // Execute request
  try {
    let result = await db.collection(collection)[method](data || {});

    switch (method) {
      case 'aggregate':
      case 'find':
        result = await result.toArray();
        break;
      default:
    }

    db.close();

    return res.status(200).json(result);
  } catch (e) {
    console.error(e);
    return res.status(400).json(e);
  }
});

// Get list of collections
app.post('/get-collections', async (req, res) => {
  const { url } = req.body;

  res.setHeader('Content-Type', 'application/json');

  // Connect to mongo instance
  const db = new MongoConnection(url);

  try {
    await db.open();
  } catch (e) {
    console.error(e);
    return res.status(500).json(e);
  }

  // Execute request
  try {
    const result = await db.listCollections().toArray();

    db.close();

    return res.status(200).json(result);
  } catch (e) {
    console.error(e);
    return res.status(400).json(e);
  }
});

app.listen(port, () => console.log(`Listening on port ${port}`));
