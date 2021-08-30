import BigNumber from "bignumber.js";

const setStorageItem = async (name, value) => {
  const obj = {};
  obj[name] = value;
  await browser.storage.local.set(obj);
  return true;
};

const getStorageItem = async (name) => {
  const result = await browser.storage.local.get(name);
  return result[name];
};

const removeStorageItem = async (name) => {
  await browser.storage.local.remove(name);
  return true;
};

const broadcastMessage = (type, data) => {
  browser.runtime.sendMessage({type, data});
};

const openPageWithPath = (path) => {
  browser.tabs.query({ url: `chrome-extension://${browser.runtime.id}/page.html`}).then((tabs) => {
    if (tabs.length != 0) {
      browser.tabs.update(tabs[0].id, { active: true, highlighted: true, url: `/page.html#${path}` }).then((tab) => {
        browser.tabs.reload(tabs[0].id);
      });
    } else {
      browser.tabs.create({ url: `/page.html#${path}` });
    }
  });
};

const generateRandomBytes = (len) => {
  return window.crypto.getRandomValues(new Uint8Array(len));
};

//@TODO return serializeBufferForStorage(generateRandomBytes(len));
const generateRandomHex = (len) => {
  const result = Array.prototype.map.call(generateRandomBytes(len), function(byte) {
    return ('0' + (byte & 0xFF).toString(16)).slice(-2);
  }).join('');
  return result;
};

//from here https://git.coolaj86.com/coolaj86/unibabel.js/src/branch/master/index.js
class Unibabel {
  static utf8ToBinaryString (str) {
    const escstr = encodeURIComponent(str);
    // replaces any uri escape sequence, such as %0A,
    // with binary escape, such as 0x0A
    const binstr = escstr.replace(/%([0-9A-F]{2})/g, function(match, p1) {
      return String.fromCharCode(parseInt(p1, 16));
    });

    return binstr;
  }

  static binaryStringToBuffer(binstr) {
    let buf;

    if ('undefined' !== typeof Uint8Array) {
      buf = new Uint8Array(binstr.length);
    } else {
      buf = [];
    }

    Array.prototype.forEach.call(binstr, function (ch, i) {
      buf[i] = ch.charCodeAt(0);
    });

    return buf;
  }

  static utf8ToBuffer(str) {
    const binstr = this.utf8ToBinaryString(str);
    const buf = this.binaryStringToBuffer(binstr);
    return buf;
  }

  static utf8ToBase64(str) {
    const binstr = this.utf8ToBinaryString(str);
    return btoa(binstr);
  }

  static binaryStringToUtf8(binstr) {
    const escstr = binstr.replace(/(.)/g, function (m, p) {
      let code = p.charCodeAt(0).toString(16).toUpperCase();
      if (code.length < 2) {
        code = '0' + code;
      }
      return '%' + code;
    });

    return decodeURIComponent(escstr);
  }

  static bufferToUtf8(buf) {
    const binstr = this.bufferToBinaryString(buf);
    return this.binaryStringToUtf8(binstr);
  }

  static base64ToUtf8(b64) {
    const binstr = atob(b64);
    return this.binaryStringToUtf8(binstr);
  }

  static bufferToBinaryString(buf) {
    const binstr = Array.prototype.map.call(buf, function (ch) {
      return String.fromCharCode(ch);
    }).join('');

    return binstr;
  }

  static bufferToBase64(arr) {
    const binstr = this.bufferToBinaryString(arr);
    return btoa(binstr);
  }

  static base64ToBuffer(base64) {
    const binstr = atob(base64);
    const buf = this.binaryStringToBuffer(binstr);
    return buf;
  }
}

// from here https://github.com/danfinlay/browser-passworder
const encrypt = (password, dataObj) => {
  var salt = generateSalt();

  return keyFromPassword(password, salt)
    .then((passwordDerivedKey) => {
      return encryptWithKey(passwordDerivedKey, dataObj);
    })
    .then(function (payload) {
      payload.salt = salt;
      return JSON.stringify(payload);
    });
};

// Takes encrypted text, returns the restored object.
const decrypt = (password, text) => {
  const payload = JSON.parse(text);
  const salt = payload.salt;
  return keyFromPassword(password, salt)
    .then((key) => {
      return decryptWithKey(key, payload);
    });
};

const encryptWithKey = (key, dataObj) => {
  const data = JSON.stringify(dataObj);
  const dataBuffer = Unibabel.utf8ToBuffer(data);
  const vector = window.crypto.getRandomValues(new Uint8Array(16));
  return window.crypto.subtle.encrypt({
    name: 'AES-GCM',
    iv: vector,
  }, key, dataBuffer).then((buf) => {
    const buffer = new Uint8Array(buf);
    const vectorStr = Unibabel.bufferToBase64(vector);
    const vaultStr = Unibabel.bufferToBase64(buffer);
    return {
      data: vaultStr,
      iv: vectorStr,
    };
  });
};

const decryptWithKey = (key, payload) => {
  const encryptedData = Unibabel.base64ToBuffer(payload.data);
  const vector = Unibabel.base64ToBuffer(payload.iv);
  return window.crypto.subtle.decrypt({name: 'AES-GCM', iv: vector}, key, encryptedData)
    .then((result) => {
      const decryptedData = new Uint8Array(result);
      const decryptedStr = Unibabel.bufferToUtf8(decryptedData);
      const decryptedObj = JSON.parse(decryptedStr);
      return decryptedObj;
    })
    .catch((reason) => {
      throw new Error('Incorrect password');
    });
};

const keyFromPassword = (password, salt) => {
  const passBuffer = Unibabel.utf8ToBuffer(password);
  const saltBuffer = Unibabel.base64ToBuffer(salt);

  return window.crypto.subtle.importKey(
    'raw',
    passBuffer,
    { name: 'PBKDF2' },
    false,
    ['deriveBits', 'deriveKey']
  ).then(function (key) {
    return window.crypto.subtle.deriveKey(
      { name: 'PBKDF2',
        salt: saltBuffer,
        iterations: 10000,
        hash: 'SHA-256',
      },
      key,
      { name: 'AES-GCM', length: 256 },
      false,
      ['encrypt', 'decrypt']
    );
  });
};

const serializeBufferFromStorage = (str) => {
  const stripStr = (str.slice(0, 2) === '0x') ? str.slice(2) : str;
  let buf = new Uint8Array(stripStr.length / 2);
  for (let i = 0; i < stripStr.length; i += 2) {
    const seg = stripStr.substr(i, 2);
    buf[i / 2] = parseInt(seg, 16);
  }
  return buf;
};

// Should return a string, ready for storage, in hex format.
const serializeBufferForStorage = (buffer) => {
  let result = '0x';
  const len = buffer.length || buffer.byteLength;
  for (let i = 0; i < len; i++) {
    result += unprefixedHex(buffer[i]);
  }
  return result;
};

const unprefixedHex = (num) => {
  let hex = num.toString(16);
  while (hex.length < 2) {
    hex = '0' + hex;
  }
  return hex;
};

const generateSalt = (byteCount = 32) => {
  const view = new Uint8Array(byteCount);
  window.crypto.getRandomValues(view);
  const b64encoded = btoa(String.fromCharCode.apply(null, view));
  return b64encoded;
};

const shortAddress = (address) => {
  return `${address.substr(0,6)}...${address.substr(-4,4)}`;
};

const copyToClipboard = ( text ) => {
  var dummy = document.createElement("input");
  dummy.setAttribute("id", "copyhelper");
  document.body.appendChild(dummy);
  document.getElementById("copyhelper").value = text;
  dummy.select();
  document.execCommand("copy");
  document.body.removeChild(dummy);
};

const fromNano = (amount, num = 4) => {
  return new BigNumber(amount).div(10**9).toFixed(num);
};

const toNano = (amount) => {
  return new BigNumber(amount).times(10**9).toNumber();
};

const strToHex = (text) => {
  return serializeBufferForStorage(Unibabel.utf8ToBuffer(text)).substr(2);
};

export {
  Unibabel,
  // Simple methods to store in localStorage:
  setStorageItem, getStorageItem, removeStorageItem, broadcastMessage,
  // Simple encryption methods:
  encrypt, decrypt,
  // More advanced encryption methods:
  keyFromPassword, encryptWithKey, decryptWithKey,
  // Buffer <-> Hex string methods
  serializeBufferForStorage, serializeBufferFromStorage,
  strToHex,
  generateRandomHex,
  generateRandomBytes,
  generateSalt,
  shortAddress,
  copyToClipboard,
  openPageWithPath,
  fromNano,
  toNano
};
