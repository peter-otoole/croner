/**
 * Copyright 2017 Peter O'Toole.
 *
 * @author peter-otoole
 * @created 28 May 2017
 *
 * Utility functions
 */

const uuid = require("uuid")
const colors = require("colors")
const path = require("path")

/**
 * Add errors to global
 */
global.InputError = function(desc) {
    let error = new Error(desc)
    error.name = "InputError"
    return error
}

global.InternalError = function(desc) {
    let error = new Error(desc)
    error.name = "InternalError"
    return error
}

/**
 * is. type checker. Returns true or false to say whether the value passed meets the type or not.
 *
 * Exposes the 'is' function as a .is.<type>( <value> )
 *
 * examples:
 *  is.string( 123 ) --> false
 *  is.array( [] ) --> true
 *
 * @param suspect
 *      - the value/reference you want to check the type of
 *
 * @returns boolean
 *      - if the type matches or not
 * */

const types = ['array', 'boolean', 'date', 'error', 'function',
    'null', 'number', 'object', 'regexp', 'string', 'symbol', 'undefined'
];

function is(type, suspect) {

    return Object.prototype.toString.call(suspect).toLowerCase() === "[object " + type + "]"
}
exports.types = types;

/**
 *
 * @type {{url: exports.is.url, email: exports.is.email, string: function, object: function, array: function, function:
 *   function}}
 */
exports.is = {};
types.forEach(function(type) {

    exports.is[type] = is.bind({}, type)
});

function getType(val) {

    return Object.prototype.toString.call(val).slice(8, -1).toLowerCase()
}
exports.getType = getType

function log(level) {

    const logging_level = process.env.logging_level
    let message = Array.prototype.slice.call(arguments, 1).join(" ")
    let outputString = `${level.toUpperCase()} ${new Date().toISOString()}: ${message}`

    if (level === "trace" && logging_level === "trace") {

        console.log(colors.magenta(outputString))
    } else if (level === "debug" && (logging_level === "debug" || logging_level === "trace")) {

        console.log(colors.yellow(outputString))
    } else if (level === "info" && (logging_level === "info" || logging_level === "debug" || logging_level === "trace")) {

        console.log(colors.green(outputString))
    } else if (level === "warning" && (logging_level === "warning" || logging_level === "info" || logging_level === "debug" || logging_level === "trace")) {

        console.error(`\u001b[93m${outputString}\u001b[39m`)
    } else if (level === "error") {

        console.error(colors.red(outputString))
    }
}

exports.log = {
    info: log.bind(null, "info"),
    debug: log.bind(null, "debug"),
    trace: log.bind(null, "trace"),
    warn: log.bind(null, "warning"),
    error: log.bind(null, "error")
}

exports.setLoggingLevel = function(levelParameter) {

    let level

    if (getType(levelParameter) === "undefined") {
        level = "info"
    } else if (getType(levelParameter) === "string" && !levelParameter) {
        level = "debug"
    } else {

        if (!Object.prototype.hasOwnProperty.call(exports.log, levelParameter)) {
            throw new Error(`'${levelParameter}' is not a valid logging level - please choose one of ${Object.keys( exports.log ).toString()}`)
        } else {
            level = levelParameter
        }
    }

    process.env.logging_level = level
}

exports.uuid = uuid.v4

exports.constants = {
    tool_name: "croner"
}

exports.findValue = function(path, value) {

    path = path.split(".")

    try {

        path.forEach(function(subField) {
            value = value[subField]
        })
    } catch (error) {
        return null
    }

    return value
}

exports.valid = {
    populatedString: function(item) {
        return item && exports.is.string(item)
    }
}

exports.isVerbose = function() {
    return process.env.logging_level === "trace" || process.env.logging_level === "debug"
}


/**
 * Checks if a key (string) is an own property member of an object
 *
 * @param object {object}
 * @param key {string}
 * @return {boolean}
 */
exports.member = function(object, key) {
    return Object.prototype.hasOwnProperty.call(object, key)
}

/**
 * Adds required number of characters to the left of the provided value to get it to the length specified
 *
 * @param {string} value
 * @param {number} length
 * @param {string} padding
 * @return {string}
 */
exports.leftPad = function(value, length = 6, padding = "0") {

    let subject = value

    if (subject.length >= length) {
        return subject
    }

    for (let i = 0; i < length - value.length; i++) {
        subject = padding + subject
    }

    return subject
}

/**
 * Adds required number of characters to the right of the provided value to get it to the length specified
 *
 * @param {string} value
 * @param {number} length
 * @param {string} padding
 * @return {string}
 */
exports.rightPad = function(value, length = 6, padding = "0") {

    let subject = value

    if (subject.length >= length) {
        return subject
    }

    for (let i = 0; i < length - value.length; i++) {
        subject = subject + padding
    }

    return subject
}