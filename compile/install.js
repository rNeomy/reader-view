var fs      = require('fs'),
    path    = require('path'),
    program = require('commander'),
    clc     = require('cli-color'),
    net     = require('net'),
    spawn   = require('child_process').spawn,
    exec    = require('child_process').exec,
    glob    = require("glob");


var isWindows = !!process.platform.match(/^win/);

/** Command Line setup **/
program
  .version('0.0.4')
  .option('-r, --run',
    'Run extension in a clean profile ' +
    '(equivalent to cfx run). No XPI will be generated'
  )
  .option('-w, --wget',
    'Send generated XPI over TCP (Port:8888) to the current profile ' +
    'A TCP server such as "Extension auto installer" is required.'
  )
  .option('-e, --xpi',
    'Create XPI file in /src dir'
  )
  .option('-j, --jsconsole',
    'Show jsConsole in run mode'
  )
  .option('-i, --ip <ip>',
    'Combine this option with --wget to send the generated XPI to a host rather than "localhost"',
    'localhost'
  )
  .option('--sdk <sdk path>',
    'Path to the Mozilla Add-On SDK library [..]',
    '..'
  )
  .option('--sdkVersion <preferred sdk version>',
    'Use another version of SDK rather than the most recent one'
  )
  .parse(process.argv);

/** Wget **/
var installer = function (callback) {
  var child;

  var cmd = "ls src/executables/*.xpi"
  child = exec(cmd, {}, function (error, stdout, stderr) {
      if (stdout) {
        fs.readFile(/.*/.exec(stdout)[0], null, function(err, buffer) {
          console.log(clc.green('Connecting to ' + program.ip + '/:8888'));
          var client = net.connect({
            host: program.ip,
            port: 8888
          }, function() {
            var identifier = new Buffer('\rPOST / HTTP/1.1\n\rUser-Agent: NodeJS Compiler\n\r\n');
            client.write(identifier);
            client.end(buffer);
          });
          client.on('data', function(data) {
            console.log(clc.green(data.toString()));
            client.end();
            setTimeout(function(){process.exit(0);}, 500);
          });
        });
      }
      if (stderr)
        console.log(clc.red(stderr));
  });
}

process.chdir(require("path").join(__dirname, '..'));

/** Clearing Thumb.db and .DS_Store **/
glob("**/.DS_Store", {}, function (err, files1) {
  if (err) throw err;
  glob("**/Thumbs.db", {}, function (err, files2) {
    if (err) throw err;
    var files = files1.concat(files2);
    files.forEach(function (file) {
      console.error('cleaning ', file);
      fs.unlinkSync(file);
    });
    /** Find SDK **/
    fs.readdir(program.sdk, function (err, files) {
      if (err) throw new Error(err);

      var actualAddonPath, sdkVersion, sdkVersionMatched = false;
      /** In case user supplied path pointing to actual SDK directory **/
      if (/addon-sdk/.test(program.sdk) !== false) {
        if (typeof program.sdkVersion !== "undefined") {
          console.log(clc.red("--sdk pointed to actual addon directory, ignoring --sdkVersion"));
        }
        actualAddonPath = program.sdk;
        sdkVersion = actualAddonPath
      } else {
        files = files.filter(function (file) {
          return /^addon-sdk-/.test(file);
        }).sort(function (a, b) {
          /** Is there any preferred sdk version **/
          if (program.sdkVersion) {
            if (a.indexOf(program.sdkVersion) != -1) {
              sdkVersionMatched = true;
              return -1;
            }
            if (b.indexOf(program.sdkVersion) != -1) {
              sdkVersionMatched = true;
              return 1;
            }
          }
          /** If the directory used has multiple addon-sdk folders, make sure we use the most recent **/
          var _patern = /(\d+)/g;
          var temp1 = a.match(_patern), temp2 = b.match(_patern);
          for (var i = 0; i < 10; i++) {
            if (temp1[i] != temp2[i]) {
              return parseInt(temp1[i])<parseInt(temp2[i]);
            }
          }
        });
        if (program.sdkVersion && sdkVersionMatched === false) throw new Error("Unable to find sdk directory for "+program.sdkVersion);
        if (!files.length) throw new Error("Addon-sdk not found");
        actualAddonPath = program.sdk + path.sep + files[0];
        sdkVersion = files[0];
      }

      var bootstrap = actualAddonPath + "/app-extension/bootstrap.js";
      var sdk = actualAddonPath + (isWindows ? "/bin" : "");
      console.log(clc.green(
        "SDK version: " + sdkVersion + "\n" +
        "bootstrap found at: " + bootstrap
      ));

      /** Replace bootstrap.js **/
      stats = fs.lstatSync('template/');
      if (stats.isDirectory()) {
        fs.createReadStream(bootstrap).pipe(fs.createWriteStream('template/bootstrap.js'));
      }

      /** Execute cfx **/
      var cfx = spawn(isWindows ? 'cmd' : 'bash', [], { cwd: sdk });
      if (!isWindows) cfx.stdin.write("echo Bash\n");

      var stage = 0;
      cfx.stdout.on('data', function (data) {
        console.log(clc.xterm(250)(data));
        switch (stage) {
          case 0:
            cfx.stdin.write(isWindows ? "activate\n" : "echo step 1&&source bin/activate\n");
            stage += 1;
            break;
          case 1:
            stage += 1;
            break;
          case 2:
            var cmd = "echo step 2&&cd " + require("path").join(__dirname, '..');
            if (isWindows) cmd += "&&" + /\w\:/.exec(require("path").resolve('.'))[0];
            cfx.stdin.write(cmd + "\n");
            stage += 1;
            break;
          case 3:
            cfx.stdin.write("echo step 3&&cd src\n");
            stage += 1;
            break;
          case 4:
            cfx.stdin.write(
              "cfx --force-mobile --templatedir=../template " + /*--force-mobile*/
              ((program.xpi || program.wget) ? "xpi --output-file ./executables/extension.xpi&&echo step 4" : (
                "run" + (program.jsconsole ? " --binary-args -jsconsole" : "") + "&&echo step 4"
              )) + "\n"
            );
            stage += 1;
            break;
          case 5:
            cfx.stdin.write("echo step 5&&exit\n");
            stage += 1;
            break;
          case 6:
            stage += 1;
            if (isWindows) break;
          case 7:
            if (program.wget) {
              setTimeout(function(){installer()}, 1000);
            }
            stage += 1;
            break;
        }
      });
      cfx.stderr.on('data', function (data) {
        console.log(clc.red('stderr: ' + data));
      });
      cfx.on('exit', function (code) {
        console.log(clc.green('Exited code: ' + code));
      });
    });
  });
});

