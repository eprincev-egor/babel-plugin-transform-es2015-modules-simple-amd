
let babel = require("babel-core");
let chalk = require("chalk");
let clear = require("clear");
let diff = require("diff");
let fs = require("fs");
let path = require("path");

require("babel-register");

let pluginPath = require.resolve("../src");

function runTests() {
    let testsPath = __dirname + "/fixtures/";

    fs.readdirSync(testsPath).map(function(item) {
        return {
            path: path.join(testsPath, item),
            name: item
        };
    }).filter(function(item) {
        return fs.statSync(item.path).isDirectory();
    }).forEach(runTest);
}

function runTest(dir) {
    let output = babel.transformFileSync(dir.path + "/actual.js", {
        plugins: [pluginPath]
    });

    let expected = fs.readFileSync(dir.path + "/expected.js", "utf-8");

    function normalizeLines(str) {
        return str.trimRight().replace(/\r\n/g, "\n");
    }

    process.stdout.write(chalk.bgWhite.black(dir.name));
    process.stdout.write("\n\n");

    diff.diffLines(normalizeLines(output.code), normalizeLines(expected))
        .forEach(function (part) {
            let value = part.value;
            if (part.added) {
                value = chalk.green(part.value);
            } else if (part.removed) {
                value = chalk.red(part.value);
            }


            process.stdout.write(value);
        });

    process.stdout.write("\n\n\n");
}

if (process.argv.indexOf("--watch") >= 0) {
    require("watch").watchTree(__dirname + "/..", function () {
        delete require.cache[pluginPath];
        clear();
        console.log("Press Ctrl+C to stop watching...");
        console.log("================================");
        try {
            runTests();
        } catch (e) {
            console.error(chalk.magenta(e.stack));
        }
    });
} else {
    runTests();
}
