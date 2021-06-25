"use strict";

const fs = require("fs");
const path = require("path");

module.exports = function readDirs(testsPath) {
    const dirNames = fs.readdirSync(testsPath);
        
    const dirs = dirNames
        .filter(dirName =>
            fs.statSync( path.join(testsPath, dirName) ).isDirectory()
        )
        .map((dirName) => {
            const dirPath = path.join(testsPath, dirName);
            let options = {};

            try {
                options = require(dirPath + "/options.js");
            } catch(err) {
            // no options for dirPath
            }

            const expected = fs.readFileSync(dirPath + "/expected.js", "utf-8");

            return {
                path: dirPath,
                name: dirName,
                expected,
                options
            };
        });
    
    return dirs;
};