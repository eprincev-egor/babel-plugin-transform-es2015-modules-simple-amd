"use strict";

const template = require("@babel/template").default;
const path = require("path");
const {getBasePath, generateModuleName} = require("./util");

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

module.exports.onEs6Module = function onEs6Module(t, programPath, meta) {
    const bodyPaths = programPath.get("body");

    const importPaths = [];
    const importVars = [];
    const namedImports = [];
    const options = meta.opts || {};
    const basePath = getBasePath(options);

    if ( options.moduleName && !basePath ) {
        throw new Error("moduleName should be boolean or object like are: {basePath: '...'}");
    }
        
    const exportsVariableName = programPath.scope.generateUidIdentifier("exports");
    let hasExport = false;
    let hasImport = false;
    let isOnlyDefaultExport = true;

    for (let i = 0; i < bodyPaths.length; i++) {
        const bodyStatementPath = bodyPaths[i];

        // import
        if ( t.isImportDeclaration(bodyStatementPath) ) {
            // save import path
            importPaths.push(
                bodyStatementPath.node.source
            );

            const importNode = bodyStatementPath.node;

            // import "some"
            if ( isAnonymousImport(importNode) ) {
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
            else if ( isImportDefault(importNode) || isImportAllAs(importNode) ) {
                const asName = importNode.specifiers[0].local;
                importVars.push( asName );
            }
            // import {x, y, z} from "xyz"
            else {
                // convert "/path/to/a"  to   _pathToA
                const asName = bodyStatementPath.scope.generateUidIdentifier(
                    bodyStatementPath.node.source.value
                );
                importVars.push( asName );

                importNode.specifiers.forEach(({imported, local}) => {
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
                
            bodyStatementPath.remove();
            hasImport = true;
        }

        // export default
        if ( t.isExportDefaultDeclaration(bodyStatementPath) ) {
            // need return at end file
            hasExport = true;

            // expression after keyword default
            const declaration = bodyStatementPath.get("declaration");
            let exportValue = declaration.node;
            let needExportExpression = true;


            if ( t.isFunctionDeclaration(declaration) ) {
                const funcNode = exportValue;
                exportValue = t.toExpression(funcNode);
            }
            if ( t.isClassDeclaration(declaration) ) {
                const classNode = exportValue;

                if ( classNode.id ) {
                    const className = t.identifier(classNode.id.name);
                    const exportDefault = exportStatement({
                        t, exportsVariableName,
                        key: "default",
                        value: className
                    });

                    bodyStatementPath.replaceWith(classNode);
                    programPath.pushContainer("body", [
                        exportDefault
                    ]);

                    needExportExpression = false;
                }
                else {
                    exportValue = t.toExpression(classNode);
                }
            }

            if ( needExportExpression ) {
                const statement = exportStatement({
                    t, exportsVariableName,
                    key: "default",
                    value: exportValue
                });

                bodyStatementPath.replaceWith(statement);
            }
        }

        // export {x as y}
        // export var a = 1;
        // export function test() {};
        // export class Test {};
        if ( t.isExportNamedDeclaration(bodyStatementPath) ) {
            hasExport = true;

            const {specifiers} = bodyStatementPath.node;
            const declaration = bodyStatementPath.get("declaration");

            // export var a = 1;
            if ( !specifiers.length ) {
                isOnlyDefaultExport = false;

                // replace "export <expression>"
                // to "<expression>"
                bodyStatementPath.replaceWith( declaration );
                    

                // export var a = 1;
                if ( t.isVariableDeclaration( declaration ) ) {
                    const varNode = declaration.node;
                    const asName = varNode.declarations[0].id.name;

                    const statement = exportStatement({
                        t, exportsVariableName,
                        key: asName,
                        value: t.identifier(asName)
                    });
                        
                    programPath.pushContainer("body", [statement]);
                }

                // export function x() {}
                if ( t.isFunctionDeclaration(declaration) ) {
                    const funcNode = declaration.node;
                    const asName = funcNode.id.name;

                    const statement = exportStatement({
                        t, exportsVariableName,
                        key: asName,
                        value: t.identifier(asName)
                    });
                        
                    programPath.pushContainer("body", [statement]);
                }

                // export class Test {}
                if ( t.isClassDeclaration(declaration) ) {
                    const classNode = declaration.node;
                    const asName = classNode.id.name;

                    const statement = exportStatement({
                        t, exportsVariableName,
                        key: asName,
                        value: t.identifier(asName)
                    });
                        
                    programPath.pushContainer("body", [statement]);
                }
                    
            }
            // export {x as y}
            else {
                specifiers.forEach(specifier => {
                    const asName = specifier.exported.name;

                    if ( asName != "default" ) {
                        isOnlyDefaultExport = false;
                    }

                    const statement = exportStatement({
                        t, exportsVariableName,
                        key: asName,
                        value: specifier.local
                    });
                        
                    programPath.pushContainer("body", [statement]);
                });

                bodyStatementPath.remove();
            }
        }


        // export * from "module"
        if ( t.isExportAllDeclaration(bodyStatementPath) ) {
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
    }


    // adding define wrapper
    if ( hasImport || hasExport ) {

            
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

        buildModule({
            t, programPath, meta,
            importPaths, importVars, namedImports
        });
    }
};

function buildModule({
    t, programPath, meta,
    importPaths, importVars, 
    namedImports
}) {
    const options = meta.opts || {};
    const templateValues = {
        IMPORT_PATHS: prepareImportPaths(
            t, meta, importPaths
        ),
        IMPORT_VARS: importVars,
        BODY: programPath.node.body,
        NAMED_IMPORTS: namedImports
    };
        
    if ( options.moduleName ) {
        const moduleName = generateModuleName(meta);

        templateValues.MODULE_NAME = t.stringLiteral(moduleName);

        programPath.node.body = [
            buildNamedModule( templateValues )
        ];
    }
    else {
        programPath.node.body = [
            buildAnonymousModule( templateValues )
        ];
    }
}

function prepareImportPaths(t, meta, importPaths) {
    const options = meta.opts || {};
    const basePath = getBasePath(options);

    if ( options.paths ) {
        importPaths.forEach(importNode => {
            const importPath = importNode.value;
            const fullImportPath = path.resolve(
                meta.file.opts.filename, 
                "../" + importPath
            );

            for (const moduleName in options.paths) {
                const modulePath = options.paths[ moduleName ];
                const fullModulePath = path.resolve(basePath, modulePath);

                if ( fullImportPath == fullModulePath ) {
                    importNode.value = moduleName;
                    break;
                }
            }
        });
    }

    return t.arrayExpression(importPaths);
}

function isAnonymousImport(importNode) {
    // import "some"
    return (
        importNode.specifiers.length === 0
    );
}

function isImportDefault(importNode) {
    // import some from "some"
    return (
        importNode.specifiers.length === 1 &&
        importNode.specifiers[0].type === "ImportDefaultSpecifier"
    );
}

function isImportAllAs(importNode) {
    // import * as some from "some"
    return (
        importNode.specifiers.length === 1 &&
        importNode.specifiers[0].type !== "ImportDefaultSpecifier" &&
        !importNode.specifiers[0].imported
    );
}

function exportStatement({
    t, exportsVariableName,
    key,
    value
}) {
    return t.toStatement( t.assignmentExpression(
        "=", 
        t.memberExpression(exportsVariableName, t.identifier(key)), 
        value
    ) );
}
        