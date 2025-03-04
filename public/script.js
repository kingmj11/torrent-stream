const dropZone = document.getElementById('dropZone');
const fileInput = document.getElementById('fileInput');
const videoContainer = document.getElementById('videoContainer');
const videoPlayer = document.getElementById('videoPlayer');

dropZone.addEventListener('click', () => fileInput.click());

dropZone.addEventListener('dragover', (e) => {
    e.preventDefault();
    dropZone.style.borderColor = 'green';
});

dropZone.addEventListener('dragleave', () => {
    dropZone.style.borderColor = '#aaa';
});

dropZone.addEventListener('drop', (e) => {
    e.preventDefault();
    dropZone.style.borderColor = '#aaa';
    const file = e.dataTransfer.files[0];
    uploadTorrent(file);
});

fileInput.addEventListener('change', (e) => {
    const file = e.target.files[0];
    uploadTorrent(file);
});

function uploadTorrent(file) {
    const formData = new FormData();
    formData.append('torrent', file);

    fetch('http://localhost:3000/upload', {
        method: 'POST',
        body: formData,
    }).then(response => {
        if (response.ok) {
            // Show video player after uploading
            videoContainer.style.display = 'block';
            videoPlayer.load();
            videoPlayer.play();
        } else {
            alert('Failed to upload file');
        }
    }).catch(err => {
        console.error('Upload failed:', err);
    });
}
