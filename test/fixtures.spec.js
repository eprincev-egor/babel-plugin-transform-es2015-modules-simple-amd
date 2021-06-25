"use strict";

const assert = require("assert");
const babel = require("@babel/core");
const readDirs = require("./readDirs");
const getBabelOptions = require("./getBabelOptions");
const normalizeLines = require("./normalizeLines");

require("@babel/register");

describe("test fixtures", () => {
    const pluginPath = require.resolve("../src");

    for (const dir of readDirs(__dirname + "/fixtures/")) {

        it(dir.name, () => {
            const babelOptions = getBabelOptions(pluginPath, dir);

            const actual = babel.transformFileSync(
                dir.path + "/actual.js", 
                babelOptions
            ).code;
            
            assert.strictEqual(
                normalizeLines(actual),
                normalizeLines(dir.expected)
            );

        });
    }

});