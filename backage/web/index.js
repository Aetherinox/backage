#!/usr/bin/env node

/*
    Import Packages
*/

import fs from 'fs';
import path from 'path';
import http from 'http';
import https from 'https';
import os from 'node:os';
import osName from 'os-name';
import getos from 'getos';
import chalk from 'chalk';
import ejs from 'ejs';
import moment from 'moment';
import TimeAgo from 'javascript-time-ago';
import en from 'javascript-time-ago/locale/en';
import cron, { schedule } from 'node-cron';
import * as crons from 'cron';

/*
    Old CJS variables converted to ESM
*/

import { fileURLToPath } from 'url';
const cache = new Map();

/*
    Import package.json values
*/

const { name, author, version, repository, discord, docs } = JSON.parse( fs.readFileSync( './package.json' ) );
const __filename = fileURLToPath( import.meta.url ); // get resolved path to file
const __dirname = path.dirname( __filename ); // get name of directory

/*
    chalk.level

    @ref        https://npmjs.com/package/chalk
                - 0    All colors disabled
                - 1    Basic color support (16 colors)
                - 2    256 color support
                - 3    Truecolor support (16 million colors)

    When assigning text colors, terminals and the windows command prompt can display any color; however apps
    such as Portainer console cannot. If you use 16 million colors and are viewing console in Portainer, colors will
    not be the same as the rgb value. It's best to just stick to Chalk's default colors.
*/

chalk.level = 3;

/*
    module setup > timeago
*/

TimeAgo.addDefaultLocale( en );
const timeAgo = new TimeAgo( );

/*
    Define > General

    @note       if you change `envWebFolder`; ensure you re-name the folder where the
                website assets are stored.
*/

let FILE_CFG;

/*
    Define > Environment Variables || Defaults
*/

const envAppRelease = process.env.IMAGE_RELEASE || 'stable';
const envGitSHA1 = process.env.IMAGE_SHA1 || '0000000000000000000000000000000000000000';
const envAppProjectUrl = process.env.URL_REPO || 'https://github.com/ipitio/backage';
const envRepoProto = process.env.GITHUB_PROTO || 'https';
const envRepoHost = process.env.GITHUB_HOST || 'github.com';
const envRepoUser = process.env.GITHUB_OWNER || 'ipitio';
const envRepoName = process.env.GITHUB_REPO || 'backage';
const envRepoUrl = `${ envRepoProto }://${ envRepoHost }/${ envRepoUser }/${ envRepoName }`;
const envApiKey = process.env.API_KEY || null;
const envWebIP = process.env.WEB_IP || '0.0.0.0';
const envWebPort = process.env.WEB_PORT || `4124`;
const envWebFolder = process.env.WEB_FOLDER || 'www';
const envWebEncoding = process.env.WEB_ENCODING || 'deflate, br';
const envProxyHeader = process.env.WEB_PROXY_HEADER || 'x-forwarded-for';
const envHealthTimer = process.env.HEALTH_TIMER || 600000;
const envTaskCronSync = process.env.TASK_CRON_SYNC || '0 */12 * * *';
const LOG_LEVEL = process.env.LOG_LEVEL || 4;

/*
    Define > Server
*/

let serverOs = 'Unknown';
let serverStartup = 0;

/*
    Container Information

    these environment variables are defined from the s6-overlay layer of the docker image
*/

const fileIpGateway = '/var/run/s6/container_environment/IP_GATEWAY';
const fileIpContainer = '/var/run/s6/container_environment/IP_CONTAINER';
const envIpGateway = fs.existsSync( fileIpGateway ) ? fs.readFileSync( fileIpGateway, 'utf8' ) : `0.0.0.0`;
const envIpContainer = fs.existsSync( fileIpContainer ) ? fs.readFileSync( fileIpContainer, 'utf8' ) : `0.0.0.0`;

/*
    Web url shortcuts

    using any of the following subdomains / subpaths will trigger the download for that specific file

    @example    http://127.0.0.1:4124/api/health
*/

const subdomainHealth = [ 'api/status', 'api/health' ];
const subdomainRestart = [ 'api/restart', 'api/sync', 'api/resync' ];

/*
    Get Server OS

    attempts to get the OS of a server a few different ways; and not just show "Linux".

    Windows machines will show          Windows 11
    Linux machines will show            Linux Alpine (3.22.0)
*/

getos( ( e, json ) =>
{
    if ( e )
        return osName( os.platform(), os.release() );

    if ( json.os === 'win32' )
        serverOs = osName( os.platform(), os.release() );

    if ( json.os === 'linux' )
    {
        if ( json.dist )
            serverOs = json.dist;

        if ( json.release )
            serverOs = serverOs.concat( ' ', '(' + json.release + ')' );
    }

    return serverOs;
});

/*
    helper > str2bool
*/

function str2bool( str )
{
    if ( typeof str === 'string' )
    {
        const lower = str.toLowerCase();
        if ([
            '1', 'true', 'yes', 'y', 't'
            ].includes( lower ) )
            str = true;
        if ([
            '0', 'false', 'no', 'n', 'f'
            ].includes( lower ) )
            str = false;
        return str;
    }
    else return Boolean( str );
}

/*
    Define > Logs

    When assigning text colors, terminals and the windows command prompt can display any color; however apps
    such as Portainer console cannot. If you use 16 million colors and are viewing console in Portainer, colors will
    not be the same as the rgb value. It's best to just stick to Chalk's default colors.

    Various levels of logs with the following usage:
        Log.verbose(`This is verbose`)
        Log.debug(`This is debug`)
        Log.info(`This is info`)
        Log.ok(`This is ok`)
        Log.notice(`This is notice`)
        Log.warn(`This is warn`)
        Log.error(
            `Error fetching sports data with error:`,
            chalk.white(`→`),
            chalk.grey(`This is the error message`)
        );

        Level               Type
    -----------------------------------
        6                   Trace
        5                   Debug
        4                   Info
        3                   Notice
        2                   Warn
        1                   Error
*/

class Log
{
    static now()
    {
        const now = new Date();
        return chalk.gray( `[${ now.toLocaleTimeString() }]` );
    }

    static verbose( ...msg )
    {
        if ( LOG_LEVEL >= 6 )
            console.debug( chalk.white.bgBlack.blackBright.bold( ` ${ name } ` ), chalk.white( `⚙️` ), this.now(), chalk.gray( msg.join( ' ' ) ) );
    }

    static debug( ...msg )
    {
        if ( LOG_LEVEL >= 7 )
            console.trace( chalk.white.bgMagenta.bold( ` ${ name } ` ), chalk.white( `⚙️` ), this.now(), chalk.magentaBright( msg.join( ' ' ) ) );
        else if ( LOG_LEVEL >= 5 )
            console.debug( chalk.white.bgGray.bold( ` ${ name } ` ), chalk.white( `⚙️` ), this.now(), chalk.gray( msg.join( ' ' ) ) );
    }

    static info( ...msg )
    {
        if ( LOG_LEVEL >= 4 )
            console.info( chalk.white.bgBlueBright.bold( ` ${ name } ` ), chalk.white( `ℹ️` ), this.now(), chalk.blueBright( msg.join( ' ' ) ) );
    }

    static ok( ...msg )
    {
        if ( LOG_LEVEL >= 4 )
            console.log( chalk.white.bgGreen.bold( ` ${ name } ` ), chalk.white( `✅` ), this.now(), chalk.greenBright( msg.join( ' ' ) ) );
    }

    static notice( ...msg )
    {
        if ( LOG_LEVEL >= 3 )
            console.log( chalk.white.bgYellow.bold( ` ${ name } ` ), chalk.white( `📌` ), this.now(), chalk.yellowBright( msg.join( ' ' ) ) );
    }

    static warn( ...msg )
    {
        if ( LOG_LEVEL >= 2 )
            console.warn( chalk.white.bgYellow.bold( ` ${ name } ` ), chalk.white( `⚠️` ), this.now(), chalk.yellowBright( msg.join( ' ' ) ) );
    }

    static error( ...msg )
    {
        if ( LOG_LEVEL >= 1 )
            console.error( chalk.white.bgRedBright.bold( ` ${ name } ` ), chalk.white( `❌` ), this.now(), chalk.redBright( msg.join( ' ' ) ) );
    }
}

/*
    Process
*/

if ( process.pkg )
{
    Log.info( `core`, chalk.yellow( `[initiate]` ), chalk.white( `ℹ️` ),
        chalk.blueBright( `<msg>` ), chalk.gray( `Starting server utilizing process.execPath` ) );

    const basePath = path.dirname( process.execPath );
    FILE_CFG = path.join( basePath, envWebFolder, `config.json` );
}
else
{
    Log.info( `core`, chalk.yellow( `[initiate]` ), chalk.white( `ℹ️` ),
        chalk.blueBright( `<msg>` ), chalk.gray( `Starting server utilizing processed locals` ) );

    FILE_CFG = path.resolve( __dirname, envWebFolder, `config.json` );
}

/*
    Semaphore > Declare

    allows multiple threads to work with the same shared resources
*/

class Semaphore
{
    constructor( max )
    {
        this.max = max;
        this.queue = [];
        this.active = 0;
    }

    async acquire()
    {
        if ( this.active < this.max )
        {
            this.active++;
            return;
        }

        return new Promise( ( resolve ) => this.queue.push( resolve ) );
    }

    release()
    {
        this.active--;
        if ( this.queue.length > 0 )
        {
            const resolve = this.queue.shift();
            this.active++;
            resolve();
        }
    }
}

/*
    Semaphore > Initialize

    @arg        int threads_max
*/

const semaphore = new Semaphore( 5 );

/*
    Get Client IP

    prioritize header.
*/

const clientIp = ( req ) =>
    ( req.headers && (
        req.headers[envProxyHeader]?.split( ',' )?.shift() ||
        req.headers['X-Forwarded-For']?.split( ',' )?.shift() ||
        req.headers['x-forwarded-for']?.split( ',' )?.shift() ||
        req.headers['cf-connecting-ip']?.split( ',' )?.shift() ||
        req.headers['x-real-ip']?.split( ',' )?.shift() ||
        req.headers['X-Real-IP']?.split( ',' )?.shift() ||
        req.socket?.remoteAddress ) ||
    envIpContainer );

/*
    Check Service Status

    this function attempts to see if a specified domain is up.
    will first start with the URL you provide.
        if try 1 fails, it will determine if that URL used protocol https or https and then flip to the other
        if try 2 fails with the opposite protocol; domain is considered down
*/

async function serviceCheck( service, uri )
{
    /* try 1 */

    try
    {
        const resp = await fetch( uri );

        /* try 1 > domain down */
        if ( resp.status !== 200 )
        {
            Log.error( `ping`, chalk.redBright( `[response]` ), chalk.white( `❌` ), chalk.redBright( `<msg>` ), chalk.gray( `Service Offline; failed to communicate with service, possibly down` ), chalk.redBright( `<code>` ), chalk.gray( `${ resp.status }` ), chalk.redBright( `<service>` ), chalk.gray( `${ service }` ), chalk.redBright( `<address>` ), chalk.gray( `${ uri }` ) );
            return;
        }

        /* try 1 > domain up */
        Log.ok( `ping`, chalk.yellow( `[response]` ), chalk.white( `✅` ), chalk.greenBright( `<msg>` ), chalk.gray( `Service Online` ), chalk.greenBright( `<code>` ), chalk.gray( `${ resp.status }` ), chalk.greenBright( `<service>` ), chalk.gray( `${ service }` ), chalk.greenBright( `<address>` ), chalk.gray( `${ uri }` ) );
    }
    catch ( err )
    {
        /*
            try 2 > http
        */

        if ( /^https:\/\//i.test( uri ) )
        {
            const uriRetry = uri.replace( /^https:\/\//ig, 'http://' );
            Log.info( `ping`, chalk.yellow( `[response]` ), chalk.white( `⚠️` ), chalk.yellowBright( `<msg>` ), chalk.gray( `Service Offline; failed to communicate with service via SSL; trying http protocol` ), chalk.yellowBright( `<service>` ), chalk.gray( `${ service }` ), chalk.yellowBright( `<uriAttempt1>` ), chalk.gray( `${ uri }` ), chalk.redBright( `(failed)` ), chalk.yellowBright( `<uriAttempt2>` ), chalk.gray( `${ uriRetry }` ), chalk.blueBright( `(pending)` ) );

            try
            {
                const resp = await fetch( uriRetry );

                /* try 2 > http > domain down */
                if ( resp.status !== 200 )
                {
                    Log.error( `ping`, chalk.redBright( `[response]` ), chalk.white( `❌` ), chalk.redBright( `<msg>` ), chalk.gray( `Service Offline; failed to communicate with service, possibly down` ), chalk.redBright( `<code>` ), chalk.gray( `${ resp.status }` ), chalk.redBright( `<service>` ), chalk.gray( `${ service }` ), chalk.redBright( `<address>` ), chalk.gray( `${ uriRetry }` ) );
                    return;
                }

                /* try 2 > http > domain up */
                Log.ok( `ping`, chalk.yellow( `[response]` ), chalk.white( `✅` ), chalk.greenBright( `<msg>` ), chalk.gray( `Service Online` ), chalk.greenBright( `<code>` ), chalk.gray( `${ resp.status }` ), chalk.greenBright( `<service>` ), chalk.gray( `${ service }` ), chalk.greenBright( `<address>` ), chalk.gray( `${ uriRetry }` ) );
            }
            catch ( err )
            {
                /* try 2 > http > domain not exist */
                Log.error( `ping`, chalk.redBright( `[response]` ), chalk.white( `❌` ), chalk.redBright( `<msg>` ), chalk.gray( `Service Offline; failed to communicate with service, address does not exist` ), chalk.redBright( `<service>` ), chalk.gray( `${ service }` ), chalk.redBright( `<address>` ), chalk.gray( `${ uri }` ), chalk.redBright( `<message>` ), chalk.gray( `${ err }` ) );
            }
        }

        /*
            try 2 > https
        */

        else if ( /^http:\/\//i.test( uri ) )
        {
            const uriRetry = uri.replace( /^http:\/\//ig, 'https://' );
            Log.info( `ping`, chalk.yellow( `[response]` ), chalk.white( `⚠️` ), chalk.yellowBright( `<msg>` ), chalk.gray( `Service Offline; failed to communicate with service via SSL; trying https protocol` ), chalk.yellowBright( `<service>` ), chalk.gray( `${ service }` ), chalk.yellowBright( `<uriAttempt1>` ), chalk.gray( `${ uri }` ), chalk.redBright( `(failed)` ), chalk.yellowBright( `<uriAttempt2>` ), chalk.gray( `${ uriRetry }` ), chalk.blueBright( `(pending)` ) );

            try
            {
                const resp = await fetch( uriRetry );

                /* try 2 > https > domain down */
                if ( resp.status !== 200 )
                {
                    Log.error( `ping`, chalk.redBright( `[response]` ), chalk.white( `❌` ), chalk.redBright( `<msg>` ), chalk.gray( `Service Offline; failed to communicate with service, possibly down` ), chalk.redBright( `<code>` ), chalk.gray( `${ resp.status }` ), chalk.redBright( `<service>` ), chalk.gray( `${ service }` ), chalk.redBright( `<address>` ), chalk.gray( `${ uriRetry }` ) );
                    return;
                }

                /* try 2 > https > domain up */
                Log.ok( `ping`, chalk.yellow( `[response]` ), chalk.white( `✅` ), chalk.greenBright( `<msg>` ), chalk.gray( `Service Online` ), chalk.greenBright( `<code>` ), chalk.gray( `${ resp.status }` ), chalk.greenBright( `<service>` ), chalk.gray( `${ service }` ), chalk.greenBright( `<address>` ), chalk.gray( `${ uriRetry }` ) );
            }
            catch ( err )
            {
                /* try 2 > https > domain not exist */
                Log.error( `ping`, chalk.redBright( `[response]` ), chalk.white( `❌` ), chalk.redBright( `<msg>` ), chalk.gray( `Service Offline; failed to communicate with service, address does not exist` ), chalk.redBright( `<service>` ), chalk.gray( `${ service }` ), chalk.redBright( `<address>` ), chalk.gray( `${ uri }` ), chalk.redBright( `<message>` ), chalk.gray( `${ err }` ) );
            }
        }
    }
}

/*
    Func > Get Human Readable Filesize

    Takes the total number of bytes in a file's size and converts it into
    a human readable format.

    @arg        str filename                    filename to get size in bytes for
    @arg        bool si                         divides the bytes of a file by 1000 instead of 2024
    @arg        int decimal                     specifies the decimal point
    @ret        str                             111.9 KB

*/

function getFileSizeHuman( filename, si = true, decimal = 1 )
{
    let stats = [];
    stats.size = 0;
    if ( fs.existsSync( filename ) )
        stats = fs.statSync( filename );

    let bytes = stats.size;
    const thresh = si ? 1000 : 1024;

    if ( Math.abs( bytes ) < thresh )
        return bytes + ' B';

    const units = si
        ? [
            'KB', 'MB', 'GB', 'TB', 'PB', 'EB', 'ZB', 'YB'
        ]
        : [
            'KiB', 'MiB', 'GiB', 'TiB', 'PiB', 'EiB', 'ZiB', 'YiB'
        ];

    let u = -1;
    const r = 10 ** decimal;

    do
    {
        bytes /= thresh;
        ++u;
    } while ( Math.round( Math.abs( bytes ) * r ) / r >= thresh && u < units.length - 1 );

    return bytes.toFixed( decimal ) + ' ' + units[u];
}

/*
    serve > health check
*/

async function serveHealthCheck( req, res )
{
    await semaphore.acquire();
    try
    {
        const paramUrl = new URL( req.url, `http://${ req.headers.host }` ).searchParams.get( 'api' );
        const paramSilent = new URL( req.url, `http://${ req.headers.host }` ).searchParams.get( 'silent' );

        if ( !paramUrl )
        {
            if ( str2bool( paramSilent ) !== true )
            {
                Log.debug( `/api`, chalk.yellow( `[health]` ), chalk.white( `⚙️` ),
                    chalk.blueBright( `<msg>` ), chalk.gray( `No api-key passed to health check` ) );
            }
        }

        const statusCheck =
        {
            ip: envIpContainer,
            gateway: envIpGateway,
            client: clientIp( req ),
            message: `healthy`,
            status: `healthy`,
            ref: req.url,
            method: req.method || 'GET',
            code: 200,
            uptime: Math.round( process.uptime() ),
            uptimeShort: timeAgo.format( Date.now() - process.uptime() * 1000, 'twitter' ),
            uptimeLong: timeAgo.format( Date.now() - process.uptime() * 1000, 'round' ),
            timestamp: Date.now()
        };

        res.writeHead( statusCheck.code, {
            'Content-Type': 'application/json'
        });

        if ( str2bool( paramSilent ) !== true )
        {
            Log.ok( `/api`, chalk.yellow( `[health]` ), chalk.white( `✅` ),
                chalk.greenBright( `<msg>` ), chalk.gray( `Response` ),
                chalk.greenBright( `<client>` ), chalk.gray( `${ clientIp( req ) }` ),
                chalk.greenBright( `<code>` ), chalk.gray( `${ statusCheck.code }` ),
                chalk.greenBright( `<status>` ), chalk.gray( `${ statusCheck.status }` ),
                chalk.greenBright( `<uptime>` ), chalk.gray( `${ process.uptime() }` ) );
        }

        res.end( JSON.stringify( statusCheck ) );
        return;
    }
    catch ( err )
    {
        if ( !res.headersSent )
        {
            const statusCheck =
            {
                ip: envIpContainer,
                gateway: envIpGateway,
                client: clientIp( req ),
                message: `health check failed`,
                error: `${ err.message }`,
                status: `unhealthy`,
                ref: req.url,
                method: req.method || 'GET',
                code: 503,
                uptime: Math.round( process.uptime() ),
                uptimeShort: timeAgo.format( Date.now() - process.uptime() * 1000, 'twitter' ),
                uptimeLong: timeAgo.format( Date.now() - process.uptime() * 1000, 'round' ),
                timestamp: Date.now()
            };

            res.writeHead( statusCheck.code, {
                'Content-Type': 'application/json'
            });

            Log.error( `/api`, chalk.redBright( `[health]` ), chalk.white( `❌` ),
                chalk.redBright( `<msg>` ), chalk.gray( `${ statusCheck.message } response` ),
                chalk.redBright( `<code>` ), chalk.gray( `${ statusCheck.code }` ),
                chalk.redBright( `<status>` ), chalk.gray( `${ statusCheck.status }` ),
                chalk.redBright( `<client>` ), chalk.gray( `${ clientIp( req ) }` ),
                chalk.redBright( `<error>` ), chalk.gray( `${ err.message }` ),
                chalk.redBright( `<uptime>` ), chalk.gray( `${ process.uptime() }` ) );

            res.end( JSON.stringify( statusCheck ) );
        }
    }
    finally
    {
        semaphore.release();
    }
}

/*
    cache > set
*/

function setCache( req, key, value, ttl )
{
    const expiry = Date.now() + ttl;
    cache.set( key, {
        value,
        expiry
    });

    Log.debug( `cache`, chalk.yellow( `[assigner]` ), chalk.white( `⚙️` ),
        chalk.blueBright( `<msg>` ), chalk.gray( `New cache key created` ),
        chalk.blueBright( `<cat>` ), chalk.gray( `setCache` ),
        chalk.blueBright( `<client>` ), chalk.gray( `${ clientIp( req ) }` ),
        chalk.blueBright( `<key>` ), chalk.gray( `${ key }` ),
        chalk.blueBright( `<expire>` ), chalk.gray( `${ ttl / 1000 } seconds` ) );
}

/*
    cache > get
*/

function getCache( req, key )
{
    const cached = cache.get( key );
    if ( cached && cached.expiry > Date.now() )
    {
        return cached.value;
    }
    else
    {
        if ( cached )
            Log.debug( `cache`, chalk.yellow( `[get]` ), chalk.white( `⚙️` ),
                chalk.blueBright( `<msg>` ), chalk.gray( `Key has expired, marked for deletion` ),
                chalk.blueBright( `<cat>` ), chalk.gray( `getCache` ),
                chalk.blueBright( `<client>` ), chalk.gray( `${ clientIp( req ) }` ),
                chalk.blueBright( `<key>` ), chalk.gray( `${ key }` ) );

        cache.delete( key );
        return null;
    }
}

/*
    Initialization

    this is the starting method to prepare backage
*/

async function initialize()
{
    const start = performance.now();
    try
    {
        const validation = crons.validateCronExpression( envTaskCronSync );
        if ( !validation.valid )
        {
            Log.error( `core`, chalk.yellow( `[schedule]` ), chalk.white( `❌` ),
                chalk.redBright( `<msg>` ), chalk.gray( `Specified cron time value is not valid` ),
                chalk.redBright( `<schedule>` ), chalk.whiteBright.bgBlack( ` ${ envTaskCronSync } ` ) );
        }
        else
        {
            const cronNextRunDt = new Date( crons.sendAt( envTaskCronSync ) );
            const cronNextRun = moment( cronNextRunDt ).format( 'MM-DD-YYYY h:mm A' );

            Log.info( `core`, chalk.yellow( `[schedule]` ), chalk.white( `ℹ️` ),
                chalk.blueBright( `<msg>` ), chalk.gray( `Next cron at:` ),
                chalk.blueBright( `<schedule>` ), chalk.whiteBright.gray( ` ${ envTaskCronSync } ` ),
                chalk.blueBright( `<nextrun>` ), chalk.whiteBright.gray( ` ${ cronNextRun } ` ),
                chalk.blueBright( `<nextrunIso>` ), chalk.whiteBright.gray( ` ${ cronNextRunDt } ` ) );
        }

        Log.info( `core`, chalk.yellow( `[initiate]` ), chalk.white( `ℹ️` ),
            chalk.blueBright( `<msg>` ), chalk.gray( `Starting Backage container. Assigning bound IP to host network adapter` ),
            chalk.blueBright( `<hostIp>` ), chalk.gray( `${ envWebIP }` ),
            chalk.blueBright( `<containerIp>` ), chalk.gray( `${ envIpContainer }` ),
            chalk.blueBright( `<port>` ), chalk.gray( `${ envWebPort }` ) );

        /*
            Debug > network
        */

        Log.debug( `.net`, chalk.yellow( `[assigner]` ), chalk.white( `⚙️` ), chalk.blueBright( `<name>` ), chalk.gray( `IP_CONTAINER` ), chalk.blueBright( `<value>` ), chalk.gray( `${ envIpContainer }` ) );
        Log.debug( `.net`, chalk.yellow( `[assigner]` ), chalk.white( `⚙️` ), chalk.blueBright( `<name>` ), chalk.gray( `IP_GATEWAY` ), chalk.blueBright( `<value>` ), chalk.gray( `${ envIpGateway }` ) );
        Log.debug( `.env`, chalk.yellow( `[assigner]` ), chalk.white( `⚙️` ), chalk.blueBright( `<name>` ), chalk.gray( `IMAGE_RELEASE` ), chalk.blueBright( `<value>` ), chalk.gray( `${ envAppRelease }` ) );

        /*
            Debug > Verbose > environment vars
        */

        const env = process.env;
        Object.keys( env ).forEach( ( key  ) =>
        {
            Log.verbose( `.env`, chalk.yellow( `[assigner]` ), chalk.white( `📣` ), chalk.blueBright( `<name>` ), chalk.gray( `${ key }` ), chalk.blueBright( `<value>` ), chalk.gray( `${ env[key] }` ) );
        });

        /*
            Debug > environment vars

            we could just loop process.env; but that will show every container env var. We just want this app
        */

        Log.debug( `.env`, chalk.yellow( `[assigner]` ), chalk.white( `⚙️` ), chalk.blueBright( `<name>` ), chalk.gray( `URL_REPO` ), chalk.blueBright( `<value>` ), chalk.gray( `${ envAppProjectUrl }` ) );
        Log.debug( `.env`, chalk.yellow( `[assigner]` ), chalk.white( `⚙️` ), chalk.blueBright( `<name>` ), chalk.gray( `WEB_IP` ), chalk.blueBright( `<value>` ), chalk.gray( `${ envWebIP }` ) );
        Log.debug( `.env`, chalk.yellow( `[assigner]` ), chalk.white( `⚙️` ), chalk.blueBright( `<name>` ), chalk.gray( `WEB_PORT` ), chalk.blueBright( `<value>` ), chalk.gray( `${ envWebPort }` ) );
        Log.debug( `.env`, chalk.yellow( `[assigner]` ), chalk.white( `⚙️` ), chalk.blueBright( `<name>` ), chalk.gray( `WEB_FOLDER` ), chalk.blueBright( `<value>` ), chalk.gray( `${ envWebFolder }` ) );
        Log.debug( `.env`, chalk.yellow( `[assigner]` ), chalk.white( `⚙️` ), chalk.blueBright( `<name>` ), chalk.gray( `WEB_ENCODING` ), chalk.blueBright( `<value>` ), chalk.gray( `${ envWebEncoding }` ) );
        Log.debug( `.env`, chalk.yellow( `[assigner]` ), chalk.white( `⚙️` ), chalk.blueBright( `<name>` ), chalk.gray( `WEB_PROXY_HEADER` ), chalk.blueBright( `<value>` ), chalk.gray( `${ envProxyHeader }` ) );
        Log.debug( `.env`, chalk.yellow( `[assigner]` ), chalk.white( `⚙️` ), chalk.blueBright( `<name>` ), chalk.gray( `API_KEY` ), chalk.blueBright( `<value>` ), chalk.gray( `${ envApiKey }` ) );
        Log.debug( `.env`, chalk.yellow( `[assigner]` ), chalk.white( `⚙️` ), chalk.blueBright( `<name>` ), chalk.gray( `HEALTH_TIMER` ), chalk.blueBright( `<value>` ), chalk.gray( `${ envHealthTimer }` ) );
        Log.debug( `.env`, chalk.yellow( `[assigner]` ), chalk.white( `⚙️` ), chalk.blueBright( `<name>` ), chalk.gray( `LOG_LEVEL` ), chalk.blueBright( `<value>` ), chalk.gray( `${ LOG_LEVEL }` ) );

        /*
            Debug > vars > subdomain keywords
        */

        Log.debug( `.var`, chalk.yellow( `[assigner]` ), chalk.white( `⚙️` ), chalk.blueBright( `<name>` ), chalk.gray( `subdomainHealth` ), chalk.blueBright( `<value>` ), chalk.gray( `${ subdomainHealth.join() }` ) );
        Log.debug( `.var`, chalk.yellow( `[assigner]` ), chalk.white( `⚙️` ), chalk.blueBright( `<name>` ), chalk.gray( `subdomainRestart` ), chalk.blueBright( `<value>` ), chalk.gray( `${ subdomainRestart.join() }` ) );

        const end = performance.now();
        serverStartup = `${ end - start }`;
        Log.info( `core`, chalk.yellow( `[initiate]` ), chalk.white( `ℹ️` ),
            chalk.blueBright( `<msg>` ), chalk.gray( `Backage container running` ),
            chalk.blueBright( `<time>` ), chalk.gray( `took ${ serverStartup }ms` ),
            chalk.blueBright( `<ip>` ), chalk.gray( `${ envIpContainer }` ),
            chalk.blueBright( `<gateway>` ), chalk.gray( `${ envIpGateway }` ),
            chalk.blueBright( `<port>` ), chalk.gray( `${ envWebPort }` ) );
    }
    catch ( err )
    {
        const end = performance.now();
        Log.error( `core`, chalk.yellow( `[initiate]` ), chalk.white( `❌` ),
            chalk.redBright( `<msg>` ), chalk.gray( `Could not start Backage container due to error` ),
            chalk.redBright( `<time>` ), chalk.gray( `took ${ end - start }ms` ),
            chalk.redBright( `<error>` ), chalk.gray( `${ err }` ),
            chalk.redBright( `<ip>` ), chalk.gray( `${ envIpContainer }` ),
            chalk.redBright( `<gateway>` ), chalk.gray( `${ envIpGateway }` ),
            chalk.redBright( `<port>` ), chalk.gray( `${ envWebPort }` ) );
    }
}

/*
    Webserver

    @todo           possibility of switching out http.createserver with express

                    import express from 'express';
                    const app = express()
                    app.use(express.static('www'));
                    const server = app.listen(8000, function () {
                        const host = server.address().address
                        const port = server.address().port

                        console.log('Express listening at http://%s:%s', host, port)
                    })
*/

const server = http.createServer( ( req, resp ) =>
{
    /*
        If request.url === '/'; load index.html as default page

        request.url returns
                /
                /www/css/backage.fonts.min.css
                /www/css/backage.min.css
    */

    const method = req.method || 'GET';
    let reqUrl = req.url;
    if ( reqUrl === '/' )
        reqUrl = 'index.html';

    /*
        Remove leading forward slash
    */

    const loadFile = reqUrl.replace( /^\/+/, '' );

    const handleRequest = async() =>
    {
        /*
            Define the different routes.
            Place the template system last. Getting Backage data should take priority.
        */

        const paramSilent = new URL( req.url, `http://${ req.headers.host }` ).searchParams.get( 'silent' );
        if ( str2bool( paramSilent ) !== true )
        {
            Log.debug( `http`, chalk.yellow( `[requests]` ), chalk.white( `⚙️` ),
                chalk.blueBright( `<msg>` ), chalk.gray( `Request started` ),
                chalk.blueBright( `<client>` ), chalk.gray( `${ clientIp( req ) }` ),
                chalk.blueBright( `<request.url>` ), chalk.gray( `${ req.url }` ),
                chalk.blueBright( `<reqUrl>` ), chalk.gray( `${ reqUrl }` ),
                chalk.blueBright( `<file>` ), chalk.gray( `${ loadFile }` ),
                chalk.blueBright( `<method>` ), chalk.gray( `${ method }` ) );
        }

        if ( subdomainRestart.some( ( urlKeyword ) => loadFile.startsWith( urlKeyword ) ) )
        {
            /*
                Not super technical, but good enough for the initial release until Express is added
                    if restart command triggered using website, allow it to pass without api-key
                    if restart command triggered by using API:
                        referer         = if activated from webpage by clicking icon
                        no referer      = if activated using URL

                use referer check just as an added aspect for the api-key, but really this doesn't even need to be here
                as the referer can be easily spoofed. Will be removed once express and a finished api system are added. right now
                it does no harm for a user to even bypass this.

                @todo               integrate completed api system; express replaces node http
            */

            const apiKey = new URL( req.url, `http://${ req.headers.host }` ).searchParams.get( 'key' );
            const referer = req.headers.referer || null;

            if ( ( !referer && envApiKey && !apiKey ) || ( referer && !referer.includes( req.headers.host ) ) )
            {
                const statusCheck =
                {
                    ip: envIpContainer, gateway: envIpGateway, client: clientIp( req ),
                    message: `must define api-key: http://${ req.headers.host }/api/restart?key=XXXXXXXX`,
                    status: `unauthorized`, ref: req.url, method: method || 'GET', code: 401,
                    uptime: Math.round( process.uptime() ), timestamp: Date.now(),
                    uptimeShort: timeAgo.format( Date.now() - process.uptime() * 1000, 'twitter' ),
                    uptimeLong: timeAgo.format( Date.now() - process.uptime() * 1000, 'round' )
                };

                resp.writeHead( statusCheck.code,
                {
                    'Content-Type': 'application/json'
                });

                Log.error( `http`, chalk.yellow( `[requests]` ), chalk.white( `❌` ),
                    chalk.redBright( `<msg>` ), chalk.gray( `Unauthorized (401): restart attempt did not specify api-key using ?key=XXX parameter` ),
                    chalk.redBright( `<type>` ), chalk.gray( `api/restart` ),
                    chalk.redBright( `<client>` ), chalk.gray( `${ clientIp( req ) }` ),
                    chalk.redBright( `<file>` ), chalk.gray( `${ loadFile }` ),
                    chalk.redBright( `<method>` ), chalk.gray( `${ method }` ) );

                resp.end( JSON.stringify( statusCheck ) );

                return;
            }

            /*
                no referer, api-key in url specified, api-key set up with backage do not match
            */

            if ( !referer && ( envApiKey !== apiKey ) )
            {
                const statusCheck =
                {
                    ip: envIpContainer, gateway: envIpGateway, client: clientIp( req ),
                    message: `incorrect api-key specified: http://${ req.headers.host }/api/restart?key=XXXXXXXX`,
                    status: `unauthorized`, ref: req.url, method: method || 'GET', code: 401,
                    uptime: Math.round( process.uptime() ), timestamp: Date.now(),
                    uptimeShort: timeAgo.format( Date.now() - process.uptime() * 1000, 'twitter' ),
                    uptimeLong: timeAgo.format( Date.now() - process.uptime() * 1000, 'round' )
                };

                resp.writeHead( statusCheck.code, {
                    'Content-Type': 'application/json'
                });

                Log.error( `http`, chalk.yellow( `[requests]` ), chalk.white( `❌` ),
                    chalk.redBright( `<msg>` ), chalk.gray( `Unauthorized (401): incorrect api-key specified` ),
                    chalk.redBright( `<type>` ), chalk.gray( `api/restart` ),
                    chalk.redBright( `<client>` ), chalk.gray( `${ clientIp( req ) }` ),
                    chalk.redBright( `<file>` ), chalk.gray( `${ loadFile }` ),
                    chalk.redBright( `<method>` ), chalk.gray( `${ method }` ) );

                resp.end( JSON.stringify( statusCheck ) );
                return;
            }

            const statusCheck =
            {
                ip: envIpContainer,
                gateway: envIpGateway,
                client: clientIp( req ),
                message: 'Restart command received',
                status: 'ok',
                ref: req.url,
                method: method || 'GET',
                code: 200,
                uptime: Math.round( process.uptime() ),
                uptimeShort: timeAgo.format( Date.now() - process.uptime() * 1000, 'twitter' ),
                uptimeLong: timeAgo.format( Date.now() - process.uptime() * 1000, 'round' ),
                timestamp: Date.now()
            };

            resp.writeHead( statusCheck.code, {
                'Content-Type': 'application/json'
            });

            Log.info( `http`, chalk.yellow( `[requests]` ), chalk.white( `ℹ️` ),
                chalk.blueBright( `<msg>` ), chalk.gray( `Requesting to access restart api` ),
                chalk.blueBright( `<type>` ), chalk.gray( `api/restart` ),
                chalk.blueBright( `<client>` ), chalk.gray( `${ clientIp( req ) }` ),
                chalk.blueBright( `<file>` ), chalk.gray( `${ loadFile }` ),
                chalk.blueBright( `<method>` ), chalk.gray( `${ method }` ) );

            await initialize();

            resp.end( JSON.stringify( statusCheck ) );
            return;
        }

        /*
            Endpoint > Health Check

            paramQuery          specifies what type of query is triggered
                                    options:
                                        uptime
                                        healthcheck
                                        sync

            paramSilent         specifies if logs should be silenced. useful for docker-compose.yml healthcheck so that console
                                    is not spammed every 30 seconds.
        */

        if ( subdomainHealth.some( ( urlKeyword ) => loadFile.startsWith( urlKeyword ) ) && method === 'GET' )
        {
            const paramSilent = new URL( req.url, `http://${ req.headers.host }` ).searchParams.get( 'silent' );

            // do not show log if query is `uptime`, since uptime runs every 1 second.
            // do not show logs if query has striggered `silent?=true` in url

            if ( str2bool( paramSilent ) !== true )
            {
                Log.info( `http`, chalk.yellow( `[requests]` ), chalk.white( `ℹ️` ),
                    chalk.blueBright( `<msg>` ), chalk.gray( `Requesting to access health api` ),
                    chalk.blueBright( `<type>` ), chalk.gray( `api/health` ),
                    chalk.blueBright( `<client>` ), chalk.gray( `${ clientIp( req ) }` ),
                    chalk.blueBright( `<file>` ), chalk.gray( `${ loadFile }` ),
                    chalk.blueBright( `<method>` ), chalk.gray( `${ method }` ) );
            }

            await serveHealthCheck( req, resp );
            return;
        }

        /*
            the request wasn't part of any of our pre-defined subdomains; see if the request is to load a html / css / js file
        */

        Log.debug( `http`, chalk.yellow( `[requests]` ), chalk.white( `⚙️` ),
            chalk.blueBright( `<msg>` ), chalk.gray( `Request not captured by subdomain keyword checks; sending request to ejs` ),
            chalk.blueBright( `<client>` ), chalk.gray( `${ clientIp( req ) }` ),
            chalk.blueBright( `<file>` ), chalk.gray( `${ loadFile }` ),
            chalk.blueBright( `<method>` ), chalk.gray( `${ method }` ) );

        /*
            General Template & .html / .css / .js
            read the loaded asset file
        */

        ejs.renderFile( `./${ envWebFolder }/${ loadFile }`,
            {
                healthTimer: envHealthTimer,
                appRelease: envAppRelease,
                appName: name,
                appVersion: version,
                appUrlGithub: repository.url.substr( 0, repository.url.lastIndexOf( '.' ) ),
                appUrlDocs: docs.url,
                appGitHashShort: envGitSHA1.substring( 0, 9 ),
                appGitHashLong: envGitSHA1,
                appUptimeShort: timeAgo.format( Date.now() - Math.round( process.uptime() ) * 1000, 'twitter' ),
                appUptimeLong: timeAgo.format( Date.now() - process.uptime() * 1000, 'twitter' ),
                appStartup: Math.round( serverStartup ) / 1000,
                serverOs: serverOs
            }, ( err, data ) =>
        {
            if ( !err )
            {
                Log.debug( `http`, chalk.yellow( `[requests]` ), chalk.white( `⚙️` ),
                    chalk.blueBright( `<msg>` ), chalk.gray( `Request accepted by ejs` ),
                    chalk.blueBright( `<client>` ), chalk.gray( `${ clientIp( req ) }` ),
                    chalk.blueBright( `<file>` ), chalk.gray( `${ loadFile }` ),
                    chalk.blueBright( `<method>` ), chalk.gray( `${ method }` ) );

                /*
                    This allows us to serve all files locally: css, js, etc.
                    the file loaded is dependent on what comes to the right of the period.
                */

                const fileExt = loadFile.lastIndexOf( '.' );
                const fileMime = fileExt === -1
                                ? 'text/plain'
                                : {
                                    '.html' : 'text/html',
                                    '.htm' : 'text/html',
                                    '.ico' : 'image/x-icon',
                                    '.jpg' : 'image/jpeg',
                                    '.png' : 'image/png',
                                    '.gif' : 'image/gif',
                                    '.css' : 'text/css',
                                    '.scss' : 'text/x-sass',
                                    '.gz' : 'application/gzip',
                                    '.js' : 'text/javascript',
                                    '.txt' : 'text/plain',
                                    '.xml' : 'application/xml',
                                    '.json' : 'application/json'
                                    }[loadFile.substring( fileExt )];

                /*
                    ejs is only for templates; if we want to load an binary data (like images); we must use fs.readFile
                */

                if ( fileMime !== 'text/html' )
                    data = fs.readFileSync( `./${ envWebFolder }/${ loadFile }` );

                resp.setHeader( 'Content-type', fileMime );
                resp.end( data );

                if ( fileMime === 'text/html' || fileMime === 'application/xml' || fileMime === 'application/json' )
                {
                    Log.ok( `http`, chalk.yellow( `[requests]` ), chalk.white( `✅` ),
                        chalk.greenBright( `<msg>` ), chalk.gray( `Request to load file` ),
                        chalk.greenBright( `<client>` ), chalk.gray( `${ clientIp( req ) }` ),
                        chalk.greenBright( `<file>` ), chalk.gray( `${ loadFile }` ),
                        chalk.greenBright( `<mime>` ), chalk.gray( `${ fileMime }` ),
                        chalk.greenBright( `<method>` ), chalk.gray( `${ method }` ) );
                }
                else
                {
                    Log.debug( `http`, chalk.yellow( `[requests]` ), chalk.white( `⚙️` ),
                        chalk.blueBright( `<msg>` ), chalk.gray( `Request to load file` ),
                        chalk.blueBright( `<client>` ), chalk.gray( `${ clientIp( req ) }` ),
                        chalk.blueBright( `<file>` ), chalk.gray( `${ loadFile }` ),
                        chalk.blueBright( `<mime>` ), chalk.gray( `${ fileMime }` ),
                        chalk.blueBright( `<method>` ), chalk.gray( `${ method }` ) );
                }
            }
            else
            {
                Log.debug( `http`, chalk.yellow( `[requests]` ), chalk.white( `⚙️` ),
                    chalk.blueBright( `<msg>` ), chalk.gray( `Request rejected by ejs` ),
                    chalk.blueBright( `<client>` ), chalk.gray( `${ clientIp( req ) }` ),
                    chalk.blueBright( `<error>` ), chalk.gray( `${ err }` ),
                    chalk.blueBright( `<file>` ), chalk.gray( `${ loadFile }` ),
                    chalk.blueBright( `<method>` ), chalk.gray( `${ method }` ) );

                const statusCheck =
                {
                    ip: envIpContainer,
                    gateway: envIpGateway,
                    client: clientIp( req ),
                    message: 'Page not found',
                    status: 'healthy',
                    ref: req.url,
                    method: method || 'GET',
                    code: 404,
                    uptime: Math.round( process.uptime() ),
                    uptimeShort: timeAgo.format( Date.now() - process.uptime() * 1000, 'twitter' ),
                    uptimeLong: timeAgo.format( Date.now() - process.uptime() * 1000, 'round' ),
                    timestamp: Date.now()
                };

                resp.writeHead( statusCheck.code, {
                    'Content-Type': 'application/json'
                });

                Log.error( `http`, chalk.redBright( `[requests]` ), chalk.white( `❌` ),
                    chalk.redBright( `<msg>` ), chalk.gray( `${ statusCheck.message }` ),
                    chalk.redBright( `<client>` ), chalk.gray( `${ clientIp( req ) }` ),
                    chalk.redBright( `<code>` ), chalk.gray( `${ statusCheck.code }` ),
                    chalk.redBright( `<error>` ), chalk.gray( `${ err }` ),
                    chalk.redBright( `<file>` ), chalk.gray( `${ loadFile }` ),
                    chalk.redBright( `<method>` ), chalk.gray( `${ method }` ) );

                resp.end( JSON.stringify( statusCheck ) );
            }
        });
    };
    handleRequest().catch( ( err ) =>
    {
        resp.writeHead( 500, {
            'Content-Type': 'text/plain'
        });

        Log.error( `http`, chalk.redBright( `[requests]` ), chalk.white( `❌` ),
            chalk.redBright( `<msg>` ), chalk.gray( `Cannot handle request` ),
            chalk.redBright( `<code>` ), chalk.gray( `500` ),
            chalk.redBright( `<error>` ), chalk.gray( `${ err }` ) );

        resp.end( 'Internal Server Error' );
    });
});

/*
    Initialize Webserver
*/

( async() =>
{
    /*
        check if api-key has been provided as env var
    */

    if ( !envApiKey )
        Log.warn( `/api`, chalk.yellow( `[callback]` ), chalk.white( `⚠️` ),
            chalk.yellowBright( `<msg>` ), chalk.gray( `API_KEY environment variable not defined, leaving blank` ) );
    else
        Log.ok( `/api`, chalk.yellow( `[callback]` ), chalk.white( `✅` ),
            chalk.greenBright( `<msg>` ), chalk.gray( `API_KEY environment variable successfully defined` ) );

    /*
        initialize
    */

    await initialize();

    /*
        start web server
    */

    server.listen( envWebPort, envWebIP, () =>
    {
        Log.ok( `core`, chalk.yellow( `[initiate]` ), chalk.white( `✅` ),
            chalk.blueBright( `<msg>` ), chalk.gray( `Server is now running on` ),
            chalk.blueBright( `<ipPublic>` ), chalk.whiteBright.bgBlack( ` ${ envWebIP }:${ envWebPort } ` ),
            chalk.blueBright( `<ipDocker>` ), chalk.whiteBright.bgBlack( ` ${ envIpContainer }:${ envWebPort } ` ) );

        Log.info( `core`, chalk.yellow( `[initiate]` ), chalk.white( `ℹ️` ),
            chalk.blueBright( `<msg>` ), chalk.gray( `Running Backage version` ),
            chalk.blueBright( `<version>` ), chalk.gray( ` v${ version } ` ),
            chalk.blueBright( `<release>` ), chalk.gray( ` ${ envAppRelease } ` ) );
    });

    /*
        check service status that we depend on
    */

    serviceCheck( 'ipitio.github.io', `${ envAppProjectUrl }` );
})();

/*
    Crons > Next Sync
*/

cron.schedule( envTaskCronSync, async() =>
{
    const cronNowRunDt = new Date( );
    const cronNowRun = moment( cronNowRunDt ).format( 'MM-DD-YYYY h:mm A' );

    Log.ok( `task`, chalk.yellow( `[schedule]` ), chalk.white( `✅` ),
        chalk.blueBright( `<msg>` ), chalk.gray( `Started cron to synchronize container with github repo` ),
        chalk.blueBright( `<runtime>` ), chalk.whiteBright.bgBlack( ` ${ cronNowRun } ` ),
        chalk.blueBright( `<schedule>` ), chalk.whiteBright.bgBlack( ` ${ envTaskCronSync } ` ),
        chalk.blueBright( `<repository>` ), chalk.whiteBright.bgBlack( ` ${ envRepoUrl } ` ) );

  // await initialize();
});

/*
    Crons > Announce Next Sync
    should show every 30 minutes
*/

cron.schedule( '*/30 * * * *', async() =>
{
    const validation = crons.validateCronExpression( envTaskCronSync );
    if ( !validation.valid )
    {
        Log.error( `core`, chalk.yellow( `[schedule]` ), chalk.white( `❌` ),
            chalk.redBright( `<msg>` ), chalk.gray( `Specified cron timer value is not valid. Re-write the cron so that it is properly formatted` ),
            chalk.redBright( `<env>` ), chalk.gray( `TASK_CRON_SYNC` ),
            chalk.redBright( `<schedule>` ), chalk.whiteBright.bgBlack( ` ${ envTaskCronSync } ` ) );
    }
    else
    {
        const cronNextRunDt = new Date( crons.sendAt( envTaskCronSync ) );
        const cronNextRun = moment( cronNextRunDt ).format( 'MM-DD-YYYY h:mm A' );

        Log.info( `core`, chalk.yellow( `[schedule]` ), chalk.white( `ℹ️` ),
            chalk.blueBright( `<msg>` ), chalk.gray( `Next data refresh at` ),
            chalk.blueBright( `<schedule>` ), chalk.whiteBright.gray( ` ${ envTaskCronSync } ` ),
            chalk.blueBright( `<nextrun>` ), chalk.whiteBright.gray( ` ${ cronNextRun } ` ),
            chalk.blueBright( `<nextrunIso>` ), chalk.whiteBright.gray( ` ${ cronNextRunDt } ` ) );
    }
});
