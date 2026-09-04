import express from "express";

// V0 only. The app/server split, the settings check and the error handler
// all arrive in V1 — see 02-PRODUCT-PLAN.md.
const app = express();
const port = 4000;

app.get("/", (_req, res) => {
  res.json({ ok: true });
});

app.listen(port, () => {
  console.log(`listening on ${port}`);
});
