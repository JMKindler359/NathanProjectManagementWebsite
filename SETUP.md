# Moving to Netlify: setup steps

## 1. Add these files to your repo (keep the folder layout)
- netlify.toml
- package.json
- netlify/functions/tasks.mjs
- netlify/functions/events.mjs
- schema.sql (reference only)

## 2. Delete the Python files from the repo
- Delete App.py and requirements.txt. Netlify publishes the repo root, so
  App.py would otherwise be downloadable by anyone, along with its password.
- Change the old MySQL password everywhere you used it. It is still in your
  git history, so treat it as compromised.

## 3. Create the database
- Netlify dashboard -> your site -> Extensions -> install "Neon" (Netlify DB)
  and follow the prompts. This sets NETLIFY_DATABASE_URL for you.
- Open the SQL console and run schema.sql.

## 4. Deploy
- Push to GitHub. Netlify installs @netlify/neon and deploys the functions.
- Test: https://YOUR-SITE.netlify.app/api/tasks should return [].

## 5. Check your front-end paths
Flask served /events.js, /tasks.js, /images/... and /css/... Your repo has
JavaScript/ and Images/ (capital I). Make sure the <script src> and <img src>
in your HTML match the real folder names exactly, e.g.
  <script src="/JavaScript/tasks.js"></script>
  <img src="/Images/logo.png">
Netlify is case-sensitive.
