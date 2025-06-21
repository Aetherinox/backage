#!/usr/bin/with-contenv bash
# shellcheck shell=bash

# #
#   Bash Logging Module — POSIX Compatible
#   Usage: source logger.sh
# #

# Default log level (can be overridden before sourcing)
: "${LOG_LEVEL:=5}"
: "${LOG_NAMESPACE:=backage}"

# #
#   colors > Reset
# #

c_end=$'\e[0m'

# #
#   colors > Normal (Dark)
# #

c_red=$'\e[0;31m'
c_green=$'\e[0;32m'
c_yellow=$'\e[0;33m'
c_blue=$'\e[0;34m'
c_magenta=$'\e[0;35m'
c_cyan=$'\e[0;36m'
c_gray=$'\e[0;90m'
c_black=$'\e[0;30m'

# #
#   colors > Normal (Light)
# #

c_red_l=$'\e[0;91m'
c_green_l=$'\e[0;92m'
c_yellow_l=$'\e[0;93m'
c_blue_l=$'\e[0;94m'
c_magenta_l=$'\e[0;95m'
c_cyan_l=$'\e[0;96m'
c_gray_l=$'\e[0;37m'
c_white=$'\e[0;97m'

# #
#   colors > Background Colors (Standard)
# #
bg_black=$'\e[0;40m'
bg_red=$'\e[0;41m'
bg_green=$'\e[0;42m'
bg_yellow=$'\e[0;43m'
bg_blue=$'\e[0;44m'
bg_magenta=$'\e[0;45m'
bg_cyan=$'\e[0;46m'
bg_white=$'\e[0;47m'

# #
#   colors > Background Colors (Light)
# #

bg_black_l=$'\e[0;100m'
bg_red_l=$'\e[0;101m'
bg_green_l=$'\e[0;102m'
bg_yellow_l=$'\e[0;103m'
bg_blue_l=$'\e[0;104m'
bg_magenta_l=$'\e[0;105m'
bg_cyan_l=$'\e[0;106m'
bg_white_l=$'\e[0;107m'

# #
#   unicode for emojis
#       https://apps.timwhitlock.info/emoji/tables/unicode
# #

ICON_SYMBOLIC_LINK=$'\xF0\x9F\x94\x97'       # 🔗
ICON_REGULAR_FILE=$'\xF0\x9F\x93\x84'        # 📄
ICON_DIRECTORY=$'\xF0\x9F\x93\x81'           # 📁
ICON_REGULAR_EMPTY_FILE=$'\xe2\xad\x95'      # ⭕
ICON_LOG=$'\xF0\x9F\x93\x9C'                 # 📜
ICON_KEY=$'\xF0\x9F\x94\x92'                 # 🔑
ICON_LOCK=$'\xF0\x9F\x94\x91'                # 🔒
ICON_CRT=$'\xF0\x9F\xAA\xAA'                 # 🪪
ICON_PACKAGE=$'\xF0\x9F\x93\xA6'             # 📦
ICON_TERMINAL=$'\xF0\x9F\x97\x94'            # 🗔

# #
#   Current timestamp
# #

log_now()
{
    printf "%b" "${c_gray}[$(date -u '+%-I:%M:%S %p')]${c_end}"
}

log_verbose()
{
    if [ "$LOG_LEVEL" -ge 6 ]; then
        printf "%b %b %s %b\n" \
            "${c_white}${bg_black} ${LOG_NAMESPACE} ${c_end}" \
            "${c_white}⚙️${c_end}" \
            "$(log_now)" \
            "${c_gray}$*${c_end}"
    fi
}

log_debug()
{
    if [ "$LOG_LEVEL" -ge 7 ]; then
        printf "%b %b %s %b\n" \
            "${c_white}\033[45m ${LOG_NAMESPACE} ${c_end}" \
            "${c_white}⚙️${c_end}" \
            "$(log_now)" \
            "${c_magenta_l}$*${c_end}"
    elif [ "$LOG_LEVEL" -ge 5 ]; then
        printf "%b %b %s %b\n" \
            "${c_white}\033[100m ${LOG_NAMESPACE} ${c_end}" \
            "${c_white}⚙️${c_end}" \
            "$(log_now)" \
            "${c_gray}$*${c_end}"
    fi
}

log_info()
{
    if [ "$LOG_LEVEL" -ge 4 ]; then
        printf "%b %b %s %b\n" \
            "${c_white}\033[104m ${LOG_NAMESPACE} ${c_end}" \
            "${c_white}ℹ️${c_end}" \
            "$(log_now)" \
            "${c_blue_l}$*${c_end}"
    fi
}

log_ok()
{
    if [ "$LOG_LEVEL" -ge 4 ]; then
        printf "%b %b %s %b\n" \
            "${c_white}\033[42m ${LOG_NAMESPACE} ${c_end}" \
            "${c_white}✅${c_end}" \
            "$(log_now)" \
            "${c_green_l}$*${c_end}"
    fi
}

log_notice()
{
    if [ "$LOG_LEVEL" -ge 3 ]; then
        printf "%b %b %s %b\n" \
            "${c_white}\033[43m ${LOG_NAMESPACE} ${c_end}" \
            "${c_white}📌${c_end}" \
            "$(log_now)" \
            "${c_yellow_l}$*${c_end}"
    fi
}

log_warn()
{
    if [ "$LOG_LEVEL" -ge 2 ]; then
        printf "%b %b %s %b\n" \
            "${c_white}\033[43m ${LOG_NAMESPACE} ${c_end}" \
            "${c_white}⚠️${c_end}" \
            "$(log_now)" \
            "${c_yellow_l}$*${c_end}"
    fi
}

log_error()
{
    if [ "$LOG_LEVEL" -ge 1 ]; then
        printf "%b %b %s %b\n" \
            "${c_white}\033[101m ${LOG_NAMESPACE} ${c_end}" \
            "${c_white}❌${c_end}" \
            "$(log_now)" \
            "${c_red_l}$*${c_end}"
    fi
}
