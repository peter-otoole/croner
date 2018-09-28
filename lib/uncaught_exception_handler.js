/**
 * @copyright 2018 Peter O'Toole
 * @author peter-otoole
 */

const utils = require('./utils')
const color = require('colors')
const readline = require('readline')

let cli = null

/**
 * Attaches a uncaught exception listener which handles the tool exit sequence
 *
 * @param {string} toolName - name of the tool
 * @returns {void}
 */
exports.attachListener = function attachListener(toolName) {
  process.on('uncaughtException', (error) => {
    error = error instanceof Error? error : new Error(error)

    console.error(color.blackBG(`\n\nFailed running ${color.yellow(toolName)} due to exception - ${color.red(error.message)}`))

    if (utils.isVerbose()) {
      console.error(color.blackBG(error.stack))
    } else {
      console.error('Run again with \'-v\' to get more information on this error.')
    }

    console.log(color.gray(`Please view the help to ensure you are using the tool correctly and contact the tool author for more information.`))

    if (cli && utils.isVerbose()) {
      const rl = readline.createInterface({
        input: process.stdin,
        output: process.stdout,
      })

      rl.question('Print help? (Y/N) - ', (answer) => {
        if (answer === 'y' || answer === 'Y') {
          cli.showHelp()
        }

        process.exit(1)
      })
    } else {
      process.exit(1)
    }
  })
}

/**
 * Used to attach the yargs CLI when available
 *
 * @param {Object} attachedCli - yargs cli
 * @returns {void}
 */
exports.attachCli = function attachCli(attachedCli) {
  cli = attachedCli
}
