const express = require('express');
const multer = require('multer');
const fs = require('fs');
const torrentStream = require('torrent-stream');
const path = require('path');

const app = express();

const UPLOADS_DIR = '/tmp'; // Use /tmp for Koyeb compatibility

// Ensure /tmp directory exists (important for Koyeb)
if (!fs.existsSync(UPLOADS_DIR)) {
    fs.mkdirSync(UPLOADS_DIR, { recursive: true });
}

// Serve static HTML for file upload UI
app.use(express.static('public'));

// Multer setup - for uploading files
const storage = multer.diskStorage({
    destination: (req, file, cb) => cb(null, UPLOADS_DIR),
    filename: (req, file, cb) => cb(null, file.originalname)
});
const upload = multer({ storage });

let engine; // This will hold the torrent-stream engine

app.post('/upload', upload.single('file'), (req, res) => {
    console.log('Received file:', req.file.originalname);

    const torrentPath = path.join(UPLOADS_DIR, req.file.filename);

    if (engine) engine.destroy(); // Clear any previous engine

    engine = torrentStream(fs.readFileSync(torrentPath));

    engine.on('ready', () => {
        console.log('Torrent ready:', engine.files.map(f => f.name));

        const videoFile = engine.files.find(file =>
            file.name.endsWith('.mp4') || file.name.endsWith('.mkv')
        );

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

const PORT = process.env.PORT || 8000;
app.listen(PORT, () => {
    console.log(`Server is running on http://localhost:${PORT}`);
});
