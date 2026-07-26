---
name: Agent Flatform API
description: Hướng dẫn gọi trực tiếp API của Agent Flatform của Google (Gemini cho văn bản/ảnh, Imagen cho ảnh, Veo cho video và TTS cho giọng nói) từ bất kỳ môi trường nào (Node.js, PHP, Python, Fetch).
---

# Tài liệu tích hợp Agent Flatform API của Google

Kỹ năng này hướng dẫn Agent cách tích hợp và gọi trực tiếp các API của Agent Flatform từ Google (Gemini cho văn bản, Imagen cho hình ảnh, Veo cho video và TTS cho giọng nói) trên nhiều nền tảng và môi trường khác nhau như Node.js, JS Fetch, PHP và Python.

## Khi nào nên sử dụng kỹ năng này

- Sử dụng khi cần viết hoặc sửa đổi code gọi API Agent Flatform của Google từ Backend (PHP, Node.js, Python) hoặc Frontend (JavaScript / Fetch API).
- Sử dụng khi cần triển khai các tính năng AI cốt lõi: tạo văn bản (chat, stream), tạo hình ảnh (multimodal), tạo video (bất đồng bộ LRO) và tạo giọng nói (Text-to-Speech - TTS).
- Sử dụng khi cần bảo trì, tối ưu hóa các thiết lập payload, cấu hình model và xử lý lỗi của Agent Flatform.

## Tổng quan về API và endpoint

Các request gọi đến Agent Flatform của Google sử dụng cơ chế xác thực bằng API Key và định tuyến qua các endpoint sau:

1. **API tạo văn bản, hình ảnh và giọng nói (Đồng bộ)**:
   `https://aiplatform.googleapis.com/v1/publishers/google/models/{MODEL}:generateContent?key={API_KEY}`
   - *Lưu ý*: Đối với stream văn bản, đổi `:generateContent` thành `:streamGenerateContent?alt=sse&key={API_KEY}`.

2. **API tạo video Veo (Bất đồng bộ - LRO)**:
   - **Khởi tạo tiến trình**:
     `https://us-central1-aiplatform.googleapis.com/v1/projects/{PROJECT_NUMBER}/locations/us-central1/publishers/google/models/{MODEL}:predictLongRunning?key={API_KEY}`
   - **Truy vấn trạng thái tiến trình**:
     `https://us-central1-aiplatform.googleapis.com/v1/projects/{PROJECT_NUMBER}/locations/us-central1/publishers/google/models/{MODEL}:fetchPredictOperation?key={API_KEY}`
   - *Quy định thời lượng (durationSeconds)*:
     - `veo-3.1-lite-generate-001` & `veo-3.0-generate-001`: hỗ trợ `[4, 6, 8]` giây.
     - `veo-2.0-generate-001`: hỗ trợ `[5, 6, 7, 8]` giây.

3. **API tạo & chỉnh sửa video Gemini Omni (Interactions API)**:
   - **Endpoint**:
     `https://aiplatform.googleapis.com/v1beta1/projects/{PROJECT_NUMBER}/locations/global/interactions`
   - Header: `Authorization: Bearer {API_KEY}`
   - Model: `gemini-omni-flash-preview`

- **Models mặc định**:
  - Chat/Text: `gemini-3.6-flash`
  - Image: `gemini-3.1-flash-image`
  - Video: `veo-3.1-lite-generate-001`
  - Video Omni / Edit: `gemini-omni-flash-preview`
  - Voice/TTS: `gemini-3.1-flash-tts-preview`
- **Danh sách 11 Giọng đọc TTS (Voice Names)**:
  - **Nữ**: `Alloy`, `Fable`, `Nova`, `Shimmer`, `Kore`, `Aoede`
  - **Nam**: `Echo`, `Onyx`, `Puck`, `Charon`, `Fenrir`

---

## Hướng dẫn tích hợp bằng JavaScript / Node.js

### 1. Gọi tạo văn bản (Đồng bộ & Stream)
Đoạn code dưới đây sử dụng Fetch API chuẩn để gọi tạo nội dung văn bản (hỗ trợ cả stream):

```javascript
/**
 * Gọi Agent Flatform của Google (Gemini) để sinh văn bản
 * 
 * @param {string} apiKey       - API Key của Agent Flatform.
 * @param {string} prompt       - Nội dung yêu cầu.
 * @param {Object} options      - Các tùy chọn bổ sung (model, systemInstruction, stream).
 * @returns {Promise<string|ReadableStream>} - Trả về text hoặc stream kết quả.
 */
async function callAgentFlatformText(apiKey, prompt, options = {}) {
    const {
        model = 'gemini-3-flash-preview',
        systemInstruction = '',
        stream = false
    } = options;

    const action = stream ? 'streamGenerateContent?alt=sse' : 'generateContent';
    const endpoint = `https://aiplatform.googleapis.com/v1/publishers/google/models/${model}:${action}&key=${apiKey}`;

    const payload = {
        contents: [{ role: 'user', parts: [{ text: prompt }] }],
        generationConfig: {
            temperature: 0.7,
            maxOutputTokens: 4096
        }
    };

    if (systemInstruction) {
        payload.systemInstruction = {
            parts: [{ text: systemInstruction }]
        };
    }

    const response = await fetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
    });

    if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`API Error: ${response.statusText} (${errorText})`);
    }

    if (stream) {
        return response.body; // Trả về stream cho client tự xử lý EventSource / SSE
    }

    const data = await response.json();
    return data.candidates?.[0]?.content?.parts?.[0]?.text || '';
}
```

### 2. Gọi tạo hình ảnh (Multimodal)
Để tạo ảnh, ta sử dụng mô hình hỗ trợ xuất ảnh (như `gemini-3.1-flash-image-preview`) và bắt buộc phải gửi thuộc tính `responseModalities`:

```javascript
/**
 * Gọi Agent Flatform của Google để tạo ảnh (Image Generation)
 * 
 * @param {string} apiKey       - API Key của Agent Flatform.
 * @param {string} prompt       - Prompt mô tả ảnh cần tạo.
 * @param {Object} options      - Các tùy chọn (model, refImageB64, aspectRatio).
 * @returns {Promise<string>}   - Trả về Base64 Data URI của ảnh đã tạo.
 */
async function callAgentFlatformImage(apiKey, prompt, options = {}) {
    const {
        model = 'gemini-3.1-flash-image-preview',
        refImageB64 = null, // Ảnh tham chiếu dạng Base64 Data URI hoặc chuỗi Base64 thô
        aspectRatio = '1:1'
    } = options;

    const endpoint = `https://aiplatform.googleapis.com/v1/publishers/google/models/${model}:generateContent?key=${apiKey}`;
    const parts = [{ text: prompt }];

    // Xử lý ảnh tham chiếu (Image-to-Image) nếu có
    if (refImageB64) {
        let cleanB64 = refImageB64;
        let mimeType = 'image/png';

        if (refImageB64.startsWith('data:')) {
            const matches = refImageB64.match(/^data:([a-zA-Z0-9]+\/[a-zA-Z0-9-.+]+);base64,(.+)$/);
            if (matches) {
                mimeType = matches[1];
                cleanB64 = matches[2];
            }
        }

        parts.push({
            inlineData: { mimeType, data: cleanB64 }
        });
    }

    const payload = {
        contents: [{ role: 'user', parts }],
        generationConfig: {
            imageConfig: { aspectRatio },
            // BẮT BUỘC có responseModalities để sinh ra ảnh (IMAGE) thay vì văn bản
            responseModalities: ['IMAGE', 'TEXT']
        }
    };

    const response = await fetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
    });

    const data = await response.json();
    if (!response.ok) {
        throw new Error(data.error?.message || `API Error (Status: ${response.status})`);
    }

    const imagePart = data.candidates?.[0]?.content?.parts?.find(p => p.inlineData);
    if (!imagePart) {
        throw new Error('AI response did not contain valid image data.');
    }

    return `data:${imagePart.inlineData.mimeType};base64,${imagePart.inlineData.data}`;
}
```

### 3. Gọi tạo video (Bất đồng bộ LRO)
Quá trình tạo video chạy dưới dạng Long Running Operation (LRO). Ta khởi tạo và sau đó thực hiện kiểm tra trạng thái định kỳ (polling) cho đến khi hoàn thành:

```javascript
/**
 * Khởi tạo tiến trình tạo video (LRO)
 * 
 * @returns {Promise<string>} Trả về operationName để dùng khi polling.
 */
async function initiateVideoGen(apiKey, prompt, options = {}) {
    const {
        model = 'veo-3.1-lite-generate-001',
        projectNumber = '640527817992',
        aspectRatio = '16:9',
        durationSeconds = 6
    } = options;

    const endpoint = `https://us-central1-aiplatform.googleapis.com/v1/projects/${projectNumber}/locations/us-central1/publishers/google/models/${model}:predictLongRunning?key=${apiKey}`;

    const payload = {
        instances: [{ prompt }],
        parameters: {
            aspectRatio,
            durationSeconds: parseInt(durationSeconds),
            sampleCount: 1
        }
    };

    const response = await fetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
    });

    const data = await response.json();
    if (!response.ok) {
        throw new Error(data.error?.message || 'Failed to initiate video generation.');
    }
    return data.name; // Đây là operationName (ví dụ: projects/.../operations/...)
}

/**
 * Kiểm tra trạng thái tiến trình tạo video (LRO Polling)
 * 
 * @returns {Promise<Object>} Trả về { done: true, videoUrl } hoặc { done: false }.
 */
async function pollVideoGen(apiKey, operationName, model = 'veo-3.1-lite-generate-001', projectNumber = '640527817992') {
    const endpoint = `https://us-central1-aiplatform.googleapis.com/v1/projects/${projectNumber}/locations/us-central1/publishers/google/models/${model}:fetchPredictOperation?key=${apiKey}`;

    const response = await fetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ operationName })
    });

    const data = await response.json();
    if (!response.ok) {
        throw new Error(data.error?.message || 'Error checking video status.');
    }

    if (data.done) {
        if (data.error) throw new Error(data.error.message || 'Video generation failed.');
        
        const videos = data.response?.videos || data.response?.generatedVideos || [];
        const firstVideo = videos[0];
        const videoData = firstVideo?.bytesBase64Encoded || firstVideo?.video?.bytesBase64Encoded;
        const mimeType = firstVideo?.mimeType || firstVideo?.video?.mimeType || 'video/mp4';

        if (!videoData) throw new Error('Video data is empty.');

        return {
            done: true,
            videoUrl: `data:${mimeType};base64,${videoData}`,
            mimeType
        };
    }

    return { done: false };
}
```

### 4. Gọi tạo giọng nói (Text-to-Speech - TTS)
Đoạn code dưới đây chuyển đổi văn bản thành âm thanh sử dụng cấu hình giọng đọc của Google:

```javascript
/**
 * Gọi Agent Flatform của Google để chuyển đổi văn bản thành giọng nói (TTS)
 * 
 * @param {string} apiKey       - API Key của Agent Flatform.
 * @param {string} prompt       - Đoạn văn bản cần đọc.
 * @param {Object} options      - Các tùy chọn (model, voiceName).
 * @returns {Promise<string>}   - Trả về Base64 Data URI của âm thanh (audio/mp3).
 */
async function callAgentFlatformTTS(apiKey, prompt, options = {}) {
    const {
        model = 'gemini-3.1-flash-tts-preview',
        voiceName = 'Puck' // Các giọng đọc phổ biến: Puck, Charon, Kore, Fenrir, Aoede
    } = options;

    const endpoint = `https://aiplatform.googleapis.com/v1/publishers/google/models/${model}:generateContent?key=${apiKey}`;

    const payload = {
        contents: [{
            role: 'user',
            parts: [{ text: prompt }]
        }],
        generationConfig: {
            responseModalities: ['AUDIO'],
            speechConfig: {
                voiceConfig: {
                    prebuiltVoiceConfig: {
                        voiceName: voiceName
                    }
                }
            }
        }
    };

    const response = await fetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
    });

    const data = await response.json();
    if (!response.ok) {
        throw new Error(data.error?.message || `API Error (Status: ${response.status})`);
    }

    const audioPart = data.candidates?.[0]?.content?.parts?.[0]?.inlineData;
    if (!audioPart || !audioPart.data) {
        throw new Error('AI response did not contain valid audio data.');
    // Lưu ý: Gemini TTS trả về dữ liệu âm thanh PCM 24kHz raw (base64)
    // Để phát được trên trình duyệt hoặc lưu thành file .wav, cần gắn thêm 44-byte WAV Header:
    const pcmBuffer = Buffer.from(audioPart.data, 'base64');
    const wavBuffer = addWavHeader(pcmBuffer, 24000, 1, 16);
    return `data:audio/wav;base64,${wavBuffer.toString('base64')}`;
}

/**
 * Thêm 44-byte RIFF WAV Header cho PCM buffer
 */
function addWavHeader(pcmBuffer, sampleRate = 24000, numChannels = 1, bitsPerSample = 16) {
    const header = Buffer.alloc(44);
    const dataSize = pcmBuffer.length;
    const byteRate = (sampleRate * numChannels * bitsPerSample) / 8;
    const blockAlign = (numChannels * bitsPerSample) / 8;

    header.write('RIFF', 0);
    header.writeUInt32LE(36 + dataSize, 4);
    header.write('WAVE', 8);
    header.write('fmt ', 12);
    header.writeUInt32LE(16, 16);
    header.writeUInt16LE(1, 20);
    header.writeUInt16LE(numChannels, 22);
    header.writeUInt32LE(sampleRate, 24);
    header.writeUInt32LE(byteRate, 28);
    header.writeUInt16LE(blockAlign, 32);
    header.writeUInt16LE(bitsPerSample, 34);
    header.write('data', 36);
    header.writeUInt32LE(dataSize, 40);

    return Buffer.concat([header, pcmBuffer]);
}
```

---

## Hướng dẫn tích hợp bằng PHP

### 1. Gọi API bằng cURL chuẩn
Ví dụ gọi API tạo văn bản đồng bộ bằng cURL thô trong PHP:

```php
<?php
/**
 * Gọi Agent Flatform của Google (Gemini) sinh văn bản bằng cURL chuẩn PHP
 */
function call_agent_flatform_text_curl( $api_key, $prompt, $model = 'gemini-3-flash-preview' ) {
    $endpoint = "https://aiplatform.googleapis.com/v1/publishers/google/models/{$model}:generateContent?key={$api_key}";

    $payload = [
        'contents' => [
            [
                'role'  => 'user',
                'parts' => [[ 'text' => $prompt ]]
            ]
        ]
    ];

    $ch = curl_init( $endpoint );
    curl_setopt( $ch, CURLOPT_RETURNTRANSFER, true );
    curl_setopt( $ch, CURLOPT_POST, true );
    curl_setopt( $ch, CURLOPT_HTTPHEADER, [ 'Content-Type: application/json' ] );
    curl_setopt( $ch, CURLOPT_POSTFIELDS, json_encode( $payload ) );
    curl_setopt( $ch, CURLOPT_TIMEOUT, 60 );

    $response = curl_exec( $ch );
    $http_code = curl_getinfo( $ch, CURLINFO_HTTP_CODE );

    if ( curl_errno( $ch ) ) {
        $error_msg = curl_error( $ch );
        curl_close( $ch );
        return new Exception( "cURL Error: " . $error_msg );
    }
    curl_close( $ch );

    $data = json_decode( $response, true );

    if ( $http_code !== 200 ) {
        $msg = isset( $data['error']['message'] ) ? $data['error']['message'] : 'Unknown API Error';
        return new Exception( "API Error (Status {$http_code}): " . $msg );
    }

    return isset( $data['candidates'][0]['content']['parts'][0]['text'] ) 
        ? $data['candidates'][0]['content']['parts'][0]['text'] 
        : '';
}
```

### 2. Gọi API tạo giọng nói (Text-to-Speech - TTS) bằng cURL chuẩn

```php
/**
 * Gọi Agent Flatform của Google chuyển văn bản thành giọng nói bằng cURL
 *
 * @param string $api_key   API Key của Agent Flatform.
 * @param string $prompt    Văn bản cần đọc.
 * @param string $voice     Tên giọng đọc (mặc định: Puck).
 * @param string $model     Tên model sử dụng.
 * @return string|Exception Trả về dữ liệu base64 kèm tiền tố URI hoặc Exception nếu lỗi.
 */
function call_agent_flatform_tts_curl( $api_key, $prompt, $voice = 'Puck', $model = 'gemini-3.1-flash-tts-preview' ) {
    $endpoint = "https://aiplatform.googleapis.com/v1/publishers/google/models/{$model}:generateContent?key={$api_key}";

    $payload = [
        'contents' => [[
            'role'  => 'user',
            'parts' => [[ 'text' => $prompt ]]
        ]],
        'generationConfig' => [
            'responseModalities' => ['AUDIO'],
            'speechConfig' => [
                'voiceConfig' => [
                    'prebuiltVoiceConfig' => [
                        'voiceName' => $voice
                    ]
                ]
            ]
        ]
    ];

    $ch = curl_init( $endpoint );
    curl_setopt( $ch, CURLOPT_RETURNTRANSFER, true );
    curl_setopt( $ch, CURLOPT_POST, true );
    curl_setopt( $ch, CURLOPT_HTTPHEADER, [ 'Content-Type: application/json' ] );
    curl_setopt( $ch, CURLOPT_POSTFIELDS, json_encode( $payload ) );
    curl_setopt( $ch, CURLOPT_TIMEOUT, 60 );

    $response = curl_exec( $ch );
    $http_code = curl_getinfo( $ch, CURLINFO_HTTP_CODE );

    if ( curl_errno( $ch ) ) {
        $error_msg = curl_error( $ch );
        curl_close( $ch );
        return new Exception( "cURL Error: " . $error_msg );
    }
    curl_close( $ch );

    $data = json_decode( $response, true );

    if ( $http_code !== 200 ) {
        $msg = isset( $data['error']['message'] ) ? $data['error']['message'] : 'Unknown API Error';
        return new Exception( "API Error (Status {$http_code}): " . $msg );
    }

    $audio_part = isset( $data['candidates'][0]['content']['parts'][0]['inlineData'] ) 
        ? $data['candidates'][0]['content']['parts'][0]['inlineData'] 
        : null;

    if ( ! $audio_part || empty( $audio_part['data'] ) ) {
        return new Exception( 'Dữ liệu âm thanh rỗng từ API.' );
    }

    $mime_type = isset( $audio_part['mimeType'] ) ? $audio_part['mimeType'] : 'audio/mp3';
    return "data:{$mime_type};base64," . $audio_part['data'];
}
```

### 3. Sử dụng trong WordPress (wp_remote_post)
Trong WordPress, nên sử dụng lớp HTTP API để thực hiện request:

```php
<?php
/**
 * Gọi Agent Flatform bằng WordPress HTTP API
 */
function call_agent_flatform_text_wp( $prompt ) {
    $api_key = get_option( 'kira_vertex_api_key' ); // Lấy option đã cấu hình
    $model   = get_option( 'kira_chatbox_model', 'gemini-3-flash-preview' );
    $endpoint = "https://aiplatform.googleapis.com/v1/publishers/google/models/{$model}:generateContent?key={$api_key}";

    $payload = [
        'contents' => [[
            'role'  => 'user',
            'parts' => [[ 'text' => $prompt ]]
        ]]
    ];

    $response = wp_remote_post( $endpoint, [
        'headers' => [ 'Content-Type' => 'application/json' ],
        'body'    => wp_json_encode( $payload ),
        'timeout' => 60
    ] );

    if ( is_wp_error( $response ) ) {
        return $response;
    }

    $status_code = wp_remote_retrieve_response_code( $response );
    $body        = wp_remote_retrieve_body( $response );
    $data        = json_decode( $body, true );

    if ( $status_code !== 200 ) {
        $msg = isset( $data['error']['message'] ) ? $data['error']['message'] : 'Lỗi không xác định';
        return new WP_Error( 'api_error', $msg . ' (Status: ' . $status_code . ')' );
    }

    return $data['candidates'][0]['content']['parts'][0]['text'] ?? '';
}
```

---

## Hướng dẫn tích hợp bằng Python

Sử dụng thư viện `requests` để thực thi nhanh các cuộc gọi Agent Flatform từ Python:

```python
import requests
import json

def call_agent_flatform_text_python(api_key: str, prompt: str, model: str = "gemini-3-flash-preview") -> str:
    endpoint = f"https://aiplatform.googleapis.com/v1/publishers/google/models/{model}:generateContent?key={api_key}"
    
    payload = {
        "contents": [{
            "role": "user",
            "parts": [{"text": prompt}]
        }]
    }
    
    headers = {"Content-Type": "application/json"}
    
    response = requests.post(endpoint, headers=headers, data=json.dumps(payload), timeout=60)
    
    if response.status_code != 200:
        try:
            err_msg = response.json().get("error", {}).get("message", "Unknown error")
        except Exception:
            err_msg = response.text
        raise Exception(f"API Error (Status {response.status_code}): {err_msg}")
        
    data = response.json()
    try:
        return data["candidates"][0]["content"]["parts"][0]["text"]
    except (KeyError, IndexError):
        return ""
```

---

## ⚠️ Danh sách kiểm tra bảo mật và lập trình

- [ ] **Tuyệt đối không hardcode API Key**: Luôn sử dụng biến môi trường (`process.env`, `.env`) hoặc lưu trữ bảo mật trong cơ sở dữ liệu và gọi động qua cấu hình.
- [ ] **Bảo vệ API Key trên client**: Tránh phơi API Key trực tiếp ra mã nguồn HTML/JS ở client. Nếu bắt buộc phải gọi từ client, hãy cấu hình giới hạn IP/Domain của API Key đó trong Google Cloud Console, hoặc tốt nhất là xây dựng một proxy API ở backend.
- [ ] **Đặt giá trị Timeout hợp lý**: Các cuộc gọi tạo nội dung AI (đặc biệt là tạo ảnh, video và giọng nói) tốn rất nhiều thời gian xử lý. Đặt timeout tối thiểu từ `60` đến `90` giây để tránh tình trạng đứt gãy kết nối giữa chừng.
- [ ] **Luôn bắt lỗi HTTP Status**: Luôn luôn kiểm tra mã HTTP trả về từ server của Google trước khi decode JSON, vì mã khác 200 (như 400, 429, 500) có thể trả về cấu trúc lỗi khác biệt hoặc chuỗi HTML thô.
