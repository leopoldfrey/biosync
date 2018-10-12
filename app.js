var express     = require("express");
var http        = require("http");
var serveIndex  = require("serve-index");
var multer      = require("multer");
var fs          = require("fs");
var path        = require("path");
var WebSocket   = require("ws");
var WebSocketServer   = WebSocket.Server;
var bodyParser  = require("body-parser");

var app         =   express();
var server = http.createServer(app);


/* PARAMETERS */

// use alternate localhost and the port Heroku assigns to $PORT
const port = process.env.PORT || 3000;
//var webServerPort = 8080; // Web server (http) listens on this port

app.get('/',function(req,res){
      res.sendFile(__dirname + "/public/index.html");
});

app.get('/biosync.html',function(req,res){
      res.sendFile(__dirname + "/public/biosync.html");
});

app.get('/controller.html',function(req,res){
      res.sendFile(__dirname + "/public/controller.html");
});


/*----------- Static Files -----------*/
app.use('/vendor', express.static('public/vendor'));
app.use('/css', express.static('public/css'));
app.use('/js', express.static('public/js'));
app.use('/img', express.static('public/img'));

app.use('/uploads', express.static('uploads'));
app.use('/uploads', serveIndex(__dirname + '/uploads'));

app.use(bodyParser.urlencoded({ extended: false }));
app.use(bodyParser.json());

server.listen(port,function() {
    console.log("Web Server listening port " + port);
});
/*----------- Static Files -----------*/

// Tools
String.prototype.replaceAll = function(search, replacement) {
  var target = this;
  return target.replace(new RegExp(search, 'g'), replacement);
};


/*----------- Img receive -----------*/

var upload = multer({ dest: '/tmp' })

app.post('/image', upload.single("biosync_image"), function (req, res) {
   console.log("Receiving image..");
   var date = new Date();

   var timeToAppend = date.getHours() + "h" + date.getMinutes() + "m" +  date.getSeconds() + "s" + date.getMilliseconds();

   var type = req.file.mimetype.split("/")[1];
   var name = req.body.name.replaceAll(" ", "_");
   var file = __dirname + "/uploads/" + name + "_" + timeToAppend + "." + type;
   file = file.replaceAll(" ", "_");
   fs.readFile( req.file.path, function (err, data) {
        fs.writeFile(file, data, function (err) {
         if( err ){
              console.error( err );
              response = {
                   message: 'Sorry, file could not be uploaded.',
                   filename: req.file.originalname
              };
         }else{
               console.log("Image saved");
               response = {
                   message: 'File uploaded successfully',
                   filename: req.file.originalname
              };

              wss.clients.forEach(function each(client) {
                if (client !== wss && client.readyState === WebSocket.OPEN) {
                  console.log("Sending new img upload");
                  client.send(
                    JSON.stringify(
                    {
                      type: "newimage",
                      stage: currentStage,
                      standbyMsg: file
                    }));
                }
              });
          }
          res.end( JSON.stringify( response ) );
       });
   });
});

/*----------- Name receive -----------*/
// https://codeforgeek.com/2014/09/handle-get-post-request-express-4/
app.post('/name', function (req, res) {
  console.log("Receiving username..");

  if (req.body.name) {
  	console.log('New user : '+req.body.name);
  } else {
    console.log("Error: invalid name received");  
  }
  
  res.end("ok");
})

/*----------- WS Server -----------*/

const wss = new WebSocketServer({
    server: server,
    autoAcceptConnections: true
});

var currentStage = -1;
var currentStandbyMessage = "Take a Selfie";

wss.on('connection', function connection(ws) {
  ws.on('message', function incoming(message) {
    console.log('Received: %s', message);

    var msg = JSON.parse(message);
    
    switch(msg.type) {
		case "broadcast":
        	currentStage = msg.stage;
        	currentStandbyMessage = msg.standbyMsg;

	        // Broadcast
    	    wss.clients.forEach(function each(client) {
				if (client !== ws && client.readyState === WebSocket.OPEN) {
					console.log("Sending: " + currentStage);
					client.send(
						JSON.stringify(
						{
							type: "changeState",
							stage: currentStage,
							standbyMsg: currentStandbyMessage
						}));
				}
        	});
		break;
		case "match":
			console.log("Ready to match width " + msg.stage);
	    	break;
    }



  });
});
