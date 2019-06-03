const options = {
    //videoBitsPerSecond: 512000, // 512kbps
    mimeType: 'video/webm; codecs=vp9'
};


// const upload = function (json_data) {
//     const url = "/movie/";
//     fetch(url, {
//         method: "POST",
//         headers: {
//             "Content-Type": "application/json; charset=utf-8",
//         },
//         body: JSON.stringify(json_data), // 本文のデータ型は "Content-Type" ヘッダーと一致する必要があります
//     }).then(function (response) {
//         return response.json();
//     }).then(function (json) {
//         console.log(JSON.stringify(json));
//     });
// }

const upload = function (json_data) {
    socketio.emit("file", JSON.stringify(json_data));
}


const Record = function (stream, id, $start_btn, $playback_video, $playback_btn) {
    const self = this;

    this.$start_btn = $start_btn;
    this.$playback_video = $playback_video;
    this.$playback_btn = $playback_btn;

    this.blobUrl = null;

    this.recorder = new MediaRecorder(stream);
    this.recorder.ondataavailable = function (ev) {
        try {
            var blob = new Blob([ev.data], { type: "video/webm" });
            var reader = new FileReader();
            reader.onload = function () {

                var b64 = reader.result;
                console.log(b64);
                upload({
                    user_name: users[id].name,
                    name: `${users[id].name}_${Date.now()}.webm`,
                    lat: users[id].lat,
                    lng: users[id].lng,
                    date: new Date().toLocaleString(),
                    blob: b64
                });

            }
            reader.readAsDataURL(blob);
            this.blobUrl = null;

        } catch (err) {
            LOG(`Record ERROR = ${err}`);
            this.recorder.stop();
            this.$start_btn.innerText = "REC";
        }
    }

    const handler_start = function (ev) {
        ev.preventDefault();

        if (self.$start_btn.innerText == "REC") {
            self.recorder.start();
            self.$start_btn.innerText = "STOP";
        } else {
            self.recorder.stop();
            self.$start_btn.innerText = "REC";
        }
    };
    this.$start_btn.onclick = handler_start;
}

Record.prototype.remove = function () {
    this.$start_btn.removeEventListener("click", this.handler_start);
    // this.recorder.stop();
    this.$start_btn.innerText = "REC";
}

Record.prototype.play = function () {

    // 既に使用済みであれば、一旦開放
    if (this.$playback_video.src) {
        window.URL.revokeObjectURL(this.$playback_video.src);
        this.$playback_video.src = null;
    }

    this.$playback_video.src = this.blobUrl;
    this.$playback_video.play();
}