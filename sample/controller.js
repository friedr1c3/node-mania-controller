var ManiaController = require('../lib/client.js');

// Initialise a new client.
var client = new ManiaController();

// Connect to the remote server.
client.connect(5000, 'localhost');

// Authenticate with the server.
client.query('Authenticate', ['SuperAdmin', 'SuperAdminPassword']);