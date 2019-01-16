const express = require('express');

// Create app
const app = express();
const port = 4000;

// Enable serving static files
app.use(express.static('public'));

app.listen(port, () => console.log(`Listening on port ${port}!`));
