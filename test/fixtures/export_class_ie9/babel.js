"use strict";

module.exports = {
    presets:  [
        [
            // ES5 => ES3
            "@babel/preset-env", {
                targets: {
                    ie: "9"
                },
                modules: false
            }
        ]
    ]
};