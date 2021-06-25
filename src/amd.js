"use strict";

const {generateModuleName} = require("./util");

module.exports.getDefineExpression = function getDefineExpression(t, bodyPaths) {
    for (const bodyStatementPath of bodyPaths) {
        if ( !t.isExpressionStatement(bodyStatementPath) ) {
            continue;
        }

        const expression = bodyStatementPath.get("expression");
        if ( !t.isCallExpression(expression) ) {
            continue;
        }

        const calleeNode = expression.get("callee");
        const nameNode = calleeNode.get("name");

        if ( nameNode.node == "define" ) {
            return expression;
        }
    }
};

module.exports.onAmdModule = function onAmdModule(t, meta, defineExpression) {
    const options = meta.opts || {};

    if ( !options.moduleName ) {
        return;
    }
    if ( !isAnonymousDefine(t, defineExpression) ) {
        return;
    }

    const moduleName = generateModuleName(meta);                
                
    defineExpression.node.arguments.unshift(
        t.stringLiteral( moduleName )
    );
};

function isAnonymousDefine(t, defineExpression) {
    const args = defineExpression.get("arguments") || [];
    return (
        args[0] && 
            t.isArrayExpression( args[0] )
    );
}
