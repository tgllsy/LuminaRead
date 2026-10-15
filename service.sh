#!/usr/bin/env bash
set -euo pipefail

# ============================================================================
# LuminaRead (阅境) 单文件服务管理与启动脚本
# 路径默认取脚本所在目录，可通过环境变量覆盖: APP_DIR / DATA_DIR / RUN_USER / RUN_GROUP / PORT
# 用法: ./service.sh {run|start|stop|restart|status|logs|install|uninstall}
# ============================================================================

APP_NAME="luminaread"
SERVICE_NAME="luminaread.service"
SERVICE_FILE="/etc/systemd/system/${SERVICE_NAME}"

BASE_DIR="${APP_DIR:-$(cd "$(dirname "$0")" && pwd)}"
BIN_PATH="${BASE_DIR}/luminaread"
CONFIG_PATH="${BASE_DIR}/config.toml"
DATA_DIR="${DATA_DIR:-${BASE_DIR}/data}"
DB_PATH="${DATA_DIR}/luminaread.db"
LOG_FILE="${DATA_DIR}/luminaread.log"

RUN_USER="${RUN_USER:-$(id -un)}"
RUN_GROUP="${RUN_GROUP:-$(id -gn)}"
PORT="${PORT:-3456}"

ensure_dirs() {
    mkdir -p "${DATA_DIR}/books" "${DATA_DIR}/covers" "${DATA_DIR}/pdf_cache" "${DATA_DIR}/tts_cache"
    chmod +x "${BIN_PATH}"
}

run_foreground() {
    ensure_dirs
    export TZ="${TZ:-Asia/Shanghai}"
    # 可选：外部知识库联动凭据路径，按需通过环境变量注入
    if [ -n "${LIFEOS_CONFIG_PATH:-}" ]; then
        export LIFEOS_CONFIG_PATH
    fi

    exec "${BIN_PATH}" \
        -c "${CONFIG_PATH}" \
        --data-dir "${DATA_DIR}" \
        --db-path "${DB_PATH}" \
        --port "${PORT}"
}

install_service() {
    ensure_dirs
    echo "正在注册 systemd 系统服务: ${SERVICE_FILE} ..."
    sudo tee "${SERVICE_FILE}" > /dev/null <<EOF
[Unit]
Description=LuminaRead (阅境) Single-Binary Web Reader Service
After=network.target mihomo.service

[Service]
Type=simple
User=${RUN_USER}
Group=${RUN_GROUP}
WorkingDirectory=${BASE_DIR}
ExecStart=/bin/sh -c 'exec "${BIN_PATH}" -c "${CONFIG_PATH}" --data-dir "${DATA_DIR}" --db-path "${DB_PATH}" >> "${LOG_FILE}" 2>&1'
Restart=always
RestartSec=3
LimitNOFILE=65535
Environment=TZ=${TZ:-Asia/Shanghai}

[Install]
WantedBy=multi-user.target
EOF

    sudo systemctl daemon-reload
    sudo systemctl enable "${SERVICE_NAME}"
    sudo systemctl restart "${SERVICE_NAME}"
    echo "✅ 服务已安装并启动，存储路径: ${DATA_DIR}"
}

uninstall_service() {
    echo "正在停止并卸载 ${SERVICE_NAME} ..."
    sudo systemctl stop "${SERVICE_NAME}" 2>/dev/null || true
    sudo systemctl disable "${SERVICE_NAME}" 2>/dev/null || true
    sudo rm -f "${SERVICE_FILE}"
    sudo systemctl daemon-reload
    echo "✅ 服务已卸载"
}

case "${1:-status}" in
    run)
        run_foreground
        ;;
    install)
        install_service
        ;;
    uninstall)
        uninstall_service
        ;;
    start)
        ensure_dirs
        sudo systemctl start "${SERVICE_NAME}"
        sudo systemctl status "${SERVICE_NAME}" --no-pager -n 10
        ;;
    stop)
        sudo systemctl stop "${SERVICE_NAME}"
        echo "✅ ${SERVICE_NAME} 已停止"
        ;;
    restart)
        ensure_dirs
        sudo systemctl restart "${SERVICE_NAME}"
        sudo systemctl status "${SERVICE_NAME}" --no-pager -n 10
        ;;
    status)
        sudo systemctl status "${SERVICE_NAME}" --no-pager -n 15
        ;;
    logs)
        if [ -f "${LOG_FILE}" ]; then
            tail -n "${2:-50}" "${LOG_FILE}"
        else
            sudo journalctl -u "${SERVICE_NAME}" -n "${2:-50}" --no-pager
        fi
        ;;
    *)
        echo "用法: $0 {run|install|uninstall|start|stop|restart|status|logs}"
        exit 1
        ;;
esac
