#!/usr/bin/env node

'use strict'

const { once } = require('events')
const fs = require('fs')
const commander = require('commander')
const path = require('path')
const puppeteer = require('puppeteer')

const EXTENSIONS = [
  'asp', 'aspx', 'css',
  'htm', 'html', 'js',
  'json', 'jsp', 'php',
  'ts', 'txt', 'xml'
]

const banner = fs.readFileSync(path.join(__dirname, 'banner'), 'utf8')
const error = msg => console.error('\x1b[31m%s\x1b[0m', msg)
const warn = msg => console.warn('\x1b[33m%s\x1b[0m', msg)

const program = new commander.Command()

const matchAll = (regex, string, cb) => {
  let match

  while ((match = regex.exec(string))) {
    cb(match)
  }
}

const regex = {
  path: /("|')(\/[\w\d?&=#.!:_-][\w\d?/&=#.!:_-]*?)\1/g,
  url:  /(https?:\/\/[^\s,'"|()<>[\]]+?)(?=https?:\/\/|[\s,'"|()<>[\]])/g
}

program
  .version('0.0.0')
  .arguments('<file>')
  .option('-d, --domains <list>', 'comma-separated list of domains; sourcery looks for results under these domains')
  .option('-e, --extensions <list>', 'comma-separated list of extensions; sourcery parses results from files with these extensions')
  .option('-o, --output <dir>', 'path to output directory', '.')
  .option('-x, --proxy <[proto://]host:port>', 'use a proxy (e.g. Burp) for Chromium')
  .action(async (file, opts) => {
    let data

    try {
      data = await fs.promises.readFile(file, 'utf8')
    } catch {
      error('[!] Cannot read file: ' + file)
      process.exit(1)
    }

    let urls

    try {
      urls = data
        .split('\n')
        .filter(Boolean)
        .map(url => new URL(url))
    } catch (err) {
      error('[!] ' + err.message)
      process.exit(1)
    }

    try {
      const stat = await fs.promises.lstat(opts.output)

      if (!stat.isDirectory()) {
        throw Error
      }
    } catch {
      error('[!] Not a directory: ' + opts.output)
      process.exit(1)
    }

    let domains = (opts.domains || '')
      .split(',')
      .filter(Boolean)

    domains = [...new Set(domains)]

    if (!domains.length) {
      error('[!] No domains specified')
      process.exit(1)
    }

    let extensions = (opts.extensions || '')
      .split(',')
      .filter(Boolean)
      .map(ext => ext.trim().toLowerCase())

    if (!extensions.length) {
      extensions = EXTENSIONS.slice()
    }

    extensions = [...new Set(extensions)]
    const args = []

    opts.proxy && args.push('--proxy-server=' + opts.proxy)

    error(banner)

    let exts = extensions.slice(0, 3).join(', ')

    if (exts.length > 3) {
      exts += ', etc.'
    }

    warn('[-] Opening browser window')
    warn('[-] Root domains: ' + domains.join(', '))
    warn('[-] Parsing endpoints from files with extensions: ' + exts)

    extensions = extensions.map(ext => '.' + ext)

    const browser = await puppeteer.launch({
      args,
      defaultViewport: null,
      headless: false,
      ignoreHTTPSErrors: true
    })

    const page = await browser.newPage()
    const uniqueDomains = new Set()

    const domainsFile = path.resolve(opts.output, 'domains.txt')
    const pathsFile = path.resolve(opts.output, 'paths.txt')
    const urlsFile = path.resolve(opts.output, 'urls.txt')

    const streams = {
      domains: fs.createWriteStream(domainsFile, { flags: 'a' }),
      paths: fs.createWriteStream(pathsFile, { flags: 'a' }),
      urls: fs.createWriteStream(urlsFile, { flags: 'a' })
    }

    const inScope = subdomain => {
      return !subdomain.startsWith('*.') && domains.some(domain => {
        return subdomain === domain || subdomain.endsWith('.' + domain)
      })
    }

    const handlePath = async (source, path) => {
      streams.paths.write(source + ' -> ' + path + '\n')
    }

    const handleURL = async url => {
      if (inScope(url.hostname)) {
        if (!uniqueDomains.has(url.hostname)) {
          uniqueDomains.add(url.hostname)
          streams.domains.write(url.hostname + '\n')
        }

        streams.urls.write(url.href + '\n')
      }
    }

    page.on('response', async resp => {
      let url

      try {
        url = new URL(resp.url())
      } catch {
        return
      }

      handleURL(url)

      const headers = JSON.stringify(resp.headers())

      matchAll(regex.url, headers, ([, url]) => {
        try {
          url = new URL(url)
        } catch {
          return
        }

        handleURL(url)
      })

      const { ext } = path.parse(url.pathname)

      if (ext && !extensions.includes(ext)) return

      let text

      try {
        text = await resp.text()
      } catch {
        return
      }

      matchAll(regex.url, text, ([, url]) => {
        try {
          url = new URL(url)
        } catch {
          return
        }

        handleURL(url)
      })

      if (inScope(url.hostname)) {
        matchAll(regex.path, text, ([,, path]) => handlePath(url.href, path))
      }
    })

    for (let i = 0; i < urls.length; i++) {
      const { href } = urls[i]

      try {
        await page.goto(href)
      } catch (err) {
        error('[!] ' + err.message)
        continue
      }

      warn('[+] ' + href)
    }

    warn('[-] Reached last URL')
    warn('[-] Waiting for page to close')

    await once(page, 'close')

    warn('[-] Page closed')

    Object.values(streams).forEach(stream => stream.end())

    await browser.close()

    warn('[-] Exiting')

    process.exit()
  })
  .parseAsync(process.argv)
  .catch(err => {
    error(err)
    process.exit(1)
  })
