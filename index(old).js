const tls = require('tls');
const fs = require('fs');
const https = require('https');
const forever = require('forever');
const {createServerFrom} = require('wss');
const WebSocket = require('ws');
let web_client = new WebSocket('ws://185.34.81.81:48880/ws/myapp');
let historicReplay = new WebSocket('ws://35.177.34.53:1880/ws/Playback');

let options = {
   key  : fs.readFileSync('./ssl_cert/urbansensingltd.com.key'),
   cert : fs.readFileSync('./ssl_cert/urbansensingltd.com.chained.crt')
};

function connectRealTime() {
  web_client.onopen = function() {
    console.log('Connection with real time broker set up');
  };
  web_client.onclose = function() {
    console.log('Socket is closed. Reconnect will be attempted');
    connectRealTime();
  };
  web_client.onerror = function(err) {
    console.error('Real time socket encountered error: ', err.message, ' Closing socket');
    web_client.close();
  };
}

function connectHistoricReplay() {
  historicReplay.onopen = function() {
    console.log('Connection with historic replay broker set up');
  };
  historicReplay.onclose = function() {
    console.log('Socket is closed. Reconnect will be attempted');
    connectHistoricReplay();
  };
  historicReplay.onerror = function(err) {
    console.error('Historic socket encountered error: ', err.message, ' Closing socket');
    historicReplay.close();
  };
}

// Set up an initial connection with the real time broker and historic broker
connectRealTime();
connectHistoricReplay();

/*web_client.on('open', () =>{ console.log('Node-Red connection set up');});
web_client.on('close', () => { console.log('Node-Red connection stopped');});
web_client.on('error', err =>{ console.error(err);});
historicReplay.on('open', () => { console.log('Historic replay node-red connection set up');});
historicReplay.on('close', () => { console.log('Historic replay connection stopped');});
historicReplay.on('error', err => { console.log(err);});*/

let httpsServer = https.createServer(options);
let httpsServer2 = https.createServer(options);

createServerFrom(httpsServer, function connectionListener (wss) {  	
  web_client.on('message', (message) => {
		console.log(message);
		if(wss.readyState == wss.OPEN){
			wss.send(message);
		}
  });

  wss.on('open', () => {
    console.log('Successfully opened connection');
  });

  wss.on("connection", (ws) => {
    console.log('Successfully opened connection (port 8080) with the client');
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

createServerFrom(httpsServer2, function connectionListener (wss) {   
  historicReplay.on('message', (msg) => {
    console.log(msg);
    if(wss.readyState == wss.OPEN){
      wss.send(msg);
    }
  });

  wss.on('open', () => {
    console.log('Successfully opened connection');
  });

  wss.on("connection", (ws) => {
    console.log('Successfully opened connection (port 8081) with the client');
  });

  wss.on('message', (data) => {
    console.log(data);
    historicReplay.send(data);
  });

  wss.on('close', () => {
    console.log('Wss connection closed');
  });

  wss.on('error', (err) => {
    console.log(err);
  });

}).listen(8081, function(){
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