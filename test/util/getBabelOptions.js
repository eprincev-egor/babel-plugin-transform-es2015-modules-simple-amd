"use strict";

const fs = require("fs");

module.exports = function getBabelOptions(pluginPath, dir) {
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

    return babelOptions;
};