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
  - [Important Info](#important-info)
    - [Before Building](#before-building)
      - [LF over CRLF](#lf-over-crlf)
      - [Set `+x / 0755` Permissions](#set-x--0755-permissions)
      - [Building Different Architectures](#building-different-architectures)
    - [Integrated Helper Scripts](#integrated-helper-scripts)
      - [`📄 utils.fix.sh`](#-utilsfixsh)
      - [`📄 utils.build.sh`](#-utilsbuildsh)
  - [Build Image](#build-image)
    - [Manual Build Command](#manual-build-command)
    - [Using `utils.build.sh`](#using-utilsbuildsh)
  - [Configure Image](#configure-image)
    - [Environment Variables](#environment-variables)
      - [Required](#required)
      - [Optional](#optional)
      - [Cron Jobs](#cron-jobs)
    - [Mountable Volumes](#mountable-volumes)
    - [Healthcheck](#healthcheck)
      - [Responses](#responses)
  - [Run Image](#run-image)
    - [Docker Run](#docker-run)
    - [Docker Compose](#docker-compose)
  - [Using Image](#using-image)
    - [Internal Paths](#internal-paths)
    - [Logs](#logs)
      - [Trace (7)](#trace-7)
      - [Verbose (6)](#verbose-6)
      - [Debug (5)](#debug-5)
      - [Info (4)](#info-4)
      - [Notice (3)](#notice-3)
      - [Warn (2)](#warn-2)
      - [Error (1)](#error-1)



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

- Alpine Root 3.22
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

### Important Info

These instructions outline how the Backage docker image is set up, and how to build your own docker image.

<br />

#### Before Building

Prior to building the docker image, you **must** ensure the sections below are completed.

- [LF over CRLF](#lf-over-crlf)
- [Set +x / 0755 Permissions](#set-x--0755-permissions)
- [Building Different Architectures](#building-different-architectures)

<br />

If the listed tasks above are not performed, your docker container will throw the following errors when started:

- `Failed to open apk database: Permission denied`
- `s6-rc: warning: unable to start service init-adduser: command exited 127`
- `unable to exec /etc/s6-overlay/s6-rc.d/init-envfile/run: Permission denied`
- `/etc/s6-overlay/s6-rc.d/init-adduser/run: line 34: aetherxown: command not found`
- `/etc/s6-overlay/s6-rc.d/init-adduser/run: /usr/bin/aetherxown: cannot execute: required file not found`

<br />
<br />

##### LF over CRLF

Line endings in text files are marked using special control characters:
- **CR**: _Carriage Return_
  - 0x0D or decimal `13`
- **LF**: _Line Feed_
  - 0x0A or decimal `10`

<br />

Different operating systems use different conventions for line breaks:
- **Windows** uses a `CR/LF` sequence to indicate the end of a line
  - `\r\n`
- **Unix/Linux** and modern `macOS > v10.0` uses only `LF`
  - `\n`
- **Classic** `macOS < v10.0` used only `CR`
  - `\r`

<br />

If you attempt to build your Backage docker image on Linux, and have windows CRLF in your files; you will get errors and the container will be unable to start. All files must be converted to Unix' `Line Feed`.  This can be done with **[Visual Studio Code](https://code.visualstudio.com/)**. OR; you can run the Linux terminal command `🗔 dos2unix` to convert these files.

<br />

> [!NOTE]
> You no longer need to manually run these commands. We have provided a script to run these commands automatically. See the section:
> - [📄 Integrated Helper Script](#integrated-helper-scripts)

<br />

> [!CAUTION]
> Be careful using the command to change **ALL** files. You should **NOT** change the files in your `📁 .git` folder, otherwise you will corrupt your git indexes.
>
> If you accidentally run `🗔 dos2unix` on your `📁 .git` folder, do NOT push anything to git. Pull a new copy from the repo or reset your local files back to the remote:
> 
> ```shell
> git reset --hard origin/master
> ```

<br />

To fix line-endings; you can use the following recursive commands:

<br />

```shell
# Change ALL files
find ./ -type f | grep -Ev 'docs|node_modules|.git|*.jpg|*.jpeg|*.png' | xargs dos2unix --

# Change run / binaries
find ./ -type f -name 'run' -print | xargs dos2unix --
```

<br />

You may pre-check if a file is using Windows CRLF or Linux LF by running the command `file <filename>` on the file:

```shell
$ file ./root//etc/s6-overlay/s6-rc.d/ci-service-check/type
./root//etc/s6-overlay/s6-rc.d/ci-service-check/type: ASCII text
```

<br />

You will get one of three messages listed below:

1. ASCII text, with `CRLF, LF` line terminators
2. ASCII text, with `CRLF` line terminators
3. ASCII text

<br />

If you get messages `1` or `2`, then you need to run `dos2unix` on the file; otherwise when you bring the container up, you will get errors.

<br />
<br />

##### Set `+x / 0755` Permissions

The files contained within this repo **MUST** have `chmod 755` /  `+x` executable permissions. If you are building the images manually; you need to do this.

All files which require executa `+x` permissions are named `run`:

<br />

> [!NOTE]
> You no longer need to manually run these commands. We have provided a script to run these commands automatically. See the section:
> - [📄 Integrated Helper Script](#integrated-helper-scripts)

<br />

To fix the permissions, `cd` into the folder where your Backage image files are and run the command:

```shell
find ./ -name 'run' -print -exec sudo chmod +x {} \;
```

<br />

<sub><sup>Optional - </sup></sub> If you want to set the permissions manually, run the following below. If you executed the `find` command above, you don't need to run the list of commands below:

```shell
sudo chmod +x ./root/etc/s6-overlay/s6-rc.d/init-adduser/run \
  ./root/etc/s6-overlay/s6-rc.d/init-crontab-config/run \
  ./root/etc/s6-overlay/s6-rc.d/init-custom-files/run \
  ./root/etc/s6-overlay/s6-rc.d/init-envfile/run \
  ./root/etc/s6-overlay/s6-rc.d/init-folders/run \
  ./root/etc/s6-overlay/s6-rc.d/init-keygen/run \
  ./root/etc/s6-overlay/s6-rc.d/init-migrations/run \
  ./root/etc/s6-overlay/s6-rc.d/init-permissions/run \
  ./root/etc/s6-overlay/s6-rc.d/init-samples/run \
  ./root/etc/s6-overlay/s6-rc.d/init-version-checks/run \
  ./root/etc/s6-overlay/s6-rc.d/svc-cron/run
```

<br />
<br />

##### Building Different Architectures

Out-of-box, you cannot build an image for a different architecture than your system. If you are running **amd64**, and want to build the arm64 image; you must install `QEMU` as a docker container by running the command:

```shell
docker run --privileged --rm tonistiigi/binfmt --install all
```

<br />

Once you have the above docker container running, you can now run the `docker buildx` command as normal:

```shell
# Build Backage arm64

docker buildx build \
  --build-arg IMAGE_NAME=backage \
  --build-arg IMAGE_ARCH=arm64 \
  --build-arg IMAGE_BUILDDATE=20250621 \
  --build-arg IMAGE_VERSION=2025.6.21 \
  --build-arg IMAGE_RELEASE=stable \
  --build-arg IMAGE_REGISTRY=local \
  --tag aetherinox/backage:2025.6.21-arm64 \
  --file Dockerfile \
  --platform linux/arm64 \
  --attest type=provenance,disabled=true \
  --attest type=sbom,disabled=true \
  --output type=docker \
  --allow network.host \
  --network host \
  --no-cache \
  --pull \
  --push \
  .
```

<br />

Make sure you change the following arguments over to `arm64`:

- `--build-arg IMAGE_ARCH=arm64 \`
- `--platform linux/arm64 \`

<br />
<br />

#### Integrated Helper Scripts

This repository includes two scripts:

- `📄 utils.fix.sh`
  - Ensures that your local copy of this Backage docker image has the correct permissions; including the `+x` executable flag on all `run` files.
- `📄 utils.build.sh`
  - Builds the Backage docker image from simply running the bash script.

<br />

To utilize these scripts, ensure you set the `+x` permission on the two scripts:

```shell
sudo chmod +x utils.fix.sh
sudo chmod +x utils.build.sh
```

<br />

Then run the scripts:

```shell
./utils.fix.sh
./utils.build.sh
```

<br />
<br />

##### `📄 utils.fix.sh`

The `fix permissions` script will ensure that your local copy of the Backage docker files have the proper permissions for all files before you create a docker image; or re-upload it to Github or your own registry. It will ensure that the `run` files have the `+x` execute permission. Without this permission; your container will fail when it starts up.

This script is automatically ran when you execute the `📄 utils.build.sh` script to build the container. You do not need to run this script before the build script.

<br />
<br />

##### `📄 utils.build.sh`

The build script allows you to build the Backage docker image without having to manually execute the `docker buildx <...>` commands. It accepts a series of arguments compatible with docker so that you can customize how the image turns out.

After the permissions are set up; you can now run the scripts in any order, at any time. The build script `📄 utils.build.sh` will automatically run the bash script to fix permissions `📄 utils.fix.sh` before it starts to build your docker image, so you don't need to run it individually.

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

When the `utils.build.sh` bash script is ran; it will also run `utils.fix.sh` which modifies the permissions of the files for the docker container and sets any files with the name `run` to have `+x` executable permissions. If these are not properly set; then the docker container will fail to start as it doesn't have the required access.

<br />
<br />

### Configure Image

After the docker image is built; you can either create a `📄 docker-compose.yml` file, or start it using the `🗔 docker run`. We will outline all of the settings you can configure; and how it will initially work.

<br />
<br />

#### Environment Variables

This container includes the following environment variables:

| Env Var | Default | Description |
| --- | --- | --- |
| `TZ` | `Etc/UTC` | Timezone for error / log reporting |
| `WEB_IP` | `0.0.0.0` | IP to use for webserver |
| `WEB_PORT` | `4124` | Port to use for webserver |
| `WEB_FOLDER` | `www` | Internal container folder to keep Backage web files in. <br /><br /> <sup><sub>⚠️ This should not be used unless you know what you're doing </sub></sup> |
| `WEB_PROXY_HEADER` | `x-forwarded-for` | Defines the header to look for when finding a client's IP address. Used to get a client's IP when behind a reverse proxy or Cloudflare when accessing Backage webapp |
| `GITHUB_PROTO` | `https` | Protocol to use for Github, Gitlab, or Gitea website where repo will be stored |
| `GITHUB_HOST` | `github.com` | Main domain for Github, Gitlab, or Gitea website where repo will be stored |
| `GITHUB_REPO` | `backage` | Repo name where badge data will be synced |
| `GITHUB_OWNER` | `ipitio` | Repo owner username where badge data will be synced<br />if not set, will take the value of `GITHUB_ACTOR` |
| `GITHUB_ACTOR` | `ipitio` | User's Github account username<br />if not set, will take the value of `GITHUB_OWNER` |
| `GITHUB_EMAIL` | `${GITHUB_OWNER [OR] GITHUB_ACTOR}@users.noreply.github.com` | Email address associated with Git account  |
| `GITHUB_TOKEN` | `empty` | Github personal access token used when pushing commits to your Backage repo |
| `GITHUB_BRANCH` | `master` | Branch to use for Backage |
| `TASK_CRON_NOTICE` | `*/30 * * * *` | Defines how often to inform you of when the next cron to sync badge data and push to the repo is. Set this to be sooner than `TASK_CRON_SYNC`<br /><br /><sup><sub> **Default**: every 30 minutes </sub></sup> |
| `TASK_CRON_SYNC` | `0 */12 * * *` | Defines how often to update badge data and push to the repo<br /><br /><sup><sub> **Default**: every 12 hours </sub></sup> |
| `HEALTH_TIMER` | `600000` | How often (in milliseconds) to run a health check |
| `DIR_BUILD` | `/usr/src/app` | Path inside container where Backage web app will be built. <br /><br /> <sup><sub>⚠️ This should not be used unless you know what you're doing</sup> |
| `DIR_RUN` | `/usr/bin/app` | Path inside container where Backage web app will be placed after it is built <br /><br /> <sup><sub>⚠️ This should not be used unless you know what you're doing</sub></sup> |
| `DIR_APP` | `/app` | Path inside container where Backage main app / syncing be placed<br /><br /> <sup><sub>⚠️ This should not be used unless you know what you're doing </sub></sup> |
| `LOG_LEVEL` | `4` | Level of logging to display in console<br/>`7` Trace <sup><sub>& below</sub></sup><br />`6` Verbose <sup><sub>& below</sub></sup><br />`5` Debug <sup><sub>& below</sub></sup><br />`4` Info <sup><sub>& below</sub></sup><br />`3` Notice <sup><sub>& below</sub></sup><br />`2` Warn <sup><sub>& below</sub></sup><br />`1` Error <sup><sub>only</sub></sup> |

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

Env variables can be defined as part of your  `📄 docker-compose.yml`, or in your `🗔 docker run`. 

For the `📄 docker-compose.yml` option; use a structure similar to:

```yml
environment:
    - GITHUB_REPO=ipitio
    - GITHUB_OWNER=aetherinox
    - GITHUB_EMAIL=me@github.com
    - GITHUB_TOKEN=gh_pat_XXXXXXXXXXXXXXXXXXXXXXXXXXX
```

<br />

If using `🗔 docker run`; define `-v` for each env variable:

```shell
docker run -d \
    --restart=unless-stopped \
    --name backage \
    -e "GITHUB_REPO=ipitio" \
    -e "GITHUB_OWNER=aetherinox" \
    -e "GITHUB_EMAIL=me@github.com" \
    -e "GITHUB_TOKEN=gh_pat_XXXXXXXXXXXXXXXXXXXXXXXXXXX" \
    ghcr.io/ipitio/backage:latest
```

<br />

##### Required

There are numerous environment variables that are **required** in order for the container to start up successfully. If you fail to provide any of the following; the container will error out and fail to start. Anything not listed below has a default value which will not allow it to be empty:

- `GITHUB_OWNER` OR `GITHUB_ACTOR`
  - One or both must be specified. If only one of the two are specified; then both will take on the same value of whichever is set.
- `GITHUB_TOKEN` OR `GITHUB_SSHKEY`
  - This is required to push to the git repo

<br />

##### Optional

There are optional values you can set, if you do not specify these, then default values will be used.

- `GITHUB_EMAIL`
  - Used to set `git config user.email`
  - Default value: `${GITHUB_OWNER || GITHUB_ACTOR}@users.noreply.github.com`
- `GITHUB_BRANCH`
  - The primary branch for repo
  - Default value: `master`
- `GITHUB_SIGNINGKEY`
  - This value will be used for `git config user.signingkey`
  - It should be a GPG, SSH, or X.509 key you wish to use when signing commits.
  - Default value: `false`
- `GITHUB_GPGSIGN`
  - Used to set `git config commit.gpgsign`
  - Determines if a commit will be siged by your GPG, SSH, or X.509 key
  - Default value: `false`

<br />

##### Cron Jobs

This docker image includes several cron jobs which are controlled by environment variables:

- `TASK_CRON_NOTICE`
  - Determines how often to tell you when the next cron execution will be.
  - Default Value: `*/30 * * * *` (30 minutes)
  - Notices will appear as:
    ```
    backage  ℹ️ [6:24:00 PM] core [schedule] ℹ️ <msg> Next data refresh at <schedule>  0 */12 * * *  <nextrun>  06-22-2025 12:00 AM  <nextrunIso>  Sun Jun 22 2025 00:00:00 GMT+0000
    ```
- `TASK_CRON_SYNC`
  - Determines how often to actually sync github package badge statistics and push these updates to your repo.
  - Default Value: `0 */12 * * *` (12 hours)
  - When cron is fired, logs will show the message:
    ```
    backage  ✅ [7:34:00 PM] task [schedule] ✅ <msg> Started cron to synchronize container with github repo <runtime>  06-21-2025 12:00 PM  <schedule>  0 */12 * * *  <repository>  https://github.com/aetherinox/backage 
    ```

<br />
<br />

#### Mountable Volumes

These paths can be mounted and shared between the Backage docker container and your host machine:

| Container Path | Description |
| --- | --- |
| `📁 /usr/bin/web` | <sub>Path where Backage web files will be placed once the app has been built. Includes `📁 node_modules`, and `📄 package.json`</sub> |
| `📁 /config` | <sub>Where logs will be placed, as well as the web server generated SSH key, certs, and your Github SSH key `🔑 cert.key` and `🪪 cert.crt`</sub> |

<br />

For the `📄 docker-compose.yml` option; use a structure similar to:

```yml
environment:
    - GITHUB_REPO=ipitio
    - GITHUB_OWNER=aetherinox
    - GITHUB_EMAIL=me@github.com
    - GITHUB_TOKEN=gh_pat_XXXXXXXXXXXXXXXXXXXXXXXXXXX
volumes:
    - ./cfg:/config
    - ./webserver:/usr/bin/web
```

<br />

If using `🗔 docker run`; define `-v` for each mounted volume:

```shell
docker run -d --restart=unless-stopped \
    --name backage \
    -e "GITHUB_REPO=ipitio" \
    -e "GITHUB_OWNER=aetherinox" \
    -e "GITHUB_EMAIL=me@github.com" \
    -e "GITHUB_TOKEN=gh_pat_XXXXXXXXXXXXXXXXXXXXXXXXXXX" \
    -v ./webserver:/usr/bin/web \
    -v ./cfg:/config \
    ghcr.io/ipitio/backage:latest
```

<br />
<br />

#### Healthcheck

This docker container includes health-checks. These health-checks allow you to ensure that your docker container is still functioning properly.

For the `📄 docker-compose.yml` option; use a structure similar to:

```yml
healthcheck:
    test: [ "CMD", "curl", "--fail", "http://127.0.0.1:4124/api/health?silent=true" ]
    interval: 30s
    retries: 5
```

<br />

If using `🗔 docker run`; define `--health-*` commands for the health-check:

```
docker run -d --restart=unless-stopped \
    --name backage \
    -e "GITHUB_REPO=ipitio" \
    -e "GITHUB_OWNER=aetherinox" \
    -e "GITHUB_EMAIL=me@github.com" \
    -e "GITHUB_TOKEN=gh_pat_XXXXXXXXXXXXXXXXXXXXXXXXXXX" \
    -v ./webserver:/usr/bin/web \
    -v ./cfg:/config \
    --health-cmd='curl --fail http://127.0.0.1:4124/api/health?silent=true || exit 1' \
    --health-interval=30s \
    ghcr.io/ipitio/backage:latest
```

<br />

At the end of the health-check url, the parameter `?silent=true` has been appended. This is to ensure that your docker logs are not spamming health-check logs every 30 seconds. If you remove this parameter, a console message will be shown every 30 seconds announcing when a health check has been called; an example is provided below:

```
backage  ℹ️ [8:33:51 PM] http [requests] ℹ️ <msg> Requesting to access health api <type> api/health <client> 127.0.0.1 <file> api/health <method> GET
backage  ✅ [8:33:51 PM] /api [health] ✅ <msg> Response <client> 127.0.0.1 <code> 200 <status> healthy <uptime> 43.292830165
```

<br />

This parameter does **not** silence any other outside services which attempt to request health checks. If you go to `http://127.0.0.1:4124/api/health` in your browser to access the health-check API, this will be logged. You will also see the health-check [response](#responses) in a structured json output.

<br />

##### Responses

When you run a health-check query on Backage; the response that is returned will output the following json:

```json
{
  "ip": "0.0.0.0",
  "gateway": "0.0.0.0",
  "client": "127.0.0.1",
  "message": "healthy",
  "status": "healthy",
  "ref": "/api/health",
  "method": "GET",
  "code": 200,
  "uptime": 123634,
  "uptimeShort": "Jun 19",
  "uptimeLong": "1 day ago",
  "timestamp": 1750411021033
}
```

<br />

| Field | Description |
| --- | --- |
| `ip` | IP address assigned to container |
| `gateway` | Gateway IP address assigned to container |
| `client` | IP address of client accessing health check |
| `message` | Will output `healthy` or an error message if health check is not healthy |
| `status` | Will output `healthy` or `unhealthy` |
| `ref` | URL to page being called |
| `method` | Returns `GET`, `POST` |
| `code` | Status code of returned response <br /><br /> `200 OK` <br /> `301 Moved Permanently` <br /> `400 Bad Request` <br /> `403 Forbidden` <br /> `404 Not Found` <br /> `405 Method Not Allowed` <br /> `429 Too Many Requests` <br /> `500 Internal Server Error` <br /> `502 Bad Gateway` <br /> `503 Service Unavailable` <br /> `504 Gateway Timeout` |
| `uptime` | Number of seconds container has been running |
| `uptimeShort` | Human-readable uptime with seconds converted to a date |
| `uptimeLong` | Human-readable uptime of how many minutes, hours, days since container has been started |
| `timestamp` | Unix timestamp of when query was made |

<br />
<br />

### Run Image

After the docker image is built; it can be ran just as any other docker image. You can use either a `📄 docker-compose.yml` file, or start it using the `🗔 docker run` command.

<br />


#### Docker Run

If you want to bring the container up using `🗔 docker run`; execute the following:

```shell
docker run -d \
    --restart=unless-stopped \
    --name backage \
    -e "TZ=Etc/UTC" \
    -v ./webserver:/usr/bin/web \
    ghcr.io/ipitio/backage:latest
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
            - ./webserver:/usr/bin/web
        environment:
            - TZ=Etc/UTC
            - GITHUB_REPO=ipitio
            - GITHUB_OWNER=aetherinox
            - GITHUB_EMAIL=me@github.com
            - GITHUB_TOKEN=gh_pat_XXXXXXXXXXXXXXXXXXXXXXXXXXX
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

### Using Image

Once your Backage docker image is up and running; you can read this section to get a better understanding of how it works.

#### Internal Paths

When the docker container is started up, there are several folders to take note of:

<br />

| Folder | Description |
| --- | --- |
| `/usr/src/web` | NodeJS app will be built here when the container is started |
| `/usr/bin/web` | Where the NodeJS web app will be placed after being built |
| `/usr/bin/helpers` | Helper scripts used with docker image |
| `/app` | The location of the Backage main app that gathers badge information and syncs with your repo. This is the default folder you will enter if you access the backage container's shell / bash. |

<br />
<br />

#### Logs

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

You can pick between any of the following values:

- `7` Trace <sup><sub>& below</sub></sup>
- `6` Verbose <sup><sub>& below</sub></sup>
- `5` Debug <sup><sub>& below</sub></sup>
- `4` Info <sup><sub>& below</sub></sup>
- `3` Notice <sup><sub>& below</sub></sup>
- `2` Warn <sup><sub>& below</sub></sup>
- `1` Error <sup><sub>only</sub></sup>

<br />
<br />

##### Trace (7)

The setting `LOG_LEVEL=7` will output anything that you can see with **debug** `LOG_LEVEL=5`; but with the addition that each log output to your console will show a complete traceback of how the log was triggered.

<br />

> [!WARNING]
> Users should be cautioned that using `LOG_LEVEL=7` will generate a large amount of logs to your console

<br />

<details>
<summary>List of message types that will be shown</summary>

<br>

If you set `LOG_LEVEL=7`; the following message types will be shown in console:

- `7` Trace <sup><sub>& below</sub></sup>
- `6` Verbose <sup><sub>& below</sub></sup>
- `5` Debug <sup><sub>& below</sub></sup>
- `4` Info <sup><sub>& below</sub></sup>
- `3` Notice <sup><sub>& below</sub></sup>
- `2` Warn <sup><sub>& below</sub></sup>
- `1` Error <sup><sub>only</sub></sup>

</details>

<br />

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

##### Verbose (6)

The setting `LOG_LEVEL=6` will output anything that you can see with **debug** `LOG_LEVEL=5`; as well as even deeper logs; such as every environment variable your Backage container has assigned. You should not need to use this log level unless you are troubleshooting an issue or if instructed to do so by the developers.

<details>
<summary>List of message types that will be shown</summary>

<br>

If you set `LOG_LEVEL=6`; the following message types will be shown in console:

- `6` Verbose <sup><sub>& below</sub></sup>
- `5` Debug <sup><sub>& below</sub></sup>
- `4` Info <sup><sub>& below</sub></sup>
- `3` Notice <sup><sub>& below</sub></sup>
- `2` Warn <sup><sub>& below</sub></sup>
- `1` Error <sup><sub>only</sub></sup>

</details>

<br />

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

##### Debug (5)

The setting `LOG_LEVEL=5` will output many of the steps that this container takes to sync your github package badge data. It will also output the environment variables you have set associated with the docker image itself.

<details>
<summary>List of message types that will be shown</summary>

<br>

If you set `LOG_LEVEL=5`; the following message types will be shown in console:

- `5` Debug <sup><sub>& below</sub></sup>
- `4` Info <sup><sub>& below</sub></sup>
- `3` Notice <sup><sub>& below</sub></sup>
- `2` Warn <sup><sub>& below</sub></sup>
- `1` Error <sup><sub>only</sub></sup>

</details>

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

##### Info (4)

The setting `LOG_LEVEL=4` is the default setting for Backages and shows informative messages. These are usually typical functionality of the script when certain actions are ran.

<details>
<summary>List of message types that will be shown</summary>

<br>

If you set `LOG_LEVEL=4`; the following message types will be shown in console:

- `4` Info <sup><sub>& below</sub></sup>
- `3` Notice <sup><sub>& below</sub></sup>
- `2` Warn <sup><sub>& below</sub></sup>
- `1` Error <sup><sub>only</sub></sup>

</details>

<br />
<br />

##### Notice (3)

The setting `LOG_LEVEL=3` will output notice messages that are made to catch the attention of the user. These aren't classified as warnings or errors, but they are simply messages that you should be aware of.

<details>
<summary>List of message types that will be shown</summary>

<br>

If you set `LOG_LEVEL=3`; the following message types will be shown in console:

- `3` Notice <sup><sub>& below</sub></sup>
- `2` Warn <sup><sub>& below</sub></sup>
- `1` Error <sup><sub>only</sub></sup>

</details>

<br />
<br />

##### Warn (2)

The setting `LOG_LEVEL=2` will output warnings that a user should be paying attention to.

<details>
<summary>List of message types that will be shown</summary>

<br>

If you set `LOG_LEVEL=2`; the following message types will be shown in console:

- `2` Warn <sup><sub>& below</sub></sup>
- `1` Error <sup><sub>only</sub></sup>

</details>

<br />
<br />

##### Error (1)

The setting `LOG_LEVEL=1` will _only_ output errors / failures. You will see no other type of messages other than when the system has failed to do something.

<details>
<summary>List of message types that will be shown</summary>

<br>

If you set `LOG_LEVEL=1`; the following message types will be shown in console:

- `1` Error <sup><sub>only</sub></sup>

</details>

<br />
<br />
