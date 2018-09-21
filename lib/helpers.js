/**
 * @copyright 2018 Peter O'Toole.
 * @author peter-otoole
 */

const utils = require("./utils")
const constants = utils.constants

/**
 * Prints the start of the program
 */
exports.printStart = function() {
    console.log(`\n<${constants.tool_name} - \n`)
}

/**
 * Prints the end of the program
 */
exports.printEnd = function() {
    console.log(`\n- ${constants.tool_name}>`)
}