<?php
header("Content-Type: application/json");

require_once __DIR__ . '/../../lib/liaraClient.php';
$config = require __DIR__ . '/../../config/config.php';

try {
    $headers = getallheaders();
    $authHeader = $headers["Authorization"] ?? $headers["authorization"] ?? '';
    if (!preg_match('/Bearer\s+(\w+)/i', $authHeader, $matches)) {
        echo json_encode(["error" => "کلید API ارسال نشده یا نامعتبر است."]);
        exit;
    }
    $apiKey = $matches[1];

    $db = new PDO('mysql:host=localhost;dbname=hoosh;charset=utf8', 'db_user', 'db_pass');
    $stmt = $db->prepare("SELECT * FROM api_users WHERE api_key = ? AND is_active = 1");
    $stmt->execute([$apiKey]);
    $user = $stmt->fetch(PDO::FETCH_ASSOC);

    if (!$user) {
        echo json_encode(["error" => "کلید API نامعتبر است یا غیرفعال شده."]);
        exit;
    }

    if ($user['used_requests'] >= $user['request_limit']) {
        echo json_encode(["error" => "سقف مصرف مجاز شما تمام شده است."]);
        exit;
    }

    $input = json_decode(file_get_contents("php://input"), true);
    $text = $input["text"] ?? '';
    if (!$text) {
        echo json_encode(["error" => "متنی برای تحلیل ارسال نشده."]);
        exit;
    }

    $prompt = <<<EOT
لطفاً متن زیر را از دو جنبه تحلیل کن و فقط خروجی را در قالب JSON زیر بده:

{
  "sentiment": "مثبت" یا "منفی" یا "خنثی",
  "confidence": عددی بین ۰ تا ۱,
  "explanation": "توضیح کوتاه فارسی درباره دلیل تحلیل احساس",
  "is_fake": true یا false,
  "fake_confidence": عددی بین ۰ تا ۱,
  "fake_explanation": "توضیح کوتاه فارسی درباره اینکه چرا این خبر جعلی است یا واقعی"
}

فقط JSON را بدون توضیح یا متن اضافه برگردان.
متن برای تحلیل:
$text
EOT;

    $client = new LiaraClient($config);
    $payload = [
        "model" => $config['default_model'],
        "messages" => [
            ["role" => "system", "content" => "تو یک تحلیل‌گر حرفه‌ای هستی. فقط خروجی JSON فارسی بده."],
            ["role" => "user", "content" => $prompt]
        ]
    ];

    $response = $client->sendRequest($payload);
    $content = $response["choices"][0]["message"]["content"] ?? null;

    if (!$content) {
        echo json_encode(["error" => "پاسخ مدل خالی بود."]);
        exit;
    }

    if (preg_match('/\{.*\}/s', $content, $matches)) {
        $jsonPart = $matches[0];
        $parsed = json_decode($jsonPart, true);

        if (json_last_error() === JSON_ERROR_NONE) {
            $update = $db->prepare("UPDATE api_users SET used_requests = used_requests + 1 WHERE id = ?");
            $update->execute([$user["id"]]);

            $ip = $_SERVER['REMOTE_ADDR'];
            $stmt = $db->prepare("INSERT INTO api_logs (api_user_id, module, ip, timestamp, success) VALUES (?, ?, ?, NOW(), 1)");
            $stmt->execute([$user["id"], 'analyze', $ip]);

            echo json_encode($parsed, JSON_UNESCAPED_UNICODE | JSON_PRETTY_PRINT);
        } else {
            throw new Exception("پاسخ مدل قابل پردازش نبود.");
        }
    } else {
        throw new Exception("هیچ JSON معتبری در پاسخ مدل یافت نشد.");
    }

} catch (Exception $e) {
    if (isset($db) && isset($user)) {
        $stmt = $db->prepare("INSERT INTO api_logs (api_user_id, module, ip, timestamp, success, error_message) VALUES (?, ?, ?, NOW(), 0, ?)");
        $stmt->execute([$user["id"], 'analyze', $_SERVER['REMOTE_ADDR'], $e->getMessage()]);
    }

    echo json_encode(["error" => $e->getMessage()]);
}
