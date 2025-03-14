function generateKey(password, salt) {
    return crypto.subtle.importKey(
        "raw",
        new TextEncoder().encode(password),
        { name: "PBKDF2" },
        false,
        ["deriveKey"]
    ).then(key => {
        return crypto.subtle.deriveKey(
            {
                name: "PBKDF2",
                salt: salt,
                iterations: 100000,
                hash: "SHA-256"
            },
            key,
            { name: "AES-CBC", length: 256 },
            true,
            ["decrypt"]
        );
    });
}

async function decryptMessage(encryptedMessage, password) {
    const data = Uint8Array.from(atob(encryptedMessage), c => c.charCodeAt(0));

    const salt = data.slice(0, 16);
    const iv = data.slice(16, 32);
    const encryptedData = data.slice(32);

    const key = await generateKey(password, salt);

    const decrypted = await crypto.subtle.decrypt(
        { name: "AES-CBC", iv },
        key,
        encryptedData
    );

    const decryptedMessage = new TextDecoder().decode(decrypted);
    const [timestampStr, timeLimitStr, message] = decryptedMessage.split(":", 3);

    const timestamp = parseInt(timestampStr, 10);
    const timeLimitMinutes = parseInt(timeLimitStr, 10);

    const currentTime = Math.floor(Date.now() / 1000);
    if (currentTime - timestamp > timeLimitMinutes * 60) {
        throw new Error("The message is older than the specified time limit and is no longer valid.");
    }

    return message;
}

document.getElementById("decryptBtn").addEventListener("click", async () => {
    const encryptedMessage = document.getElementById("encryptedMessage").value;
    const password = document.getElementById("password").value;

    if (!encryptedMessage || !password) {
        alert("Please fill in all fields.");
        return;
    }

    try {
        const decryptedMessage = await decryptMessage(encryptedMessage, password);
        document.getElementById("decryptedMessage").value = decryptedMessage;
    } catch (error) {
        console.error("Decryption failed:", error);
        alert("Decryption failed. The message may be invalid or expired.");
    }
});