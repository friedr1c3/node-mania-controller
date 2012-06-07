var net = require('net');
var serializer = require('./serializer.js');
var Deserializer = require('./deserializer.js');

/**
 * Node.JS Mania Controller.
 */
var ManiaController = function() {
	this.client = null;
	this.requestCount = 0;
	this.connected = false;
};

/**
 * Creates a connection to a host.
 *
 * @param {Integer} port 	- The remote port.
 * @param {String} host		- The remote host.
 */
ManiaController.prototype.connect = function(port, host) {
	// Create a connection to the client.
	this.client = net.createConnection(port, host);
	
	// Add listeners.
	this.addListeners();
};

/**
 * Adds listeners to the client.
 */
ManiaController.prototype.addListeners = function() {
	// Data.
	this.client.on('data', function(data) {
		console.log('Data: ' + data);
	});

	// Error.
	this.client.on('error', function(error) {
		console.log('Error: ' + error);
	});

	// Connect.
	this.client.on('connect', function() {
		console.log('Connected.');
	});

	// Close.
	this.client.on('close', function() {
		console.log('Connection to the remote server has been closed.');
	});

	// Timeout.
	this.client.on('timeout', function() {
		console.log('Connection to the remote server timed out.');
	});
};

/**
 * Serialises an XML-RPC request and executes the request.
 *
 * @param {String} methodName		- The name of the method.
 * @param {Array} methodParameters	- Method parameters.
 */
ManiaController.prototype.query = function(methodName, methodParameters)
{
	// Serialise the method call.
	var xml = serializer.serializeMethodCall(methodName, methodParameters);
	
	// Send.
	this.send(xml, 0x80000000);
};

/**
 * Sends a message to the XML-RPC server.
 *
 * @param {String} message		- The message.
 * @param {Integer} messageID	- The ID of the message.
 */
ManiaController.prototype.send = function(message, messageID)
{
	var messageBytes = new Buffer(message);
	var sizeBytes = new Buffer(4);
	var handleBytes = new Buffer(4);
	
	sizeBytes.writeUInt32LE(message.length, 0);
	handleBytes.writeUInt32LE(messageID++, 0);
	
	var sendBuffer = new Buffer(messageBytes.length + sizeBytes.length + handleBytes.length);
	sizeBytes.copy(sendBuffer, 0, 0, sizeBytes.length); // Copy.
	handleBytes.copy(sendBuffer, 4, 0, handleBytes.length); // Copy.
	messageBytes.copy(sendBuffer, 8, 0, messageBytes.length); // Copy.
	
	// Write message to socket. UTF-8 encoding.
	this.client.write(sendBuffer, 'utf8');
	
	// Increment the request count.
	this.requestCount++;
};

// Export module.
module.exports = ManiaController;