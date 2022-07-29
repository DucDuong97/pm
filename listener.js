const pm2 = require('pm2');

pm2.connect(function(err){
    if (err) {
        console.error(`connection error: ${err}`);
        process.exit(2);
    }

    pm2.launchBus((err, bus) => {
        bus.on('process:event', (packet) => {
            if (packet.event == 'exit'){
                console.log('packet', packet.process.name);
            }
        });
    });

    pm2.disconnect();
});