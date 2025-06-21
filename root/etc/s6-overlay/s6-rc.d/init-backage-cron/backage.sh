#!/usr/bin/with-contenv bash
# shellcheck shell=bash

# #
#   defaults
# #

DIR_BUILD=${DIR_BUILD:-/usr/src/web}
DIR_RUN=${DIR_RUN:-/usr/bin/web}
DIR_APP=${DIR_APP:-/app}
TASK_CRON_SYNC=${TASK_CRON_SYNC:-0 */12 * * *}

# #
#   source logger
# #

source "/usr/bin/helpers/logger/logger.sh"

# #
#   cron > start
# #

log_info "cron" \
    "${c_yellow_l}[s6-crons]${c_end}" \
    "${c_blue_l}ℹ️${c_end}" \
    "${c_blue_l}<msg>" "${c_gray}Targeting cron folder${c_end}" \
    "${c_blue_l}<path>" "${c_gray}${DIR_APP}${c_end}"

cd "${DIR_APP}"

# #
#   cron > git prune worktree
# #

log_info "cron" \
    "${c_yellow_l}[s6-crons]${c_end}" \
    "${c_blue_l}ℹ️${c_end}" \
    "${c_blue_l}<msg>" "${c_gray}Pruning worktree for git${c_end}" \
    "${c_blue_l}<path>" "${c_gray}${DIR_APP}${c_end}"

git worktree remove -f index 2>/dev/null

# #
#   cron > run
# #

log_info "cron" \
    "${c_yellow_l}[s6-crons]${c_end}" \
    "${c_blue_l}ℹ️${c_end}" \
    "${c_blue_l}<msg>" "${c_gray}Running cron${c_end}" \
    "${c_blue_l}<path>" "${c_gray}${DIR_APP}/src/test/update.sh${c_end}" \
    "${c_blue_l}<time>" "${c_gray}${TASK_CRON_SYNC}${c_end}"

cd "${DIR_APP}/src" && bash "bkg.sh"
cd "${DIR_APP}" && bash "src/test/update.sh"

# #
#   cron > finish
# #

log_ok "cron" \
    "${c_yellow_l}[s6-crons]${c_end}" \
    "${c_green_l}✅${c_end}" \
    "${c_green_l}<msg>" "${c_gray}Successfully ran cron${c_end}" \
    "${c_green_l}<path>" "${c_gray}${DIR_APP}/src/test/update.sh${c_end}" \
    "${c_green_l}<time>" "${c_gray}${TASK_CRON_SYNC}${c_end}"
