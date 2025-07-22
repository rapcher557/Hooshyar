<?php
header("Content-Type: application/json");
require_once __DIR__ . '/../lib/liaraClient.php';
$config = require __DIR__ . '/../config/config.php';

$input = json_decode(file_get_contents("php://input"), true);
$text = $input["text"] ?? "";

if (!$text) {
    echo json_encode(["error" => "متنی وارد نشده است."]);
    exit;
}

$client = new LiaraClient($config);

$prompt = <<<EOT
لطفاً متن زیر را از نظر نگارشی و املایی اصلاح کن و فقط متن اصلاح‌شده را بدون هیچ توضیح اضافه برگردان.

متن:
$text
EOT;

$payload = [
    "model" => $config['default_model'],
    "messages" => [
        ["role" => "system", "content" => "تو یک ویرایشگر فارسی هستی. فقط متن اصلاح‌شده را بدون توضیح بده."],
        ["role" => "user", "content" => $prompt]
    ]
];
$ip = $_SERVER['REMOTE_ADDR'];
$module = 'grammar';
$timestamp = date('Y-m-d H:i:s');

try {
    $db = new PDO('mysql:host=localhost;dbname=hoosh;charset=utf8', 'db_user', 'db_pass');
    $stmt = $db->prepare("INSERT INTO request_logs (ip, module, timestamp) VALUES (?, ?, ?)");
    $stmt->execute([$ip, $module, $timestamp]);
} catch (Exception $logErr) {
    error_log("DB Log Error: " . $logErr->getMessage());
}

try {
    $response = $client->sendRequest($payload);
    $content = $response["choices"][0]["message"]["content"] ?? null;

    if (!$content) {
        echo json_encode(["error" => "پاسخ مدل خالی است."]);
        exit;
    }

    echo json_encode(["corrected_text" => trim($content)], JSON_UNESCAPED_UNICODE | JSON_PRETTY_PRINT);
} catch (Exception $e) {
    echo json_encode(["error" => $e->getMessage()]);
}
?>
