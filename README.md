# Prostate Biopsy Mapper

A digital framework for urologic oncologists to spatially map prostate needle biopsy specimens, integrate MRI-targeted data, assess NCCN risk stratification, plan focal therapy zones, and track patients longitudinally.

## Features

- **12-zone systematic biopsy mapping** with interactive prostate schematic
- **MRI-targeted biopsy overlay** with draggable PI-RADS lesion markers
- **NCCN risk stratification** (Very Low → Very High) with auto-calculation
- **PSA density** auto-computed from PSA and prostate volume
- **PSA kinetics** plotting with velocity and doubling time
- **Focal therapy zone planning** with coverage verification
- **Treatment recording** with post-treatment surveillance mapping
- **Genomic classifier integration** (Decipher, Oncotype DX, Prolaris)
- **Multi-patient registry** with session management
- **JSON export/import** for data portability
- **MRI image attachment** per session
- **Printable PDF report** with full risk assessment

## Deploy to Vercel (5 minutes)

### Step 1: Push to GitHub

```bash
cd prostate-biopsy-mapper
git init
git add .
git commit -m "Initial commit"
```

Create a new repo on github.com, then:

```bash
git remote add origin https://github.com/YOUR_USERNAME/prostate-biopsy-mapper.git
git branch -M main
git push -u origin main
```

### Step 2: Deploy on Vercel

1. Go to [vercel.com](https://vercel.com) and sign in with GitHub
2. Click "Add New Project"
3. Import your `prostate-biopsy-mapper` repository
4. Vercel auto-detects Vite — just click "Deploy"
5. Your app is live at `prostate-biopsy-mapper.vercel.app`

That's it. Every push to `main` auto-deploys.

### Alternative: Netlify

1. Go to [netlify.com](https://netlify.com) and sign in with GitHub
2. Click "Add new site" → "Import an existing project"
3. Select your repo
4. Build command: `npm run build`
5. Publish directory: `dist`
6. Click "Deploy"

## Local Development

```bash
npm install
npm run dev
```

Opens at `http://localhost:5173`

## Build for Production

```bash
npm run build
```

Output in `dist/` folder.

## Data Privacy

All patient data stays in the browser. Nothing is sent to any server. JSON export files are saved locally. For clinical use, ensure your deployment meets your institution's data governance requirements.

## License

For research and clinical use. Not FDA-cleared.
