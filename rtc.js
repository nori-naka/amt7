
const $my_video = document.getElementById("my_video");
const $your_video = document.getElementById("your_video");

let peer = null;
let local_stream = null;
let peers = {};

//-------------------------------------------------------------------------------
// let constraints = {
//     video: true,
//     audio: true
// }

//-------------------------------------------------------------------------------
var user_constraints = {
    video: {
        facingMode: "user",
        width: 320,
        // height: 480,
        frameRate: { min: 1, max: 10 },
    },
    audio: true
};

var hide_constraints = {
    video: {
        facingMode: "environment",
        width: 320,
        // height: 480,
        frameRate: { min: 1, max: 10 },
    },
    audio: true
};

let constraints = user_constraints;

const regist = function (id) {
    socketio.emit("regist", id);
}


const my_video_start = function (constraints, callback) {

    navigator.mediaDevices.getUserMedia(constraints)
        .then(function (stream) {
            local_stream = stream;

            $my_video.srcObject = local_stream;
            if (!callback) {
                $my_video.play();
            } else {
                $my_video.play().then(callback());
            }
        })
        .catch(function (err) {
            console.log("An error occurred: " + err);
        });
}

$my_video.addEventListener("click", function (ev) {

    if ($my_video.srcObject) {
        // 自分の見ているvideoを停止させる。
        $my_video.srcObject.getVideoTracks().forEach(function (track) {
            track.stop();
        })
    }

    if (constraints == user_constraints) {
        constraints = hide_constraints;
    } else {
        constraints = user_constraints;
    }
    my_video_start(constraints, replace_video_to_all);
})


const createPeerConnection = function () {
    peer = new RTCPeerConnection({
        //sdpSemantics: "unified-plan",
        sdpSemantics: "plan-b",
        iceServers: [
            { urls: 'stun:stun01.sipphone.com' },
            { urls: 'stun:stun.ekiga.net' },
            { urls: 'stun:stun.ideasip.com' },
            { urls: 'stun:stun.l.google.com:19302' },
            { urls: 'stun:stun1.l.google.com:19302' },
            { urls: 'stun:stun2.l.google.com:19302' },
            { urls: 'stun:stun3.l.google.com:19302' },
            { urls: 'stun:stun4.l.google.com:19302' },
            { urls: 'stun:stunserver.org' },
            { urls: 'stun:stun.softjoys.com' },
            { urls: 'stun:stun.voipbuster.com' },
            { urls: 'stun:stun.voxgratia.org' },
        ]
    });

    peer.onicecandidate = on_icecandidate;
    peer.ontrack = on_track;
    peer.onnegotiationneeded = on_negotiationneeded;
    peer.onremovetrack = on_removetrack;
    peer.onremovestream = on_removestream;
    peer.oniceconnectionstatechange = on_iceconnectionstatechange;
    peer.onicegatheringstatechange = on_icegatheringstatechange;
    peer.onsignalingstatechange = on_signalingstatechange;
    peer.onconnectionstatechange = on_connectionstatechange;

    return peer;
}

const get_peer_id = function (a_peer) {

    let res = null;
    Object.keys(peers).forEach(function (id) {
        if (peers[id] === a_peer) {
            res = id;
            return;
        }
    });
    return res;
}


const on_connectionstatechange = function (ev) {
    LOG(`${myUid}: connection_state = ${peer.connectionState}`)
}

const on_icecandidate = function (ev) {

    const remote_id = get_peer_id(this); // thisは呼び出し元のpeer

    if (!ev.candidate) {
        LOG(`${myUid}: END candidate`);
    } else {
        LOG(`${myUid}: candidate ->${remote_id}`);
        socketio.emit("publish", JSON.stringify({
            type: "candidate",
            dest: remote_id,
            src: myUid,
            candidate: ev.candidate
        }));
    }
};

const on_negotiationneeded = function (ev) {

    const peer = ev.target;
    const remote_id = get_peer_id(peer);

    peer.createOffer()
        .then(function (offer) {
            return peer.setLocalDescription(offer);
        })
        .then(function () {
            LOG(`${myUid}: offer ->${remote_id}`);
            socketio.emit("publish", JSON.stringify({
                type: "offer",
                dest: remote_id,
                src: myUid,
                sdp: peer.localDescription
            }))
        })
}

const on_track = function (ev) {

    let target_id = null;
    Object.keys(peers).forEach(function(id){
        if (peers[id] ==  ev.target){
            target_id = id;
            return;
        }
    });

    if (ev.track.kind == "video"){
        let media_elm = document.getElementById(`video_${target_id}`);
        media_elm.srcObject = ev.streams[0];
        media_elm.classList.remove("no_display");
        media_elm.play();

        ev.streams[0].onremovetrack = function(ev){
            media_elm.classList.add("no_display");
        }

    } else {
        let media_elm = document.getElementById(`audio_${target_id}`);
        media_elm.srcObject = ev.streams[0];
        media_elm.play();    

        const $mic_btn = document.getElementById("call_audio_to_all");
        $mic_btn.classList.add("green_background");
    
        ev.streams[0].onremovetrack = function(ev){
            $mic_btn.classList.remove("green_background");
        }
    }
}

// WHY! onremovetrack is not work!
const on_removetrack = function (ev) {
    // no operation
}

const on_removestream = function (ev) {

    const remote_peer = this;

    // 発火元を調べる
    let target_id = null;
    Object.keys(peers).forEach(function (id) {
        if (peers[id] === remote_peer) {
            target_id = id;
            return;
        }
    });

    LOG(`on removestream : ${target_id} -> ${myUid}`);

}


const on_iceconnectionstatechange = function (ev) {
    let peer = ev.target;

    LOG(`${myUid}: iceconnectionState = ${peer.iceConnectionState}`);

    switch (peer.iceConnectionState) {
        case "closed":
        case "failed":
        case "disconnected":
            closeVideoCall(ev.target);
            break;
    }
}

const on_signalingstatechange = function (ev) {
    let peer = ev.target;

    LOG(`${myUid}: signalingState = ${peer.signalingState}`);

    switch (peer.signalingState) {
        case "closed":
            closeVideoCall(ev.target);
            break;
    }
};

const on_icegatheringstatechange = function (ev) {
    // No Operation
};

const recive_offer = function (data) {

    if (!peers[data.src]) {
        peers[data.src] = createPeerConnection();
    }
    LOG(`${data.src} -> ${myUid}: recive offer`)

    const desc = new RTCSessionDescription(data.sdp);

    peers[data.src].setRemoteDescription(desc).then(function () {
        return peers[data.src].createAnswer();
    })
        .then(function (answer) {
            return peers[data.src].setLocalDescription(answer);
        })
        .then(function () {
            socketio.emit("publish", JSON.stringify({
                type: "answer",
                dest: data.src,
                src: myUid,
                sdp: peers[data.src].localDescription
            }))
        });
}

const recive_answer = function (data) {

    const desc = new RTCSessionDescription(data.sdp);
    LOG(`${data.src} -> ${myUid}: recive answer`)
    peers[data.src].setRemoteDescription(desc)
        .catch(function (e) {
            LOG(`${myUid}: recive answer. but failed`)
        });
}

const recive_icecandidate = function (data) {

    if (!data.candidate) {
        LOG(`${myUid}: END recive candidate`);
    } else {
        let candidate = new RTCIceCandidate(data.candidate);
        peers[data.src].addIceCandidate(candidate)
            .catch(function (e) {
                LOG(`${myUid}: addIceCandidate failed I am sorry`);
            });
    }
}

const recive_type = {
    "offer": recive_offer,
    "answer": recive_answer,
    "candidate": recive_icecandidate,
}

socketio.on("publish", function (msg) {
    const data = JSON.parse(msg);

    if (data.dest == myUid) {
        recive_type[data.type](data);
    }
});


socketio.on("start", function (msg) {
    const data = JSON.parse(msg)

    if (data.src) {
        if (data.type == "start") {
            call_video_to(data.src);
        } else {
            stop_video_to(data.src);
        }
    }

});


const reportError = function (err) {
    console.log(`ERROR : ${err}`);
    LOG(`ERROR : ${err}`);
}

function closeVideoCall(peer) {
    console.trace();

    if (peer) {
        peer.ontrack = null;
        peer.onremovetrack = null;
        peer.onremovestream = null;
        peer.onicecandidate = null;
        peer.oniceconnectionstatechange = null;
        peer.onsignalingstatechange = null;
        peer.onicegatheringstatechange = null;
        peer.onnegotiationneeded = null;

        const remoteVideo = document.getElementById(`video_${get_peer_id(peer)}`);
        if (remoteVideo.srcObject) {
            remoteVideo.srcObject.getTracks().forEach(track => track.stop());
        }

        peer.close();
        peer = null;
        remoteVideo.removeAttribute("src");
        remoteVideo.removeAttribute("srcObject");
    }

}

let video_senders = {};
let audio_sender = null;
const call_video_to = function (remote_id) {

    if (!peers[remote_id]) {
        peers[remote_id] = createPeerConnection();
    }
    local_stream.getVideoTracks().forEach(function (track) {
        LOG(track);
        video_senders[remote_id] = peers[remote_id].addTrack(track, local_stream);
    })
}

const stop_video_to = function (remote_id) {
    peers[remote_id].removeTrack(video_senders[remote_id]);
    delete video_senders[remote_id];
}

const replace_video_to_all = function () {
    local_stream.getVideoTracks().forEach(function (track) {

        Object.keys(video_senders).forEach(function (id) {
            video_senders[id].replaceTrack(track);
        })
    })
}

const call_audio = function (remote_id) {

    if (!peers[remote_id]) {
        peers[remote_id] = createPeerConnection();
    }
    local_stream.getAudioTracks().forEach(function (track) {
        LOG(track);
        audio_sender = peers[remote_id].addTrack(track, local_stream);
    })
}

let cur_audio_senders = {};
const call_audio_to_all = function () {

    last_list.forEach(function (id) {
        if (id != myUid) {
            if (!peers[id]) {
                peers[id] = createPeerConnection();
            }
            local_stream.getAudioTracks().forEach(function (track) {
                LOG(`audio track ADD ${myUid}->${id}`);
                cur_audio_senders[id] = peers[id].addTrack(track, local_stream);
            });
        }
    })
}

const stop_audio_to_all = function () {

    Object.keys(cur_audio_senders).forEach(function (id) {
        LOG(`audio track REMOVE ${myUid}->${id}`);
        peers[id].removeTrack(cur_audio_senders[id]);
        delete cur_audio_senders[id];
        LOG(`cur_audio_senders=${JSON.stringify(cur_audio_senders)}`);
    })
}

const stop_audio_to = function () {
    peers[remote_id].removeTrack(audio_sender);
    audio_sender = null;
}

const $mic_btn = document.getElementById("call_audio_to_all");
$mic_btn.addEventListener("touchstart", function (ev) {
    ev.preventDefault();

    $mic_btn.classList.add("red_background");
    call_audio_to_all();
})
$mic_btn.addEventListener("touchend", function (ev) {
    ev.preventDefault();

    $mic_btn.classList.remove("red_background");
    stop_audio_to_all()
})
$mic_btn.addEventListener("mousedown", function (ev) {
    $mic_btn.classList.add("red_background");
    call_audio_to_all();
})
$mic_btn.addEventListener("mouseup", function (ev) {
    $mic_btn.classList.remove("red_background");
    stop_audio_to_all()
})

regist(myUid);
my_video_start(constraints);
