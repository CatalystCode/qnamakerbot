var DocumentClient = require('documentdb').DocumentClient;
var docdbUtils = require('./docdbUtils');

function DataDao(documentDBClient, databaseId, collectionId) {
  this.client = documentDBClient;
  this.databaseId = databaseId;
  this.collectionId = collectionId;

  this.database = null;
  this.collection = null;
}

module.exports = DataDao;

DataDao.prototype = {
  init: function (callback) {
    var self = this;

    docdbUtils.getOrCreateDatabase(self.client, self.databaseId, function (err, db) {
      if (err) {
        callback(err);
      } else {
        self.database = db;
        docdbUtils.getOrCreateCollection(
          self.client, self.database._self, self.collectionId, function (err, coll)
          {
            if (err) {
              callback(err);
            } else {
              self.collection = coll;
            }
          }
        );
      }
    });
  },

  find: function (querySpec, callback) {
    var self = this;

    self.client.queryDocuments(self.collection._self, querySpec).toArray(function (err, results) {
      if (err) {
        callback(err);
      } else {
        callback(null, results);
      }
    });
  },

  addItem: function (item, callback) {
    var self = this;

    item.date = Date.now();
    item.completed = false;

    self.client.createDocument(self.collection._self, item, function (err, doc) {
      if (err) {
        callback(err);
      } else {
        callback(null, doc);
      }
    });
  },

  updateItem: function (doc, callback) {
    var self = this;

    self.getItem(doc.userId, function (err, doc2) {
      if (err) {
        callback(err);
      } else if ( !doc2 ) {
        callback( 'Unable to find user');
      } else {
        doc.completed = true;
        self.client.replaceDocument(doc2._self, doc, function (err, replaced) {
          if (err) {
            callback(err);
          } else {
            callback(null, replaced);
          }
        });
      }
    });
  },

  getItem: function (itemId, callback) {
    var self = this;

    var querySpec = {
      query: 'SELECT * FROM users u WHERE u.userId = @id',
      parameters: [{
        name: '@id',
        value: itemId
      }]
    };

    self.client.queryDocuments(self.collection._self, querySpec).toArray(function (err, results) {
      if (err) {
        callback(err);
      } else {
        callback(null, results[0]);
      }
    });
  }
};
