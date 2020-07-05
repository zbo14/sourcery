# sourcery

A command-line utility that spins up a Chromium browser window and parses URLs, domains, and endpoints from source files and other response payloads.

`sourcery` writes the results to files and continually sorts/de-dupes them.

## Why?

Source files (e.g. JavaScript-s) often contain information about subdomains and endpoints that's difficult to discover via other enumeration/brute-forcing methods. A single webpage may require dozens of scripts, each containing tens of thousands of lines of code. There are existing tools to crawl sites and parse endpoints from these large files, but these tools aren't always easy to integrate with existing workflows.

If you're a bug-bounty hunter or web security researcher, chances are you're spending a lot of time in the browser. While you navigate around a web application and test different functionality,` sourcery` parses URLs, domains, and endpoints from all the files and response payloads it sees. It writes this information to a directory you specify and repeatedly sorts/de-dupes the data.


## Usage

```
  _____  ___   __ __  ____      __    ___  ____   __ __
 / ___/ /   \ |  T  T|    \    /  ]  /  _]|    \ |  T  T
(   \_ Y     Y|  |  ||  D  )  /  /  /  [_ |  D  )|  |  |
 \__  T|  O  ||  |  ||    /  /  /  Y    _]|    / |  ~  |
 /  \ ||     ||  :  ||    \ /   \_ |   [_ |    \ l___, |
 \    |l     !l     ||  .  Y\     ||     T|  .  Y|     !
  \___j \___/  \__,_jl__j\_j \____jl_____jl__j\_jl____/


Usage: index [options] <url>

Options:
  -V, --version                      output the version number
  -d, --domains <list>               comma-separated list of domains; sourcery looks for results under these domains
  -e, --extensions <list>            comma-separated list of extensions; sourcery parses results from files with these extensions
  -o, --output <dir>                 path to output directory (default: ".")
  -s, --sort-every <int>             sort output files every x seconds, removing duplicate values (default: 60)
  -x, --proxy <[proto://]host:port>  use a proxy (e.g. Burp) for Chromium
  -h, --help                         display help for command
```
