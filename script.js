// Import Firebase SDKs
import { initializeApp } from "https://www.gstatic.com/firebasejs/11.3.1/firebase-app.js";
import { getDatabase, ref, push, onChildAdded } from "https://www.gstatic.com/firebasejs/11.3.1/firebase-database.js";

// Firebase configuration
const firebaseConfig = {
    apiKey: "AIzaSyDIFKyaO_a5AOJf24951ZjXSaR1CZaG3pc",
    authDomain: "chatt-app-aba0b.firebaseapp.com",
    databaseURL: "https://chatt-app-aba0b-default-rtdb.asia-southeast1.firebasedatabase.app",
    projectId: "chatt-app-aba0b",
    storageBucket: "chatt-app-aba0b.firebasestorage.app",
    messagingSenderId: "379998051916",
    appId: "1:379998051916:web:3cd7c42ea041eff9bc1ee9",
    measurementId: "G-V3D6CNZ2WH"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const db = getDatabase(app);
const messagesRef = ref(db, "messages");

// Event Listeners
document.getElementById("send-btn").addEventListener("click", sendMessage);
document.getElementById("message-input").addEventListener("keypress", function(event) {
    if (event.key === "Enter") sendMessage();
});

// Send message function
function sendMessage() {
    let inputField = document.getElementById("message-input");
    let message = inputField.value.trim();

    if (message === "") return;  // Ignore empty messages

    push(messagesRef, { text: message, timestamp: Date.now() }); // Send to Firebase

    inputField.value = ""; // Clear input
}

// Listen for new messages
onChildAdded(messagesRef, (snapshot) => {
    let messageData = snapshot.val();
    let chatBox = document.getElementById("chat-box");

    let messageBubble = document.createElement("div");
    messageBubble.classList.add("message", "received");
    messageBubble.innerText = messageData.text;

    chatBox.appendChild(messageBubble);
    chatBox.scrollTop = chatBox.scrollHeight; // Auto-scroll
});

// Auto-focus input field on page load
document.addEventListener("DOMContentLoaded", () => {
    document.getElementById("message-input").focus();
});
