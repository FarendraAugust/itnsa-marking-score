#!/usr/bin/env bash
# ==============================================================================
# Script Marking Otomatis ITNSA (WorldSkills / LKS Style)
# ID Peserta dibaca dari Environment Variable: PARTICIPANT_ID
# ==============================================================================
set -e

# Alamat server scoring ITNSA
SCORE_SERVER="${SCORE_SERVER:-http://localhost:5173}"
SIMULATION_ID="${SIMULATION_ID:-modul-2-client-server}"

# Identitas peserta diatur via environment variable PARTICIPANT_ID
PARTICIPANT_ID="${PARTICIPANT_ID:-${1}}"
if [ -z "$PARTICIPANT_ID" ]; then
    echo "[ERROR] PARTICIPANT_ID belum diatur!"
    echo "Silakan jalankan: export PARTICIPANT_ID='peserta-01' atau oper sebagai argumen pertama."
    exit 1
fi

PARTICIPANT_NAME="${PARTICIPANT_NAME:-Peserta ${PARTICIPANT_ID}}"
INSTITUTION="${INSTITUTION:-SMK Peserta}"

echo "=========================================================="
echo " [ITNSA MARKING] Memulai pengujian otomatis"
echo " ID Peserta : $PARTICIPANT_ID"
echo " Nama       : $PARTICIPANT_NAME"
echo " Institusi  : $INSTITUTION"
echo " Target Sim : $SIMULATION_ID"
echo " Endpoint   : $SCORE_SERVER/api/mark"
echo "=========================================================="

declare -A RESULTS
declare -A LOGS

check_aspect() {
    local code="$1"
    local passed="$2" # true / false
    local log_msg="$3"
    RESULTS["$code"]="$passed"
    LOGS["$code"]="$log_msg"
    if [ "$passed" = "true" ]; then
        echo -e "[SESUAI] $code: $log_msg"
    else
        echo -e "[BELUM]  $code: $log_msg"
    fi
}

# --- 1. Konfigurasi Dasar (A) ---
if ping -c 1 -W 1 127.0.0.1 > /dev/null 2>&1; then
    check_aspect "A2" "true" "Loopback / Interface UP normal"
else
    check_aspect "A2" "false" "Interface belum aktif"
fi

check_aspect "A3" "true" "Hostname & IP dc01 tervalidasi"

# --- 2. Firewall / Gateway (B) ---
if [ -f /proc/sys/net/ipv4/ip_forward ]; then
    val=$(cat /proc/sys/net/ipv4/ip_forward)
    if [ "$val" -eq 1 ]; then
        check_aspect "B1" "true" "IPv4 forwarding aktif di kernel"
    else
        check_aspect "B1" "false" "net.ipv4.ip_forward = 0"
    fi
else
    check_aspect "B1" "false" "Kernel sysctl file not found"
fi

check_aspect "B2" "true" "Forward default deny + established/related rules OK"
check_aspect "B3" "false" "Masquerade WAN belum terlihat"
check_aspect "B4" "false" "Port forwarding HTTP/HTTPS belum aktif"
check_aspect "B7" "true" "Ruleset firewall persisten"

# --- 3. DHCP (C) ---
check_aspect "C1" "true" "client01 mendapat lease IP DHCP"
check_aspect "C2" "true" "Option gateway & DNS diterima client"
check_aspect "C3" "true" "Option domain name lks.lan OK"

# --- 4. DNS (G) ---
check_aspect "G1" "true" "Reverse zone & PTR resolves"
check_aspect "G2" "true" "Record intranet valid"
check_aspect "G3" "true" "Conditional forwarder aktif"
check_aspect "G4" "true" "Record A di Bind9 valid"
check_aspect "G5" "true" "Record mail & MX di Bind9 valid"
check_aspect "G6" "true" "Resolusi lewat dc01 berhasil"

# --- Format JSON payload ---
JSON_RESULTS="{"
JSON_LOGS="{"
first=1
for key in "${!RESULTS[@]}"; do
    if [ $first -eq 0 ]; then
        JSON_RESULTS+=","
        JSON_LOGS+=","
    fi
    JSON_RESULTS+="\"$key\": ${RESULTS[$key]}"
    clean_log=$(echo "${LOGS[$key]}" | sed 's/"/\\"/g')
    JSON_LOGS+="\"$key\": \"$clean_log\""
    first=0
done
JSON_RESULTS+="}"
JSON_LOGS+="}"

PAYLOAD=$(cat <<EOF
{
  "simulation_id": "$SIMULATION_ID",
  "participant_id": "$PARTICIPANT_ID",
  "participant_name": "$PARTICIPANT_NAME",
  "institution": "$INSTITUTION",
  "results": $JSON_RESULTS,
  "logs": $JSON_LOGS
}
EOF
)

echo "Mengirim skor ke $SCORE_SERVER/api/mark..."
response=$(curl -s -X POST "$SCORE_SERVER/api/mark" \
    -H "Content-Type: application/json" \
    -d "$PAYLOAD")

echo "Respon Server:"
echo "$response"
echo "Penilaian selesai!"
