var exec = require('child_process').exec;
var appname = process.argv[2];
var runCmd = 'phantomjs ../amdjs-tests/server/phantom-runner.js ' +
    appname + ' http://localhost:4000/?framework=' +
    appname + '\\&autorun=true';

exec(runCmd, {timeout: 10000}, function (error, stdout, stderr) {

    console.warn(stdout);

    if (error) {
        console.warn('test suite failed');
        process.exit(1);
    }
    else {
        console.warn('test suite passes');
        process.exit(0);
    }
  
});

