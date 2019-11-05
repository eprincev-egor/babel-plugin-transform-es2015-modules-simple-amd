require("better-log/install");
const template = require("@babel/template").default;

const buildModule = template(`
define(IMPORT_PATHS, function(IMPORT_VARS) {
	NAMED_IMPORTS;
	BODY;
});
`);

module.exports = function({ types: t }) {
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
                            // expression after keyword default
                            const declaration = bodyStatementPath.get("declaration");
                            bodyStatementPath
                        }
                    }

                    if ( isModular ) {

                        // Output the `return defaultExport;` statement.
                        // Done within the loop to have access to `bodyStatementPath`.
                        if ( hasExport ) {
                            const returnStatement = t.returnStatement(
                                exportsVariableName
                            );
                            programPath.unshiftContainer("body", [returnStatement]);
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

                        const isStrict = programPath.node.directives.some(
                            directive => directive.value.value === "use strict"
                        );
                        if (!isStrict) {
                            programPath.unshiftContainer(
                                "directives",
                                t.directive(t.directiveLiteral("use strict"))
                            );
                        }
                    }
                }
            }
        }
    };
};
