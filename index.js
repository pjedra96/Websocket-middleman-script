const tls = require('tls');
const fs = require('fs');
const https = require('https');
const forever = require('forever');
const {createServerFrom} = require('wss');
const WebSocket = require('ws');
let web_client = new WebSocket('ws://................');

let options = {
   key  : fs.readFileSync('./license.key'), // Import the encryption license .key file
   cert : fs.readFileSync('./encrptionfile.chained.crt') // Import the encryption certificate .chained.crt file
};

web_client.on('open', () =>{ console.log('Node-Red connection set up');});
web_client.on('close', () => { console.log('Node-Red connection stopped');});
web_client.on('error', err =>{ console.error(err);});

let httpsServer = https.createServer(options);

createServerFrom(httpsServer, function connectionListener (wss) {  	
  web_client.on('message', (message) => {
		console.log(message);
		if(wss.readyState == wss.OPEN){
			wss.send(message);
		}
  });

  wss.on('open', () => {
    console.log('Successfully opened connection');
    start_client();
  });

  wss.on("connection", (ws) => {
    console.log('Successfully opened connection (port 8080) with the client');
    start_client();
  });

  wss.on('message', (data) => {
      wss.send(data.toString()); // echo-server 
  });

  wss.on('close', () => {
  	console.log('Wss connection closed');
  });

  wss.on('error', (err) => {
  	console.log(err);
  });

}).listen(8080, function(){
  	const {address, port} = this.address(); // this is the http[s].Server 
	console.log('listening on wss:// & https://%s:%d', /::/.test(address) ? '0.0.0.0' : address, port);
});

// Restart the whole server process every 1 hour
setTimeout(() => {
    process.on("exit", function () {
        require("child_process").spawn(process.argv.shift(), process.argv, {
            cwd: process.cwd(),
            detached : true,
            stdio: "inherit"
        });
    });
    process.exit();
}, 1000*60*30); // NEW restart the server process every 30 mins