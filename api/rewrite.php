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
لطفاً متن زیر را بازنویسی کن به صورتی که:
1. لحن رسمی و اداری داشته باشد
2. ساختار دستوری کاملاً صحیح باشد
3. از کلمات مترادف و شیوا استفاده شود
4. طول متن تغییر محسوسی نکند
5. همه کلمات فارسی باشند

متن اصلی:
$text

فقط متن بازنویسی شده را بدون توضیح اضافه برگردان.
EOT;

$payload = [
    "model" => $config['default_model'],
    "messages" => [
        ["role" => "system", "content" => "تو یک ویرایشگر حرفه‌ای متون فارسی هستی. متون را با حفظ معنا اما با بیانی شیواتر بازنویسی می‌کنی."],
        ["role" => "user", "content" => $prompt]
    ],
    "temperature" => 0.7 // کنترل خلاقیت مدل
];


try {
    $response = $client->sendRequest($payload);
    $content = $response["choices"][0]["message"]["content"] ?? null;

    if (!$content) {
        echo json_encode(["error" => "پاسخ مدل خالی است."]);
        exit;
    }

    $rewritten = trim($content);
    $rewritten = preg_replace('/^متن بازنویسی شده:\s*/u', '', $rewritten); // حذف عبارت اضافه
    
    echo json_encode([
        "rewritten_text" => $rewritten,
        "original_length" => strlen($text),
        "rewritten_length" => strlen($rewritten)
    ], JSON_UNESCAPED_UNICODE);

} catch (Exception $e) {
    echo json_encode([
        "error" => "خطا در پردازش متن",
        "details" => $e->getMessage()
    ]);
}