# PTJ Stora Wasby QS Hub

Static GitHub Pages portal for Stora Wasby Vardcentral / Praktikertjanst.

The public page is prepared for the supplied NotebookLM notebook ID:

`4b4902ea-8e75-4093-a1fb-c8e92cf8fd1a`

Important:

- The repository is public, so the app does not include private NotebookLM credentials, staff names, patient data, or full internal routines.
- The frontend has no direct link to the notebook.
- The built-in fallback answers are short paraphrases from the limited Notebook material supplied in the conversation.
- A live NotebookLM integration should be done through a private backend that authenticates server-side and returns paraphrased answers to the static frontend.

## Private Notebook bridge

`notebook-bridge.example.js` is a minimal server-side bridge that can run on a trusted machine after `notebooklm login`.

It exposes:

`POST /api/notebook`

with JSON:

```json
{ "question": "Vad gäller vid nyupptäckt diabetes?" }
```

and returns:

```json
{ "answer": "Paraphrased answer...", "source": "NotebookLM" }
```

Do not host this publicly without proper authentication and access control.

When the frontend and bridge share a domain, the page calls `/api/notebook` automatically. If the bridge is on another domain, set this before loading `index.html`:

```html
<script>
  window.PTJ_NOTEBOOK_ENDPOINT = "https://your-private-bridge.example.com/api/notebook";
</script>
```
