import express from "express";
import fetch from "node-fetch";
import cors from "cors";

const app = express();
app.use(cors());

app.use("/:difficulty", async (req, res) => {
  try {
    const { difficulty } = req.params;
    const response = await fetch(`https://sudoku.com/api/level/${difficulty}`, {
      headers: {
        "x-requested-with": "XMLHttpRequest",
      },
    });
    const data = await response.json();
    res.send(data);
  } catch (e) {
    res.send({});
  }
});
const port = process.env.PORT || 3001;
app.listen(port, () => console.log(`Server running on port ${port}`));
