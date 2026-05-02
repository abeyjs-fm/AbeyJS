Blank AbeyJS starter (Vite + OM shell).

1. npm install
2. npm run dev
3. Routes: src/routes.ts · Home: src/views/home/ (app.home.view.html / .ts / .css) · Runtime: src/omegaSetup.ts · Environments: src/environment.ts · Static assets: public/ (logo.png, icon.png)
4. Global styles: abey.json → styles (imported via import "/abey-styles.js" in src/main.ts)
5. After abeyjs connect, run abeyjs generate views (default --scaffold minimal). Extra layers: --scaffold full.
