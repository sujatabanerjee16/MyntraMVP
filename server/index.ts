import { createServer } from "./app";

const port = Number(process.env.PORT ?? 8787);
const app = createServer();

app.listen(port, "0.0.0.0", () => {
  console.log(`Shopper API listening on ${port}`);
});
