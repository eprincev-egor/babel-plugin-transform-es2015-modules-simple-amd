"use strict";

require("better-log/install");
const template = require("@babel/template").default;

const buildModule = template(`
define(IMPORT_PATHS, function(IMPORT_VARS) {
  "use strict";
	NAMED_IMPORTS;
	BODY;
});
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
                exit(programPath) {
                    const bodyPaths = programPath.get("body");
                    const importPaths = [];
                    const importVars = [];
                    const namedImports = [];
                    
                    const exportsVariableName = programPath.scope.generateUidIdentifier("exports");
                    let hasExport = false;
                    let isOnlyDefaultExport = true;
                    let isModular = false;

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
                            isModular = true;
                        }

                        // export default
                        if ( t.isExportDefaultDeclaration(bodyStatementPath) ) {
                            // need return at end file
                            hasExport = true;
                            isModular = true;

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
                            isModular = true;
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
                    }


                    // adding define wrapper
                    if ( isModular ) {

                        
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


                        programPath.node.body = [
                            buildModule({
                                IMPORT_PATHS: t.arrayExpression(
                                    importPaths
                                ),
                                IMPORT_VARS: importVars,
                                BODY: programPath.node.body,
                                NAMED_IMPORTS: namedImports
                            })
                        ];
                    }
                }
            }
        }
    };
};
