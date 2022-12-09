class GracefulUtils {

	constructor(cb){
        this.running = false;
        this.cb = cb;
	}

    run(){
		this.running = true;
	}

    stop(){
		this.running = false;
	}

    graceful(){
        console.log("Turning on graceful shutdown...");

        process.on('message', function(msg) {
            if (msg == 'shutdown') {
                setTimeout(async function() {
                    console.log('~');
                    console.log('GRACEFUL SHUTDOWN: start');
                    while (this.running){
                        console.log('GRACEFUL SHUTDOWN: a process is still running. Sleep...');
                        await new Promise(resolve => setTimeout(resolve, 1000));
                    }
                    this.cb();
                    console.log('GRACEFUL SHUTDOWN: successful');
                    process.exit(0);
                });
            }
        });
    }

}

module.exports = GracefulUtils;