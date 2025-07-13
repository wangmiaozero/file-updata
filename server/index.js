// index.js
const Controller = require("./controller");
const http = require("http");
const server = http.createServer();

const controller = new Controller();

server.on("request", async (req, res) => {
  // 添加请求日志
  console.log(`Request received for ${req.method} ${req.url}`);

  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Headers", "*");

  if (req.method === "OPTIONS") {
    res.statusCode = 200;
    res.end();
    return;
  }

  try {
    if (req.url === "/verify") {
      await controller.handleVerifyUpload(req, res);
      return;
    }

    if (req.url === "/merge") {
      await controller.handleMerge(req, res);
      return;
    }

    if (req.url === "/") {
      await controller.handleFormData(req, res);
      return;
    }

    res.statusCode = 404;
    res.setHeader('Content-Type', 'text/plain');
    res.end("Not Found");
  } catch (error) {
    console.error("Error processing request:", error);
    res.statusCode = 500;
    res.setHeader('Content-Type', 'text/plain');
    res.end("Internal Server Error");
  }
});


server.listen(3000, () => console.log("正在监听 3000 端口"));