


# croner
Command line tool to cronologically order JPG files in a folder using their EXIF creation timestamp

# Install 

1. Install node.js from here - https://nodejs.org/dist/v7.9.0/
2. Open Command Prompt
3. Enter the following:  

```
npm install -g peter-otoole/croner
```
4. Use croner via the command line - see help by entering: 

```
croner -h
```

# Help 

``` batch
croner -h

 Chronologically orders JPEG files in a folder based on their EXIF creation
 date. New filenames take the form YYYYMMDD_NNNNNN.jpg

 Usage: croner [options]

 Examples:
   - croner -f ./pictures/ -p ^img.+[.]jpg$


Options:
  -f, --folder          the folder location of the files to be sorted
                                                             [string] [required]
  -p, --pattern         filename pattern to match, defaults to '^.+[.]jpg$'.
                        NOTE: always case insensitive                   [string]
  -i, --ignoreErrors    ignore errors that occur while reading exif data (skips
                        file)                                          [boolean]
  -t, --timestamp       select which timestamp to order files by
                       [choices: "exif", "atime", "ctime", "mtime", "birthtime"]
  -v, --verboseLogging  set logging level to info,debug,trace,warn,error
                        (default to info, '' means debug)               [string]
  -h, --help            Show help                                      [boolean]
```

# Support

Currently, croner does not have unit tests so there are likely edge case issues. Croner is also untested on Linux - use Windows until this is resolved.

# Warning

There is an issue with sorting burst shots - EXIF records to "second" accuracy, not "millisecond" accuracy, and therefore if there are more than one image with the same timestamp (down to the second), they can be sorted out of order. Future versions will fix this. 