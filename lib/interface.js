/**
 * Copyright 2017 Peter O'Toole.
 *
 * @author peter-otoole
 * @created 28 May 2017
 */

const utils = require( "./utils" )
const yargs = require( "yargs" )

const log = utils.log
const is = utils.is

module.exports = fucntion() {

    const yargsInterface = getInterface()
    const cli = yargsInterface.argv

    return { interface: yargsInterface, cli: cli }
}

function getInterface( ) {

    return yargs.usage( `
 Sorts all files in a folder based on creation date meta information, by prepending a number to the filename.
                          
 Usage: ${utils.constants.too_name} [options]

 Examples:
   - ${utils.constants.too_name } -f C://pictures// -p *+.jpg -d ctime
` ).option( "f", {
    alias: "folder",
    describe: "the folder location of the files to be sorted",
    type: "string",
    demand: true
  } ).option( "p", {
    alias: "pattern",
    describe: "filename pattern to match, defaults to *",
    type: "string",
    demand: false
  } ).option( "t", {
    alias: "time",
    describe: "time type ",
    choices: [ "ctime" ],
    demand: false
  } ).option( "v", {
    alias: "verboseLogging",
    describe: `set logging level to ${Object.keys( utils.log ).toString()} (default to info, '' means debug)`,
    type: "string",
    demand: false
  } ).help( "h" ).alias( "h", "help" )
}