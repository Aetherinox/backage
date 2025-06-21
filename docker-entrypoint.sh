#!/bin/sh

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

set -e

# Run command with node if the first argument contains a "-" or is not a system command. The last
# part inside the "{}" is a workaround for the following bug in ash/dash:
# https://bugs.debian.org/cgi-bin/bugreport.cgi?bug=874264
if [ "${1#-}" != "${1}" ] || [ -z "$(command -v "${1}")" ] || { [ -f "${1}" ] && ! [ -x "${1}" ]; }; then
  set -- node "$@"
fi

exec "$@"
