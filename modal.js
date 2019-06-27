// (function () {
//     const modalArea = document.getElementById('modalArea');
//     const openModal = document.getElementById('openModal');
//     const closeModal = document.getElementById('closeModal');
//     const modalBg = document.getElementById('modalBg');


//     // modalArea.classList.add("is-show");
// }());

const modalArea = document.getElementById('modalArea');

// MODAL CLOSE
// window.addEventListener("click", function () {
//     if (modalArea.classList.contains("is-show")) {
//         modalArea.classList.remove('is-show');
//     }
// })

const show_modal = function (title, msg) {
    document.getElementById("modal_title").innerText = title;
    document.getElementById("modal_contents").innerText = msg;
    modalArea.classList.add("is-show");
}