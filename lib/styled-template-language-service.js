"use strict";
// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT License.
//
// Original code forked from https://github.com/Quramy/ts-graphql-plugin
Object.defineProperty(exports, "__esModule", { value: true });
var vscode_css_languageservice_1 = require("vscode-css-languageservice");
var vscode = require("vscode-languageserver-types");
var config = require("./config");
var wrapperPre = ':root{\n';
var StyledTemplateLanguageService = /** @class */ (function () {
    function StyledTemplateLanguageService(typescript, configuration, logger) {
        this.typescript = typescript;
        this.configuration = configuration;
        this.logger = logger;
    }
    Object.defineProperty(StyledTemplateLanguageService.prototype, "scssLanguageService", {
        // private get cssLanguageService(): LanguageService {
        //     if (!this._cssLanguageService) {
        //         this._cssLanguageService = getCSSLanguageService();
        //         this._cssLanguageService.configure(this.configuration);
        //     }
        //     return this._cssLanguageService;
        // }
        get: function () {
            if (!this._scssLanguageService) {
                this._scssLanguageService = vscode_css_languageservice_1.getSCSSLanguageService();
                this._scssLanguageService.configure(this.configuration);
            }
            return this._scssLanguageService;
        },
        enumerable: true,
        configurable: true
    });
    StyledTemplateLanguageService.prototype.getCompletionsAtPosition = function (context, position) {
        var doc = this.createVirtualDocument(context);
        var stylesheet = this.scssLanguageService.parseStylesheet(doc);
        var items = this.scssLanguageService.doComplete(doc, this.toVirtualDocPosition(position), stylesheet);
        items.items = filterCompletionItems(items.items);
        return translateCompletionItems(this.typescript, items);
    };
    StyledTemplateLanguageService.prototype.getQuickInfoAtPosition = function (context, position) {
        var doc = this.createVirtualDocument(context);
        var stylesheet = this.scssLanguageService.parseStylesheet(doc);
        var hover = this.scssLanguageService.doHover(doc, this.toVirtualDocPosition(position), stylesheet);
        if (hover) {
            return this.translateHover(hover, this.toVirtualDocPosition(position), context);
        }
        return undefined;
    };
    StyledTemplateLanguageService.prototype.getSemanticDiagnostics = function (context) {
        var doc = this.createVirtualDocument(context);
        var stylesheet = this.scssLanguageService.parseStylesheet(doc);
        return this.translateDiagnostics(this.scssLanguageService.doValidation(doc, stylesheet), doc, context, context.text).filter(function (x) { return !!x; });
    };
    StyledTemplateLanguageService.prototype.createVirtualDocument = function (context) {
        var _this = this;
        var contents = "" + wrapperPre + context.text + "\n}";
        return {
            uri: 'untitled://embedded.scss',
            languageId: 'scss',
            version: 1,
            getText: function () { return contents; },
            positionAt: function (offset) {
                var pos = context.toPosition(_this.fromVirtualDocOffset(offset));
                return _this.toVirtualDocPosition(pos);
            },
            offsetAt: function (p) {
                var offset = context.toOffset(_this.fromVirtualDocPosition(p));
                return _this.toVirtualDocOffset(offset);
            },
            lineCount: contents.split(/n/g).length + 1,
        };
    };
    StyledTemplateLanguageService.prototype.toVirtualDocPosition = function (position) {
        return {
            line: position.line + 1,
            character: position.character,
        };
    };
    StyledTemplateLanguageService.prototype.fromVirtualDocPosition = function (position) {
        return {
            line: position.line - 1,
            character: position.character,
        };
    };
    StyledTemplateLanguageService.prototype.toVirtualDocOffset = function (offset) {
        return offset + wrapperPre.length;
    };
    StyledTemplateLanguageService.prototype.fromVirtualDocOffset = function (offset) {
        return offset - wrapperPre.length;
    };
    StyledTemplateLanguageService.prototype.translateDiagnostics = function (diagnostics, doc, context, content) {
        var _this = this;
        var sourceFile = context.node.getSourceFile();
        return diagnostics.map(function (diag) {
            return _this.translateDiagnostic(diag, sourceFile, doc, context, content);
        });
    };
    StyledTemplateLanguageService.prototype.translateDiagnostic = function (diagnostic, file, doc, context, content) {
        // Make sure returned error is within the real document
        if (diagnostic.range.start.line === 0
            || diagnostic.range.start.line > doc.lineCount
            || diagnostic.range.start.character >= content.length) {
            return undefined;
        }
        var start = context.toOffset(this.fromVirtualDocPosition(diagnostic.range.start));
        var length = context.toOffset(this.fromVirtualDocPosition(diagnostic.range.end)) - start;
        var code = typeof diagnostic.code === 'number' ? diagnostic.code : 9999;
        return {
            code: code,
            messageText: diagnostic.message,
            category: translateSeverity(this.typescript, diagnostic.severity),
            file: file,
            start: start,
            length: length,
            source: config.pluginName,
        };
    };
    StyledTemplateLanguageService.prototype.translateHover = function (hover, position, context) {
        var contents = [];
        var convertPart = function (hoverContents) {
            if (typeof hoverContents === 'string') {
                contents.push({ kind: 'unknown', text: hoverContents });
            }
            else if (Array.isArray(hoverContents)) {
                hoverContents.forEach(convertPart);
            }
            else {
                contents.push({ kind: 'unknown', text: hoverContents.value });
            }
        };
        convertPart(hover.contents);
        var start = context.toOffset(this.fromVirtualDocPosition(hover.range ? hover.range.start : position));
        return {
            kind: this.typescript.ScriptElementKind.unknown,
            kindModifiers: '',
            textSpan: {
                start: start,
                length: hover.range ? context.toOffset(this.fromVirtualDocPosition(hover.range.end)) - start : 1,
            },
            displayParts: [],
            documentation: contents,
            tags: [],
        };
    };
    return StyledTemplateLanguageService;
}());
exports.default = StyledTemplateLanguageService;
function filterCompletionItems(items) {
    return items.filter(function (item) {
        if (item.kind === vscode.CompletionItemKind.Property ||
            item.kind === vscode.CompletionItemKind.Unit ||
            item.kind === vscode.CompletionItemKind.Value ||
            item.kind === vscode.CompletionItemKind.Keyword ||
            item.kind === vscode.CompletionItemKind.Snippet ||
            item.kind === vscode.CompletionItemKind.File ||
            item.kind === vscode.CompletionItemKind.Color ||
            !item.kind) {
            return true;
        }
        else if (item.kind === vscode.CompletionItemKind.Function &&
            item.label.substr(0, 1) === ':') {
            return true;
        }
        else {
            return false;
        }
    });
}
function translateCompletionItems(typescript, items) {
    return {
        isGlobalCompletion: false,
        isMemberCompletion: false,
        isNewIdentifierLocation: false,
        entries: items.items.map(function (x) { return translateCompetionEntry(typescript, x); }),
    };
}
function translateCompetionEntry(typescript, item) {
    return {
        name: item.label,
        kindModifiers: 'declare',
        kind: item.kind ? translateionCompletionItemKind(typescript, item.kind) : typescript.ScriptElementKind.unknown,
        sortText: '0',
    };
}
function translateionCompletionItemKind(typescript, kind) {
    switch (kind) {
        case vscode.CompletionItemKind.Method:
            return typescript.ScriptElementKind.memberFunctionElement;
        case vscode.CompletionItemKind.Function:
            return typescript.ScriptElementKind.functionElement;
        case vscode.CompletionItemKind.Constructor:
            return typescript.ScriptElementKind.constructorImplementationElement;
        case vscode.CompletionItemKind.Field:
        case vscode.CompletionItemKind.Variable:
            return typescript.ScriptElementKind.variableElement;
        case vscode.CompletionItemKind.Class:
            return typescript.ScriptElementKind.classElement;
        case vscode.CompletionItemKind.Interface:
            return typescript.ScriptElementKind.interfaceElement;
        case vscode.CompletionItemKind.Module:
            return typescript.ScriptElementKind.moduleElement;
        case vscode.CompletionItemKind.Property:
            return typescript.ScriptElementKind.memberVariableElement;
        case vscode.CompletionItemKind.Unit:
        case vscode.CompletionItemKind.Value:
            return typescript.ScriptElementKind.constElement;
        case vscode.CompletionItemKind.Enum:
            return typescript.ScriptElementKind.enumElement;
        case vscode.CompletionItemKind.Keyword:
            return typescript.ScriptElementKind.keyword;
        case vscode.CompletionItemKind.Color:
            return typescript.ScriptElementKind.constElement;
        case vscode.CompletionItemKind.Reference:
            return typescript.ScriptElementKind.alias;
        case vscode.CompletionItemKind.File:
            return typescript.ScriptElementKind.moduleElement;
        case vscode.CompletionItemKind.Snippet:
        case vscode.CompletionItemKind.Text:
        default:
            return typescript.ScriptElementKind.unknown;
    }
}
function translateSeverity(typescript, severity) {
    switch (severity) {
        case vscode.DiagnosticSeverity.Information:
        case vscode.DiagnosticSeverity.Hint:
            return typescript.DiagnosticCategory.Message;
        case vscode.DiagnosticSeverity.Warning:
            return typescript.DiagnosticCategory.Warning;
        case vscode.DiagnosticSeverity.Error:
        default:
            return typescript.DiagnosticCategory.Error;
    }
}
