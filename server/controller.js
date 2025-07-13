// controller.js
const multiparty = require("multiparty");
const path = require("path");
const fse = require("fs-extra");

const extractExt = filename => {
  if (typeof filename !== 'string') {
    throw new Error('Filename must be a string');
  }
  return filename.slice(filename.lastIndexOf("."), filename.length);
};

const UPLOAD_DIR = path.resolve(__dirname, "..", "target");

// 合并切片
// 合并切片
const mergeFileChunk = async (filePath, fileHash) => {
  const chunkDir = `${UPLOAD_DIR}/${fileHash}`;
  try {
    const chunkPaths = await fse.readdir(chunkDir);
    await fse.ensureFile(filePath); // Ensure the file exists

    for (const chunkPath of chunkPaths) {
      const chunkFilePath = path.join(chunkDir, chunkPath);
      const chunkData = await fse.readFile(chunkFilePath);
      await fse.appendFile(filePath, chunkData);
      await fse.unlink(chunkFilePath);
    }

    await fse.rmdir(chunkDir);
  } catch (error) {
    throw error; // Ensure errors are propagated
  }
};



const resolvePost = req => new Promise((resolve, reject) => {
  let chunk = "";
  req.on("data", data => {
    chunk += data;
  });
  req.on("end", () => {
    resolve(JSON.parse(chunk));
  });
  req.on("error", reject);
});

const createUploadedList = async fileHash => {
  const chunkDir = `${UPLOAD_DIR}/${fileHash}`;
  try {
    await fse.ensureDir(chunkDir);
    return await fse.readdir(chunkDir);
  } catch (error) {
    if (error.code === 'ENOENT') {
      return [];
    } else {
      throw error;
    }
  }
};

module.exports = class {
  async handleMerge(req, res) {
    try {
      const data = await resolvePost(req);
      const { fileHash, filename } = data;
      const ext = extractExt(filename);
      const filePath = `${UPLOAD_DIR}/${fileHash}${ext}`;
  
      await mergeFileChunk(filePath, fileHash);
  
      res.statusCode = 200;
      res.setHeader('Content-Type', 'application/json');
      res.end(JSON.stringify({ code: 200, message: "file merged success" }));
    } catch (error) {
      console.error("Error handling merge:", error);
      res.statusCode = 500;
      res.setHeader('Content-Type', 'text/plain');
      res.end("merge file failed");
    }
  }
  

  async handleFormData(req, res) {
    try {
      const contentType = req.headers['content-type'];
      if (!contentType || !contentType.startsWith('multipart/form-data')) {
        res.statusCode = 400; 
        res.end('Missing or invalid Content-Type header');
        return;
      }
  
      // Check if the Content-Type header contains a boundary
      if (!contentType.includes('boundary=')) {
        res.statusCode = 400;
        res.end('Content-Type boundary parameter is missing');
        return;
      }
  
      const multipart = new multiparty.Form();
      const [fields, files] = await new Promise((resolve, reject) => {
        multipart.parse(req, (err, fields, files) => {
          console.log('fields is:',fields);
          console.log('files is:',files);
          if (err) reject(err);
          else resolve([fields, files]);
        });
      });
  
      // Rest of your logic...
    } catch (error) {
      console.error(error);
      res.statusCode = 500;
      res.end('process file chunk failed');
    }
  }
  

  async handleVerifyUpload(req, res) {
    try {
      const data = await resolvePost(req);
      const { fileHash, filename } = data;
      if (!filename || typeof filename !== 'string') {
        res.statusCode = 400;
        res.end("Invalid filename");
        return;
      }
      const ext = extractExt(filename);
      const filePath = `${UPLOAD_DIR}/${fileHash}${ext}`;
      if (await fse.pathExists(filePath)) {
        res.statusCode = 200;
        res.end(JSON.stringify({ shouldUpload: false }));
      } else {
        const uploadedList = await createUploadedList(fileHash);
        res.statusCode = 200;
        res.end(JSON.stringify({
          shouldUpload: true,
          uploadedList: uploadedList
        }));
      }
    } catch (error) {
      console.error(error);
      res.statusCode = 500;
      res.end("verify upload failed");
    }
  }
};