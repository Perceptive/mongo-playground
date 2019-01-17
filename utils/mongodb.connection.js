const { MongoClient } = require('mongodb');

class MongoConnection {
  constructor(url) {
    this.MONGO_URL = url || 'mongodb://localhost:27017/anaheim';
    this.DB_NAME = this.MONGO_URL.replace(/^.+:\/\/.+\/(\w+)[?]?.*/, '$1');
  }

  async open() {
    this.client = await MongoClient.connect(this.MONGO_URL, { useNewUrlParser: true });
    this.db = this.client.db(this.DB_NAME);
  }

  close() {
    this.client.close();
  }

  collection(name) {
    return this.db.collection(name);
  }

  listCollections() {
    return this.db.listCollections();
  }
}

module.exports = MongoConnection;
