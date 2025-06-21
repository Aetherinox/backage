<div align="center">
<h6>A self-hosted docker container for the backage github badge service</h6>
<h1>♾️ Backage ♾️</h1>
</div>

<br />

<div align="center">

<img src="https://github.com/ipitio/backage/raw/master/src/img/logo-b.webp">

</div>

<br />

---

<br />

- [About](#about)
- [Docker Image](#docker-image)
  - [Build Image](#build-image)
    - [Manual Build Command](#manual-build-command)
    - [Using `utils.build.sh`](#using-utilsbuildsh)
  - [Run Image](#run-image)
    - [Docker Run](#docker-run)
    - [Docker Compose](#docker-compose)
  - [Internal Paths](#internal-paths)
  - [Environment Variables](#environment-variables)
  - [Mountable Volumes](#mountable-volumes)
  - [Logs](#logs)
    - [Trace (7)](#trace-7)
    - [Verbose (6)](#verbose-6)
    - [Debug (5)](#debug-5)
- [Notes](#notes)
  - [Configuration](#configuration)



<br />

---

<br />

## About

Backage is a self-hostable and free app which allows you to create and utilize an end-point for Github package badges. Show off stats for packages such as npm, gem, mvn, Gradle, NuGet, or GHCR, which can be used in combination with Shields.io/json or Shields.io/xml in order to display badges on material such as websites or your Github, Gitea, or Gitlab README.md. 

Even if you are not in need of a badge; you can still use the service to query package statistics, such as weekly or monthly download count, package size, and a complete version history, all while not exposing any metadata that other registries provide, and utilizing completely free Github resources.

<br />
<br />

## Docker Image

The docker image has numerous elements:

- Alpine Root
- Ubuntu 24.04 (Noble)
- s6-overlay

<br />

The image consists of the following:

- **Webapp** (NodeJS)
  - This webapp consists of a main page which explains how to use badges with your Github repository. 
  - Contains health-check to ensure container is up; which can be accessed via querying the url:
    - `http://127.0.0.1:4124/api/health?silent=true`
- **Backage Sync App** (Bash)
  - Responsible for running a cron which will update the repositories that contain statistics for each repo.
  - These changes will then be pushed to the specified git repo under the branch `index`.

<br />

The **Webapp** and **Backage Sync App** are independent of each other, and the webapp does not need to run in order for the syncing functionality to continue.

<br />
<br />

### Build Image

This docker image can be built a few different ways:

1. Manually using `docker buildx`
2. Using the included build script `utils.build.sh`

<br />

#### Manual Build Command

To build manually using `docker buildx`; you can use the following command:

```shell
docker buildx build \
  --build-arg IMAGE_NAME=backage \
  --build-arg IMAGE_ARCH=amd64 \
  --build-arg IMAGE_BUILDDATE=20250621 \
  --build-arg IMAGE_VERSION=2025.6.21 \
  --build-arg IMAGE_RELEASE=stable \
  --build-arg IMAGE_REGISTRY=local \
  --tag aetherinox/backage:latest \
  --tag aetherinox/backage:2025.6.21 \
  --tag aetherinox/backage:2025 \
  --tag aetherinox/backage:2025.6 \
  --file Dockerfile \
  --platform linux/amd64 \
  --attest type=provenance,disabled=true \
  --attest type=sbom,disabled=true \
  --output type=docker \
  --allow network.host \
  --network host \
  --no-cache \
  --pull \
  .
```

<br />

This is a very basic command, it does not include merging docker image manifests in order to create a multi-arcitecture image.

<br />
<br />

#### Using `utils.build.sh`

This script allows for a Backage docker image to be created without using such a long command. First, set `+x` executive permissions on the script:

```shell
sudo chmod +x utils.build.sh
```

<br />

Then run the build command:

```shell
./utils.build.sh
```

<br />

Keep in mind, the script tries to fill in values as best as possible, however, you can override the values yourself by specifying arguments with the command:

```shell
./utils.build.sh \
  --version 2025.6.21 \
  --distro noble \
  --arch amd64 \
  --registry local \
  --name backage \
  --release beta \
  --registry github \
  --author Aetherinox \
  --network default
```

<br />

If you need a list of all the available arguments, run the help command:

```shell
./utils.build.sh --help
```

<br />

If you want to test the command first without actually building the image; do a `dryrun` with:

```shell
./utils.build.sh --dryrun
```

<br />
<br />

### Run Image

After the docker image is built; it can be ran just as any other docker image. You can use either a `📄 docker-compose.yml` file, or start it using the `🗔 docker run` command.

<br />


#### Docker Run

If you want to bring the container up using `🗔 docker run`; execute the following:

```shell
docker run -d --restart=unless-stopped \
  --name backage \
  -p 4124:4124 \
  -e "DIR_RUN=/usr/bin/web" \
  -e "TZ=Etc/UTC" \
  -v ${PWD}/app:/usr/bin/web ghcr.io/ipitio/backage:latest
```

<br />
<br />

#### Docker Compose

If you want to use a `📄 docker-compose.yml` to bring Backage up; you may use the following example:

```yml
services:
    backage:
        container_name: backage
        image: ghcr.io/ipitio/backage:latest                # Image: Github
      # image: ipitio/backage:latest                        # Image: Dockerhub
        restart: unless-stopped
        volumes:
            - /etc/timezone:/etc/timezone:ro
            - /etc/localtime:/etc/localtime:ro
            - /var/run/docker.sock:/var/run/docker.sock
            - ./config:/config
            - ./app:/usr/bin/web
        environment:
            - TZ=Etc/UTC
            - WEB_IP=0.0.0.0
            - WEB_PORT=4124
            - GITHUB_REPO=ipitio
            - GITHUB_OWNER=aetherinox
            - GITHUB_EMAIL=me@github.com
            - GITHUB_TOKEN=gh_pat_XXXXXXXXXXXXXXXXXXXXXXXXXXX
            - LOG_LEVEL=4
```

<br />

Once you bring the docker container up; open your web-browser and access the container's webserver by going to:

```console
http://container-ip:4124
```

<br />

You can access the container logs; which will outline the startup process. It will also inform you of when the first sync will be.

```
backage  ℹ️ [8:42:08 AM] core [initiate] ℹ️ <msg> Backage container running <time> took 18.592039999999997ms <ip> 172.18.0.75 <gateway> 172.18.0.1 <port> 4124
backage  ✅ [8:42:08 AM] core [initiate] ✅ <msg> Server is now running on <ipPublic>  0.0.0.0:4124  <ipDocker>  172.18.0.75:4124 
backage  ℹ️ [8:42:08 AM] core [initiate] ℹ️ <msg> Running Backage version <version>  v2025.6.20  <release>  stable 
backage  ✅ [8:42:08 AM] ping [response] ✅ <msg> Service Online <code> 200 <service> ipitio.github.io <address> https://github.com/ipitio/backage
backage  ℹ️ [8:44:00 AM] core [schedule] ℹ️ <msg> Next data refresh at <schedule>  0 */12 * * *  <nextrun>  06-21-2025 12:00 PM  <nextrunIso>  Sat Jun 21 2025 12:00:00 GMT+0000
```

<br />
<br />

### Internal Paths

When the docker container is started up, there are several folders to take note of:

<br />

| Folder | Description |
| --- | --- |
| `/usr/src/web` | NodeJS app will be built here when the container is started |
| `/usr/bin/web` | Where the NodeJS web app will be placed after being built |
| `/usr/bin/helpers` | Helper scripts used with docker image |
| `/app` | The location of the Backage main app that gathers badge information and syncs with your repo. Also the `Dockerfile` `WORKDIR` |

<br />
<br />

### Environment Variables

The following is a list of environment variables you can declare within your `docker-compose.yml` or docker run command:

<br />

> [!CAUTION]  
> Do **not** add `"` quotation marks to environment variables.
>
> ✔️ Correct
> ```yml
> environment:
>    - TASK_CRON_SYNC=*/60 * * * *
> ```
>
> ❌ Incorrect
> ```yml
> environment:
>    - TASK_CRON_SYNC="*/60 * * * *"
> ```

<br />

| Env Var | Default | Description |
| --- | --- | --- |
| `TZ` | `Etc/UTC` | Timezone for error / log reporting |
| `WEB_IP` | `0.0.0.0` | IP to use for webserver |
| `WEB_PORT` | `4124` | Port to use for webserver |
| `WEB_FOLDER` | `www` | Internal container folder to keep Backage web files in. <br /><br /> <sup><sub>⚠️ This should not be used unless you know what you're doing </sub></sup> |
| `WEB_PROXY_HEADER` | `x-forwarded-for` | Defines the header to look for when finding a client's IP address. Used to get a client's IP when behind a reverse proxy or Cloudflare |
| `GITHUB_PROTO` | `https` | Protocol to use for Github, Gitlab, or Gitea website where repo will be stored |
| `GITHUB_HOST` | `github.com` | Main domain for Github, Gitlab, or Gitea website where repo will be stored |
| `GITHUB_REPO` | `ipitio` | Repo name where badge data will be synced |
| `GITHUB_OWNER` | `ipitio` | Repo owner username where badge data will be synced<br />if not set, will take the value of `GITHUB_ACTOR` |
| `GITHUB_ACTOR` | `ipitio` | User's Github account username<br />if not set, will take the value of `GITHUB_OWNER` |
| `GITHUB_EMAIL` | `${GITHUB_OWNER}@users.noreply.github.com` | Email address associated with Git account  |
| `GITHUB_TOKEN` | `empty` | Github personal access token used when pushing commits to your Backage repo |
| `GITHUB_BRANCH` | `master` | Branch to use for Backage |
| `TASK_CRON_SYNC` | `0 */12 * * *` | Defines how often to update badge data and push to the repo<br /><br /><sup><sub> **Default**: every 12 hours </sub></sup> |
| `TASK_CRON_NOTICE` | `*/30 * * * *` | Defines how often to inform you of when the next cron to sync badge data and push to the repo is. Set this to be sooner than `TASK_CRON_SYNC`<br /><br /><sup><sub> **Default**: every 30 minutes </sub></sup> |
| `HEALTH_TIMER` | `600000` | How often (in milliseconds) to run a health check |
| `DIR_BUILD` | `/usr/src/app` | Path inside container where Backage web app will be built. <br /><br /> <sup><sub>⚠️ This should not be used unless you know what you're doing</sup> |
| `DIR_RUN` | `/usr/bin/app` | Path inside container where Backage web app will be placed after it is built <br /><br /> <sup><sub>⚠️ This should not be used unless you know what you're doing</sub></sup> |
| `DIR_APP` | `/app` | Path inside container where Backage main app / syncing be placed<br /><br /> <sup><sub>⚠️ This should not be used unless you know what you're doing </sub></sup> |
| `LOG_LEVEL` | `4` | Level of logging to display in console<br/>`7` Trace <sup><sub>& below</sub></sup><br />`6` Verbose <sup><sub>& below</sub></sup><br />`5` Debug <sup><sub>& below</sub></sup><br />`4` Info <sup><sub>& below</sub></sup><br />`3` Notice <sup><sub>& below</sub></sup><br />`2` Warn <sup><sub>& below</sub></sup><br />`1` Error <sup><sub>only</sub></sup> |

<br />
<br />

### Mountable Volumes

These paths can be mounted and shared between the Backage docker container and your host machine:

| Container Path | Description |
| --- | --- |
| `📁 /usr/bin/web` | <sub>Path where Backage web files will be placed once the app has been built. Includes `📁 node_modules`, and `📄 package.json`</sub> |
| `📁 /config` | <sub>Where logs will be placed, as well as the web server generated SSH key, certs, and your Github SSH key `🔑 cert.key` and `🪪 cert.crt`</sub> |

<br />
<br />

### Logs

This docker container has extensive logging. It tries to let the user know exactly what is going on, and inform them when issues arise, and how to correct the issue.

The environment variable `LOG_LEVEL` can be set, which allows you to adjust how many different types of logs you will see. To set the env variable, specify it in your `docker-compose.yml` or `docker run` command:

```yml
        environment:
            - LOG_LEVEL=4
```

<br />

The default level of `info (4)` will give you all messages related to running your container. It should be enough for everyday users. This log level includes:

- All informative messages
- All errors
- All warnings
- All notices

<br />

However, this container supports three levels with high verbosity:
- **Trace**: 7
- **Verbose**: 6
- **Debug**: 5

<br />
<br />

#### Trace (7)

This **LOG_LEVEL** will output anything that you can see with **debug** `LOG_LEVEL=5`; but with the addition that each log output to your console will show a complete traceback of how the log was triggered.

<br />

> [!NOTE]
> Users should be cautioned that using `LOG_LEVEL=7` will generate a large amount of logs to your console, especially when you initiate watching an IPTV channel.

<br />

```shell
Trace:  backage  → core [requests] ⚙️ <msg> Connection request received <src> /usr/bin/web/www/health
    at Log.debug (file:///usr/bin/web/index.js:182:21)
    at getGzip (file:///usr/bin/web/index.js:658:13)
    at initialize (file:///usr/bin/web/index.js:1840:15)
    at process.processTicksAndRejections (node:internal/process/task_queues:105:5)
    at async file:///usr/bin/web/index.js:2288:5
```

<br />
<br />

#### Verbose (6)

This **LOG_LEVEL** will output anything that you can see with **debug** `LOG_LEVEL=5`; as well as even deeper logs; such as every environment variable your Backage container has assigned. You should not need to use this log level unless you are troubleshooting an issue or if instructed to do so by the developers.

```shell
backage  ⚙️ [8:42:07 AM] .env [assigner] 📣 <name> GITHUB_REPO <value> backage
backage  ⚙️ [8:42:07 AM] .env [assigner] 📣 <name> HEALTH_TIMER <value> 600000
backage  ⚙️ [8:42:07 AM] .env [assigner] 📣 <name> UUID0 <value> 0
backage  ⚙️ [8:42:07 AM] .env [assigner] 📣 <name> NODE_VERSION <value> 22.16.0
backage  ⚙️ [8:42:07 AM] .env [assigner] 📣 <name> HOSTNAME <value> backage
backage  ⚙️ [8:42:07 AM] .env [assigner] 📣 <name> YARN_VERSION <value> 1.22.22
```

<br />
<br />

#### Debug (5)

This **LOG_LEVEL** will output many of the steps that this container takes to sync your github package badge data. It will also output the environment variables you have set associated with the docker image itself.

<br />

```shell
backage  ⚙️ [8:41:57 AM] core [svcsdotd] ⚙️ <msg> Setting git config item <command> git config core.commitGraph true
backage  ⚙️ [8:41:57 AM] core [svcsdotd] ⚙️ <msg> Setting git config item <command> git config core.eof lf
backage  ⚙️ [8:41:57 AM] core [svcsdotd] ⚙️ <msg> Setting git config item <command> git config color.diff true
backage  ⚙️ [8:41:57 AM] core [svcsdotd] ⚙️ <msg> Setting git config item <command> git config color.grep true
backage  ⚙️ [8:41:57 AM] core [svcsdotd] ⚙️ <msg> Setting git config item <command> git config color.status true
```

<br />
<br />


## Notes

The following should be taken into consideration:

<br />

### Configuration

There are numerous environment variables that are required in order for the container to start up successfully. If you fail to provide any of the following; the container will error out and fail to start. Anything not listed below has a default value which will not allow it to be empty:

- `GITHUB_OWNER` OR `GITHUB_ACTOR`
  - One or both must be specified. If only one of the two are specified; then both will take on the same value of whichever is set.
- `GITHUB_TOKEN`
  - This is required to push to the git repo

<br />

There are optional values you can set:

- `GITHUB_EMAIL`
  - Used to set `git config user.email`
- `GITHUB_SIGNINGKEY`
  - This value will be used for `git config user.signingkey`.
  - It should be a GPG, SSH, or X.509 key you wish to use when signing commits.
- `GITHUB_GPGSIGN`
  - Used to set `git config commit.gpgsign`
  - Determines if a commit will be siged by your GPG, SSH, or X.509 key

<br />

This docker image includes several cron jobs which are controlled by environment variables:

- `TASK_CRON_NOTICE`
  - Determines how often to tell you when the next cron execution will be.
  - By default, this fires every `30 minutes`
- `TASK_CRON_SYNC`
  - Determines how often to actually sync github package badge statistics and push these updates to your repo.
  - By default, this fires every `12 hours`

<br />
<br />
