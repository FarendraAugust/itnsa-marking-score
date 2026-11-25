# Deployment

Aplikasi ini dibangun sebagai SvelteKit + Node.js dan menggunakan `node:sqlite`, sehingga runtime Docker memakai **Node.js 24**.

## Prasyarat

- Docker Engine 24+
- Docker Compose v2
- Bun 1.4+ (untuk development lokal)
- Node.js 24+ (untuk menjalankan build di luar Docker)

## Build & Jalankan Lokal

```bash
# install dependency
bun install

# build produksi
bun run build

# jalankan
PORT=3000 ORIGIN=http://localhost:3000 node build
```

Atau dengan Docker Compose:

```bash
cp .env.example .env
docker compose up -d --build
```

Akses `http://localhost:3000`. Saat database masih kosong, aplikasi otomatis mengarahkan ke `/setup` untuk membuat akun administrator pertama.

## Image Docker

Image dibangun dari `Dockerfile` multi-stage:

- **Builder**: `oven/bun:1.4-alpine` untuk install dependency dan build.
- **Runtime**: `node:24-alpine`, hanya berisi hasil `build/`.
- Database **tidak** disalin ke image. Folder `/app/data` di-mount sebagai volume.

Build manual:

```bash
docker build -t itnsa-marking-score:local .
docker run -d \
  --name itnsa-marking-score \
  -p 3000:3000 \
  -e ORIGIN=http://localhost:3000 \
  -v itnsa-marking-score-data:/app/data \
  itnsa-marking-score:local
```

## Deploy ke VPS

### Instalasi aktif

| Item | Nilai |
|---|---|
| Host | `103.178.174.91` (SSH port 22, user `root`) |
| Folder deploy | `/opt/itnsa-marking-score` |
| URL | `http://103.178.174.91:3020` |
| Volume database | `itnsa-marking-score-data` |
| Port host | `3020` (container `3000`) |

Server ini sudah menjalankan container `itnsa-marking-score`. Auto-deploy dari GitHub Actions aktif.

Catatan: Docker di server ini menyimpan kredensial `ghcr.io` lama yang tidak valid, sehingga pull harus memakai config Docker terisolasi. Workflow deploy sudah menangani ini.

### 1. Siapkan VPS

Install Docker dan Docker Compose di VPS, lalu buat folder deploy:

```bash
mkdir -p /opt/itnsa-marking-score
cd /opt/itnsa-marking-score
```

Salin `docker-compose.yml` dan `.env.example` ke folder tersebut:

```bash
cp .env.example .env
```

Sesuaikan `.env`:

```env
APP_PORT=3020
ORIGIN=http://<IP_PUBLIK_VPS>:3020
BODY_SIZE_LIMIT=2M
```

### 2. Login GHCR di VPS

Image publik: `ghcr.io/farendraaugust/itnsa-marking-score:latest` dapat di-pull tanpa login.

Jika package diubah menjadi private, login dulu di VPS:

```bash
echo "<PAT_WITH_read:packages>" | docker login ghcr.io -u <github-username> --password-stdin
```

Alternatif: ubah visibility package image menjadi **Public** di GitHub Packages, lalu login tidak diperlukan.

### 3. Jalankan

```bash
docker compose pull
docker compose up -d
```

Cek status:

```bash
docker compose ps
docker compose logs -f app
```

## CI/CD GitHub Actions

Workflow: `.github/workflows/ci-cd.yml`

### CI

Berjalan pada setiap pull request dan push ke `main`:

- `bun install --frozen-lockfile`
- `bun run check`
- `bun run build`

### Build & Push Image

Berjalan pada push ke `main`:

- Build image Docker
- Push ke GHCR:
  - `ghcr.io/<owner>/itnsa-marking-score:latest`
  - `ghcr.io/<owner>/itnsa-marking-score:<commit-sha>`

### Deploy Otomatis

Job deploy hanya berjalan jika repository variable `DEPLOY_ENABLED` bernilai `true`.

Secrets yang diperlukan:

| Secret | Keterangan |
|---|---|
| `DEPLOY_HOST` | IP atau domain VPS |
| `DEPLOY_USER` | User SSH |
| `DEPLOY_SSH_KEY` | Private key SSH |
| `DEPLOY_PATH` | Folder berisi `docker-compose.yml`, mis. `/opt/itnsa-marking-score` |
| `GHCR_TOKEN` | PAT dengan `read:packages` (opsional jika image public) |

Repository variable:

| Variable | Nilai |
|---|---|
| `DEPLOY_ENABLED` | `true` untuk mengaktifkan deploy otomatis |

## Database

Database berada di volume Docker `itnsa-marking-score-data`, file `itnsa.sqlite` di `/app/data`.

### Backup

```bash
docker run --rm \
  -v itnsa-marking-score-data:/data \
  -v "$PWD":/backup \
  alpine \
  tar czf /backup/itnsa-backup-$(date +%Y%m%d-%H%M%S).tar.gz -C /data .
```

### Restore

```bash
docker compose down
docker run --rm \
  -v itnsa-marking-score-data:/data \
  -v "$PWD":/backup \
  alpine \
  sh -c "rm -rf /data/* && tar xzf /backup/itnsa-backup-YYYYMMDD-HHMMSS.tar.gz -C /data"
docker compose up -d
```

### Reset Database (Fresh)

```bash
docker compose down
docker volume rm itnsa-marking-score-data
docker compose up -d
```

Setelah reset, buka aplikasi dan selesaikan `/setup` untuk membuat admin baru.

## Update Aplikasi

Push ke `main`. GitHub Actions akan membangun image baru. Jika deploy otomatis aktif, VPS akan menarik image terbaru. Manual:

```bash
cd /opt/itnsa-marking-score
docker compose pull
docker compose up -d
```
