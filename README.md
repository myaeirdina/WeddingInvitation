# Nadirah & Ibrahim — Wedding Invitation

A single-page digital wedding invitation. Plain HTML, CSS, and JavaScript — no
build step, no framework, no backend.

**Saturday, 5 December 2026 · 7:00 PM · Nakhoda Three Empire Wedding & Event Hall, Ampang, Kuala Lumpur**

## Files

```
index.html      markup
styles.css      all styling
script.js       language toggle (EN/BM), countdown, schedule, RSVP form, scroll reveal
assets/
  hydrangea-top.png       hero flourish
  hydrangea-bottom.png    footer flourish
  cake-detail.png         cameo photo
```

## View it locally

The page loads fonts from Google Fonts and uses `fetch`-free JS, so opening the
file directly works, but a local server avoids browser quirks with `file://`.

**Option A — just open it**

Double-click `index.html`, or:

```
open index.html
```

**Option B — local server (recommended)**

```
# Python 3 (already on macOS)
python3 -m http.server 8000
```

Then visit <http://localhost:8000>.

```
# or, if you have Node
npx serve
```

## Host it on GitHub Pages

1. Create a new repository on GitHub and push this folder:

   ```
   git init
   git add .
   git commit -m "Wedding invitation"
   git branch -M main
   git remote add origin https://github.com/<you>/<repo>.git
   git push -u origin main
   ```

2. On GitHub: **Settings → Pages → Build and deployment**
   - Source: **Deploy from a branch**
   - Branch: **main** / **/ (root)** → Save

3. Your site goes live at `https://<you>.github.io/<repo>/` after a minute or two.

### Custom domain

In **Settings → Pages → Custom domain**, enter your domain (e.g.
`nadirah-ibrahim.com`) and add the DNS records GitHub shows you at your
registrar. A `CNAME` file will be committed automatically. Keep **Enforce
HTTPS** checked.

## Editing the content

| What | Where |
| --- | --- |
| Names, date, venue address, map links | `index.html` |
| All translated text + the schedule | `COPY` object in `script.js` |
| Countdown target date/time | `TARGET` in `script.js` |
| Colours, fonts, spacing | `:root` variables at the top of `styles.css` |

## RSVP form

The form currently has no backend — on submit it logs the reply to the browser
console and shows a thank-you message. To collect real responses, point the
`<form>` at a service like [Formspree](https://formspree.io) or a Google Form,
or replace the `submit` handler in `script.js` with a `fetch()` call.
