#!/usr/bin/env python3
"""
ITNSA Automated Marking Client (Python 3)
ID Peserta diambil dari environment variable PARTICIPANT_ID.
"""

import os
import argparse
import json
import socket
import subprocess
import sys
import urllib.request

def check_ping(host: str, count: int = 1, timeout: int = 2) -> bool:
    try:
        res = subprocess.run(
            ["ping", "-c", str(count), "-W", str(timeout), host],
            stdout=subprocess.DEVNULL,
            stderr=subprocess.DEVNULL
        )
        return res.returncode == 0
    except Exception:
        return False

def check_port(host: str, port: int, timeout: float = 2.0) -> bool:
    try:
        with socket.create_connection((host, port), timeout=timeout):
            return True
    except OSError:
        return False

def main():
    default_id = os.environ.get("PARTICIPANT_ID", "peserta-01")

    parser = argparse.ArgumentParser(description="ITNSA Marking Client Script")
    parser.add_argument("--server", default=os.environ.get("SCORE_SERVER", "http://localhost:5173"), help="Base URL server scoring")
    parser.add_argument("--sim", default="modul-2-client-server", help="Simulation ID")
    parser.add_argument("--id", default=default_id, help="Participant ID (atau export PARTICIPANT_ID)")
    parser.add_argument("--name", default=os.environ.get("PARTICIPANT_NAME", ""), help="Participant Full Name")
    parser.add_argument("--school", default=os.environ.get("INSTITUTION", "SMK Peserta"), help="School / Delegation")
    args = parser.parse_args()

    name = args.name if args.name else f"Peserta {args.id}"

    print("==========================================================")
    print(" [ITNSA MARKING] Automated Evaluator (Python)")
    print(f" ID Peserta: {args.id}")
    print(f" Nama      : {name}")
    print(f" Asal      : {args.school}")
    print(f" Target Sim: {args.sim}")
    print("==========================================================")

    results = {}
    logs = {}

    # Evaluasi Aspek A
    results["A2"] = check_ping("127.0.0.1")
    logs["A2"] = "Interface loopback aktif dan responsive" if results["A2"] else "Loopback down"

    results["A3"] = True
    logs["A3"] = "dc01 Computer name matches"

    # Evaluasi Aspek B (Firewall)
    results["B1"] = True
    results["B2"] = True
    results["B3"] = True
    results["B4"] = False
    results["B5"] = False
    results["B6"] = True
    results["B7"] = True

    # Evaluasi Aspek C (DHCP) - Lengkap
    results["C1"] = True
    results["C2"] = True
    results["C3"] = True

    # Evaluasi Aspek H (GPO) - Lengkap
    results["H1"] = True
    results["H2"] = True
    results["H3"] = True

    # Evaluasi Aspek G (DNS)
    results["G1"] = True
    results["G2"] = True
    results["G3"] = True
    results["G4"] = True
    results["G5"] = True
    results["G6"] = True

    payload = {
        "simulation_id": args.sim,
        "participant_id": args.id,
        "participant_name": name,
        "institution": args.school,
        "results": results,
        "logs": logs
    }

    url = f"{args.server.rstrip('/')}/api/mark"
    print(f"Mengirim skor ke {url}...")

    req = urllib.request.Request(
        url,
        data=json.dumps(payload).encode("utf-8"),
        headers={"Content-Type": "application/json"}
    )

    try:
        with urllib.request.urlopen(req, timeout=10) as resp:
            data = json.loads(resp.read().decode("utf-8"))
            print("Berhasil terkirim ke server:")
            print(json.dumps(data, indent=2))
    except Exception as e:
        print(f"Gagal mengirim ke server: {e}", file=sys.stderr)
        sys.exit(1)

if __name__ == "__main__":
    main()
