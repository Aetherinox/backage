# syntax=docker/dockerfile:1

# #
#   @project        Backage
#   @usage          Runs backage on a schedule, similar to using a Github workflow
#   @file           Dockerfile
#   @repo           https://github.com/ipitio/backage
#                   https://github.com/aetherinox/backage
#
#   build your own image by running
#       amd64                   docker build --build-arg IMAGE_DISTRO=noble --build-arg IMAGE_VERSION=2025.6.20 --build-arg IMAGE_BUILDDATE=20260812 -t backage:latest -t backage:2025.6.20 -t backage:2025.6.20-amd64 -f Dockerfile .
#       arm64                   docker build --build-arg IMAGE_DISTRO=noble --build-arg IMAGE_VERSION=2025.6.20 --build-arg IMAGE_BUILDDATE=20260812 -t backage:2025.6.20-arm64 -f Dockerfile.aarch64 .
#
#   OR; build using `docker buildx`
#       create                  docker buildx create --driver docker-container --name container --bootstrap --use
#       amd64                   docker buildx build --build-arg IMAGE_DISTRO=noble --build-arg IMAGE_ARCH=amd64 --build-arg IMAGE_VERSION=2025.6.20 --build-arg IMAGE_BUILDDATE=20260812 --build-arg IMAGE_RELEASE=stable --tag ghcr.io/ipitio/backage:2025.6.20-amd64 --attest type=provenance,disabled=true --attest type=sbom,disabled=true --file Dockerfile --platform linux/amd64 --output type=docker --allow network.host --network host --no-cache --pull --push .
#       arm64                   docker buildx build --build-arg IMAGE_DISTRO=noble --build-arg IMAGE_ARCH=arm64 --build-arg IMAGE_VERSION=2025.6.20 --build-arg IMAGE_BUILDDATE=20260812 --build-arg IMAGE_RELEASE=stable --tag ghcr.io/ipitio/backage:2025.6.20-arm64 --attest type=provenance,disabled=true --attest type=sbom,disabled=true --file Dockerfile --platform linux/arm64 --output type=docker --allow network.host --network host --no-cache --pull --push .
#
#   OR; build single amd64 image
#       create                  docker buildx create --driver docker-container --name container --bootstrap --use
#       amd64                   docker buildx build --build-arg IMAGE_DISTRO=noble --build-arg IMAGE_ARCH=amd64 --build-arg IMAGE_VERSION=2025.6.20 --build-arg IMAGE_BUILDDATE=20260812 --build-arg IMAGE_RELEASE=stable --tag ghcr.io/ipitio/backage:2025.6.20 --tag ghcr.io/ipitio/backage:1.5 --tag ghcr.io/ipitio/backage:1 --tag ghcr.io/ipitio/backage:latest --attest type=provenance,disabled=true --attest type=sbom,disabled=true --file Dockerfile --platform linux/amd64 --output type=docker --allow network.host --network host --no-cache --push .
#
#   OR; build official image (publish)
#       create                  docker buildx create --driver docker-container --name container --bootstrap --use
#       amd64-stable            docker buildx build --build-arg IMAGE_DISTRO=noble --build-arg IMAGE_ARCH=amd64 --build-arg IMAGE_VERSION=2025.6.20 --build-arg IMAGE_BUILDDATE=20260812 --build-arg IMAGE_RELEASE=stable --tag ghcr.io/ipitio/backage:2025.6.20-amd64 --attest type=provenance,disabled=true --attest type=sbom,disabled=true --file Dockerfile --platform linux/amd64 --output type=docker --allow network.host --network host --no-cache --pull --push .
#       arm64-stable            docker buildx build --build-arg IMAGE_DISTRO=noble --build-arg IMAGE_ARCH=arm64 --build-arg IMAGE_VERSION=2025.6.20 --build-arg IMAGE_BUILDDATE=20260812 --build-arg IMAGE_RELEASE=stable --tag ghcr.io/ipitio/backage:2025.6.20-arm64 --attest type=provenance,disabled=true --attest type=sbom,disabled=true --file Dockerfile --platform linux/arm64 --output type=docker --allow network.host --network host --no-cache --pull --push .
#       amd64-dev               docker buildx build --build-arg IMAGE_DISTRO=noble --build-arg IMAGE_ARCH=amd64 --build-arg IMAGE_VERSION=2025.6.20 --build-arg IMAGE_BUILDDATE=20260812 --build-arg IMAGE_RELEASE=development --tag ghcr.io/ipitio/backage:development-amd64 --attest type=provenance,disabled=true --attest type=sbom,disabled=true --file Dockerfile --platform linux/amd64 --output type=docker --allow network.host --network host --no-cache --pull --push .
#       arm64-dev               docker buildx build --build-arg IMAGE_DISTRO=noble --build-arg IMAGE_ARCH=arm64 --build-arg IMAGE_VERSION=2025.6.20 --build-arg IMAGE_BUILDDATE=20260812 --build-arg IMAGE_RELEASE=development --tag ghcr.io/ipitio/backage:development-arm64 --attest type=provenance,disabled=true --attest type=sbom,disabled=true --file Dockerfile --platform linux/arm64 --output type=docker --allow network.host --network host --no-cache --pull --push .
#       amd64-stable-hash       docker buildx imagetools inspect ghcr.io/ipitio/backage:2025.6.20-amd64
#       arm64-stable-hash       docker buildx imagetools inspect ghcr.io/ipitio/backage:2025.6.20-arm64
#       amd64-dev-hash          docker buildx imagetools inspect ghcr.io/ipitio/backage:development-amd64
#       arm64-dev-hash          docker buildx imagetools inspect ghcr.io/ipitio/backage:development-arm64
#       merge-stable            docker buildx imagetools create --tag ghcr.io/ipitio/backage:2025.6.20 --tag ghcr.io/ipitio/backage:2025.6 --tag ghcr.io/ipitio/backage:2025 --tag ghcr.io/ipitio/backage:latest sha256:0abe1b1c119959b3b1ccc23c56a7ee2c4c908c6aaef290d4ab2993859d807a3b sha256:e68b9de8669eac64d4e4d2a8343c56705e05e9a907cf0b542343f9b536d9c473
#       merge-dev               docker buildx imagetools create --tag ghcr.io/ipitio/backage:development sha256:8f36385a28c8f6eb7394d903c9a7a2765b06f94266b32628389ee9e3e3d7e69d sha256:c719ccb034946e3f0625003f25026d001768794e38a1ba8aafc9146291d548c5
# #

# #
#   FROM
#   any args defined before FROM cannot be called after FROM and the ARE is classified outside the build process.
#   You will have to re-define the arg after FROM to utilize it anywhere else in the build process.
#
#   @ref            https://docs.docker.com/reference/dockerfile/#understand-how-arg-and-from-interact
# #

ARG IMAGE_ARCH=amd64
ARG IMAGE_DISTRO=noble
FROM --platform=linux/${IMAGE_ARCH} ghcr.io/aetherinox/ubuntu:${IMAGE_DISTRO}

# #
#   Define > Args
# #

ARG IMAGE_REPO_AUTHOR="aetherinox"
ARG IMAGE_REPO_NAME="backage"
ARG IMAGE_NAME="backage"
ARG IMAGE_ARCH="amd64"
ARG IMAGE_SHA1="0000000000000000000000000000000000000000"
ARG IMAGE_REGISTRY="local"
ARG IMAGE_RELEASE="stable"
ARG IMAGE_BUILDDATE="20250620"
ARG IMAGE_VERSION="2025.6.20"
ARG IMAGE_DISTRO="noble"

# #
#   Define > Labels
# #

LABEL org.opencontainers.image.authors="${IMAGE_REPO_AUTHOR}"
LABEL org.opencontainers.image.vendor="${IMAGE_REPO_AUTHOR}"
LABEL org.opencontainers.image.title="${IMAGE_NAME:-Backage} (Ubuntu) ${IMAGE_DISTRO}"
LABEL org.opencontainers.image.description="${IMAGE_NAME:-Backage} Github badges"
LABEL org.opencontainers.image.created=
LABEL org.opencontainers.image.source="https://github.com/${IMAGE_REPO_AUTHOR}/${IMAGE_REPO_NAME}"
LABEL org.opencontainers.image.documentation="https://github.com/${IMAGE_REPO_AUTHOR}/${IMAGE_REPO_NAME}/wiki"
LABEL org.opencontainers.image.issues="https://github.com/${IMAGE_REPO_AUTHOR}/${IMAGE_REPO_NAME}/issues"
LABEL org.opencontainers.image.licenses="MIT"
LABEL org.opencontainers.image.version="${IMAGE_VERSION}"
LABEL org.opencontainers.image.branch="main"
LABEL org.opencontainers.image.registry="${IMAGE_REGISTRY:-local}"
LABEL org.opencontainers.image.release="${IMAGE_RELEASE:-stable}"
LABEL org.opencontainers.image.development="false"
LABEL org.opencontainers.image.sha="${IMAGE_SHA1:-0000000000000000000000000000000000000000}"
LABEL org.opencontainers.image.architecture="${IMAGE_ARCH:-amd64}"
LABEL org.ubuntu.image.maintainers="${IMAGE_REPO_AUTHOR}"
LABEL org.ubuntu.image.version="Version: ${IMAGE_VERSION} Date: ${IMAGE_BUILDDATE:-20250620}"
LABEL org.ubuntu.image.release="${IMAGE_RELEASE:-stable}"
LABEL org.ubuntu.image.sha="${IMAGE_SHA1:-0000000000000000000000000000000000000000}"
LABEL org.ubuntu.image.architecture="${IMAGE_ARCH:-amd64}"

# #
#   Set Env Var
#
#       DIR_APP     path to actual backage sync app
#       DIR_BUILD   path where node website built
#       DIR_RUN     path where node website ran
# #

ENV IMAGE_RELEASE="${IMAGE_RELEASE:-stable}"
ENV IMAGE_SHA1="${IMAGE_SHA1:-0000000000000000000000000000000000000000}"
ENV NODE_VERSION=22.16.0
ENV YARN_VERSION=1.22.22
ENV NPM_VERSION=10.9.2
ENV DIR_BUILD=/usr/src/web
ENV DIR_RUN=/usr/bin/web
ENV DIR_APP=/app
ENV WEB_IP="0.0.0.0"
ENV WEB_PORT=4124
ENV WEB_PROXY_HEADER="x-forwarded-for"
ENV HEALTH_TIMER=600000
ENV TASK_CRON_SYNC="*/1 * * * *"
ENV LOG_LEVEL=4
ENV TZ="Etc/UTC"

# #
#   Install
# #

RUN \
    apt update -yq && \
    apt install -yq \
        wget \
        curl \
        sudo \
        bash \
        nano \
        git \
        net-tools \
        iproute2 \
        openssl \
        yq \
        parallel \
        sqlite3 \
        libsqlite3-dev \
        libpcre2-dev \
        zstd \
        libxml2-utils && \
    curl -fsSL https://deb.nodesource.com/setup_22.x | bash - && \
    apt-get install -yq nodejs && \
    npm i -g npm@latest

# #
#   Copy docker-entrypoint
# #

COPY docker-entrypoint.sh /usr/local/bin/

# #
#   copy s6-overlays root to image root
# #

COPY root/ /

# #
#   set work directory
# #

WORKDIR ${DIR_BUILD}

# #
#   copy backage project to workdir
# #

COPY backage/web/ ./

# #
#   bash helpers
# #

COPY backage/helpers/ /usr/bin/helpers/

# #
#   set work dir to built app
# #

WORKDIR ${DIR_APP}

# #
#   Ports and volumes
# #

EXPOSE ${WEB_PORT}/tcp

# #
#   In case user sets up the cron for a longer duration, do a first run
#   and then keep the container running. Hacky, but whatever.
# #

ENTRYPOINT ["/init"]
