const tls = require('tls');
const fs = require('fs');
const https = require('https');
const forever = require('forever');
const {createServerFrom} = require('wss');
const WebSocket = require('ws');
let web_client = new WebSocket('ws://3.8.43.221:1880/ws/myapp'); // local-original connection ws://185.34.81.81:48880/ws/myapp
let historicReplay = new WebSocket('ws://3.8.43.221:1880/ws/Playback'); // 185.34.81.81:48880/ws/Playback

let options = {
   key  : fs.readFileSync('./ssl_cert/urbansensingltd.com.key'),
   cert : fs.readFileSync('./ssl_cert/urbansensingltd.com.chained.crt')
};

function connectRealTime() {
  web_client = new WebSocket('ws://3.8.43.221:1880/ws/myapp'); // local-original connection ws://185.34.81.81:48880/ws/myapp
  web_client.onopen = function() {
    console.log('Connection with real time broker set up');
    setTimeout(() => {
      web_client.close();
    }, 1000*60*30); // Close the connection automatically after 30 minutes
  };
  web_client.onclose = function() {
    console.log('Real time socket closed. Reconnect will be attempted');
    connectRealTime(); // When connection closed re-connect with the real time data broker
  };
  web_client.onerror = function(err) {
    console.error('Real time socket encountered error: ', err.message, ' Closing socket');
    web_client.close();
  };
}

function connectHistoricReplay() {
  historicReplay = new WebSocket('ws://3.8.43.221:1880/ws/Playback'); // 185.34.81.81:48880/ws/Playback
  historicReplay.onopen = function() {
    console.log('Connection with historic replay broker set up');
    setTimeout(() => {
      historicReplay.close();
    }, 1000*60*30); // Close the connection automatically after 30 minutes
  };
  historicReplay.onclose = function() {
    console.log('Historic Replay socket closed. Reconnect will be attempted');
    connectHistoricReplay(); // When connection closed re-connect with the historic replay broker
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

createServerFrom(httpsServer2, function connectionListener (wsss) {   
  historicReplay.on('message', (msg) => {
    if(wsss.readyState == wsss.OPEN){
      wsss.send(msg);
    }
  });

  wsss.on('open', () => {
    console.log('Successfully opened connection');
  });

  wsss.on("connection", (ws) => {
    console.log('Successfully opened connection (port 8081) with the client');
  });

  wsss.on('message', (data) => {
    historicReplay.send(data);
  });

  wsss.on('close', () => {
    console.log('Wss connection closed');
  });

  wsss.on('error', (err) => {
    console.log(err);
  });

}).listen(8081, function(){
    const {address, port} = this.address(); // this is the http[s].Server 
  console.log('listening on wss:// & https://%s:%d', /::/.test(address) ? '0.0.0.0' : address, port);
});

/*setTimeout(() => {
    process.on("exit", function () {
        require("child_process").spawn(process.argv.shift(), process.argv, {
            cwd: process.cwd(),
            detached : true,
            stdio: "inherit"
        });
    });
    process.exit();
}, 1000*60*30);*/ // restart the server process every 30 mins
