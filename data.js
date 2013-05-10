var config = require('./config.json');

var fs         = require('fs'),
    XMLWriter  = require('xml-writer'),
    ATOMWriter = require('atom-writer');

var coffeeWord = require('./lib/coffee-word');

var dataStore = "./data/store.json";

// sometimes you just gotta capitalize strings
String.prototype.capitalize = function() {
  return this.charAt(0).toUpperCase() + this.slice(1);
};

// set last modified date
var lastModified = new Date();

// synchronously read data from json store
function readData() {
  var data  = fs.readFileSync(dataStore, 'utf8'),
      store = {};

  try {
    store = JSON.parse(data);
  } catch (err) {
    console.error("Unable to parse data from store");
  }

  return store;
}

exports.read = readData;

// synchronously write data to json store
exports.write = function(store) {
  fs.writeFileSync(dataStore, JSON.stringify(store), 'utf8');
  lastModified = new Date();
}

exports.atom = function(request, response) {
  var xwriter = new XMLWriter(true);
  var atom = new ATOMWriter(xwriter);
  var store = readData();

  var data = [];

  for(var y in store) {
    for(var x in store[y]) {
      if (store[y][x] > 0) {
        data.push(x.capitalize() + " owes " + y.toString().capitalize() + " " + coffeeWord(store[y][x], true));
      }
    }
  }

  atom
    .startFeed('urn:coffee', lastModified, lastModified)
    .writeStartIndex(1)
    .writeItemsPerPage(data.length)
    .writeTotalResults(data.length)
    .writeTitle("Coffee Board")
    .writeLink(config.baseURL+"score.atom", "application/atom+xml", "self");

  for (var i in data) {
    atom
      .startEntry("urn:coffee:"+lastModified.toISOString()+":"+i, lastModified, lastModified)
      .writeTitle(data[i])
      .writeContent(data[i])
      .writeAuthor("Esri Portland")
      .endEntry();
  }

  atom.endFeed();

  response.setHeader('Content-Type', 'text/xml');
  response.write('<?xml version="1.0" encoding="utf-8"?>'+"\n");
  response.write(atom.writer.toString());
  response.end();
}
