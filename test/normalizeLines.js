"use strict";

module.exports = function normalizeLines(str) {
    return str.trimRight()
        .replace(/\r\n/g, "\n")
        .split("\n")
        .filter(line => line.trim() !== "")
        .join("\n");
};
