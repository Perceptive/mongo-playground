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

  // Connect to mongo instance
  const db = new MongoConnection(url);

  try {
    await db.open();
  } catch (e) {
    console.error(e);
    return res.status(500).send(`Error occurred while connecting to database ${url}`);
  }

  // Execute request
  try {
    const result = await db.collection(collection)[method](data ? JSON.parse(data) : {});
    db.close();
    return res.status(200).send(JSON.stringify(result));
  } catch (e) {
    console.error(e);
    return res.status(500).send(`Error occurred while executing method "${method}" on collection "${collection}"`);
  }
});

app.listen(port, () => console.log(`Listening on port ${port}!`));
