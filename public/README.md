# Drop your butterfly here

Save your butterfly image (e.g. the Blue Morpho) as **`butterfly.png`** in this folder:

```
poster-studio/public/butterfly.png
```

Reload the app — every template's ASCII layer will use it automatically
(it's served same-origin, so the ASCII engine can sample it; remote URLs can't
be sampled because browsers block cross-origin pixel reads).

Until a file is here, the ASCII falls back to a drawn butterfly.

A `.jpg` works too — if you use `butterfly.jpg`, change `DEFAULT_ASCII_SRC` in
`src/poster/model.js` (and the two `src: "/butterfly.png"` lines in
`src/poster/templates.js`) to `/butterfly.jpg`.
