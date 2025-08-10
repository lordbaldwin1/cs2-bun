import express from "express";
import { config } from "./config";


const app = express();
app.use(express.json());

app.listen(config.api.port, () => {
  console.log(`Server is running at http://localhost: ${config.api.port}`);
});