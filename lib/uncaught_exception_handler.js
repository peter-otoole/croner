/**
 * @copyright 2018 Peter O'Toole.
 * @author peter-otoole
 */

let cli
const utils = require( "./utils" )
const color = require( "colors" )
const readline = require( 'readline' )

/**
 * Attaches a uncaught exception listener which handles the tool exit sequence
 *
 * @param toolName
 */
exports.attachListener = function attachListener( toolName ) {

  process.on( "uncaughtException", function ( error ) {

    console.error( color.blackBG(
      `

Failed running ${color.yellow( toolName )} due to exception - ${color.red( error && error.message ? error.message : error )}
${ (utils.isVerbose() && error && error.stack) ? `
${error.stack}
` : ""}
${ color.gray( `Please view the help to ensure you are using the tool correctly and contact the tool author for more information.${utils.isVerbose()? "" : " Run again with '-v' to get more information on this error." }` ) } 
` ) )
    if ( cli && utils.isVerbose() ) {

      const rl = readline.createInterface( {
        input: process.stdin,
        output: process.stdout
      } )

      rl.question( `Print help? (Y/N) - `, ( answer ) => {

        if ( answer === "y" || answer === "Y" ) {

          cli.showHelp()
        }

        process.exit( 1 )
      } )
    }
    else {
      process.exit( 1 )
    }
  } )
}

/**
 * Used to attach the yargs CLI when available
 *
 * @param attachedCli
 */
exports.attachCli = function attachCli( attachedCli ) {
  cli = attachedCli
}
