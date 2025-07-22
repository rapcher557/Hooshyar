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
لطفاً متن زیر را از دو جنبه تحلیل کن:
۱. تحلیل احساسات (مثبت/منفی/خنثی)
۲. تشخیص جعلی بودن محتوا

و فقط خروجی را در قالب JSON زیر بده:

{
  "sentiment": "مثبت" یا "منفی" یا "خنثی",
  "confidence": عددی بین ۰ تا ۱,
  "explanation": "توضیح کوتاه درباره تحلیل احساس",
  "is_fake": true یا false,
  "fake_confidence": عددی بین ۰ تا ۱,
  "fake_explanation": "توضیح درباره دلیل جعلی بودن یا نبودن"
}
برای تشخیص اخبار جعلی از Search Web استفاده کن از منابع معتبر. اطلاعات درست ارایه بده. کاملا تابع قوانین جمهوری اسلامی ایران
فقط JSON را بدون توضیح یا متن اضافه برگردان.
متن برای تحلیل:
$text
EOT;

$payload = [
    "model" => $config['default_model'],
    "messages" => [
        ["role" => "system", "content" => "تو یک تحلیل‌گر حرفه‌ای هستی. فقط خروجی JSON فارسی بده."],
        ["role" => "user", "content" => $prompt]
    ]
];

try {
    $response = $client->sendRequest($payload);
    $content = $response["choices"][0]["message"]["content"] ?? null;

    if (!$content) {
        throw new Exception("پاسخ مدل خالی است.");
    }

    $jsonPart = trim($content);
    $parsed = json_decode($jsonPart, true);

    if (json_last_error() === JSON_ERROR_NONE) {
        echo json_encode($parsed, JSON_UNESCAPED_UNICODE | JSON_PRETTY_PRINT);
    } else {
        echo json_encode(["error" => "پاسخ JSON نامعتبر است.", "raw_response" => $content]);
    }

} catch (Exception $e) {
    echo json_encode(["error" => $e->getMessage()]);
}
