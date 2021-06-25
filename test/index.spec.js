"use strict";

const assert = require("assert");
const babel = require("@babel/core");
const fs = require("fs");
const path = require("path");

require("@babel/register");

describe("Test", () => {
    const pluginPath = require.resolve("../src");

    function runTests() {
        const testsPath = __dirname + "/fixtures/";
        const dirs = fs.readdirSync(testsPath);
        
        dirs.map(function(dirName) {
            const dirPath = path.join(testsPath, dirName);
            let options = {};

            try {
                options = require(dirPath + "/options.js");
            } catch(err) {
                // no options for dirPath
            }

            return {
                path: dirPath,
                name: dirName,
                options
            };
        }).filter(function(item) {
            return fs.statSync(item.path).isDirectory();
        }).forEach(runTest);
    }

    function runTest(dir) {
        it(dir.name, () => {
            const babelOptions = {
                plugins: [
                    [pluginPath, dir.options]
                ]
            };

            const babelConfigPath = dir.path + "/babel.js";
            if ( fs.existsSync(babelConfigPath) ) {
                const additionalBabelOptions = require(dir.path + "/babel.js");
                babelOptions.presets = additionalBabelOptions.presets;
            }

            const actual = babel.transformFileSync(
                dir.path + "/actual.js", 
                babelOptions
            ).code;
            
            const expected = fs.readFileSync(dir.path + "/expected.js", "utf-8");

            assert.strictEqual(
                normalizeLines(actual),
                normalizeLines(expected)
            );

        });
    }

    runTests();
    
    function normalizeLines(str) {
        return str.trimRight()
            .replace(/\r\n/g, "\n")
            .split("\n")
            .filter(line => line.trim() !== "")
            .join("\n");
    }

});