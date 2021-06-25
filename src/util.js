"use strict";
const path = require("path");

function getBasePath(options) {
    return (
        options.moduleName && options.moduleName.basePath || 
            options.basePath
    );
}

function generateModuleName(meta) {
    const customModuleName = extractCustomModuleName(meta);
    if ( customModuleName ) {
        return customModuleName;
    }

    const basePath = getBasePath(meta.opts || {});
    const moduleName = toBasePath(basePath, meta.filename);

    return moduleName;
}

function toBasePath(basePath, filePath) {
    const relativePath = path.relative(basePath, filePath);
    const fullPath = relativePath
        .replace(/\.(js|ts)$/, "")
        .replace(/\\/g, "/");

    return fullPath;
}

function extractCustomModuleName(meta) {
    // try find comment:
    // module name: some
    let sourceCode = meta.file.code;
    if ( /\/\/\s*module name\s*:/.test(sourceCode) ) {
        let execRes = /\/\/\s*module name\s*:[ \t]*([^ \t\n\r]+)/.exec(sourceCode);
        const customModuleName = execRes && execRes[1];
                                
        if ( customModuleName ) {
            return customModuleName.trim();
        }
    }
}


module.exports = {
    getBasePath,
    generateModuleName,
    toBasePath
};