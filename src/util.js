
module.exports.getBasePath = function getBasePath(options) {
    return (
        options.moduleName && options.moduleName.basePath || 
            options.basePath
    );
};
