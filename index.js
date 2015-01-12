/**
 * Created by GGuinn on 11/22/2014.
 */

var express = require('express');
var app     = express();
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

app.use(express.static(__dirname + '/'));

io.on('connection', function (socket) {
    console.log('a user connected');

    socket.on('subscribe', function(queueNameSuppliedByHmi) {

        console.log('In subscribe');

        amqp.connect('amqps://Symphony:SymphonyPass@localhost:5671', opts).then(function (conn) {

            conn.createChannel().then(function (ch) {

                //var ok = ch.assertQueue('hello', {durable: false});
                var ok = ch.assertQueue(queueNameSuppliedByHmi, {durable: false});

                ok = ok.then(function (_qok) {

                    ch.consume(queueNameSuppliedByHmi, function (msg) {

                        console.log(" [x] Received '%s'", msg.content.toString());

                        console.log("In socket.io connection");

                        io.emit('data', msg.content.toString());
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
});

http.listen(3000, function () {
    console.log('listening on *:3000');
});