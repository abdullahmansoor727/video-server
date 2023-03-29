const express = require("express");
const fs = require("fs");
const app = express();
const path = require("path");
const { spawn } = require("child_process");

// Define the directory where the video files are stored
const videoDir = "D:/04 Movies & Series";
const videoFileTypes = [
	".3g2",
	".3gp",
	".avi",
	".flv",
	".h264",
	".m4v",
	".mkv",
	".mov",
	".mp4",
	".mpg",
	".mpeg",
	".rm",
	".swf",
	".vob",
	".wmv",
];

const style = `
  body {
    margin: 1rem 0;
  }

  .container {
    max-width: 1200px;
    margin: 0 auto;
    display: flex;
    flex-direction: column;
    gap: 1rem;
    align-items: flex-start;
    padding: 0;
  }

  a {
    color: #093E77;
    text-decoration: none;
    font-weight: 500;
  }

  h4 {
    margin: 0;
  }

  #my-video {
    width: 100%;
    height: 675px;
  }
  
  @media (max-width: 600px) {
    body a {
      font-size: 12px;
    } 
  }
  
  @media (max-width: 1200px) {
    body {
      padding: 1rem;
    }

    #my-video {
      width: 100%;
      height: calc( (100vw - 2rem) * 9/16 );
    }
  }
  
`;

app.get("/videos", (req, res) => {
	const filename = req.query.filename;
	const dir = req.query.dir;

	if (!filename) {
		let dirContents;
		let prev;
		if (dir) {
			let filepath = `${videoDir}/${dir}`;
			prev = dir.split("/");
			if (prev.length > 1)
				prev = "/videos?dir=" + prev.slice(0, prev.length - 1).join("/");
			else prev = `/videos`;
			filepath = filepath.replace(/\//g, path.sep);
			dirContents = fs.readdirSync(filepath, { withFileTypes: true });
		} else {
			dirContents = fs.readdirSync(videoDir, { withFileTypes: true });
			prev = `/videos`;
		}

		let files = dirContents.filter(
			(file) =>
				!file.isDirectory() && videoFileTypes.includes(path.extname(file.name))
		);

		let folders = dirContents.filter((dir) => dir.isDirectory());

		var html = `
      <!DOCTYPE html>
      <html lang="en">
      <head>
        <meta charset="UTF-8">
        <meta http-equiv="X-UA-Compatible" content="IE=edge">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Movies & TV Series | ${filename ?? "Home"}</title>
        <link href="https://cdn.jsdelivr.net/npm/bootstrap@5.0.2/dist/css/bootstrap.min.css" rel="stylesheet" integrity="sha384-EVSTQN3/azprG1Anm3QDgpJLIm9Nao0Yz1ztcQTwFspd3yD65VohhpuuCOmLASjC" crossorigin="anonymous">
        <script src="https://cdn.jsdelivr.net/npm/bootstrap@5.0.2/dist/js/bootstrap.bundle.min.js" integrity="sha384-MrcW6ZMFYlzcLA8Nl+NtUVF0sA7MsXsP1UyJoMp4YLEuNSfAP+JcXn/tWtIaxVXM" crossorigin="anonymous"></script>
      </head>
      <style>${style}</style>
        
      <body>
        <div class="container">
          ${dir ? `<a class="btn border" href="${prev}">Back</a>` : ""}
          <h4>Movies & TV Series | ${(filename || dir) ?? "Home"}</h4>
          <div class="file-list">
            ${folders
							.map((file) => {
								let href = dir
									? `/videos?dir=${dir}/${file.name}`
									: `/videos?dir=${file.name}`;
								return `<a href="${href}">📁 ${file.name}<br/></a>`;
							})
							.toString()
							.replaceAll(",", " ")}
          </div>
          <div class="file-list">
            ${files
							.map((file) => {
								let href = dir
									? `/videos/watch?filename=${dir}/${file.name}`
									: `/videos/watch?filename=${file.name}`;
								return `<a href="${href}">▶️ ${path.basename(
									file.name,
									path.extname(file.name)
								)}<br/></a>`;
							})
							.toString()
							.replaceAll(",", " ")}
          </div>
        </div>
      </body>`;
		res.send(html);
		return;
	}

	let filepath = `${videoDir}/${filename}`;
	filepath = filepath.replace(/\//g, path.sep);
	console.log(filepath);
	// Replace any forward slashes with the correct file system path separator

	// Check if the file exists
	if (fs.existsSync(filepath)) {
		const stat = fs.statSync(filepath);
		const fileSize = stat.size;
		const range = req.headers.range;

		// Check if the request includes the Range header
		if (range) {
			const parts = range.replace(/bytes=/, "").split("-");
			const start = parseInt(parts[0], 10);
			const end = parts[1] ? parseInt(parts[1], 10) : fileSize - 1;
			const chunkSize = end - start + 1;
			const file = fs.createReadStream(filepath, { start, end });
			const head = {
				"Content-Type": "video/mp4",
				"Content-Length": chunkSize,
				"Content-Range": `bytes ${start}-${end}/${fileSize}`,
				"Accept-Ranges": "bytes",
			};
			res.writeHead(206, head);
			file.pipe(res);
		} else {
			const head = {
				"Content-Type": `video/mp4`,
				"Content-Length": fileSize,
				"Accept-Ranges": "bytes",
			};
			res.writeHead(200, head);
			fs.createReadStream(filepath).pipe(res);
		}
	} else {
		res.writeHead(404);
		res.end("File not found");
	}
});

app.get("/videos/watch", async (req, res) => {
	const filename = req.query.filename;
	let prev;
	prev = filename.split("/");
	if (prev.length > 1)
		prev = "/videos?dir=" + prev.slice(0, prev.length - 1).join("/");
	else prev = `/videos`;
	var html = `
	    <!DOCTYPE html>
	    <html lang="en">
	    <head>
	      <meta charset="UTF-8">
	      <meta http-equiv="X-UA-Compatible" content="IE=edge">
	      <meta name="viewport" content="width=device-width, initial-scale=1.0">
	      <title>Movies & TV Series | ${filename}</title>
	      <link href="https://vjs.zencdn.net/8.0.4/video-js.css" rel="stylesheet" />
	      <link href="https://unpkg.com/@videojs/themes@1/dist/fantasy/index.css" rel="stylesheet">
        <link href="https://cdn.jsdelivr.net/npm/bootstrap@5.0.2/dist/css/bootstrap.min.css" rel="stylesheet" integrity="sha384-EVSTQN3/azprG1Anm3QDgpJLIm9Nao0Yz1ztcQTwFspd3yD65VohhpuuCOmLASjC" crossorigin="anonymous">
        <script src="https://cdn.jsdelivr.net/npm/bootstrap@5.0.2/dist/js/bootstrap.bundle.min.js" integrity="sha384-MrcW6ZMFYlzcLA8Nl+NtUVF0sA7MsXsP1UyJoMp4YLEuNSfAP+JcXn/tWtIaxVXM" crossorigin="anonymous"></script>
	    </head>

	    <style>${style}</style>
	    <body>
      <div class="container">
        <a class="btn border" href="${prev}">Back</a>
	      <video id="my-video" class="video-js vjs-theme-fantasy" controls preload="auto" data-setup='{sourceHandlers: { xhr: {}}}'>
	        <source
	          src="/videos?filename=${filename}"
	          type="video/mp4" />
	        <track id="my-sub-track" kind="subtitles" src="${path.basename(
						filename,
						path.extname(filename)
					)}.srt" srclang="en" label="English" default showing>
	        <p class="vjs-no-js">
	          To view this video please enable JavaScript, and consider upgrading to a
	          web browser that
	          <a href="https://videojs.com/html5-video-support/" target="_blank">supports HTML5 video</a>
	        </p>
	      </video>
        <a href="/videos?filename=${filename}">⬇️ Download</a>
	      <script src="https://vjs.zencdn.net/8.0.4/video.min.js"></script>
      </div>
	    </body>`;
	res.send(html);
});

// Start the server
app.listen(1997, () => {
	console.log("Server started on port 1997");
});

// const compressedFilePath = filepath.replace(".mp4", "_compressed.mp4");

// // Check if the compressed file already exists, otherwise compress it
// if (fs.existsSync(compressedFilePath)) {
// 	filepath = compressedFilePath;
// } else {
// 	// Use FFmpeg to compress the video file
// 	let args = [
// 		"-i",
// 		filepath,
// 		"-codec:v",
// 		"libx264",
// 		"-preset",
// 		"slow",
// 		"-movflags",
// 		"faststart",
// 	];

// 	if (true) {
// 		args.push("-c:v", "h264_amf"); // Use AMD hardware acceleration
// 	}

// 	args.push(compressedFilePath);

// 	const ffmpeg = spawn("C:/ffmpeg/bin/ffmpeg.exe", args, {
// 		detached: true, // Detach the child process from the parent process
// 	});

// 	ffmpeg.stderr.on("data", (data) => {
// 		console.error(`FFmpeg error: ${data}`);
// 	});

// 	ffmpeg.on("close", (code) => {
// 		if (code === 0) {
// 			filepath = compressedFilePath;
// 			console.log(`FFmpeg compression succeeded for file ${filepath}`);
// 		} else {
// 			console.error(`FFmpeg compression failed for file ${filepath}`);
// 		}
// 	});
// }
