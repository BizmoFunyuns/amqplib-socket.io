/**
 * Created by GGuinn on 11/22/2014.
 */

var app     = require('express')();
var http    = require('http').createServer(app);
var io      = require('socket.io')(http);
var amqp 	= require('amqplib');
var fs 		= require('fs');
var opts 	= {
    cert: fs.readFileSync('C:\\ProgramData\\Schlumberger\\Symphony\\CertificateStores\\CertificateAuthorities\\certs\\signing-ca-1.der'),
    key: fs.readFileSync('C:\\ProgramData\\Schlumberger\\Symphony\\CertificateStores\\server\\rig_server-01-00.symphony.slb.com.key'),
    ca: fs.readFileSync('C:\\ProgramData\\Schlumberger\\Symphony\\CertificateStores\\CertificateAuthorities\\signing-ca-1.der'),
    passPhrase: 'MySecretPassword',
    rejectUnauthorized: 'false'
};

app.get('/', function(req, res){
    res.sendFile(__dirname + '/index.html');
});

io.on('connection', function (socket) {
    console.log('a user connected');

    socket.on('subscribe', function() {

        console.log('In subscribe');

        amqp.connect('amqps://Symphony:SymphonyPass@localhost:5671', opts).then(function (conn) {

            conn.createChannel().then(function (ch) {

                var ok = ch.assertQueue('hello', {durable: false});

                ok = ok.then(function (_qok) {

                    ch.consume('hello', function (msg) {

                        console.log(" [x] Received '%s'", msg.content.toString());

                        console.log("In socket.io connection");

                        io.sockets.emit('data', msg.content.toString());
                    },
                    {noAck: true});
                });

                ok.then(function (_consumeOk) {
                    console.log(' [*] Waiting for messages. To exit press CTRL+C');
                });
            });
        });
    });

    socket.on('disconnect', function () {
        console.log('user disconnected');
    });

    /*socket.on('chat message', function (msg) {
        console.log('message: ' + msg);
        //socket.emit('data', )
    });*/

    /*socket.on('data', function (data){
        console.log('data received, emitting data2');
        io.sockets.emit('data2', data);
    });*/
});

http.listen(3000, function () {
    console.log('listening on *:3000');
});