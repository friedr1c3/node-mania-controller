var net = require('net');
var serializer = require('./serializer.js');
var et = require('elementtree');

/**
 * Node.JS Mania Controller.
 */
var ManiaController = function() {
	this.client = null;
	this.requestHandle = 0x80000000;
	this.protocol = 0;
	this.connected = false;
	this.maxRequestSize = 4096 * 1024;
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

		var slice = data.slice(4, data.length);

		// Handshake. This is the first request and resonse.
		// This controller isn't designed for the old protocol, but anyway ...
		if(slice.toString() == 'GBXRemote 2')
		{
			// Set the protocol version.
			this.protocol = 2;

			console.log('Protocol: GBXRemote ' + slice.toString());
		}

		else
		{
			// Process everything else.
			getResult(data);
		}
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
ManiaController.prototype.query = function(methodName, methodParameters) {
	// Serialise the method call.
	var xml = serializer.serializeMethodCall(methodName, methodParameters);
	
	// Send.
	this.send(xml);
};

/**
 * Sends a message to the XML-RPC server.
 *
 * @param {String} message		- The message.
 * @param {Integer} messageID	- The ID of the message.
 */
ManiaController.prototype.send = function(message) {
	this.requestHandle++;

	var messageBytes = new Buffer(message);
	var sizeBytes = new Buffer(4);
	var handleBytes = new Buffer(4);
	
	sizeBytes.writeUInt32LE(message.length, 0);
	handleBytes.writeUInt32LE(this.requestHandle, 0);
	
	var sendBuffer = new Buffer(messageBytes.length + sizeBytes.length + handleBytes.length);
	sizeBytes.copy(sendBuffer, 0, 0, sizeBytes.length); // Copy.
	handleBytes.copy(sendBuffer, 4, 0, handleBytes.length); // Copy.
	messageBytes.copy(sendBuffer, 8, 0, messageBytes.length); // Copy.
	
	// Write message to socket. UTF-8 encoding.
	this.client.write(sendBuffer, 'utf8');
};

/**
 * Proccesses a response.
 *
 * @param {Buffer} data 	- The data from the response.
 */
function getResult(data) {

	// Received handle ID.
	var recHandle = 0;

	var size = data.slice(0, 4); // Size.
	var handle = data.slice(4, 8); // Handle.
	var message = data.slice(8, data.length); // Message.

	// Read handle.
	recHandle = handle.readUInt32LE(0);
	
	var xml = '';
	
	xml = message.toString('utf8', 0, size.readUInt32LE(0));
	if (xml.length < size.readUInt32LE(0))
		return;

	// Parse the XML.
	var etxml = et.parse(xml);

	// Callback.
	if((recHandle & 0x80000000) == 0)
	{
		// Find the name of the callback executed.
		var methodName = etxml.findtext('methodName');

		// Log. Debugging purposes, perhaps we could log somewhere else?
		console.log('Callback: ' + methodName);
	}
};

// Export module.
module.exports = ManiaController;