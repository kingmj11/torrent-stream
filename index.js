const express = require('express');
const multer = require('multer');
const fs = require('fs');
const torrentStream = require('torrent-stream');
const path = require('path');

const app = express();
const PORT = 3000;

// Serve static HTML for file upload UI
app.use(express.static('public'));

// Multer setup - for uploading files
const storage = multer.diskStorage({
    destination: (req, file, cb) => cb(null, 'uploads/'),
    filename: (req, file, cb) => cb(null, file.originalname)
});
const upload = multer({ storage });

let engine; // This will hold the torrent-stream engine

app.post('/upload', upload.single('file'), (req, res) => {
    console.log('Received file:', req.file.originalname);

    const torrentPath = path.join(__dirname, 'uploads', req.file.filename);

    if (engine) engine.destroy(); // Clear any previous engine

    engine = torrentStream(fs.readFileSync(torrentPath));

    engine.on('ready', () => {
        console.log('Torrent ready:', engine.files.map(f => f.name));

        // Find the first video file to stream
        const videoFile = engine.files.find(file => file.name.endsWith('.mp4') || file.name.endsWith('.mkv'));

        if (!videoFile) {
            return res.status(400).send('No video file found in torrent.');
        }

        console.log('Streaming:', videoFile.name);

        res.json({ streamUrl: `/stream?file=${encodeURIComponent(videoFile.name)}` });
    });

    engine.on('error', (err) => {
        console.error('Torrent error:', err);
        res.status(500).send('Error processing torrent.');
    });
});

// Serve the video stream
app.get('/stream', (req, res) => {
    if (!engine) return res.status(400).send('No torrent loaded.');

    const fileName = req.query.file;
    const file = engine.files.find(f => f.name === fileName);

    if (!file) return res.status(404).send('File not found.');

    const range = req.headers.range;
    if (!range) return res.status(416).send('Requires Range header');

    const positions = range.replace(/bytes=/, '').split('-');
    const start = parseInt(positions[0], 10);
    const end = positions[1] ? parseInt(positions[1], 10) : file.length - 1;

    const chunkSize = (end - start) + 1;
    res.writeHead(206, {
        'Content-Range': `bytes ${start}-${end}/${file.length}`,
        'Accept-Ranges': 'bytes',
        'Content-Length': chunkSize,
        'Content-Type': 'video/mp4'
    });

    const stream = file.createReadStream({ start, end });
    stream.pipe(res);
});

app.listen(PORT, () => console.log(`Server is running on http://localhost:${PORT}`));
