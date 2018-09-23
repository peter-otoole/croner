/**
 * @copyright 2018 Peter O'Toole.
 * @author peter-otoole
 */

const utils = require('./utils');
const constants = utils.constants;

/**
 * Prints the start of the program
 *
 * @returns {void}
 */
exports.printStart = () => {
  console.log(`\n<${constants.tool_name} - \n`);
};

/**
 * Prints the end of the program
 *
 * @returns {void}
 */
exports.printEnd = () => {
  console.log(`\n- ${constants.tool_name}>`);
};
