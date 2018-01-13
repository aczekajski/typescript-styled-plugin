"use strict";
// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT License.
//
// Original code forked from https://github.com/Quramy/ts-graphql-plugin
var styled_template_language_service_1 = require("./styled-template-language-service");
var typescript_template_language_service_decorator_1 = require("typescript-template-language-service-decorator");
var configuration_1 = require("./configuration");
var logger_1 = require("./logger");
module.exports = function (mod) {
    return {
        create: function (info) {
            var logger = new logger_1.LanguageServiceLogger(info);
            var config = configuration_1.loadConfiguration(info.config);
            logger.log('config: ' + JSON.stringify(config));
            return typescript_template_language_service_decorator_1.decorateWithTemplateLanguageService(mod.typescript, info.languageService, new styled_template_language_service_1.default(mod.typescript, config, logger), {
                tags: config.tags,
                enableForStringWithSubstitutions: true,
                getSubstitution: function (templateString, start, end) {
                    var placeholder = templateString.slice(start, end);
                    // check to see if it's an in-property interplation, or a mixin,
                    // and determine which character to use in either case
                    // if in-property, replace with "xxxxxx"
                    // if a mixin, replace with "      "
                    var pre = templateString.slice(0, start);
                    var replacementChar = pre.match(/(^|\n)\s*$/g) ? ' ' : 'x';
                    var result = placeholder.replace(/./gm, function (c) { return c === '\n' ? '\n' : replacementChar; });
                    // check if it's a mixin and if followed by a semicolon
                    // if so, replace with a dummy variable declaration, so scss server doesn't complain about rogue semicolon
                    if (replacementChar === ' ' && templateString.slice(end).match(/^\s*;/)) {
                        result = '$a:0' + result.slice(4);
                    }
                    return result;
                },
            }, { logger: logger });
        },
    };
};