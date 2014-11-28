/**
 * Created by GGuinn on 11/23/2014.
 */

var app     = require('express')();
var server  = require('http').Server(app);
var io      = require('socket.io')(server);
var amqp 	= require('amqplib');
var fs 		= require('fs');
var opts 	= {
    cert: fs.readFileSync('C:\\ProgramData\\Schlumberger\\Symphony\\CertificateStores\\CertificateAuthorities\\certs\\signing-ca-1.der'),
    key: fs.readFileSync('C:\\ProgramData\\Schlumberger\\Symphony\\CertificateStores\\server\\rig_server-01-00.symphony.slb.com.key'),
    passPhrase: 'MySecretPassword',
    rejectUnauthorized: 'false',
    ca: fs.readFileSync('C:\\ProgramData\\Schlumberger\\Symphony\\CertificateStores\\CertificateAuthorities\\signing-ca-1.der')
};

var rabbitMq = amqp.connect('amqps://Symphony:SymphonyPass@localhost:5671', opts).then(function(conn) {
    process.once('SIGINT', function() { conn.close(); });

    return conn.createChannel().then(function(ch) {
        var ok = ch.assertQueue('hello', {durable: false});

        ok = ok.then(function(_qok) {
            return ch.consume('hello', function(msg) {
                    console.log(" [x] Received '%s'", msg.content.toString());

                    io.on('connection', function(socket){
                        console.log("In socket.io connection");
                        socket.emit('data', msg.content.toString());
                    });
                },
                {noAck: true});
        });

        return ok.then(function(_consumeOk) {
            console.log(' [*] Waiting for messages. To exit press CTRL+C');
        });
    });
}).then(null, console.warn);