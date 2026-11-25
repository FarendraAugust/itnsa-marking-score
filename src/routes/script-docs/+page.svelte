<script lang="ts">
	import type { PageData } from './$types';
	import Icon from '#lib/components/Icon.svelte';

	let { data }: { data: PageData } = $props();

	let selectedSimId = $state('');
	$effect(() => {
		selectedSimId = data.selectedSimId;
	});

	// Interactive tester fields
	let testParticipantId = $state('peserta-02');
	let testParticipantName = $state('Dewi Lestari');
	let testInstitution = $state('SMK Negeri 2 Bandung');
	let testChecks = $state<Record<string, boolean>>({});
	let testStatusMsg = $state('');
	let testResultData = $state<any>(null);
	let isSubmitting = $state(false);

	let currentSim = $derived(data.simulations.find(s => s.id === selectedSimId) || data.simulations[0]);

	// Initialize checkboxes when simulation items are loaded
	$effect(() => {
		if (data.simulation?.sections) {
			const initial: Record<string, boolean> = {};
			for (const sec of data.simulation.sections) {
				for (const itm of sec.items || []) {
					initial[itm.code] = Math.random() > 0.35;
				}
			}
			testChecks = initial;
		}
	});

	function setAll(val: boolean) {
		const updated: Record<string, boolean> = {};
		if (data.simulation?.sections) {
			for (const sec of data.simulation.sections) {
				for (const itm of sec.items || []) {
					updated[itm.code] = val;
				}
			}
		}
		testChecks = updated;
	}

	function randomize() {
		const updated: Record<string, boolean> = {};
		if (data.simulation?.sections) {
			for (const sec of data.simulation.sections) {
				for (const itm of sec.items || []) {
					updated[itm.code] = Math.random() > 0.4;
				}
			}
		}
		testChecks = updated;
	}

	async function runTestSubmit() {
		isSubmitting = true;
		testStatusMsg = 'Mengirim penilaian ke /api/mark...';
		testResultData = null;

		const payload = {
			simulation_id: selectedSimId,
			participant_id: testParticipantId,
			participant_name: testParticipantName,
			institution: testInstitution,
			results: testChecks,
			logs: {
				A2: testChecks['A2'] ? 'Pemeriksaan IP fw-gw valid 192.168.1.1' : 'Koneksi ke fw-gw timeout (192.168.1.1)',
				B1: testChecks['B1'] ? 'sysctl ip_forward aktif' : 'sysctl ip_forward = 0',
				C1: testChecks['C1'] ? 'DHCP lease diperoleh client01' : 'DHCP discover timeout'
			}
		};

		try {
			const res = await fetch('/api/mark', {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify(payload)
			});
			const json = await res.json();
			if (res.ok) {
				testResultData = json.data;
				testStatusMsg = `Berhasil! Total skor ${json.data.total_score} / ${json.data.max_score} (${json.data.passed_items} aspek sesuai). Sisa waktu: ${json.data.remaining_minutes} menit.`;
			} else {
				testStatusMsg = `Gagal: ${json.error || 'Server error'}`;
			}
		} catch (e: any) {
			testStatusMsg = `Error koneksi: ${e.message}`;
		} finally {
			isSubmitting = false;
		}
	}

	let bashScriptCode = $derived(() => `#!/usr/bin/env bash
# ==============================================================================
# ITNSA AUTOMATED MARKING SCRIPT
# Pengaturan ID Peserta via Environment Variable
# ==============================================================================
set -e

# Alamat server scoring ITNSA
SCORE_SERVER="\${SCORE_SERVER:-http://192.168.1.100:5173}"
SIMULATION_ID="${selectedSimId || 'modul-2-client-server'}"

# 1. PENGATURAN IDENTITAS PESERTA VIA ENVIRONMENT VARIABLE
# Peserta cukup mengekspor PARTICIPANT_ID di bash:
# export PARTICIPANT_ID="peserta-01"
PARTICIPANT_ID="\${PARTICIPANT_ID:?Wajib set env PARTICIPANT_ID, misal: export PARTICIPANT_ID='peserta-01'}"

# Opsi nama dan institusi opsional (otomatis dilengkapi server jika kosong)
PARTICIPANT_NAME="\${PARTICIPANT_NAME:-Peserta \${PARTICIPANT_ID}}"
INSTITUTION="\${INSTITUTION:-SMK Peserta}"

echo "=========================================================="
echo "[ITNSA MARKING] Mulai pengujian untuk ID: $PARTICIPANT_ID"
echo "Target Simulasi : $SIMULATION_ID"
echo "Endpoint        : $SCORE_SERVER/api/mark"
echo "=========================================================="

declare -A RESULTS
declare -A LOGS

record_aspect() {
    local code="$1"
    local status="$2"
    local log_msg="$3"
    RESULTS["$code"]="$status"
    LOGS["$code"]="$log_msg"
    if [ "$status" = "true" ]; then
        echo -e "[SESUAI] $code: $log_msg"
    else
        echo -e "[BELUM]  $code: $log_msg"
    fi
}

# --- Evaluasi Aspek A: Konfigurasi Dasar ---
if ping -c 1 -W 2 192.168.1.1 > /dev/null 2>&1; then
    record_aspect "A2" "true" "Ping ke gateway 192.168.1.1 berhasil"
else
    record_aspect "A2" "false" "Ping ke gateway 192.168.1.1 timeout"
fi

if host dc01 192.168.1.2 > /dev/null 2>&1; then
    record_aspect "A3" "true" "Hostname dc01 teresolusi benar"
else
    record_aspect "A3" "false" "Resolusi hostname dc01 gagal"
fi

# --- Evaluasi Aspek B: Firewall & Gateway ---
if sysctl net.ipv4.ip_forward 2>/dev/null | grep -q "1"; then
    record_aspect "B1" "true" "IPv4 forwarding aktif di kernel"
else
    record_aspect "B1" "false" "net.ipv4.ip_forward bernilai 0"
fi

# --- Kirim Hasil ke Endpoint Server ---
JSON_RESULTS="{"
first=1
for key in "\${!RESULTS[@]}"; do
    if [ $first -eq 0 ]; then JSON_RESULTS+=","; fi
    JSON_RESULTS+="\\"$key\\": \${RESULTS[$key]}"
    first=0
done
JSON_RESULTS+="}"

PAYLOAD=$(cat <<EOF
{
  "simulation_id": "$SIMULATION_ID",
  "participant_id": "$PARTICIPANT_ID",
  "participant_name": "$PARTICIPANT_NAME",
  "institution": "$INSTITUTION",
  "results": $JSON_RESULTS
}
EOF
)

echo "Mengirim hasil ke server..."
curl -s -X POST "$SCORE_SERVER/api/mark" \\
     -H "Content-Type: application/json" \\
     -d "$PAYLOAD"

echo ""
echo "Penilaian selesai tercatat!"
`);

	let pythonScriptCode = $derived(() => `#!/usr/bin/env python3
"""
ITNSA Automated Marking Script (Python 3)
ID Peserta diambil dari environment variable PARTICIPANT_ID.
"""

import os
import json
import socket
import subprocess
import urllib.request

# 1. Ambil ID Peserta dari Environment Variable
PARTICIPANT_ID = os.environ.get("PARTICIPANT_ID")
if not PARTICIPANT_ID:
    raise SystemExit("Error: Silakan atur env: export PARTICIPANT_ID='peserta-01'")

PARTICIPANT_NAME = os.environ.get("PARTICIPANT_NAME", f"Peserta {PARTICIPANT_ID}")
INSTITUTION = os.environ.get("INSTITUTION", "SMK Peserta")
SCORE_SERVER = os.environ.get("SCORE_SERVER", "http://localhost:5173")
SIMULATION_ID = "${selectedSimId || 'modul-2-client-server'}"

def check_ping(host: str) -> bool:
    res = subprocess.run(["ping", "-c", "1", "-W", "2", host], stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL)
    return res.returncode == 0

def check_port(host: str, port: int) -> bool:
    try:
        with socket.create_connection((host, port), timeout=2.0):
            return True
    except OSError:
        return False

def main():
    print(f"[ITNSA] Menjalankan marking untuk Peserta: {PARTICIPANT_ID}")

    results = {}
    logs = {}

    # Pengujian Aspek Otomatis
    results["A2"] = check_ping("192.168.1.1")
    logs["A2"] = "Ping gateway OK" if results["A2"] else "Ping gateway timeout"

    results["G4"] = check_port("192.168.1.2", 53)
    logs["G4"] = "DNS port 53 aktif" if results["G4"] else "DNS unreachable"

    endpoint = f"{SCORE_SERVER.rstrip('/')}/api/mark"
    payload = {
        "simulation_id": SIMULATION_ID,
        "participant_id": PARTICIPANT_ID,
        "participant_name": PARTICIPANT_NAME,
        "institution": INSTITUTION,
        "results": results,
        "logs": logs
    }

    req = urllib.request.Request(
        endpoint,
        data=json.dumps(payload).encode("utf-8"),
        headers={"Content-Type": "application/json"}
    )

    try:
        with urllib.request.urlopen(req, timeout=10) as resp:
            data = json.loads(resp.read().decode("utf-8"))
            print("Hasil penilaian tercatat di server:")
            print(json.dumps(data, indent=2))
    except Exception as e:
        print(f"Gagal mengirim skor: {e}")

if __name__ == "__main__":
    main()
`);
</script>

<div class="space-y-6">
	<!-- Page Header -->
	<div>
		<h1 class="text-2xl font-bold tracking-tight text-slate-900">Script Marking & Dokumentasi API</h1>
		<p class="text-sm text-slate-600 mt-1">
			Peserta mengatur identitas melalui environment variable <code>PARTICIPANT_ID</code>. Timer peserta otomatis dimulai saat tembakan pertama.
		</p>
	</div>

	<!-- Interactive Simulator Card -->
	<div class="bg-white rounded-xl border border-blue-200 p-5 shadow-xs">
		<div class="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-4 border-b border-slate-200 mb-4">
			<div>
				<h2 class="text-base font-bold text-slate-900 flex items-center gap-2">
					<Icon name="terminal" size={18} />
					Uji Coba Pengiriman Nilai Langsung (Interactive Tester)
				</h2>
				<p class="text-xs text-slate-500 mt-0.5">
					Simulasikan tembakan script marking peserta secara real-time langsung dari web ini.
				</p>
			</div>

			<div class="min-w-[260px]">
				<label for="doc-sim-select" class="block text-[11px] font-semibold text-slate-600 mb-1">Target Simulasi:</label>
				<select
					id="doc-sim-select"
					class="w-full px-3 py-1.5 text-xs font-medium border border-slate-300 rounded-lg bg-white text-slate-800 focus:ring-2 focus:ring-blue-500"
					bind:value={selectedSimId}
					onchange={() => (window.location.href = `/script-docs?sim=${selectedSimId}`)}
				>
					{#each data.simulations as sim}
						<option value={sim.id}>{sim.module_label} - {sim.title}</option>
					{/each}
				</select>
			</div>
		</div>

		<!-- Identity Inputs -->
		<div class="grid grid-cols-1 sm:grid-cols-3 gap-3 mb-4">
			<div>
				<label for="tester-pid" class="block text-xs font-semibold text-slate-700 mb-1">
					ID Peserta (PARTICIPANT_ID):
				</label>
				<input
					id="tester-pid"
					type="text"
					class="w-full px-3 py-1.5 border border-slate-300 rounded-lg text-xs font-mono font-bold text-blue-600 focus:ring-2 focus:ring-blue-500 focus:outline-none"
					bind:value={testParticipantId}
				/>
			</div>

			<div>
				<label for="tester-pname" class="block text-xs font-semibold text-slate-700 mb-1">
					Nama Peserta (Opsional):
				</label>
				<input
					id="tester-pname"
					type="text"
					class="w-full px-3 py-1.5 border border-slate-300 rounded-lg text-xs focus:ring-2 focus:ring-blue-500 focus:outline-none"
					bind:value={testParticipantName}
				/>
			</div>

			<div>
				<label for="tester-inst" class="block text-xs font-semibold text-slate-700 mb-1">
					Sekolah / Asal Kontingen:
				</label>
				<input
					id="tester-inst"
					type="text"
					class="w-full px-3 py-1.5 border border-slate-300 rounded-lg text-xs focus:ring-2 focus:ring-blue-500 focus:outline-none"
					bind:value={testInstitution}
				/>
			</div>
		</div>

		<!-- Checklist Grid -->
		<div class="bg-slate-50 border border-slate-200 rounded-lg p-3.5 mb-4">
			<div class="flex items-center justify-between mb-2.5">
				<span class="text-xs font-bold text-slate-700">
					Status Aspek ({Object.keys(testChecks).length} Aspek):
				</span>
				<div class="flex gap-1.5">
					<button
						type="button"
						class="px-2 py-1 bg-white border border-slate-200 hover:bg-slate-100 rounded text-[11px] font-semibold text-slate-700 transition"
						onclick={() => setAll(true)}
					>
						Centang Semua
					</button>
					<button
						type="button"
						class="px-2 py-1 bg-white border border-slate-200 hover:bg-slate-100 rounded text-[11px] font-semibold text-slate-700 transition"
						onclick={() => setAll(false)}
					>
						Kosongkan
					</button>
					<button
						type="button"
						class="px-2 py-1 bg-white border border-slate-200 hover:bg-slate-100 rounded text-[11px] font-semibold text-slate-700 transition"
						onclick={randomize}
					>
						Acak Nilai
					</button>
				</div>
			</div>

			<div class="grid grid-cols-3 sm:grid-cols-6 md:grid-cols-8 lg:grid-cols-10 gap-1.5 max-h-52 overflow-y-auto p-1">
				{#if data.simulation?.sections}
					{#each data.simulation.sections as sec}
						{#each sec.items || [] as itm}
							<label
								class="flex items-center gap-1.5 px-2 py-1 rounded border text-xs cursor-pointer select-none transition"
								class:bg-emerald-50={testChecks[itm.code]}
								class:border-emerald-300={testChecks[itm.code]}
								class:text-emerald-800={testChecks[itm.code]}
								class:bg-white={!testChecks[itm.code]}
								class:border-slate-200={!testChecks[itm.code]}
								class:text-slate-600={!testChecks[itm.code]}
							>
								<input type="checkbox" bind:checked={testChecks[itm.code]} class="rounded text-emerald-600" />
								<span class="font-mono font-bold text-[11px]">{itm.code}</span>
							</label>
						{/each}
					{/each}
				{/if}
			</div>
		</div>

		<!-- Submit Action -->
		<div class="flex flex-wrap items-center gap-3">
			<button
				type="button"
				class="inline-flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg text-xs font-semibold hover:bg-blue-700 disabled:opacity-50 transition"
				disabled={isSubmitting}
				onclick={runTestSubmit}
			>
				<Icon name="play" size={14} />
				<span>{isSubmitting ? 'Mengirim...' : 'Tembak Endpoint (/api/mark)'}</span>
			</button>

			{#if testStatusMsg}
				<div
					class="px-3 py-1.5 rounded-lg text-xs font-medium"
					class:bg-emerald-50={testResultData}
					class:text-emerald-700={testResultData}
					class:border={testResultData}
					class:border-emerald-200={testResultData}
					class:bg-red-50={!testResultData}
					class:text-red-700={!testResultData}
				>
					{testStatusMsg}
				</div>
			{/if}

			{#if testResultData}
				<div class="ml-auto flex items-center gap-2">
					<a
						href={`/scoreboard?sim=${selectedSimId}`}
						class="inline-flex items-center gap-1 px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg text-xs font-semibold transition"
					>
						<Icon name="chart" size={13} />
						Buka Scoreboard
					</a>
					<a
						href={`/sheet?sim=${selectedSimId}&participant=${testParticipantId}`}
						class="inline-flex items-center gap-1 px-3 py-1.5 bg-white border border-slate-300 text-slate-700 rounded-lg text-xs font-semibold hover:bg-slate-50 transition"
					>
						<Icon name="file-text" size={13} />
						Buka Lembar Nilai
					</a>
				</div>
			{/if}
		</div>
	</div>

	<!-- API Specification -->
	<div class="bg-white rounded-xl border border-slate-200 p-5 shadow-xs space-y-4">
		<div>
			<h2 class="text-base font-bold text-slate-900">Spesifikasi Endpoint REST API</h2>
			<p class="text-xs text-slate-600 mt-1">
				Script penilaian di VM peserta atau runner juri cukup menembak endpoint ini melalui HTTP POST JSON.
			</p>
		</div>

		<div class="inline-flex items-center gap-2 bg-slate-100 border border-slate-200 px-3 py-1.5 rounded-lg text-xs font-mono">
			<span class="bg-emerald-600 text-white font-bold px-2 py-0.5 rounded text-[10px]">POST</span>
			<span class="font-bold text-slate-800">/api/mark</span>
		</div>

		<!-- Configuration Guide -->
		<div class="bg-blue-50 border border-blue-200 rounded-lg p-3.5 text-xs text-blue-900 space-y-1.5 leading-relaxed">
			<div class="font-bold flex items-center gap-1.5 text-blue-950">
				<Icon name="info" size={15} />
				Cara Peserta Mengatur Environment Variable di Sistem:
			</div>
			<p>Peserta cukup mengekspor ID unik mereka di terminal sebelum menjalankan script grading:</p>
			<pre class="bg-slate-900 text-sky-400 p-2.5 rounded font-mono text-[11px] my-1">export PARTICIPANT_ID="peserta-01"</pre>
			<p>
				Saat script pertama kali menembak endpoint, sistem akan secara otomatis memulai timer peserta sesuai batas waktu simulasi ({currentSim?.duration_minutes || 120} menit).
			</p>
		</div>

		<div class="space-y-2">
			<h4 class="text-xs font-bold text-slate-700">Contoh Request Payload (JSON):</h4>
			<pre class="bg-slate-900 text-slate-200 p-3.5 rounded-lg font-mono text-xs overflow-x-auto leading-relaxed">{`{
  "simulation_id": "${selectedSimId || 'modul-2-client-server'}",
  "participant_id": "peserta-01",
  "results": {
    "A2": false,
    "A3": true,
    "B1": true,
    "B2": true,
    "C1": true,
    "G1": true
  },
  "logs": {
    "A2": "Ping ke gateway timeout",
    "A3": "dc01 Computer name matches"
  }
}`}</pre>
		</div>
	</div>

	<!-- Script Templates Grid -->
	<div class="grid grid-cols-1 md:grid-cols-2 gap-5">
		<!-- Bash Script -->
		<div class="bg-white rounded-xl border border-slate-200 p-5 shadow-xs flex flex-col justify-between">
			<div>
				<div class="flex items-center justify-between pb-3 border-b border-slate-200 mb-3">
					<div>
						<span class="text-[10px] font-bold px-2 py-0.5 rounded bg-amber-100 text-amber-800 uppercase">Bash</span>
						<h3 class="text-sm font-bold text-slate-900 mt-1">Template Script Shell (marking.sh)</h3>
					</div>
					<button
						type="button"
						class="inline-flex items-center gap-1 px-2.5 py-1 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded text-xs font-semibold transition"
						onclick={() => navigator.clipboard.writeText(bashScriptCode())}
					>
						<Icon name="copy" size={13} />
						Salin
					</button>
				</div>
				<pre class="bg-slate-900 text-slate-200 p-3 rounded-lg font-mono text-[11px] max-h-80 overflow-y-auto leading-relaxed">{bashScriptCode()}</pre>
			</div>
		</div>

		<!-- Python Script -->
		<div class="bg-white rounded-xl border border-slate-200 p-5 shadow-xs flex flex-col justify-between">
			<div>
				<div class="flex items-center justify-between pb-3 border-b border-slate-200 mb-3">
					<div>
						<span class="text-[10px] font-bold px-2 py-0.5 rounded bg-emerald-100 text-emerald-800 uppercase">Python 3</span>
						<h3 class="text-sm font-bold text-slate-900 mt-1">Template Script Python (marking.py)</h3>
					</div>
					<button
						type="button"
						class="inline-flex items-center gap-1 px-2.5 py-1 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded text-xs font-semibold transition"
						onclick={() => navigator.clipboard.writeText(pythonScriptCode())}
					>
						<Icon name="copy" size={13} />
						Salin
					</button>
				</div>
				<pre class="bg-slate-900 text-slate-200 p-3 rounded-lg font-mono text-[11px] max-h-80 overflow-y-auto leading-relaxed">{pythonScriptCode()}</pre>
			</div>
		</div>
	</div>
</div>
