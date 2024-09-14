const express = require("express");
const PORT = 5000;
const app = express();

const http = require("http");

const server = http.createServer(app);


app.get("/" , (req, res)  => {
    return res.send("Wellcome to zenWhisper")
})

server.listen(PORT, () => {
  console.log(`Server is runnig at PORT:${PORT}`);
});
