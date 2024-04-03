import axios from "axios"

import crypto from "crypto"

export async function getCookie(html) {
    try {
        console.log(html)
        if (html.includes("src=\"/aes.js\"") || html.includes("src=\"/aes.min.js\"")) {
            const beginOffsetA = "var a=toNumbers(\"";
            const beginOffsetB = "\"),b=toNumbers(\"";
            const beginOffsetC = "\"),c=toNumbers(\"";
            const endOffsetC = "\");document.cookie=";
            
            const a = extractValue(html, beginOffsetA, beginOffsetB);
            const b = extractValue(html, beginOffsetB, beginOffsetC);
            const c = extractValue(html, beginOffsetC, endOffsetC);
            console.log(a,b,c)
            return `__test=${encrypt(hexStringToByteArray(a), hexStringToByteArray(b), hexStringToByteArray(c)).toLowerCase()}; expires=Thu, 31-Dec-37 23:55:55 GMT; path=/`;
        } else {
            theServerDoesNotNeedTestCookie();
        }
    } catch (error) {
        console.error(error);
        throw error;
    }
}

function extractValue(data, start, end) {
    const startIndex = data.indexOf(start) + start.length;
    const endIndex = data.indexOf(end, startIndex);
    return data.substring(startIndex, endIndex);
}

function encrypt(key, initVector, data) {
    try {
        const iv = Buffer.from(initVector);
        const cipher = crypto.createCipheriv('aes-256-cbc', Buffer.from(key), iv);
        let encrypted = cipher.update(data, 'hex', 'hex');
        encrypted += cipher.final('hex');
        return encrypted;
    } catch (ex) {
        return null;
    }
}

function hexStringToByteArray(s) {
    const len = s.length;
    const data = Buffer.alloc(len / 2);
    for (let i = 0; i < len; i += 2) {
        data[i / 2] = parseInt(s.substr(i, 2), 16);
    }
    return data;
}