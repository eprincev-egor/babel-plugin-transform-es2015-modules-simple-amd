"use strict";

require("better-log/install");

const {getDefineExpression, onAmdModule} = require("./amd");
const {onEs6Module} = require("./es6");

module.exports = function({ types: t }) {
    
    return {
        visitor: {
            Program: {
                exit(programPath, meta) {
                    const bodyPaths = programPath.get("body");

                    const defineExpression = getDefineExpression(t, bodyPaths);
                    if ( defineExpression ) {
                        onAmdModule(t, meta, defineExpression);
                    }
                    else {
                        onEs6Module(t, programPath, meta);
                    }

                }
            }
        }
    };

};
