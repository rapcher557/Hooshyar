<?php
header("Content-Type: application/json; charset=utf-8");
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
متن زیر را از نظر وجود کلمات توهین‌آمیز بررسی کن و نتیجه را دقیقاً در قالب زیر برگردان:

{
  "has_profanity": true/false,
  "profanity_confidence": عدد اعشاری بین 0 تا 1,
  "profanity_explanation": "توضیح کوتاه",
  "bad_words": ["لیست کلمات توهین‌آمیز"]
}

فقط خروجی JSON را بدون هیچ متن اضافه‌ای برگردان.
متن ورودی:
$text
EOT;

$payload = [
    "model" => $config['default_model'],
    "messages" => [
        ["role" => "system", "content" => "تو یک سیستم تشخیص محتوای توهین‌آمیز هستی. فقط و فقط خروجی JSON معتبر تولید کن."],
        ["role" => "user", "content" => $prompt]
    ],
    "response_format" => ["type" => "json_object"] // ✨ مهم: درخواست پاسخ JSON
];

try {
    $response = $client->sendRequest($payload);
    $content = $response["choices"][0]["message"]["content"] ?? null;

    if (!$content) {
        throw new Exception("پاسخ مدل خالی است.");
    }

    $parsed = json_decode($content, true);
    
    if (!$parsed) {
        preg_match('/\{.*\}/s', $content, $matches);
        if ($matches) {
            $parsed = json_decode($matches[0], true);
        }
    }

    if ($parsed && json_last_error() === JSON_ERROR_NONE) {
        $result = [
            "has_profanity" => (bool)($parsed["has_profanity"] ?? false),
            "profanity_confidence" => (float)($parsed["profanity_confidence"] ?? 0),
            "profanity_explanation" => $parsed["profanity_explanation"] ?? "",
            "bad_words" => $parsed["bad_words"] ?? []
        ];
        echo json_encode($result, JSON_UNESCAPED_UNICODE | JSON_PRETTY_PRINT);
    } else {
        echo json_encode([
            "error" => "پاسخ JSON نامعتبر است",
            "raw_response" => $content
        ]);
    }

} catch (Exception $e) {
    echo json_encode(["error" => "خطا در پردازش: " . $e->getMessage()]);
}