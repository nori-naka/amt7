SpeechRecognition = webkitSpeechRecognition || SpeechRecognition;

recognition = new SpeechRecognition();

recognition.lang = 'ja-JP';
// recognition.interimResults = true;
// recognition.continuous = true;

let finalTranscript = ''; // 確定した(黒の)認識結果

let mic_flag = false;
const toggle_speech2text = function (ev) {

    if (ev.target.classList.contains("mic_btn_blue")) {
        recognition.start();
        ev.target.classList.remove("mic_btn_blue");
        ev.target.classList.add("mic_btn_red");
    } else {
        recognition.stop();
        ev.target.classList.remove("mic_btn_red");
        ev.target.classList.add("mic_btn_blue");
    }
}

var $textarea = null;
var $btn = null;
const speech2text = function (btn, textarea) {
    $btn = btn;
    $btn.addEventListener("click", toggle_speech2text);
    $textarea = textarea;
}

recognition.onresult = (event) => {

    console.log(event);
    let interimTranscript = ''; // 暫定(灰色)の認識結果
    for (let i = event.resultIndex; i < event.results.length; i++) {
        let transcript = event.results[i][0].transcript;
        if (event.results[i].isFinal) {
            finalTranscript += transcript;
        } else {
            interimTranscript = transcript;
        }
    }
    $_textarea.value = finalTranscript + interimTranscript;
}

recognition.onerror = (event) => {
    console.log(event.error);
    console.log(event.message);

    recognition.stop();
    $btn.classList.remove("mic_btn_red");
    $btn.classList.add("mic_btn_blue");
};

