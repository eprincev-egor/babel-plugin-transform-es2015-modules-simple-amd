"use strict";

require("better-log/install");
const template = require("@babel/template").default;
const path = require("path");

const buildAnonymousModule = template(`
define(IMPORT_PATHS, function(IMPORT_VARS) {
  "use strict";
	NAMED_IMPORTS;
	BODY;
});
`);
const buildNamedModule = template(`
define(MODULE_NAME, IMPORT_PATHS, function(IMPORT_VARS) {
  "use strict";
	NAMED_IMPORTS;
	BODY;
});
`);
const forInTemplate = template(`
for (var _key in IMPORT_VAR) {
    EXPORT_VAR[ _key ] = IMPORT_VAR[ _key ];
}
`);

module.exports = function({ types: t }) {
    
    function exportStatement({
        exportsVariableName,
        key,
        value
    }) {
        return t.toStatement( t.assignmentExpression(
            "=", 
            t.memberExpression(exportsVariableName, t.identifier(key)), 
            value
        ) );
    }

    return {
        visitor: {
            Program: {
                exit(programPath, meta) {
                    const bodyPaths = programPath.get("body");
                    const importPaths = [];
                    const importVars = [];
                    const namedImports = [];
                    const options = meta.opts || {};
                    const fullFilePath = meta.filename;
                    let customModuleName;

                    if ( options.moduleName ) {
                        if ( !options.moduleName.basePath ) {
                            throw new Error("moduleName should be object like are: {basePath: '...'}");
                        }

                        // try find comment:
                        // module name: some
                        let sourceCode = meta.file.code;
                        if ( /\/\/\s*module name\s*:/.test(sourceCode) ) {
                            let execRes = /\/\/\s*module name\s*:\s*([^\n\r]+)/.exec(sourceCode);
                            customModuleName = execRes && execRes[1];
                            
                            if ( customModuleName ) {
                                customModuleName = customModuleName.trim();
                            }
                        }
                    }
                    
                    const exportsVariableName = programPath.scope.generateUidIdentifier("exports");
                    let hasExport = false;
                    let isOnlyDefaultExport = true;
                    let needDefineWrapper = false;
                    let isAnonymousAmdModule = false;
                    let defineExpression = null;

                    for (let i = 0; i < bodyPaths.length; i++) {
                        const bodyStatementPath = bodyPaths[i];

                        // import
                        if ( t.isImportDeclaration(bodyStatementPath) ) {
                            // save import path
                            importPaths.push(
                                bodyStatementPath.node.source
                            );


                            const {specifiers} = bodyStatementPath.node;
                            
                            // import "some"
                            const isAnonymousImport = (
                                specifiers.length === 0
                            );
                            // import some from "some"
                            const isImportDefault = (
                                specifiers.length === 1 &&
                                specifiers[0].type === "ImportDefaultSpecifier"
                            );
                            // import * as some from "some"
                            const isImportAllAs = (
                                specifiers.length === 1 &&
                                specifiers[0].type !== "ImportDefaultSpecifier" &&
                                !specifiers[0].imported
                            );
                            // import {x, y, z} from "xyz"
                            const isImportSomeAs = (
                                !isAnonymousImport &&
                                !isImportDefault
                            );


                            // import "some"
                            if ( isAnonymousImport ) {
                                // importVars.length
                                // should be equal 
                                // importPaths.length 
                                const tmpImportVariableName = bodyStatementPath.scope.generateUidIdentifier(
                                    bodyStatementPath.node.source.value
                                );
                                importVars.push( tmpImportVariableName );
                            }
                            // import some from "some"
                            // import * as some from "some"
                            else if ( isImportDefault || isImportAllAs ) {
                                const asName = specifiers[0].local;
                                importVars.push( asName );
                            }
                            // import {x, y, z} from "xyz"
                            else if ( isImportSomeAs ) {
                                // convert "/path/to/a"  to   _pathToA
                                const asName = bodyStatementPath.scope.generateUidIdentifier(
                                    bodyStatementPath.node.source.value
                                );
                                importVars.push( asName );

                                specifiers.forEach(({imported, local}) => {
                                    namedImports.push(
                                        t.variableDeclaration("var", [
                                            t.variableDeclarator(
                                                t.identifier(local.name),
                                                t.memberExpression(
                                                    t.identifier(asName.name), 
                                                    t.identifier(imported.name)
                                                )
                                            )
                                        ])
                                    );
                                });
                            }
                            else {
                                throw new Error("unknown case");
                            }
                            
                            bodyStatementPath.remove();
                            needDefineWrapper = true;
                        }

                        // export default
                        if ( t.isExportDefaultDeclaration(bodyStatementPath) ) {
                            // need return at end file
                            hasExport = true;
                            needDefineWrapper = true;

                            // expression after keyword default
                            const declaration = bodyStatementPath.get("declaration");
                            let exportValue = declaration.node;
                            
                            let isFunction = (
                                t.isFunctionDeclaration(declaration)
                            );
                            let isClass = (
                                t.isClassDeclaration(declaration)
                            );

                            if ( isFunction ) {
                                let funcNode = exportValue;
                                exportValue = t.toExpression(funcNode);
                            }
                            if ( isClass ) {
                                let classNode = exportValue;
                                exportValue = t.toExpression(classNode);
                            }


                            const statement = exportStatement({
                                exportsVariableName,
                                key: "default",
                                value: exportValue
                            });

                            bodyStatementPath.replaceWith(statement);
                        }

                        // export {x as y}
                        // export var a = 1;
                        // export function test() {};
                        // export class Test {};
                        if ( t.isExportNamedDeclaration(bodyStatementPath) ) {
                            hasExport = true;
                            needDefineWrapper = true;
                            isOnlyDefaultExport = false;

                            const {specifiers} = bodyStatementPath.node;
                            const declaration = bodyStatementPath.get("declaration");

                            // export var a = 1;
                            if ( !specifiers.length ) {
                                // replace "export <expression>"
                                // to "<expression>"
                                bodyStatementPath.replaceWith( declaration );
                                

                                // export var a = 1;
                                let isVariable = t.isVariableDeclaration( declaration );
                                if ( isVariable ) {
                                    let varNode = declaration.node;
                                    let asName = varNode.declarations[0].id.name;
                                    

                                    let exportValue = t.identifier(asName);
    
                                    const statement = exportStatement({
                                        exportsVariableName,
                                        key: asName,
                                        value: exportValue
                                    });
                                    
                                    programPath.pushContainer("body", [statement]);
                                }

                                // export function x() {}
                                let isFunction = t.isFunctionDeclaration(declaration);
                                if ( isFunction ) {
                                    let funcNode = declaration.node;
                                    let asName = funcNode.id.name;


                                    let exportValue = t.identifier(asName);
    
                                    const statement = exportStatement({
                                        exportsVariableName,
                                        key: asName,
                                        value: exportValue
                                    });
                                    
                                    programPath.pushContainer("body", [statement]);
                                }

                                // export class Test {}
                                let isClass = t.isClassDeclaration(declaration);
                                if ( isClass ) {
                                    let classNode = declaration.node;
                                    let asName = classNode.id.name;


                                    let exportValue = t.identifier(asName);
    
                                    const statement = exportStatement({
                                        exportsVariableName,
                                        key: asName,
                                        value: exportValue
                                    });
                                    
                                    programPath.pushContainer("body", [statement]);
                                }
                                
                            }
                            // export {x as y}
                            else {
                                specifiers.forEach(specifier => {
                                    let asName = specifier.exported.name;
                                    let exportValue = specifier.local;
    
                                    const statement = exportStatement({
                                        exportsVariableName,
                                        key: asName,
                                        value: exportValue
                                    });
                                    
                                    programPath.pushContainer("body", [statement]);
                                });

                                bodyStatementPath.remove();
                            }
                        }


                        // export * from "module"
                        if ( t.isExportAllDeclaration(bodyStatementPath) ) {
                            needDefineWrapper = true;
                            isOnlyDefaultExport = false;
                            hasExport = true;

                            // save import path
                            importPaths.push(
                                bodyStatementPath.node.source
                            );
                            // importVars.length
                            // should be equal 
                            // importPaths.length 
                            const tmpImportVariableName = bodyStatementPath.scope.generateUidIdentifier(
                                bodyStatementPath.node.source.value
                            );
                            importVars.push( tmpImportVariableName );
                            
                            const forIn = forInTemplate({
                                IMPORT_VAR: tmpImportVariableName,
                                EXPORT_VAR: exportsVariableName
                            });


                            bodyStatementPath.replaceWith(forIn);
                        }

                        if ( t.isExpressionStatement(bodyStatementPath) ) {
                            const expression = bodyStatementPath.get("expression");
                            if ( t.isCallExpression(expression) ) {
                                const calleeNode = expression.get("callee");
                                const nameNode = calleeNode.get("name");
                                const args = expression.get("arguments") || [];
                                const firstArg = args[0];

                                let isAnonymousDefine = (
                                    nameNode.node == "define" &&
                                    firstArg && 
                                    t.isArrayExpression( firstArg )
                                );

                                if ( isAnonymousDefine ) {
                                    isAnonymousAmdModule = true;
                                    defineExpression = expression;
                                }
                            }
                        }
                    }


                    // adding define wrapper
                    if ( needDefineWrapper ) {

                        
                        if ( hasExport ) {

                            // var _exports = {};
                            programPath.unshiftContainer("body", [
                                t.variableDeclaration("var", [
                                    t.variableDeclarator(
                                        exportsVariableName,
                                        t.objectExpression([])
                                    )
                                ])
                            ]);



                            // return <expression>;
                            let returnStatement;

                            if ( isOnlyDefaultExport ) {
                                // return _exports.default;
                                returnStatement = t.returnStatement(
                                    t.memberExpression(
                                        exportsVariableName, 
                                        t.identifier("default")
                                    )
                                );
                            }
                            else {
                                // return _exports;
                                returnStatement = t.returnStatement(
                                    exportsVariableName
                                );
                            }

                            programPath.pushContainer("body", [returnStatement]);
                        }


                        const templateValues = {
                            IMPORT_PATHS: t.arrayExpression(
                                importPaths
                            ),
                            IMPORT_VARS: importVars,
                            BODY: programPath.node.body,
                            NAMED_IMPORTS: namedImports
                        };
                        let buildModule = buildAnonymousModule;
                        
                        if ( options.moduleName ) {
                            buildModule = buildNamedModule;


                            const basePath = options.moduleName.basePath;
                            const relativePath = path.relative(basePath, fullFilePath);
                            const moduleName = (
                                customModuleName ? 
                                    customModuleName : 
                                    relativePath
                                        .replace(/\.js$/, "")
                                        .replace(/\\/g, "/")
                            );

                            templateValues.MODULE_NAME = t.stringLiteral(moduleName);
                        }

                        programPath.node.body = [
                            buildModule( templateValues )
                        ];
                    }
                    
                    if ( isAnonymousAmdModule ) {
                        if ( options.moduleName ) {
                            const basePath = options.moduleName.basePath;
                            const relativePath = path.relative(basePath, fullFilePath);
                            const moduleName = relativePath
                                .replace(/\.js$/, "")
                                .replace(/\\/g, "/");
                            
                            
                            defineExpression.node.arguments.unshift(
                                t.stringLiteral( moduleName )
                            );
                        }
                    }
                }
            }
        }
    };
};
